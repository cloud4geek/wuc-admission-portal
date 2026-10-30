// Admission letter reference number: WUC/APP/<3-digit sequence><2-digit application year>
// e.g. WUC/APP/00126  (1st applicant of 2026), WUC/APP/00226, ...
//
// The sequence is SEQUENTIAL per calendar year (resets each year) and is
// generated ONCE per applicant, then stored in applications.reference_no so it
// stays stable across letter regenerations and matches any QR verification.
const { pool } = require('./config/database');

function twoDigitYear(dateLike) {
  const d = dateLike ? new Date(dateLike) : new Date();
  const y = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
  return String(y).slice(-2);
}

/**
 * Compute the next 3-digit sequence for a given 2-digit year by looking at the
 * highest sequence already assigned to references ending in that year.
 * Reference format: WUC/APP/<seq(3)><yy(2)>  — so the seq is chars 8..-2.
 */
async function nextSequenceForYear(yy) {
  // Pull all references for this year and find the max leading sequence.
  const r = await pool.query(
    `SELECT reference_no FROM applications
      WHERE reference_no LIKE $1`,
    [`WUC/APP/%${yy}`]
  );
  let max = 0;
  for (const row of r.rows) {
    const ref = row.reference_no || '';
    // Strip prefix "WUC/APP/" then drop the trailing 2 year digits
    const digits = ref.replace('WUC/APP/', '');
    // Only count NEW-format refs whose sequence portion is exactly 3 digits.
    // Legacy 5-digit references (e.g. WUC/APP/5011926) are ignored so the new
    // sequential series starts cleanly at 001 and stays 3 digits.
    if (digits.length === 5 && digits.endsWith(yy)) {
      const seqPart = digits.slice(0, 3); // exactly 3 sequence digits
      const n = parseInt(seqPart, 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return max + 1;
}

/**
 * Returns the applicant's stored reference_no, generating & persisting a unique
 * sequential one on first use. Uses the application's created_at for the year.
 * @param {object} application - row from applications (must have id; created_at optional)
 * @returns {Promise<string>} e.g. "WUC/APP/00126"
 */
async function getOrCreateReferenceNo(application) {
  // Reuse if already assigned on the in-memory object
  if (application.reference_no) return application.reference_no;

  // Re-read from DB in case it was set after the row was loaded
  try {
    const existing = await pool.query(
      'SELECT reference_no FROM applications WHERE id = $1',
      [application.id]
    );
    if (existing.rows[0] && existing.rows[0].reference_no) {
      return existing.rows[0].reference_no;
    }
  } catch (e) {
    throw new Error('reference_no column not available: ' + e.message);
  }

  const yy = twoDigitYear(application.created_at);

  // Try up to 50 times: compute next sequence, attempt atomic assignment.
  // The UNIQUE constraint on reference_no is the final guard against races.
  for (let attempt = 0; attempt < 50; attempt++) {
    const seq = await nextSequenceForYear(yy);
    const seqStr = String(seq).padStart(3, '0');
    const candidate = `WUC/APP/${seqStr}${yy}`;

    try {
      const res = await pool.query(
        `UPDATE applications
            SET reference_no = $1
          WHERE id = $2
            AND reference_no IS NULL
            AND NOT EXISTS (SELECT 1 FROM applications WHERE reference_no = $1)
        RETURNING reference_no`,
        [candidate, application.id]
      );
      if (res.rows[0] && res.rows[0].reference_no) {
        return res.rows[0].reference_no;
      }
      // No row returned — either set concurrently, or candidate taken.
      const recheck = await pool.query(
        'SELECT reference_no FROM applications WHERE id = $1',
        [application.id]
      );
      if (recheck.rows[0] && recheck.rows[0].reference_no) {
        return recheck.rows[0].reference_no;
      }
      // else: candidate collided with a concurrent insert — loop, recompute seq
    } catch (e) {
      if (e.code === '23505') continue; // unique violation race — retry
      throw e;
    }
  }
  throw new Error('Could not generate a unique reference number after 50 attempts');
}

module.exports = { getOrCreateReferenceNo };
