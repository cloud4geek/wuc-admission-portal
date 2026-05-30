const PDFDocumentKit = require('pdfkit');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');
const { amountToWords, fmtGHS } = require('../utils/amountToWords');

// Font paths — Arial supports the Ghana Cedi ₵ symbol
const FONT_REGULAR = 'C:\\Windows\\Fonts\\arial.ttf';
const FONT_BOLD    = 'C:\\Windows\\Fonts\\arialbd.ttf';
const USE_ARIAL    = fs.existsSync(FONT_REGULAR) && fs.existsSync(FONT_BOLD);
const F_REGULAR    = USE_ARIAL ? FONT_REGULAR : 'Helvetica';
const F_BOLD       = USE_ARIAL ? FONT_BOLD    : 'Helvetica-Bold';

const LETTERS_DIR = path.join(__dirname, '..', 'uploads', 'admission-letters');
const TEMPLATES_DIR = path.join(__dirname, '..', 'uploads', 'templates');
if (!fs.existsSync(LETTERS_DIR)) fs.mkdirSync(LETTERS_DIR, { recursive: true });
if (!fs.existsSync(TEMPLATES_DIR)) fs.mkdirSync(TEMPLATES_DIR, { recursive: true });

/* ── DB helpers ── */
async function findPassportPhoto(appUUID) {
  try {
    const r = await pool.query(
      `SELECT file_path FROM documents WHERE application_id=$1 AND document_type='photo' ORDER BY created_at DESC LIMIT 1`,
      [appUUID]
    );
    if (r.rows.length === 0) return null;
    const fp = r.rows[0].file_path.replace(/\\/g, '/');

    // Resolve against process.cwd() first (server runs from backend/ dir),
    // then fall back to __dirname-relative paths for other contexts.
    const candidates = [
      path.resolve(path.join(process.cwd(), fp)),             // backend/uploads/photos/...  ✅
      path.resolve(fp),                                        // same when cwd=backend/
      path.resolve(path.join(__dirname, '..', fp)),           // services/../uploads/...
      path.resolve(path.join(__dirname, '..', '..', fp)),     // services/../../uploads/...
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  } catch { return null; }
}

async function lookupFees(app, choices) {
  if (!choices || choices.length === 0) return null;

  // Mature Access is an entry mode, not a study programme.
  // First try the actual public health programme the applicant selected.
  // If no fee record exists there, fall back to 'mature-access' programme_id
  // (admin may have configured fees there for mature applicants).
  const sorted = [...choices]
    .filter(c => c.programme_id !== 'mature-access' && !/mature access/i.test(c.programme_label || ''))
    .sort((a, b) => Number(a.preference) - Number(b.preference));

  // Pass 1: try the actual academic programme (disease control / nutrition)
  for (const choice of sorted) {
    try {
      const r = await pool.query(
        `SELECT * FROM programme_fees
         WHERE programme_id=$1 AND application_type=$2 AND enrollment_option=$3 AND is_active=true
         ORDER BY academic_year DESC LIMIT 1`,
        [choice.programme_id, app.application_type, app.enrollment_option || 'Regular']
      );
      if (r.rows.length > 0) return r.rows[0];
    } catch {}
  }

  // Pass 2: if this is a mature applicant and no fee found above,
  // look up under 'mature-access' programme_id (where admin set the fees)
  const isMatureApplicant = app.candidate_type === 'mature' ||
    choices.some(c => c.programme_id === 'mature-access');
  if (isMatureApplicant) {
    try {
      const r = await pool.query(
        `SELECT * FROM programme_fees
         WHERE programme_id='mature-access' AND application_type=$1 AND enrollment_option=$2 AND is_active=true
         ORDER BY academic_year DESC LIMIT 1`,
        [app.application_type, app.enrollment_option || 'Regular']
      );
      if (r.rows.length > 0) return r.rows[0];
    } catch {}
  }

  return null;
}

/* ── Config helpers ── */
function getTemplateConfig() {
  const cfg = path.join(TEMPLATES_DIR, 'template-config.json');
  if (!fs.existsSync(cfg)) return null;
  try { return JSON.parse(fs.readFileSync(cfg, 'utf8')); } catch { return null; }
}

function getTemplatePath() {
  const c = getTemplateConfig();
  if (!c) return null;
  return { path: path.join(TEMPLATES_DIR, c.filename), config: c };
}

function getRegistrarSettings() {
  const p = path.join(TEMPLATES_DIR, 'registrar.json');
  if (!fs.existsSync(p)) return { name: 'Ms. Mary Yaa Boahemaa', title: 'Registrar', signaturePath: null };
  try {
    const s = JSON.parse(fs.readFileSync(p, 'utf8'));
    const sigPath = s.signatureFile ? path.join(TEMPLATES_DIR, s.signatureFile) : null;
    return {
      name: s.name || 'Ms. Mary Yaa Boahemaa',
      title: s.title || 'Registrar',
      signaturePath: sigPath && fs.existsSync(sigPath) ? sigPath : null,
    };
  } catch { return { name: 'Ms. Mary Yaa Boahemaa', title: 'Registrar', signaturePath: null }; }
}

/**
 * Find the best background for the letter:
 * 1. Explicit backgroundImage in config (PNG/JPG)
 * 2. The uploaded template file if it's an image
 * 3. Any letterhead-*.png/jpg in templates dir
 * 4. The uploaded PDF template (embedded via pdf-lib)
 */
function getBackground() {
  const cfg = getTemplateConfig();
  const contentStartY = cfg?.contentStartY || 160;

  // 1. Explicit backgroundImage
  if (cfg?.backgroundImage) {
    const p = path.join(TEMPLATES_DIR, cfg.backgroundImage);
    if (fs.existsSync(p)) return { type: 'image', path: p, contentStartY };
  }

  // 2. Uploaded file is an image
  if (cfg?.filename && /\.(png|jpg|jpeg)$/i.test(cfg.filename)) {
    const p = path.join(TEMPLATES_DIR, cfg.filename);
    if (fs.existsSync(p)) return { type: 'image', path: p, contentStartY };
  }

  // 3. Any letterhead image in templates dir
  if (fs.existsSync(TEMPLATES_DIR)) {
    const imgs = fs.readdirSync(TEMPLATES_DIR)
      .filter(f => /^(letterhead|admission-template).*\.(png|jpg|jpeg)$/i.test(f))
      .sort().reverse();
    if (imgs.length > 0) return { type: 'image', path: path.join(TEMPLATES_DIR, imgs[0]), contentStartY };
  }

  // 4. PDF template — embed via pdf-lib
  if (cfg?.filename && /\.pdf$/i.test(cfg.filename)) {
    const p = path.join(TEMPLATES_DIR, cfg.filename);
    if (fs.existsSync(p)) return { type: 'pdf', path: p, contentStartY };
  }

  return null;
}

/* ══════════════════════════════════════════════════════════
   Core letter body writer (shared by all generators)
   ══════════════════════════════════════════════════════════ */
function buildLetterLines(app, choices, fees, registrar) {
  // Title separate from name to avoid duplication
  const title = (app.title || '').trim();
  // Name WITHOUT title (title shown separately)
  const nameOnly = [app.first_name, app.other_names, app.last_name]
    .filter(Boolean).join(' ').toUpperCase();
  // Full display: "Miss KUSI LUCY" — title in mixed case, name in uppercase
  const fullName = title ? `${title} ${nameOnly}` : nameOnly;
  // First name with proper capitalization: "Veronica"
  const rawFirst = (app.first_name || app.last_name || '').trim();
  const firstName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1).toLowerCase();
  const programme = (() => {
    if (!choices || choices.length === 0) return 'your selected programme';
    const sorted = [...choices].sort((a, b) => Number(a.preference) - Number(b.preference));
    // Skip 'mature-access' and any label that contains "Mature Access" —
    // it's a candidate type, not an academic programme.
    const academic = sorted.find(c =>
      c.programme_id !== 'mature-access' &&
      !/mature access/i.test(c.programme_label || '')
    );
    return academic ? academic.programme_label : sorted[0].programme_label;
  })();
  const enrollment = (app.enrollment_option || 'Regular').toUpperCase();
  const now = new Date();
  const academicYear = fees?.academic_year || `${now.getFullYear()}/${now.getFullYear() + 1}`;
  const dur = fees?.duration_years || 4;
  const startDate = fees?.programme_start_date || 'September 8';
  const startYear = parseInt(academicYear.split('/')[0]) || now.getFullYear();
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) + ', ' + now.getFullYear();

  let pt = 1;
  const feePoints = [];

  if (fees) {
    const totalFee = parseFloat(fees.total_fee);
    const pct = parseInt(fees.initial_payment_percent) || 70;
    const initialAmt = Math.round(totalFee * pct / 100 * 100) / 100;
    const balanceAmt = Math.round((totalFee - initialAmt) * 100) / 100;
    const bankInfo =
      `${fees.bank_account_name || 'WITHROW COLLEGE'} account; ` +
      `${fees.bank_name || 'GCB'} ACCOUNT NO: ${fees.bank_account_no || '6201130004574'}, ` +
      `${fees.bank_branch || 'AGONA BRANCH'}`;
    const initDL = `${fees.initial_payment_deadline || 'September 1'}, ${startYear}`;
    const balDL = `${fees.balance_payment_deadline || 'October 15'}, ${startYear}`;

    feePoints.push({
      num: pt++,
      text: `Admission and tuition fees for your programme for the ${academicYear} academic year ` +
        `is ${amountToWords(totalFee)} (${fmtGHS(totalFee)}) to be paid into the ${bankInfo}.`,
    });
    feePoints.push({
      num: pt++,
      text: `You are expected to confirm your acceptance of this offer by way of writing and ` +
        `payment of ${pct}% of the total fees which is ${amountToWords(initialAmt)} (${fmtGHS(initialAmt)}) ` +
        `not later than ${initDL} and the outstanding balance of ${amountToWords(balanceAmt)} ` +
        `(${fmtGHS(balanceAmt)}) be paid by ${balDL}.`,
    });
  }

  const conditions = [
    `You are to note that if it is discovered subsequently that you do not, in fact, possess the ` +
    `qualifications by virtue of which you have been offered admission to pursue the programme of study, ` +
    `you will be withdrawn immediately and possibly prosecuted. You will also be held personally liable ` +
    `for any false statement or omission made on your application form.`,
    `The College will provide you with Uniform, Laboratory coat, Name Tag and Student ID as well as ` +
    `free accommodation. You will be attached to a Hostel/Hall on campus.`,
    `You are also to note that your admission is subject to you being declared medically fit, you are ` +
    `therefore mandated to undergo a medical examination when you report on campus at a fee.`,
    `All students are considered to be under probation for the full duration of their programme, and ` +
    `may be withdrawn from the College at any time for unsatisfactory academic work or misconduct. ` +
    `You will be required to adhere to all the College's rules and regulations.`,
    `Kindly note that all fees paid are NOT REFUNDABLE.`,
  ].map(text => ({ num: pt++, text }));

  return {
    fullName, firstName, programme, enrollment, academicYear, dur, startDate, startYear, dateStr,
    feePoints, conditions,
  };
}

function writeBodyOnDoc(doc, app, choices, fees, photoPath, startY, M, W, registrar) {
  const d = buildLetterLines(app, choices, fees, registrar);
  const black = '#1a1a1a', grey = '#555', navy = '#0a2240';

  // Register Arial if available (supports ₵)
  if (USE_ARIAL) {
    try {
      doc.registerFont('Body', FONT_REGULAR);
      doc.registerFont('Body-Bold', FONT_BOLD);
    } catch {}
  }
  const fReg  = USE_ARIAL ? 'Body'      : 'Helvetica';
  const fBold = USE_ARIAL ? 'Body-Bold' : 'Helvetica-Bold';

  // Gap below header line
  const contentY = startY + 12;
  doc.y = contentY;

  // ── Passport photo — top right ──
  const photoW = 75, photoH = 90, photoX = W - M - photoW;
  if (photoPath) {
    try { doc.image(photoPath, photoX, contentY, { fit: [photoW, photoH] }); }
    catch (e) { console.log('    [photo] error:', e.message); }
  }

  const textW = photoPath ? (photoX - M - 12) : (W - 2 * M);

  // ── Date ──
  doc.font(fReg).fontSize(10).fillColor(black);
  doc.text(d.dateStr, M, contentY, { width: textW });
  doc.moveDown(0.4);

  // ── Reference number ──
  doc.text(`Reference no: ${app.application_id}`, { width: textW });
  doc.moveDown(0.5);

  // ── Applicant name (title + name, no duplication) ──
  doc.font(fBold).fontSize(10).fillColor(black)
    .text(d.fullName, { width: textW });
  doc.font(fReg).fontSize(9).fillColor(grey)
    .text(`Email: ${app.email || ''}`, { width: textW });
  doc.y = Math.max(doc.y, contentY + photoH + 6);
  doc.moveDown(0.7);

  // ── Salutation — first name properly capitalised ──
  doc.font(fReg).fontSize(10).fillColor(black).text(`Dear ${d.firstName},`);
  doc.moveDown(0.5);

  // ── Subject ──
  doc.font(fBold).fontSize(10.5).fillColor(navy)
    .text(`OFFER OF ADMISSION FOR THE ${d.academicYear} ACADEMIC YEAR`, { underline: true });
  doc.moveDown(0.5);

  // ── Opening paragraph with bold key elements ──
  // We use continued text to mix bold and normal inline
  doc.font(fReg).fontSize(9.5).fillColor(black);
  doc.text(
    `With reference to your application for admission into this College, I write to inform you that ` +
    `you have been offered admission to pursue a `,
    { continued: true, lineGap: 2.5 }
  );
  doc.font(fBold).text(`${d.dur}-year (${d.enrollment}) Programme `, { continued: true });
  doc.font(fReg).text(`leading to the award of a `, { continued: true });
  doc.font(fBold).text(`${d.programme.toUpperCase()} `, { continued: true });
  doc.font(fReg).text(`effective `, { continued: true });
  doc.font(fBold).text(`${d.startDate}, ${d.startYear}`, { continued: true });
  doc.font(fReg).text(
    `. This offer of admission is for the `,
    { continued: true }
  );
  doc.font(fBold).text(`${d.academicYear} academic year only`, { continued: true });
  doc.font(fReg).text(` (cannot be deferred).`, { lineGap: 2.5 });
  doc.moveDown(0.4);

  // ── Fee points with bold amounts, dates, bank details ──
  d.feePoints.forEach(({ num, text, data }) => {
    if (num === 1 && fees) {
      const totalFee = parseFloat(fees.total_fee);
      const bankInfo =
        `${fees.bank_account_name || 'WITHROW COLLEGE'} account; ` +
        `${fees.bank_name || 'GCB'} ACCOUNT NO: ${fees.bank_account_no || '6201130004574'}, ` +
        `${fees.bank_branch || 'AGONA BRANCH'}`;
      const academicYear = fees.academic_year || d.academicYear;

      doc.font(fReg).fontSize(9.5).fillColor(black);
      doc.text(`${num}.      Admission and tuition fees for your programme for the `, { continued: true, lineGap: 2.5 });
      doc.font(fBold).text(`${academicYear} academic year `, { continued: true });
      doc.font(fReg).text(`is `, { continued: true });
      doc.font(fBold).text(`${amountToWords(totalFee)} (${fmtGHS(totalFee)}) `, { continued: true });
      doc.font(fReg).text(`to be paid into the `, { continued: true });
      doc.font(fBold).text(bankInfo, { continued: true });
      doc.font(fReg).text(`.`, { lineGap: 2.5 });
    } else if (num === 2 && fees) {
      const totalFee = parseFloat(fees.total_fee);
      const pct = parseInt(fees.initial_payment_percent) || 70;
      const initialAmt = Math.round(totalFee * pct / 100 * 100) / 100;
      const balanceAmt = Math.round((totalFee - initialAmt) * 100) / 100;
      const initDL = `${fees.initial_payment_deadline || 'September 1'}, ${d.startYear}`;
      const balDL = `${fees.balance_payment_deadline || 'October 15'}, ${d.startYear}`;

      doc.font(fReg).fontSize(9.5).fillColor(black);
      doc.text(`${num}.      You are expected to confirm your acceptance of this offer by way of writing and payment of `, { continued: true, lineGap: 2.5 });
      doc.font(fBold).text(`${pct}% `, { continued: true });
      doc.font(fReg).text(`of the total fees which is `, { continued: true });
      doc.font(fBold).text(`${amountToWords(initialAmt)} (${fmtGHS(initialAmt)}) `, { continued: true });
      doc.font(fReg).text(`not later than `, { continued: true });
      doc.font(fBold).text(initDL, { continued: true });
      doc.font(fReg).text(` and the outstanding balance of `, { continued: true });
      doc.font(fBold).text(`${amountToWords(balanceAmt)} (${fmtGHS(balanceAmt)}) `, { continued: true });
      doc.font(fReg).text(`be paid by `, { continued: true });
      doc.font(fBold).text(balDL, { continued: true });
      doc.font(fReg).text(`.`, { lineGap: 2.5 });
    } else {
      doc.font(fReg).fontSize(9.5).fillColor(black)
        .text(`${num}.      ${text}`, { lineGap: 2.5 });
    }
    doc.moveDown(0.35);
  });

  // ── Conditions (plain text) ──
  d.conditions.forEach(({ num, text }) => {
    doc.font(fReg).fontSize(9.5).fillColor(black)
      .text(`${num}.      ${text}`, { lineGap: 2.5 });
    doc.moveDown(0.35);
  });

  doc.moveDown(0.3);
  doc.font(fBold).fontSize(10).fillColor(black).text('Congratulations');
  doc.moveDown(0.8);
  doc.font(fReg).fontSize(10).fillColor(black).text('Yours Sincerely');
  doc.moveDown(0.8);

  // ── Signature ──
  const sigY = doc.y;
  if (registrar.signaturePath) {
    try { doc.image(registrar.signaturePath, M, sigY, { fit: [130, 50] }); doc.y = sigY + 55; }
    catch {}
  } else { doc.moveDown(1.2); }

  doc.moveTo(M, doc.y).lineTo(M + 190, doc.y).lineWidth(0.5).strokeColor('#aaa').stroke();
  doc.moveDown(0.2);
  doc.font(fBold).fontSize(10).fillColor(navy).text(registrar.name);
  doc.font(fReg).fontSize(9).fillColor(grey).text(`(${registrar.title})`);
}

/* ══════════════════════════════════════════════════════════
   Generator: PDF template background (via pdf-lib embed)
   ══════════════════════════════════════════════════════════ */
async function generateWithPdfBackground(app, choices, fees, photoPath, bg, registrar) {
  const appId = app.application_id;
  const tmpPath = path.join(LETTERS_DIR, `${appId}-body.pdf`);
  const finalPath = path.join(LETTERS_DIR, `${appId}.pdf`);
  const rel = `uploads/admission-letters/${appId}.pdf`;

  // Step 1: Generate the letter body as a standalone PDF using PDFKit
  await new Promise((resolve, reject) => {
    const doc = new PDFDocumentKit({ size: 'A4', margin: 0 });
    const stream = fs.createWriteStream(tmpPath);
    doc.pipe(stream);
    writeBodyOnDoc(doc, app, choices, fees, photoPath, bg.contentStartY, 60, doc.page.width, registrar);
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  // Step 2: Merge template (background) + body using pdf-lib
  const templateBytes = fs.readFileSync(bg.path);
  const bodyBytes = fs.readFileSync(tmpPath);

  const templateDoc = await PDFDocument.load(templateBytes);
  const bodyDoc = await PDFDocument.load(bodyBytes);

  // Load template into a fresh doc — copyPages registers pages with the target doc
  const mergedDoc = await PDFDocument.load(templateBytes);

  // Get the first page of the merged doc (which is the template page)
  const bgPage = mergedDoc.getPage(0);
  const { width, height } = bgPage.getSize();

  // Embed the body PDF page and draw it transparently on top of the template
  const [embeddedBody] = await mergedDoc.embedPdf(bodyBytes, [0]);
  bgPage.drawPage(embeddedBody, { x: 0, y: 0, width, height });

  const mergedBytes = await mergedDoc.save();
  fs.writeFileSync(finalPath, mergedBytes);

  // Clean up temp file
  try { fs.unlinkSync(tmpPath); } catch {}

  console.log(`    [pdf-merge] Written: ${rel} (${Math.round(mergedBytes.length / 1024)} KB)`);
  return rel;
}

/* ══════════════════════════════════════════════════════════
   Generator: Image background (PNG/JPG letterhead)
   ══════════════════════════════════════════════════════════ */
async function generateWithImageBackground(app, choices, fees, photoPath, bg, registrar) {
  const appId = app.application_id;
  const filePath = path.join(LETTERS_DIR, `${appId}.pdf`);
  const rel = `uploads/admission-letters/${appId}.pdf`;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocumentKit({ size: 'A4', margin: 0 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const W = doc.page.width;

      // Full-page letterhead background
      try {
        doc.image(bg.path, 0, 0, { width: W, height: doc.page.height });
        console.log(`    [image-bg] Placed: ${path.basename(bg.path)}`);
      } catch (e) {
        console.error(`    [image-bg] Failed: ${e.message}`);
      }

      writeBodyOnDoc(doc, app, choices, fees, photoPath, bg.contentStartY, 60, W, registrar);

      doc.end();
      stream.on('finish', () => { console.log(`    [image-bg] Written: ${rel}`); resolve(rel); });
      stream.on('error', reject);
    } catch (err) { reject(err); }
  });
}

/* ══════════════════════════════════════════════════════════
   Generator: Built-in header (no te
   mplate)
   ══════════════════════════════════════════════════════════ */
async function generateFromCode(app, choices, fees, photoPath, registrar) {
  const appId = app.application_id;
  const filePath = path.join(LETTERS_DIR, `${appId}.pdf`);
  const rel = `uploads/admission-letters/${appId}.pdf`;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocumentKit({ size: 'A4', margin: 60 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const navy = '#0a2240', gold = '#c9a84c', grey = '#555';
      const W = doc.page.width, M = 60;

      doc.rect(0, 0, W, 5).fill(gold);
      doc.moveDown(1.2);
      doc.font(F_BOLD).fontSize(20).fillColor(navy).text('WITHROW COLLEGE', { align: 'center' });
      doc.font('Helvetica-Oblique').fontSize(10).fillColor(grey)
        .text('Integrity \u2022 Excellence \u2022 Innovation \u2022 Service', { align: 'center' });
      doc.font(F_REGULAR).fontSize(9).fillColor(grey)
        .text('(An Affiliate of University for Development Studies)', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(8)
        .text('Loc: Agona Asamang Road | P.O. Box 128, Agona-Ashanti | Tel: 0303969461 / 0535197436', { align: 'center' });
      doc.text('Email: admissions@wuc.edu.gh / info@wuc.edu.gh', { align: 'center' });
      doc.moveDown(0.6);
      doc.moveTo(M, doc.y).lineTo(W - M, doc.y).lineWidth(1).strokeColor(gold).stroke();
      doc.moveDown(0.6);

      writeBodyOnDoc(doc, app, choices, fees, photoPath, doc.y, M, W, registrar);

      doc.rect(0, doc.page.height - 5, W, 5).fill(gold);
      doc.end();
      stream.on('finish', () => { console.log(`    [code] Written: ${rel}`); resolve(rel); });
      stream.on('error', reject);
    } catch (err) { reject(err); }
  });
}

/* ══════════════════════════════════════════════════════════
   Main entry point
   ══════════════════════════════════════════════════════════ */
async function generateAdmissionLetter(application, programmeChoices = []) {
  console.log(`  Generating letter for ${application.application_id}...`);
  const photoPath = await findPassportPhoto(application.id);
  const fees = await lookupFees(application, programmeChoices);
  const registrar = getRegistrarSettings();
  const bg = getBackground();

  if (fees) {
    console.log(`    Fees: ${fees.programme_label} | ${fees.enrollment_option} | ${fees.application_type} | Total: ${fees.total_fee}`);
  } else {
    console.log(`    No fee structure found — fee points will be omitted`);
  }

  if (bg) {
    console.log(`    Background: ${path.basename(bg.path)} (type: ${bg.type}, contentStartY: ${bg.contentStartY})`);
    if (bg.type === 'pdf') {
      return generateWithPdfBackground(application, programmeChoices, fees, photoPath, bg, registrar);
    } else {
      return generateWithImageBackground(application, programmeChoices, fees, photoPath, bg, registrar);
    }
  }

  console.log(`    No background found, using built-in header`);
  return generateFromCode(application, programmeChoices, fees, photoPath, registrar);
}

module.exports = { generateAdmissionLetter, getTemplatePath, getRegistrarSettings, TEMPLATES_DIR };
