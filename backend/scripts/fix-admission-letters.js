/**
 * Generates admission letter PDFs for all approved applications
 * that don't have a valid PDF file yet.
 * Run: node scripts/fix-admission-letters.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('../config/database');
const { generateAdmissionLetter } = require('../services/admissionLetterService');

async function fix() {
  const result = await pool.query(
    `SELECT a.*,
            json_agg(pc ORDER BY pc.preference) FILTER (WHERE pc.id IS NOT NULL) as progs
     FROM applications a
     LEFT JOIN programme_choices pc ON pc.application_id = a.id
     WHERE a.status = 'approved'
     GROUP BY a.id`
  );

  console.log(`Found ${result.rows.length} approved application(s)\n`);

  for (const app of result.rows) {
    try {
      const letterPath = await generateAdmissionLetter(app, app.progs || []);
      const url = `http://localhost:${process.env.PORT || 5000}/${letterPath}`;
      await pool.query('UPDATE applications SET admission_letter_url = $1 WHERE id = $2', [url, app.id]);
      console.log(`✅ ${app.application_id} → ${letterPath}`);
    } catch (err) {
      console.error(`❌ ${app.application_id}: ${err.message}`);
    }
  }

  await pool.end();
  console.log('\nDone.');
}

fix();
