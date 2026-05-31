const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');
const { sendAdmissionLetter, sendEmail, emailTemplate } = require('../services/emailService');
const { generateAdmissionLetter } = require('../services/admissionLetterService');
const { sendSMS } = require('../services/smsService');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

/* ── helper: write audit log ── */
const audit = async (adminId, action, entityType, entityId, details, ip) => {
  pool.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [adminId || null, action, entityType || null, entityId || null,
     details ? JSON.stringify(details) : null, ip || null]
  ).catch(e => logger.error('Audit log failed', { error: e.message }));
};

/* ── GET /api/admin/applications?type=&status=&search=&page=&limit=&programme= ── */
const getAllApplications = async (req, res, next) => {
  try {
    const { type, status, search, programme, page = 1, limit = 50 } = req.query;
    const where = [];
    const params = [];
    let idx = 1;

    if (type && ['regular', 'topup'].includes(type)) {
      where.push(`a.application_type = $${idx++}`);
      params.push(type);
    }
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      where.push(`a.status = $${idx++}`);
      params.push(status);
    }
    if (search) {
      where.push(`(a.application_id ILIKE $${idx} OR a.email ILIKE $${idx} OR a.first_name ILIKE $${idx} OR a.last_name ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (programme) {
      where.push(`EXISTS (SELECT 1 FROM programme_choices pc2 WHERE pc2.application_id = a.id AND pc2.programme_id = $${idx})`);
      params.push(programme);
      idx++;
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM applications a ${whereClause}`, params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT a.*,
              json_agg(pc ORDER BY pc.preference) FILTER (WHERE pc.id IS NOT NULL) AS programme_choices
       FROM applications a
       LEFT JOIN programme_choices pc ON pc.application_id = a.id
       ${whereClause}
       GROUP BY a.id
       ORDER BY a.submitted_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      applications: result.rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

/* ── GET /api/admin/applications/:applicationId ── */
const getApplicationDetail = async (req, res, next) => {
  const { applicationId } = req.params;
  try {
    const appResult = await pool.query(
      'SELECT * FROM applications WHERE application_id = $1',
      [applicationId.toUpperCase()]
    );
    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    const app = appResult.rows[0];

    const [choices, institutions, grades, diplomas, employment, docs] = await Promise.all([
      pool.query('SELECT * FROM programme_choices WHERE application_id=$1 ORDER BY preference', [app.id]),
      pool.query('SELECT * FROM institutions_attended WHERE application_id=$1 ORDER BY sort_order', [app.id]),
      pool.query('SELECT * FROM academic_grades WHERE application_id=$1 ORDER BY subject_type, id', [app.id]),
      pool.query('SELECT * FROM diploma_qualifications WHERE application_id=$1 ORDER BY sort_order', [app.id]),
      pool.query('SELECT * FROM employment_history WHERE application_id=$1 ORDER BY sort_order', [app.id]),
      pool.query('SELECT id, document_type, document_name, file_path, file_size, mime_type, status, created_at FROM documents WHERE application_id=$1 ORDER BY created_at', [app.id]),
    ]);

    res.json({
      success: true,
      application: {
        ...app,
        programmeChoices: choices.rows,
        institutionsAttended: institutions.rows,
        academicGrades: grades.rows,
        diplomaQualifications: diplomas.rows,
        employmentHistory: employment.rows,
        documents: docs.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* ── POST /api/admin/applications/:applicationId/approve ── */
const approveApplication = async (req, res, next) => {
  const { applicationId } = req.params;
  const adminId = req.admin?.adminId;
  try {
    const appResult = await pool.query('SELECT * FROM applications WHERE application_id = $1', [applicationId.toUpperCase()]);
    if (appResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Application not found' });
    const application = appResult.rows[0];
    if (application.status === 'approved') return res.status(400).json({ success: false, message: 'Already approved' });

    // Fetch programme choices for the letter
    const choicesResult = await pool.query(
      'SELECT * FROM programme_choices WHERE application_id=$1 ORDER BY preference',
      [application.id]
    );

    // Generate the real PDF admission letter
    let letterPath;
    try {
      letterPath = await generateAdmissionLetter(application, choicesResult.rows);
    } catch (err) {
      logger.error('PDF generation failed', { applicationId, error: err.message });
      letterPath = null;
    }

    const admissionLetterUrl = letterPath
      ? `${process.env.API_URL || process.env.APP_URL}/${letterPath}`
      : null;

    await pool.query(
      `UPDATE applications SET status='approved', reviewed_at=NOW(), reviewed_by=$1, admission_letter_url=$2 WHERE application_id=$3`,
      [adminId || null, admissionLetterUrl, applicationId.toUpperCase()]
    );
    audit(adminId, 'approve_application', 'application', application.id, { applicationId }, req.ip);
    sendAdmissionLetter(application.email, application.first_name, admissionLetterUrl || '#').catch(() => {});

    // SMS notification with programme details (no fees)
    const programme = choicesResult.rows
      .filter(c => c.programme_id !== 'mature-access' && !/mature access/i.test(c.programme_label || ''))
      .sort((a, b) => a.preference - b.preference)[0]?.programme_label || 'your selected programme';
    const enrollment = application.enrollment_option || 'Regular';
    const smsMsg = `Congratulations ${application.first_name}! Your WUC application (${applicationId}) has been APPROVED for ${programme} (${enrollment}). Download your admission letter at ${process.env.APP_URL || 'https://apply.wuc.edu.gh'}/application-status`;
    sendSMS(application.phone, smsMsg).catch(() => {});

    res.json({ success: true, message: 'Application approved and admission letter generated', admissionLetterUrl });
  } catch (error) { next(error); }
};

/* ── POST /api/admin/applications/:applicationId/reject ── */
const rejectApplication = async (req, res, next) => {
  const { applicationId } = req.params;
  const { reason } = req.body;
  const adminId = req.admin?.adminId;
  try {
    const appResult = await pool.query('SELECT * FROM applications WHERE application_id = $1', [applicationId.toUpperCase()]);
    if (appResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Application not found' });
    await pool.query(
      `UPDATE applications SET status='rejected', reviewed_at=NOW(), reviewed_by=$1, rejection_reason=$2 WHERE application_id=$3`,
      [adminId || null, reason || null, applicationId.toUpperCase()]
    );
    audit(adminId, 'reject_application', 'application', appResult.rows[0].id, { applicationId, reason }, req.ip);

    // SMS notification for rejection
    const app = appResult.rows[0];
    const smsMsg = `Dear ${app.first_name}, we regret to inform you that your WUC application (${applicationId}) was not successful. Contact admissions@wuc.edu.gh for more information.`;
    sendSMS(app.phone, smsMsg).catch(() => {});

    res.json({ success: true, message: 'Application rejected' });
  } catch (error) { next(error); }
};

/* ── POST /api/admin/applications/bulk-action ── */
const bulkAction = async (req, res, next) => {
  const { applicationIds, action, reason } = req.body;
  const adminId = req.admin?.adminId;
  if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
    return res.status(400).json({ success: false, message: 'applicationIds array required' });
  }
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'action must be approve or reject' });
  }
  try {
    let processed = 0;
    for (const appId of applicationIds) {
      const r = await pool.query('SELECT * FROM applications WHERE application_id=$1 AND status=$2', [appId.toUpperCase(), 'pending']);
      if (r.rows.length === 0) continue;
      const app = r.rows[0];
      if (action === 'approve') {
        const choices = await pool.query('SELECT * FROM programme_choices WHERE application_id=$1 ORDER BY preference', [app.id]);
        let letterPath;
        try { letterPath = await generateAdmissionLetter(app, choices.rows); } catch { letterPath = null; }
        const url = letterPath ? `${process.env.API_URL || process.env.APP_URL}/${letterPath}` : null;
        await pool.query(`UPDATE applications SET status='approved', reviewed_at=NOW(), reviewed_by=$1, admission_letter_url=$2 WHERE application_id=$3`, [adminId, url, appId.toUpperCase()]);
        sendAdmissionLetter(app.email, app.first_name, url || '#').catch(() => {});
        // SMS with programme details
        const prog = choices.rows.filter(c => c.programme_id !== 'mature-access' && !/mature access/i.test(c.programme_label || '')).sort((a, b) => a.preference - b.preference)[0]?.programme_label || 'your selected programme';
        sendSMS(app.phone, `Congratulations ${app.first_name}! Your WUC application (${appId}) has been APPROVED for ${prog} (${app.enrollment_option || 'Regular'}). Download your admission letter at ${process.env.APP_URL || 'https://apply.wuc.edu.gh'}/application-status`).catch(() => {});
      } else {
        await pool.query(`UPDATE applications SET status='rejected', reviewed_at=NOW(), reviewed_by=$1, rejection_reason=$2 WHERE application_id=$3`, [adminId, reason || null, appId.toUpperCase()]);
        sendSMS(app.phone, `Dear ${app.first_name}, we regret to inform you that your WUC application (${appId}) was not successful. Contact admissions@wuc.edu.gh for more information.`).catch(() => {});
      }
      audit(adminId, `bulk_${action}`, 'application', app.id, { applicationId: appId }, req.ip);
      processed++;
    }
    res.json({ success: true, message: `${processed} application(s) ${action}d`, processed });
  } catch (error) { next(error); }
};

/* ── POST /api/admin/applications/:applicationId/notes ── */
const updateNotes = async (req, res, next) => {
  const { applicationId } = req.params;
  const { notes } = req.body;
  const adminId = req.admin?.adminId;
  try {
    await pool.query('UPDATE applications SET admin_notes=$1 WHERE application_id=$2', [notes, applicationId.toUpperCase()]);
    audit(adminId, 'update_notes', 'application', null, { applicationId }, req.ip);
    res.json({ success: true, message: 'Notes updated' });
  } catch (error) { next(error); }
};

/* ── POST /api/admin/applications/:applicationId/email ── */
const emailApplicant = async (req, res, next) => {
  const { applicationId } = req.params;
  const { subject, message } = req.body;
  const adminId = req.admin?.adminId;
  try {
    const r = await pool.query('SELECT email, first_name FROM applications WHERE application_id=$1', [applicationId.toUpperCase()]);
    if (r.rows.length === 0) return res.status(404).json({ success: false, message: 'Application not found' });
    const { email, first_name } = r.rows[0];
    const html = emailTemplate(`<h2>${subject}</h2><p>Dear ${first_name},</p><p>${message.replace(/\n/g, '<br>')}</p><p>Best regards,<br><strong>WUC Admissions Office</strong></p>`);
    await sendEmail(email, subject, html);
    audit(adminId, 'email_applicant', 'application', null, { applicationId, subject }, req.ip);
    res.json({ success: true, message: `Email sent to ${email}` });
  } catch (error) { next(error); }
};

/* ── GET /api/admin/vouchers?status=&search=&page=&limit= ── */
const getAllVouchers = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const where = [];
    const params = [];
    let idx = 1;
    if (status && ['unused', 'used', 'expired'].includes(status)) {
      where.push(`status = $${idx++}`); params.push(status);
    }
    if (search) {
      where.push(`(voucher_code ILIKE $${idx} OR email ILIKE $${idx} OR first_name ILIKE $${idx} OR last_name ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const countResult = await pool.query(`SELECT COUNT(*) FROM vouchers ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query(
      `SELECT * FROM vouchers ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit), offset]
    );
    res.json({ success: true, vouchers: result.rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { next(error); }
};

/* ── POST /api/admin/vouchers/:voucherId/cancel ── */
const cancelVoucher = async (req, res, next) => {
  const { voucherId } = req.params;
  const adminId = req.admin?.adminId;
  try {
    await pool.query(`UPDATE vouchers SET status='expired' WHERE id=$1 AND status='unused'`, [voucherId]);
    audit(adminId, 'cancel_voucher', 'voucher', voucherId, null, req.ip);
    res.json({ success: true, message: 'Voucher cancelled' });
  } catch (error) { next(error); }
};

/* ── GET /api/admin/dashboard/stats ── */
const getDashboardStats = async (req, res, next) => {
  try {
    const [totalApps, pendingApps, approvedApps, rejectedApps, regularApps, topupApps, totalVouchers, usedVouchers, progStats] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM applications'),
      pool.query(`SELECT COUNT(*) FROM applications WHERE status='pending'`),
      pool.query(`SELECT COUNT(*) FROM applications WHERE status='approved'`),
      pool.query(`SELECT COUNT(*) FROM applications WHERE status='rejected'`),
      pool.query(`SELECT COUNT(*) FROM applications WHERE application_type='regular'`),
      pool.query(`SELECT COUNT(*) FROM applications WHERE application_type='topup'`),
      pool.query('SELECT COUNT(*) FROM vouchers'),
      pool.query(`SELECT COUNT(*) FROM vouchers WHERE status='used'`),
      pool.query(`SELECT pc.programme_label, COUNT(*) as count FROM programme_choices pc WHERE pc.preference=1 GROUP BY pc.programme_label ORDER BY count DESC`),
    ]);
    res.json({
      success: true,
      stats: {
        totalApplications: parseInt(totalApps.rows[0].count),
        pendingApplications: parseInt(pendingApps.rows[0].count),
        approvedApplications: parseInt(approvedApps.rows[0].count),
        rejectedApplications: parseInt(rejectedApps.rows[0].count),
        regularApplications: parseInt(regularApps.rows[0].count),
        topupApplications: parseInt(topupApps.rows[0].count),
        totalVouchers: parseInt(totalVouchers.rows[0].count),
        usedVouchers: parseInt(usedVouchers.rows[0].count),
        programmeBreakdown: progStats.rows,
      },
    });
  } catch (error) { next(error); }
};

/* ── POST /api/admin/documents/:documentId/verify ── */
const verifyDocument = async (req, res, next) => {
  const { documentId } = req.params;
  const adminId = req.admin?.adminId;
  try {
    await pool.query(`UPDATE documents SET status='verified', verified_at=NOW(), verified_by=$1 WHERE id=$2`, [adminId || null, documentId]);
    audit(adminId, 'verify_document', 'document', documentId, null, req.ip);
    res.json({ success: true, message: 'Document verified' });
  } catch (error) { next(error); }
};

/* ── GET /api/admin/export/applications?type=&status= ── */
const exportApplications = async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const where = [];
    const params = [];
    let idx = 1;
    if (type) { where.push(`a.application_type=$${idx++}`); params.push(type); }
    if (status) { where.push(`a.status=$${idx++}`); params.push(status); }
    const wc = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT a.application_id, a.application_type, a.title, a.first_name, a.last_name, a.other_names,
              a.date_of_birth, a.gender, a.nationality, a.hometown, a.postal_address, a.email, a.phone,
              a.enrollment_option, a.status, a.submitted_at, a.reviewed_at,
              (SELECT string_agg(pc.programme_label, '; ' ORDER BY pc.preference) FROM programme_choices pc WHERE pc.application_id=a.id) as programmes
       FROM applications a ${wc} ORDER BY a.submitted_at DESC`, params
    );
    // CSV
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'No data' });
    const cols = Object.keys(result.rows[0]);
    const csv = [cols.join(','), ...result.rows.map(r => cols.map(c => {
      let v = r[c] == null ? '' : String(r[c]);
      if (v.includes(',') || v.includes('"') || v.includes('\n')) v = `"${v.replace(/"/g, '""')}"`;
      return v;
    }).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=wuc-applications-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) { next(error); }
};

/* ── GET /api/admin/audit-logs?page=&limit= ── */
const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const result = await pool.query(
      `SELECT al.*, au.username as admin_username FROM audit_logs al LEFT JOIN admin_users au ON al.user_id=au.id ORDER BY al.created_at DESC LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );
    const countResult = await pool.query('SELECT COUNT(*) FROM audit_logs');
    res.json({ success: true, logs: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (error) { next(error); }
};

/* ── Admin user management ── */
const getAdminUsers = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id, username, email, role, is_active, last_login, created_at FROM admin_users ORDER BY created_at');
    res.json({ success: true, admins: result.rows });
  } catch (error) { next(error); }
};

const createAdminUser = async (req, res, next) => {
  const { username, email, password, role = 'admin' } = req.body;
  const adminId = req.admin?.adminId;
  const adminRole = req.admin?.role;
  if (adminRole !== 'super_admin') return res.status(403).json({ success: false, message: 'Only super admins can create users' });
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO admin_users (username, email, password_hash, role) VALUES ($1,$2,$3,$4)',
      [username, email, hash, role]
    );
    audit(adminId, 'create_admin', 'admin_user', null, { username, email, role }, req.ip);
    res.status(201).json({ success: true, message: 'Admin user created' });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ success: false, message: 'Username or email already exists' });
    next(error);
  }
};

const toggleAdminUser = async (req, res, next) => {
  const { adminUserId } = req.params;
  const adminRole = req.admin?.role;
  if (adminRole !== 'super_admin') return res.status(403).json({ success: false, message: 'Only super admins can manage users' });
  try {
    await pool.query('UPDATE admin_users SET is_active = NOT is_active WHERE id=$1', [adminUserId]);
    audit(req.admin?.adminId, 'toggle_admin', 'admin_user', adminUserId, null, req.ip);
    res.json({ success: true, message: 'Admin user updated' });
  } catch (error) { next(error); }
};

/* ── POST /api/admin/applications/:applicationId/regenerate-letter ── */
const regenerateLetter = async (req, res, next) => {
  const { applicationId } = req.params;
  try {
    const appResult = await pool.query('SELECT * FROM applications WHERE application_id = $1', [applicationId.toUpperCase()]);
    if (appResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Application not found' });
    const application = appResult.rows[0];
    if (application.status !== 'approved') return res.status(400).json({ success: false, message: 'Only approved applications can have letters regenerated' });

    const choicesResult = await pool.query('SELECT * FROM programme_choices WHERE application_id=$1 ORDER BY preference', [application.id]);
    const letterPath = await generateAdmissionLetter(application, choicesResult.rows);
    const url = `${process.env.API_URL || process.env.APP_URL}/${letterPath}`;
    await pool.query('UPDATE applications SET admission_letter_url=$1 WHERE id=$2', [url, application.id]);

    res.json({ success: true, message: 'Admission letter regenerated with latest fees, template and registrar settings', admissionLetterUrl: url });
  } catch (error) { next(error); }
};

/* ══════════════════════════════════════════════════════════
   Programme Fees Management (super_admin only)
   ══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════
   Admission Letter Template Management
   ══════════════════════════════════════════════════════════ */
const { getTemplatePath, getRegistrarSettings, TEMPLATES_DIR } = require('../services/admissionLetterService');

/* ── GET /api/admin/template ── */
const getTemplate = async (req, res) => {
  const info = getTemplatePath();
  const registrar = getRegistrarSettings();
  const cfgPath = path.join(TEMPLATES_DIR, 'template-config.json');
  let cfg = {};
  if (fs.existsSync(cfgPath)) { try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); } catch {} }

  res.json({
    success: true,
    template: info ? {
      filename: info.config.filename,
      contentStartY: info.config.contentStartY || 170,
      backgroundImage: info.config.backgroundImage || null,
      uploadedAt: info.config.uploadedAt,
      previewUrl: `${process.env.API_URL || process.env.APP_URL}/uploads/templates/${info.config.filename}`,
    } : null,
    registrar,
  });
};

/* ── POST /api/admin/template/upload ── (multipart — handled by multer in route) */
const uploadTemplate = async (req, res) => {
  if (req.admin?.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Super admin only' });
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const configPath = path.join(TEMPLATES_DIR, 'template-config.json');
  const isImage = /\.(png|jpg|jpeg)$/i.test(req.file.originalname);

  let config = {
    filename: req.file.filename,
    uploadedAt: new Date().toISOString(),
    contentStartY: 170,
    fields: {},
  };

  // If it's an image, save it as the letterhead background
  if (isImage) {
    const bgDest = path.join(TEMPLATES_DIR, 'letterhead-bg' + path.extname(req.file.originalname));
    fs.copyFileSync(req.file.path, bgDest);
    config.filename = req.file.filename;
    config.backgroundImage = 'letterhead-bg' + path.extname(req.file.originalname);
  }

  // Preserve existing config values if updating
  if (fs.existsSync(configPath)) {
    try {
      const old = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      config.contentStartY = old.contentStartY || 170;
      if (!isImage && old.backgroundImage) config.backgroundImage = old.backgroundImage;
    } catch {}
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  audit(req.admin?.adminId, 'upload_template', 'template', null, { filename: req.file.filename }, req.ip);

  res.json({
    success: true,
    message: isImage
      ? 'Letterhead image uploaded. The full letter body will be written below your letterhead.'
      : 'Template uploaded. Set the contentStartY to where your letterhead ends.',
    template: {
      filename: config.filename,
      contentStartY: config.contentStartY,
      backgroundImage: config.backgroundImage || null,
      uploadedAt: config.uploadedAt,
      previewUrl: `${process.env.API_URL || process.env.APP_URL}/uploads/templates/${config.filename}`,
    },
  });
};

/* ── PUT /api/admin/template/fields ── */
const updateTemplateFields = async (req, res) => {
  if (req.admin?.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Super admin only' });
  const { contentStartY } = req.body;
  const configPath = path.join(TEMPLATES_DIR, 'template-config.json');
  if (!fs.existsSync(configPath)) return res.status(400).json({ success: false, message: 'No template uploaded yet' });

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (contentStartY !== undefined) config.contentStartY = parseInt(contentStartY) || 170;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    audit(req.admin?.adminId, 'update_template_fields', 'template', null, { contentStartY }, req.ip);
    res.json({ success: true, message: 'Template settings updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed: ' + err.message });
  }
};

/* ── DELETE /api/admin/template ── */
const deleteTemplate = async (req, res) => {
  if (req.admin?.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Super admin only' });
  const configPath = path.join(TEMPLATES_DIR, 'template-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const tplFile = path.join(TEMPLATES_DIR, config.filename);
      if (fs.existsSync(tplFile)) fs.unlinkSync(tplFile);
      fs.unlinkSync(configPath);
    } catch {}
  }
  res.json({ success: true, message: 'Template removed. Letters will use the default format.' });
};

/* ── PUT /api/admin/registrar ── */
const updateRegistrar = async (req, res) => {
  if (req.admin?.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Super admin only' });
  const { name, title } = req.body;
  const regPath = path.join(TEMPLATES_DIR, 'registrar.json');
  try {
    let existing = {};
    if (fs.existsSync(regPath)) { try { existing = JSON.parse(fs.readFileSync(regPath, 'utf8')); } catch {} }
    existing.name = name || existing.name || 'Ms. Mary Yaa Boahemaa';
    existing.title = title || existing.title || 'Registrar';
    fs.writeFileSync(regPath, JSON.stringify(existing, null, 2));
    audit(req.admin?.adminId, 'update_registrar', 'registrar', null, { name, title }, req.ip);
    res.json({ success: true, message: 'Registrar details updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── POST /api/admin/registrar/signature ── (multipart) */
const uploadSignature = async (req, res) => {
  if (req.admin?.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Super admin only' });
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const regPath = path.join(TEMPLATES_DIR, 'registrar.json');
  try {
    let existing = {};
    if (fs.existsSync(regPath)) { try { existing = JSON.parse(fs.readFileSync(regPath, 'utf8')); } catch {} }
    // Remove old signature file
    if (existing.signatureFile) {
      const old = path.join(TEMPLATES_DIR, existing.signatureFile);
      if (fs.existsSync(old)) try { fs.unlinkSync(old); } catch {}
    }
    existing.signatureFile = req.file.filename;
    fs.writeFileSync(regPath, JSON.stringify(existing, null, 2));
    audit(req.admin?.adminId, 'upload_signature', 'registrar', null, { file: req.file.filename }, req.ip);
    res.json({
      success: true,
      message: 'Signature uploaded',
      signatureUrl: `${process.env.API_URL || process.env.APP_URL}/uploads/templates/${req.file.filename}`,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

/* ── GET /api/admin/fees ── */
const getAllFees = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM programme_fees ORDER BY programme_label, application_type, enrollment_option`
    );
    res.json({ success: true, fees: result.rows });
  } catch (error) { next(error); }
};

/* ── POST /api/admin/fees ── */
const createFee = async (req, res, next) => {
  if (req.admin?.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Super admin only' });
  const { programmeId, programmeLabel, applicationType, enrollmentOption,
          tuitionFee, facilityFee, libraryFee, ictFee, examinationFee, registrationFee,
          otherFees, otherFeesLabel, academicYear,
          durationYears, bankName, bankBranch, bankAccountNo, bankAccountName,
          initialPaymentPercent, initialPaymentDeadline, balancePaymentDeadline, programmeStartDate } = req.body;
  try {
    await pool.query(
      `INSERT INTO programme_fees
         (programme_id, programme_label, application_type, enrollment_option,
          tuition_fee, facility_fee, library_fee, ict_fee, examination_fee, registration_fee,
          other_fees, other_fees_label, academic_year,
          duration_years, bank_name, bank_branch, bank_account_no, bank_account_name,
          initial_payment_percent, initial_payment_deadline, balance_payment_deadline, programme_start_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
      [programmeId, programmeLabel, applicationType, enrollmentOption,
       parseFloat(tuitionFee) || 0, parseFloat(facilityFee) || 0, parseFloat(libraryFee) || 0,
       parseFloat(ictFee) || 0, parseFloat(examinationFee) || 0, parseFloat(registrationFee) || 0,
       parseFloat(otherFees) || 0, otherFeesLabel || null, academicYear || '2025/2026',
       parseInt(durationYears) || 4, bankName || 'GCB BANK', bankBranch || 'AGONA BRANCH',
       bankAccountNo || '6201130004574', bankAccountName || 'WITHROW COLLEGE',
       parseInt(initialPaymentPercent) || 70, initialPaymentDeadline || 'September 1',
       balancePaymentDeadline || 'October 15', programmeStartDate || 'September 8']
    );
    audit(req.admin?.adminId, 'create_fee', 'programme_fees', null, { programmeId, applicationType, enrollmentOption }, req.ip);
    res.status(201).json({ success: true, message: 'Fee structure created' });
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ success: false, message: 'Fee structure already exists for this combination' });
    next(error);
  }
};

/* ── PUT /api/admin/fees/:feeId ── */
const updateFee = async (req, res, next) => {
  if (req.admin?.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Super admin only' });
  const { feeId } = req.params;
  const { tuitionFee, facilityFee, libraryFee, ictFee, examinationFee, registrationFee,
          otherFees, otherFeesLabel, isActive,
          durationYears, bankName, bankBranch, bankAccountNo, bankAccountName,
          initialPaymentPercent, initialPaymentDeadline, balancePaymentDeadline, programmeStartDate } = req.body;
  try {
    await pool.query(
      `UPDATE programme_fees SET
         tuition_fee=$1, facility_fee=$2, library_fee=$3, ict_fee=$4,
         examination_fee=$5, registration_fee=$6, other_fees=$7, other_fees_label=$8,
         is_active=$9, duration_years=$10, bank_name=$11, bank_branch=$12,
         bank_account_no=$13, bank_account_name=$14, initial_payment_percent=$15,
         initial_payment_deadline=$16, balance_payment_deadline=$17, programme_start_date=$18,
         updated_at=NOW()
       WHERE id=$19`,
      [parseFloat(tuitionFee) || 0, parseFloat(facilityFee) || 0, parseFloat(libraryFee) || 0,
       parseFloat(ictFee) || 0, parseFloat(examinationFee) || 0, parseFloat(registrationFee) || 0,
       parseFloat(otherFees) || 0, otherFeesLabel || null, isActive !== false,
       parseInt(durationYears) || 4, bankName || 'GCB BANK', bankBranch || 'AGONA BRANCH',
       bankAccountNo || '6201130004574', bankAccountName || 'WITHROW COLLEGE',
       parseInt(initialPaymentPercent) || 70, initialPaymentDeadline || 'September 1',
       balancePaymentDeadline || 'October 15', programmeStartDate || 'September 8', feeId]
    );
    audit(req.admin?.adminId, 'update_fee', 'programme_fees', feeId, null, req.ip);
    res.json({ success: true, message: 'Fee structure updated' });
  } catch (error) { next(error); }
};

/* ── DELETE /api/admin/fees/:feeId ── */
const deleteFee = async (req, res, next) => {
  if (req.admin?.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Super admin only' });
  const { feeId } = req.params;
  try {
    await pool.query('DELETE FROM programme_fees WHERE id=$1', [feeId]);
    audit(req.admin?.adminId, 'delete_fee', 'programme_fees', feeId, null, req.ip);
    res.json({ success: true, message: 'Fee structure deleted' });
  } catch (error) { next(error); }
};

/* ── GET /api/admin/fees/lookup?programmeId=&applicationType=&enrollmentOption= ── */
const lookupFee = async (req, res, next) => {
  const { programmeId, applicationType, enrollmentOption } = req.query;
  try {
    const result = await pool.query(
      `SELECT * FROM programme_fees
       WHERE programme_id=$1 AND application_type=$2 AND enrollment_option=$3 AND is_active=true
       ORDER BY academic_year DESC LIMIT 1`,
      [programmeId, applicationType, enrollmentOption]
    );
    if (result.rows.length === 0) return res.json({ success: true, fee: null, message: 'No fee structure found' });
    res.json({ success: true, fee: result.rows[0] });
  } catch (error) { next(error); }
};

/* ══════════════════════════════════════════════════════════
   Manual Enrolment (super_admin only)
   ══════════════════════════════════════════════════════════ */

/**
 * POST /api/admin/enrolments/manual
 * Super admin manually enrols an applicant:
 *  - Creates an application record (status = approved immediately)
 *  - Creates programme_choices
 *  - Generates admission letter
 *  - Sends letter to applicant email
 */
const manualEnrol = async (req, res, next) => {
  if (req.admin?.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Super admin access required' });
  }

  const {
    title, firstName, lastName, otherNames,
    email, phone, dateOfBirth, gender,
    nationality = 'Ghanaian', hometown, postalAddress,
    enrollmentOption, applicationType = 'regular', candidateType = 'wassce',
    programmeId, programmeLabel,
    notes,
  } = req.body;

  const adminId = req.admin?.adminId;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Generate a unique application ID
    const prefix = applicationType === 'topup' ? 'TUP' : 'APP';
    const applicationId = `${prefix}${Date.now().toString().slice(-6)}`;

    // Insert application directly as approved
    const appResult = await client.query(
      `INSERT INTO applications (
         application_id, application_type,
         title, first_name, last_name, other_names,
         date_of_birth, gender, nationality, hometown, postal_address,
         email, phone, enrollment_option, candidate_type,
         status, reviewed_at, reviewed_by, admin_notes,
         financing
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
                 'approved', NOW(), $16, $17, '[]')
       RETURNING id`,
      [
        applicationId, applicationType,
        title || null, firstName, lastName, otherNames || null,
        dateOfBirth, gender, nationality, hometown, postalAddress,
        email, phone, enrollmentOption, candidateType,
        adminId || null,
        notes ? `Manual enrolment by admin. ${notes}` : 'Manual enrolment by admin.',
      ]
    );
    const appUUID = appResult.rows[0].id;

    // Insert programme choice
    await client.query(
      `INSERT INTO programme_choices (application_id, programme_id, programme_label, preference)
       VALUES ($1, $2, $3, 1)`,
      [appUUID, programmeId, programmeLabel]
    );

    await client.query('COMMIT');

    // Fetch full application for letter generation
    const fullApp = await pool.query('SELECT * FROM applications WHERE id=$1', [appUUID]);
    const choices = await pool.query(
      'SELECT * FROM programme_choices WHERE application_id=$1 ORDER BY preference', [appUUID]
    );

    // Generate admission letter
    let letterPath = null;
    try {
      letterPath = await generateAdmissionLetter(fullApp.rows[0], choices.rows);
    } catch (err) {
      logger.error('Manual enrolment letter generation failed', { applicationId, error: err.message });
    }

    const letterUrl = letterPath
      ? `${process.env.API_URL || process.env.APP_URL}/${letterPath}`
      : null;

    if (letterUrl) {
      await pool.query(
        'UPDATE applications SET admission_letter_url=$1 WHERE id=$2',
        [letterUrl, appUUID]
      );
    }

    // Send admission letter email
    if (letterUrl) {
      sendAdmissionLetter(email, firstName, letterUrl).catch(() => {});
    }

    audit(adminId, 'manual_enrolment', 'application', appUUID,
      { applicationId, programmeId, programmeLabel, enrollmentOption }, req.ip);

    res.status(201).json({
      success: true,
      message: `Applicant manually enrolled. Application ID: ${applicationId}`,
      applicationId,
      admissionLetterUrl: letterUrl,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

module.exports = {
  getAllApplications, getApplicationDetail, approveApplication, rejectApplication,
  bulkAction, updateNotes, emailApplicant, regenerateLetter,
  getAllVouchers, cancelVoucher,
  getDashboardStats, verifyDocument, exportApplications, getAuditLogs,
  getAdminUsers, createAdminUser, toggleAdminUser,
  getAllFees, createFee, updateFee, deleteFee, lookupFee,
  getTemplate, uploadTemplate, updateTemplateFields, deleteTemplate,
  updateRegistrar, uploadSignature,
  manualEnrol,
};
