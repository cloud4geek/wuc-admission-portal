require('dotenv').config();
const { pool } = require('../config/database');

async function seedFee() {
  try {
    const existing = await pool.query(
      "SELECT id FROM programme_fees WHERE programme_id='bsc-nursing' AND application_type='regular' AND enrollment_option='Regular'"
    );
    if (existing.rows.length > 0) {
      console.log('✅ Fee structure already exists for BSc Nursing (Regular)');
    } else {
      await pool.query(`
        INSERT INTO programme_fees (
          programme_id, programme_label, application_type, enrollment_option,
          tuition_fee, facility_fee, library_fee, ict_fee, examination_fee, registration_fee,
          duration_years, bank_name, bank_branch, bank_account_no, bank_account_name,
          initial_payment_percent, initial_payment_deadline, balance_payment_deadline, programme_start_date
        ) VALUES (
          'bsc-nursing', 'BSc Nursing', 'regular', 'Regular',
          8500, 1200, 500, 800, 600, 400,
          4, 'GCB BANK', 'AGONA BRANCH', '6201130004574', 'WITHROW COLLEGE',
          70, 'September 1, 2025', 'October 15, 2025', 'September 8, 2025'
        )
      `);
      console.log('✅ Fee structure created for BSc Nursing (Regular)');
      console.log('   Total: GHS 12,000');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

seedFee();
