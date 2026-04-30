/**
 * Debug: trace exactly why the photo isn't appearing in the PDF.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { generateAdmissionLetter } = require('../services/admissionLetterService');

async function debug() {
  // 1. Get the application with a photo
  const appResult = await pool.query(
    "SELECT * FROM applications WHERE application_id = 'APP570026'"
  );
  const app = appResult.rows[0];
  console.log('Application:', app.application_id, 'UUID:', app.id);

  // 2. Check documents table
  const docsResult = await pool.query(
    "SELECT * FROM documents WHERE application_id = $1",
    [app.id]
  );
  console.log('\nDocuments in DB:', docsResult.rows.length);
  docsResult.rows.forEach(d => {
    console.log('  Type:', d.document_type);
    console.log('  Path:', d.file_path);
    const abs = path.resolve(path.join(__dirname, '..', d.file_path));
    console.log('  Absolute:', abs);
    console.log('  Exists:', fs.existsSync(abs));
  });

  // 3. Test findPassportPhoto directly
  // Import the function by requiring the module
  const svc = require('../services/admissionLetterService');
  // The function is not exported, so let me just replicate the logic
  const photoDoc = docsResult.rows.find(d => d.document_type === 'photo');
  if (photoDoc) {
    const rel = photoDoc.file_path;
    const abs = path.join(__dirname, '..', rel);
    console.log('\nPhoto path resolution:');
    console.log('  Relative from DB:', rel);
    console.log('  __dirname:', __dirname);
    console.log('  path.join(__dirname, "..", rel):', abs);
    console.log('  Resolved:', path.resolve(abs));
    console.log('  Exists:', fs.existsSync(abs));
    console.log('  Exists (resolved):', fs.existsSync(path.resolve(abs)));
    
    // Try reading the file
    try {
      const stats = fs.statSync(abs);
      console.log('  File size:', stats.size, 'bytes');
      console.log('  Is file:', stats.isFile());
    } catch (e) {
      console.log('  Stat error:', e.message);
    }
  }

  // 4. Get programme choices
  const choices = await pool.query(
    "SELECT * FROM programme_choices WHERE application_id = $1 ORDER BY preference",
    [app.id]
  );
  console.log('\nProgramme choices:', choices.rows.length);

  // 5. Generate the PDF
  console.log('\nGenerating PDF...');
  try {
    const letterPath = await generateAdmissionLetter(app, choices.rows);
    console.log('Generated:', letterPath);
    
    // Check the PDF size
    const pdfPath = path.join(__dirname, '..', letterPath);
    const pdfStats = fs.statSync(pdfPath);
    console.log('PDF size:', pdfStats.size, 'bytes');
    console.log('PDF size:', Math.round(pdfStats.size / 1024), 'KB');
  } catch (e) {
    console.error('Generation error:', e.message);
    console.error(e.stack);
  }

  await pool.end();
}

debug();
