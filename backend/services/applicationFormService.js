// placeholder

/**
 * Application Form PDF Generator
 * - Page 1 : full template background (header + watermark + footer graphic)
 * - Pages 2+: full template background BUT header zone covered with white
 *             (watermark + footer graphic + everything else preserved)
 * - Custom footer (timestamp + page number) replaces template footer on all pages
 *
 * IMPORTANT: Template is 612×792 pt (US Letter).
 * PDFKit body pages are generated at the SAME size so coordinates align exactly.
 */
const PDFDocumentKit = require('pdfkit');
const { PDFDocument, rgb } = require('pdf-lib');
const fs   = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const FORMS_DIR     = path.join(__dirname, '..', 'uploads', 'application-forms');
const TEMPLATES_DIR = path.join(__dirname, '..', 'uploads', 'templates');
if (!fs.existsSync(FORMS_DIR)) fs.mkdirSync(FORMS_DIR, { recursive: true });

const FONT_REGULAR = 'C:\\Windows\\Fonts\\arial.ttf';
const FONT_BOLD    = 'C:\\Windows\\Fonts\\arialbd.ttf';
const USE_ARIAL    = fs.existsSync(FONT_REGULAR) && fs.existsSync(FONT_BOLD);

// ── Layout constants ──────────────────────────────────────────────────────────
// Template page dimensions (US Letter — confirmed from pdf-lib inspection)
const TPL_W = 612;
const TPL_H = 792;

// Template footer cover height — white rect painted over footer on all pages
const FOOTER_COVER_H = 115;

// Our custom footer height
const CUSTOM_FOOTER_H = 30;

// How much usable space is lost at the bottom due to the downward template shift
// (the template body area shrinks by FOOTER_SHIFT at the bottom)
// Content must not go below: page_height - FOOTER_SHIFT - CUSTOM_FOOTER_H - padding

// Default header cover height — overridden by bg.contentStartY at runtime
const DEFAULT_HEADER_H = 194;

// ── Template helpers ──────────────────────────────────────────────────────────
function getTemplateConfig() {
  const p = path.join(TEMPLATES_DIR, 'template-config.json');
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function getBackground() {
  const cfg = getTemplateConfig();
  const contentStartY = cfg?.contentStartY || DEFAULT_HEADER_H;

  if (cfg?.backgroundImage) {
    const p = path.join(TEMPLATES_DIR, cfg.backgroundImage);
    if (fs.existsSync(p)) return { type: 'image', path: p, contentStartY };
  }
  if (cfg?.filename && /\.(png|jpg|jpeg)$/i.test(cfg.filename)) {
    const p = path.join(TEMPLATES_DIR, cfg.filename);
    if (fs.existsSync(p)) return { type: 'image', path: p, contentStartY };
  }
  if (fs.existsSync(TEMPLATES_DIR)) {
    const imgs = fs.readdirSync(TEMPLATES_DIR)
      .filter(f => /^(letterhead|admission-template).*\.(png|jpg|jpeg)$/i.test(f))
      .sort().reverse();
    if (imgs.length > 0)
      return { type: 'image', path: path.join(TEMPLATES_DIR, imgs[0]), contentStartY };
  }
  if (cfg?.filename && /\.pdf$/i.test(cfg.filename)) {
    const p = path.join(TEMPLATES_DIR, cfg.filename);
    if (fs.existsSync(p)) return { type: 'pdf', path: p, contentStartY };
  }
  return null;
}

// ── Utility helpers ───────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return String(d); }
}

function parseJsonField(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

async function findPassportPhoto(appUUID) {
  try {
    const r = await pool.query(
      `SELECT file_path FROM documents
       WHERE application_id=$1 AND document_type='photo'
       ORDER BY created_at DESC LIMIT 1`,
      [appUUID]
    );
    if (!r.rows.length) return null;
    const fp = r.rows[0].file_path.replace(/\\/g, '/');
    const candidates = [
      path.resolve(path.join(process.cwd(), fp)),
      path.resolve(fp),
      path.resolve(path.join(__dirname, '..', fp)),
      path.resolve(path.join(__dirname, '..', '..', fp)),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return null;
  } catch { return null; }
}

/**
 * drawOverlayLayer — called after writeFormBody, before doc.end().
 * Iterates every buffered page and:
 *   - Page 1  : covers template footer only → draws custom footer
 *   - Pages 2+: covers template header (white rect) + template footer → draws custom footer
 *               Everything else on the template (watermark, body area, etc.) is untouched.
 *
 * @param {object} doc          PDFKit document (bufferPages:true)
 * @param {number} pageCount    total pages
 * @param {string} appId
 * @param {string} generatedAt  pre-formatted timestamp string
 * @param {number} W            page width
 * @param {number} M            left/right margin
 * @param {boolean} hasTemplate true when a template background is being used
 * @param {number} headerH      height of header zone to cover on pages 2+
 */
function drawOverlayLayer(doc, pageCount, appId, generatedAt, W, M, hasTemplate, headerH) {
  const fr = USE_ARIAL ? 'FR' : 'Helvetica';
  const fb = USE_ARIAL ? 'FB' : 'Helvetica-Bold';
  const pH = doc.page.height;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);

    if (hasTemplate) {
      // Footer is removed via CropBox in the pdf-lib merge step — no cover needed.
      // Only cover on pages 2+ where the header zone may still show through
      // (the body PDF has no background, so nothing to cover there either).
    }

    // Custom footer
    const footerTop = pH - CUSTOM_FOOTER_H - 6;
    doc.moveTo(M, footerTop - 2).lineTo(W - M, footerTop - 2)
      .lineWidth(0.6).strokeColor('#c9a84c').stroke();
    doc.font(fr).fontSize(7).fillColor('#555555')
      .text(`Generated: ${generatedAt}`, M, footerTop + 2,
        { width: (W - 2 * M) * 0.55, lineBreak: false });
    doc.font(fb).fontSize(7).fillColor('#0a2240')
      .text(`Page ${i + 1} of ${pageCount}`, M, footerTop + 2,
        { width: W - 2 * M, align: 'right', lineBreak: false });
    doc.font(fr).fontSize(6.5).fillColor('#888888')
      .text(`Application ID: ${appId}`, M, footerTop + 13,
        { width: W - 2 * M, align: 'center', lineBreak: false });
  }
}

/**
 * writeFormBody — renders all form sections onto the PDFKit doc.
 *
 * @param {object} doc
 * @param {object} application
 * @param {array}  programmeChoices
 * @param {array}  institutions
 * @param {array}  grades
 * @param {array}  diplomas
 * @param {array}  employments
 * @param {string|null} photoPath
 * @param {number} startY      Y to begin content on page 1 (below template header)
 * @param {number} M           left/right margin
 * @param {number} W           page width
 * @param {number} headerH     header cover height — used to set Y after page breaks
 */
function writeFormBody(doc, application, programmeChoices, institutions, grades,
                       diplomas, employments, photoPath, startY, M, W, headerH) {
  if (USE_ARIAL) {
    try { doc.registerFont('FR', FONT_REGULAR); doc.registerFont('FB', FONT_BOLD); } catch {}
  }
  const fr = USE_ARIAL ? 'FR' : 'Helvetica';
  const fb = USE_ARIAL ? 'FB' : 'Helvetica-Bold';

  const navy    = '#0a2240';
  const gold    = '#c9a84c';
  const black   = '#111111';
  const grey    = '#444444';
  const muted   = '#777777';
  const lightbg = '#f4f6f9';
  const contentW = W - 2 * M;

  // Safe bottom — footer is removed via CropBox; leave room for custom footer only
  const safeBottom = () => doc.page.height - CUSTOM_FOOTER_H - 20;

  // Content start Y on pages 2+ — y=0 (top of page).
  // The template header is physically absent on pages 2+ (shifted off-page),
  // so content starts from the very top with no cover needed.
  const PAGE2_Y = 8;

  // Add a new page and hard-set Y to the top
  const breakPage = () => {
    doc.addPage();
    doc.y = PAGE2_Y;
    doc.x = M;
  };

  // ── Form title bar (page 1 only) ─────────────────────────────────────────
  doc.y = startY + 6;
  const titleBarY = doc.y;
  doc.rect(M, titleBarY, contentW, 20).fill(navy);
  doc.font(fb).fontSize(9.5).fillColor('white')
    .text('APPLICATION FOR UNDERGRADUATE ADMISSION',
      M + 8, titleBarY + 6, { width: contentW - 16, align: 'center' });
  doc.y = titleBarY + 24;

  // ── Applicant summary block + passport photo ─────────────────────────────
  const summaryY = doc.y;
  const photoW = 82, photoH = 100;
  const photoX = W - M - photoW;

  // Photo box with gold border
  doc.rect(photoX, summaryY, photoW, photoH).lineWidth(1).strokeColor(gold).stroke();
  if (photoPath) {
    try {
      doc.image(photoPath, photoX + 1, summaryY + 1,
        { fit: [photoW - 2, photoH - 2], align: 'center', valign: 'center' });
    } catch {}
  } else {
    doc.font(fr).fontSize(7).fillColor(muted)
      .text('PASSPORT\nPHOTO', photoX, summaryY + photoH / 2 - 10,
        { width: photoW, align: 'center' });
  }
  doc.font(fr).fontSize(6.5).fillColor(muted)
    .text('Passport Photograph', photoX, summaryY + photoH + 2,
      { width: photoW, align: 'center' });

  // Info block left of photo
  const infoW = photoX - M - 12;
  const fullName = [application.title, application.first_name,
                    application.other_names, application.last_name]
    .filter(Boolean).map(s => s.toUpperCase()).join(' ');

  doc.font(fb).fontSize(11).fillColor(navy)
    .text(fullName || '—', M, summaryY, { width: infoW });

  const infoLines = [
    [`Application ID`, application.application_id],
    [`Date Submitted`, fmtDate(application.submitted_at)],
    [`Type`, application.application_type === 'topup' ? 'Top-Up / Access' : 'Regular Undergraduate'],
    [`Enrollment`, application.enrollment_option || '—'],
    [`Email`, application.email || '—'],
    [`Phone`, application.phone || '—'],
  ];
  infoLines.forEach(([label, val], idx) => {
    const lineY = summaryY + 18 + idx * 13;
    doc.font(fb).fontSize(7).fillColor(muted)
      .text(`${label}:`, M, lineY, { width: 80, lineBreak: false });
    doc.font(fr).fontSize(8.5).fillColor(grey)
      .text(`  ${val}`, M + 82, lineY, { width: infoW - 82, lineBreak: false });
  });

  const statusColor = application.status === 'approved' ? '#0e7a4e'
    : application.status === 'rejected' ? '#b91c1c' : '#b45309';
  doc.font(fb).fontSize(8.5).fillColor(statusColor)
    .text(`Status: ${(application.status || 'PENDING').toUpperCase()}`,
      M, summaryY + 18 + infoLines.length * 13, { width: infoW });

  doc.y = summaryY + photoH + 16;

  // ── Section / field helpers ───────────────────────────────────────────────

  const section = (letter, title) => {
    if (doc.y > safeBottom() - 40) {
      breakPage();
    } else {
      doc.moveDown(0.35);
    }
    const sY = doc.y;
    doc.rect(M, sY, contentW, 18).fill(navy);
    doc.font(fb).fontSize(9).fillColor('white')
      .text(`${letter}.  ${title.toUpperCase()}`, M + 8, sY + 5, { width: contentW - 16 });
    doc.y = sY + 22;
  };

  const grid2 = (pairs) => {
    const colW = (contentW - 12) / 2;
    let i = 0;
    while (i < pairs.length) {
      if (doc.y > safeBottom() - 24) { breakPage(); }
      const rowY = doc.y;
      const bg = Math.floor(i / 2) % 2 === 0 ? lightbg : '#ffffff';
      doc.rect(M, rowY, contentW, 22).fill(bg);

      const [lLabel, lVal] = pairs[i];
      const [rLabel, rVal] = pairs[i + 1] || ['', ''];

      doc.font(fb).fontSize(6.5).fillColor(muted)
        .text(lLabel.toUpperCase(), M + 4, rowY + 3, { width: colW - 4, lineBreak: false });
      doc.font(fr).fontSize(9).fillColor(black)
        .text(lVal || '—', M + 4, rowY + 11, { width: colW - 4, lineBreak: false });

      if (rLabel) {
        doc.font(fb).fontSize(6.5).fillColor(muted)
          .text(rLabel.toUpperCase(), M + colW + 16, rowY + 3, { width: colW - 4, lineBreak: false });
        doc.font(fr).fontSize(9).fillColor(black)
          .text(rVal || '—', M + colW + 16, rowY + 11, { width: colW - 4, lineBreak: false });
      }
      doc.moveTo(M, rowY + 22).lineTo(M + contentW, rowY + 22)
        .lineWidth(0.3).strokeColor('#d0d5dd').stroke();
      doc.y = rowY + 23;
      i += 2;
    }
    doc.moveDown(0.2);
  };

  const grid3 = (pairs) => {
    const colW = (contentW - 20) / 3;
    let i = 0;
    while (i < pairs.length) {
      if (doc.y > safeBottom() - 24) { breakPage(); }
      const rowY = doc.y;
      const bg = Math.floor(i / 3) % 2 === 0 ? lightbg : '#ffffff';
      doc.rect(M, rowY, contentW, 22).fill(bg);
      for (let j = 0; j < 3; j++) {
        const p = pairs[i + j];
        if (!p) break;
        const xOff = M + j * (colW + 10);
        doc.font(fb).fontSize(6.5).fillColor(muted)
          .text(p[0].toUpperCase(), xOff + 4, rowY + 3, { width: colW - 4, lineBreak: false });
        doc.font(fr).fontSize(9).fillColor(black)
          .text(p[1] || '—', xOff + 4, rowY + 11, { width: colW - 4, lineBreak: false });
      }
      doc.moveTo(M, rowY + 22).lineTo(M + contentW, rowY + 22)
        .lineWidth(0.3).strokeColor('#d0d5dd').stroke();
      doc.y = rowY + 23;
      i += 3;
    }
    doc.moveDown(0.2);
  };

  const fullField = (label, value) => {
    if (doc.y > safeBottom() - 30) { breakPage(); }
    const rowY = doc.y;
    doc.rect(M, rowY, contentW, 28).fill(lightbg);
    doc.font(fb).fontSize(6.5).fillColor(muted)
      .text(label.toUpperCase(), M + 4, rowY + 3, { width: contentW - 8, lineBreak: false });
    doc.font(fr).fontSize(9).fillColor(black)
      .text(value || '—', M + 4, rowY + 12, { width: contentW - 8, lineBreak: false });
    doc.moveTo(M, rowY + 28).lineTo(M + contentW, rowY + 28)
      .lineWidth(0.3).strokeColor('#d0d5dd').stroke();
    doc.y = rowY + 29;
    doc.moveDown(0.1);
  };

  const tblHeader = (cols, widths) => {
    if (doc.y > safeBottom() - 32) { breakPage(); }
    const hY = doc.y;
    doc.rect(M, hY, contentW, 16).fill(navy);
    let cx = M + 4;
    cols.forEach((h, i) => {
      doc.font(fb).fontSize(7.5).fillColor('white')
        .text(h, cx, hY + 4, { width: widths[i] - 4, lineBreak: false });
      cx += widths[i];
    });
    doc.y = hY + 16;
  };

  const tblRow = (vals, widths, rowIdx) => {
    if (doc.y > safeBottom() - 16) { breakPage(); }
    const rY = doc.y;
    doc.rect(M, rY, contentW, 15).fill(rowIdx % 2 === 0 ? '#f8f9fb' : '#ffffff');
    let cx = M + 4;
    vals.forEach((v, i) => {
      doc.font(fr).fontSize(8.5).fillColor(black)
        .text(String(v || '—'), cx, rY + 3, { width: widths[i] - 4, lineBreak: false });
      cx += widths[i];
    });
    doc.moveTo(M, rY + 15).lineTo(M + contentW, rY + 15)
      .lineWidth(0.3).strokeColor('#e0e4ea').stroke();
    doc.y = rY + 15;
  };

  // ── SECTION A — Personal Particulars ─────────────────────────────────────
  section('A', 'Personal Particulars of Applicant');
  grid2([
    ['Surname',           application.last_name],
    ['First Name',        application.first_name],
    ['Other Names',       application.other_names],
    ['Title',             application.title],
    ['Gender',            application.gender],
    ['Date of Birth',     fmtDate(application.date_of_birth)],
    ['Nationality',       application.nationality],
    ['Home Town',         application.hometown],
    ['Email Address',     application.email],
    ['Mobile Number',     application.phone],
    ['Physical Challenge',application.physical_challenge || 'None declared'],
    ['Candidate Type',    application.candidate_type === 'mature' ? 'Mature Applicant' : 'WASSCE / SSCE'],
  ]);
  fullField('Permanent Postal Address', application.postal_address);

  // ── SECTION B — Parent / Guardian ────────────────────────────────────────
  const guardian = (() => {
    try { return JSON.parse(application.admin_notes || '{}')?.guardian || {}; } catch { return {}; }
  })();
  section('B', 'Particulars of Parent / Guardian');
  if (guardian.name) {
    grid2([
      ['Full Name',    guardian.name],
      ['Relationship', guardian.relationship],
      ['Occupation',   guardian.occupation],
      ['Mobile Number',guardian.phone],
      ['Email Address',guardian.email],
    ]);
    fullField('Postal Address', guardian.postalAddress);
  } else {
    doc.font(fr).fontSize(9).fillColor(muted)
      .text('No guardian information provided.', M + 4, doc.y);
    doc.moveDown(0.5);
  }

  // ── SECTION C — Programme Selection ──────────────────────────────────────
  section('C', 'Programme Selection & Enrollment');
  const sorted = [...programmeChoices].sort((a, b) => a.preference - b.preference);
  if (sorted.length > 0) {
    const pW = [60, contentW - 60];
    tblHeader(['Choice', 'Programme of Study'], pW);
    sorted.forEach((p, i) => {
      const ord = ['1st Choice', '2nd Choice', '3rd Choice'][p.preference - 1] || `${p.preference}th`;
      tblRow([ord, p.programme_label], pW, i);
    });
    doc.moveDown(0.3);
  } else {
    doc.font(fr).fontSize(9).fillColor(muted)
      .text('No programme choices recorded.', M + 4, doc.y);
    doc.moveDown(0.3);
  }
  const financingArr = parseJsonField(application.financing);
  grid3([
    ['Enrollment Option', application.enrollment_option],
    ['Application Type',  application.application_type === 'topup' ? 'Top-Up / Access' : 'Regular'],
    ['Financing',         financingArr.length > 0 ? financingArr.join(', ') : '—'],
  ]);

  // ── SECTION D — Institutions Attended ────────────────────────────────────
  section('D', 'Institutions Attended / Qualifications');
  if (institutions.length > 0) {
    const iW = [contentW * 0.42, contentW * 0.14, contentW * 0.14, contentW * 0.30];
    tblHeader(['Name of Institution', 'From', 'To', 'Certificate Awarded'], iW);
    institutions.forEach((inst, i) =>
      tblRow([inst.institution_name, inst.date_from || '—',
              inst.date_to || '—', inst.certificate_awarded || '—'], iW, i));
    doc.moveDown(0.3);
  } else {
    doc.font(fr).fontSize(9).fillColor(muted).text('No institutions recorded.', M + 4, doc.y);
    doc.moveDown(0.3);
  }

  // ── SECTION E — Academic Performance ─────────────────────────────────────
  const coreGrades     = grades.filter(g => g.subject_type === 'core');
  const electiveGrades = grades.filter(g => g.subject_type === 'elective');
  if (coreGrades.length > 0 || electiveGrades.length > 0) {
    section('E', 'Academic Performance — WASSCE / SSCE');
    const gW = [contentW*0.30, contentW*0.18, contentW*0.18, contentW*0.18, contentW*0.16];
    const gH = ['Subject', 'Index No.', 'Exam Type', 'Date Taken', 'Grade'];
    if (coreGrades.length > 0) {
      doc.font(fb).fontSize(7.5).fillColor(grey)
        .text('Core Subjects', M + 4, doc.y, { lineGap: 2 });
      doc.moveDown(0.15);
      tblHeader(gH, gW);
      coreGrades.forEach((g, i) =>
        tblRow([g.subject_name, g.index_no||'—', g.exam_type||'—', g.date_taken||'—', g.grade||'—'], gW, i));
      doc.moveDown(0.3);
    }
    if (electiveGrades.length > 0) {
      doc.font(fb).fontSize(7.5).fillColor(grey)
        .text('Elective Subjects', M + 4, doc.y, { lineGap: 2 });
      doc.moveDown(0.15);
      tblHeader(gH, gW);
      electiveGrades.forEach((g, i) =>
        tblRow([g.subject_name, g.index_no||'—', g.exam_type||'—', g.date_taken||'—', g.grade||'—'], gW, i));
      doc.moveDown(0.3);
    }
  }

  // ── SECTION F — Diploma / HND ─────────────────────────────────────────────
  if (diplomas.length > 0) {
    section('F', 'Diploma / HND / Certificate Qualifications');
    const dW = [contentW*0.28, contentW*0.28, contentW*0.22, contentW*0.22];
    tblHeader(['Qualification', 'Subject Studied', 'Date Obtained', 'Grade / Class'], dW);
    diplomas.forEach((d, i) =>
      tblRow([d.qualification, d.subject_studied||'—', d.date_obtained||'—', d.grade||'—'], dW, i));
    doc.moveDown(0.3);
  }

  // ── SECTION G — Employment History ───────────────────────────────────────
  if (employments.length > 0) {
    section('G', 'Employment History');
    const eW = [contentW*0.35, contentW*0.30, contentW*0.175, contentW*0.175];
    tblHeader(['Employer / Organisation', 'Position Held', 'From', 'To'], eW);
    employments.forEach((e, i) =>
      tblRow([e.employer, e.position_held||'—', e.date_from||'—', e.date_to||'—'], eW, i));
    if (application.total_years_worked) {
      doc.moveDown(0.2);
      doc.font(fr).fontSize(8.5).fillColor(grey)
        .text(`Total Years of Work Experience: ${application.total_years_worked} year(s)`, M + 4, doc.y);
    }
    doc.moveDown(0.3);
  }

  // ── Candidate Declaration ─────────────────────────────────────────────────
  if (doc.y > safeBottom() - 120) breakPage();
  doc.moveDown(0.5);
  doc.moveTo(M, doc.y).lineTo(M + contentW, doc.y).lineWidth(0.8).strokeColor(gold).stroke();
  doc.moveDown(0.4);
  doc.font(fb).fontSize(8.5).fillColor(navy).text('CANDIDATE DECLARATION', M, doc.y);
  doc.moveDown(0.25);
  doc.font(fr).fontSize(8.5).fillColor(black).text(
    'I hereby declare that all the above information provided by me is true and correct, ' +
    'and that I could be denied admission, or be withdrawn from the College after admission, ' +
    'if the information on this form proves to be false. I also confirm that I have read and ' +
    'understood the terms and conditions of admission.',
    M, doc.y, { width: contentW, lineGap: 2 }
  );
  doc.moveDown(1.8);
  const sigY = doc.y;
  doc.moveTo(M, sigY).lineTo(M + 190, sigY).lineWidth(0.5).strokeColor('#999').stroke();
  doc.moveTo(M + 230, sigY).lineTo(M + 430, sigY).lineWidth(0.5).strokeColor('#999').stroke();
  doc.font(fr).fontSize(7.5).fillColor(muted);
  doc.text("Applicant's Signature", M, sigY + 3, { width: 190 });
  doc.text(`Date: ${fmtDate(application.submitted_at)}`, M + 230, sigY + 3, { width: 200 });

  // ── For Official Use Only ─────────────────────────────────────────────────
  doc.moveDown(2);
  if (doc.y > safeBottom() - 140) breakPage();
  doc.moveTo(M, doc.y).lineTo(M + contentW, doc.y).lineWidth(0.8).strokeColor(gold).stroke();
  doc.moveDown(0.4);
  doc.font(fb).fontSize(8.5).fillColor(navy).text('FOR OFFICIAL USE ONLY', M, doc.y);
  doc.moveDown(0.3);
  ['Registration No.', 'Application Received On', 'Receipt / Reference No.',
   'Name of Receiving Officer', 'Signature of Officer', 'Remarks'].forEach((label, i) => {
    if (doc.y > safeBottom() - 24) breakPage();
    const rY = doc.y;
    doc.rect(M, rY, contentW, 22).fill(i % 2 === 0 ? lightbg : '#ffffff');
    doc.font(fb).fontSize(6.5).fillColor(muted)
      .text(label.toUpperCase(), M + 4, rY + 3, { width: contentW - 8 });
    doc.moveTo(M, rY + 22).lineTo(M + contentW, rY + 22)
      .lineWidth(0.3).strokeColor('#d0d5dd').stroke();
    doc.y = rY + 23;
  });
}

// ── Generator: PDF template background (pdf-lib merge) ───────────────────────
async function generateWithPdfBackground(application, programmeChoices, institutions,
    grades, diplomas, employments, photoPath, bg, appId) {
  const tmpPath   = path.join(FORMS_DIR, `${appId}-body.pdf`);
  const finalPath = path.join(FORMS_DIR, `${appId}-form.pdf`);
  const rel       = `uploads/application-forms/${appId}-form.pdf`;

  const generatedAt = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });

  // Scale contentStartY (set on A4=842pt) to actual template height (792pt)
  const headerH = Math.round((bg.contentStartY || DEFAULT_HEADER_H) * TPL_H / 842);
  const FOOTER_H = 115; // footer zone height from bottom of template

  const rawTemplateBytes = fs.readFileSync(bg.path);

  // ── Pre-process template variants using pdf-lib drawRectangle ──────────
  // We draw white rectangles directly onto the template page content stream.
  // This physically removes the header/footer — not a cover, it's part of the page.

  // Variant A (page 1): white rect over footer only
  const tplDocA = await PDFDocument.load(rawTemplateBytes);
  {
    const pg = tplDocA.getPage(0);
    const { width, height } = pg.getSize();
    // Footer: bottom FOOTER_H pt → PDF y=0..FOOTER_H
    pg.drawRectangle({ x: 0, y: 0, width, height: FOOTER_H, color: rgb(1, 1, 1), opacity: 1 });
  }
  const tplBytesA = await tplDocA.save();

  // Variant B (pages 2+): white rect over header AND footer
  const tplDocB = await PDFDocument.load(rawTemplateBytes);
  {
    const pg = tplDocB.getPage(0);
    const { width, height } = pg.getSize();
    // Footer: y=0..FOOTER_H
    pg.drawRectangle({ x: 0, y: 0, width, height: FOOTER_H, color: rgb(1, 1, 1), opacity: 1 });
    // Header: y=(height-headerH)..height
    pg.drawRectangle({ x: 0, y: height - headerH, width, height: headerH, color: rgb(1, 1, 1), opacity: 1 });
  }
  const tplBytesB = await tplDocB.save();

  // Step 1 — render body PDF at same size as template
  await new Promise((resolve, reject) => {
    const doc = new PDFDocumentKit({ size: [TPL_W, TPL_H], margin: 0, bufferPages: true });
    const stream = fs.createWriteStream(tmpPath);
    doc.pipe(stream);
    writeFormBody(doc, application, programmeChoices, institutions, grades,
                  diplomas, employments, photoPath, headerH, 55, TPL_W, headerH);
    const { count } = doc.bufferedPageRange();
    drawOverlayLayer(doc, count, appId, generatedAt, TPL_W, 55, true, headerH);
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  const bodyBytes = fs.readFileSync(tmpPath);
  const bodyDoc   = await PDFDocument.load(bodyBytes);
  const bodyPageCount = bodyDoc.getPageCount();

  // Step 2 — build merged PDF
  const mergedDoc = await PDFDocument.create();

  // Page 1: template A (footer removed) + body
  const pg1 = mergedDoc.addPage([TPL_W, TPL_H]);
  const [tplEmbA] = await mergedDoc.embedPdf(tplBytesA, [0]);
  const [bEmb1]   = await mergedDoc.embedPdf(bodyBytes, [0]);
  pg1.drawPage(tplEmbA, { x: 0, y: 0, width: TPL_W, height: TPL_H });
  pg1.drawPage(bEmb1,   { x: 0, y: 0, width: TPL_W, height: TPL_H });

  // Pages 2+: template B (header + footer removed) + body
  for (let i = 1; i < bodyPageCount; i++) {
    const newPg = mergedDoc.addPage([TPL_W, TPL_H]);
    const [tplEmbB] = await mergedDoc.embedPdf(tplBytesB, [0]);
    const [bEmb]    = await mergedDoc.embedPdf(bodyBytes, [i]);
    newPg.drawPage(tplEmbB, { x: 0, y: 0, width: TPL_W, height: TPL_H });
    newPg.drawPage(bEmb,    { x: 0, y: 0, width: TPL_W, height: TPL_H });
  }

  const mergedBytes = await mergedDoc.save();
  fs.writeFileSync(finalPath, mergedBytes);
  try { fs.unlinkSync(tmpPath); } catch {}

  console.log(`  [form-pdf-merge] ${appId} — ${Math.round(mergedBytes.length / 1024)} KB, ${bodyPageCount} page(s)`);
  return rel;
}

// ── Generator: Image background (PNG/JPG letterhead) ─────────────────────────
async function generateWithImageBackground(application, programmeChoices, institutions,
    grades, diplomas, employments, photoPath, bg, appId) {
  const finalPath = path.join(FORMS_DIR, `${appId}-form.pdf`);
  const rel       = `uploads/application-forms/${appId}-form.pdf`;

  const generatedAt = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });

  // Scale contentStartY from A4 (842pt) to actual template height (792pt)
  const headerH = Math.round((bg.contentStartY || DEFAULT_HEADER_H) * TPL_H / 842);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocumentKit({
        size: [TPL_W, TPL_H],
        margin: 0,
        bufferPages: true,
      });
      const stream = fs.createWriteStream(finalPath);
      doc.pipe(stream);

      // Page 1: draw full template image
      try { doc.image(bg.path, 0, 0, { width: TPL_W, height: TPL_H }); } catch {}

      writeFormBody(doc, application, programmeChoices, institutions, grades,
                    diplomas, employments, photoPath, headerH, 55, TPL_W, headerH);

      const { count } = doc.bufferedPageRange();

      // Draw template image on pages 2+ before the overlay
      for (let i = 1; i < count; i++) {
        doc.switchToPage(i);
        try { doc.image(bg.path, 0, 0, { width: TPL_W, height: TPL_H }); } catch {}
      }

      drawOverlayLayer(doc, count, appId, generatedAt, TPL_W, 55, true, headerH);

      doc.end();
      stream.on('finish', () => resolve(rel));
      stream.on('error', reject);
    } catch (err) { reject(err); }
  });
}

// ── Generator: Built-in header (no template uploaded) ────────────────────────
async function generateFromCode(application, programmeChoices, institutions,
    grades, diplomas, employments, photoPath, appId) {
  const finalPath = path.join(FORMS_DIR, `${appId}-form.pdf`);
  const rel       = `uploads/application-forms/${appId}-form.pdf`;

  const generatedAt = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocumentKit({ size: 'A4', margin: 0, bufferPages: true });
      const stream = fs.createWriteStream(finalPath);
      doc.pipe(stream);

      if (USE_ARIAL) {
        try { doc.registerFont('FR', FONT_REGULAR); doc.registerFont('FB', FONT_BOLD); } catch {}
      }
      const fb = USE_ARIAL ? 'FB' : 'Helvetica-Bold';
      const fr = USE_ARIAL ? 'FR' : 'Helvetica';
      const navy = '#0a2240', gold = '#c9a84c', grey = '#555';
      const W = doc.page.width, M = 55;

      // Built-in header (page 1 only — no template to repeat)
      doc.rect(0, 0, W, 6).fill(gold);
      doc.y = 16;
      doc.font(fb).fontSize(17).fillColor(navy)
        .text('WITHROW UNIVERSITY COLLEGE', M, doc.y, { align: 'center', width: W - 2 * M });
      doc.font(fr).fontSize(8.5).fillColor(grey)
        .text('Agona-Asamangah, Ghana  |  Tel: 0303969461 / 0535197436  |  admissions@wuc.edu.gh',
          M, doc.y + 2, { align: 'center', width: W - 2 * M });
      doc.moveDown(0.5);
      const divY = doc.y;
      doc.moveTo(M, divY).lineTo(W - M, divY).lineWidth(1.5).strokeColor(gold).stroke();

      // For built-in path, pages 2+ have no header — headerH=0 means no white cover needed
      writeFormBody(doc, application, programmeChoices, institutions, grades,
                    diplomas, employments, photoPath, divY + 4, M, W, 0);

      const { count } = doc.bufferedPageRange();

      // Pages 2+: draw a minimal gold top rule so they don't look bare
      for (let i = 1; i < count; i++) {
        doc.switchToPage(i);
        doc.rect(0, 0, W, 4).fill(gold);
      }

      // Custom footer — no template footer to cover
      drawOverlayLayer(doc, count, appId, generatedAt, W, M, false, 0);

      doc.end();
      stream.on('finish', () => resolve(rel));
      stream.on('error', reject);
    } catch (err) { reject(err); }
  });
}

// ── Main entry point ──────────────────────────────────────────────────────────
async function generateApplicationForm(application, programmeChoices = [],
    institutions = [], grades = [], diplomas = [], employments = []) {
  const appId = application.application_id;
  console.log(`  Generating application form for ${appId}...`);

  const photoPath = await findPassportPhoto(application.id);
  const bg = getBackground();

  if (bg) {
    console.log(`  [form] Template: ${path.basename(bg.path)} (${bg.type}, startY: ${bg.contentStartY})`);
    if (bg.type === 'pdf') {
      return generateWithPdfBackground(application, programmeChoices, institutions,
        grades, diplomas, employments, photoPath, bg, appId);
    }
    return generateWithImageBackground(application, programmeChoices, institutions,
      grades, diplomas, employments, photoPath, bg, appId);
  }

  console.log(`  [form] No template — using built-in header`);
  return generateFromCode(application, programmeChoices, institutions,
    grades, diplomas, employments, photoPath, appId);
}

module.exports = { generateApplicationForm, FORMS_DIR };
