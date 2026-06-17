/**
 * Creates a test student account for development/demo purposes.
 * Run: node scripts/create-test-student.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

async function createTestStudent() {
  try {
    // First create a dummy application (required by foreign key)
    const existingApp = await pool.query(
      "SELECT id FROM applications WHERE application_id = 'APP-DEMO-001'"
    );

    let appId;
    if (existingApp.rows.length > 0) {
      appId = existingApp.rows[0].id;
    } else {
      const appResult = await pool.query(`
        INSERT INTO applications (
          application_id, application_type, first_name, last_name,
          date_of_birth, gender, nationality, hometown, postal_address,
          email, phone, enrollment_option, status, reviewed_at
        ) VALUES (
          'APP-DEMO-001', 'regular', 'John', 'Mensah',
          '2000-05-15', 'Male', 'Ghanaian', 'Kumasi', 'P.O. Box 123, Kumasi',
          'john.mensah@example.com', '+233241234567', 'Regular', 'approved', NOW()
        ) RETURNING id
      `);
      appId = appResult.rows[0].id;

      // Add programme choice
      await pool.query(`
        INSERT INTO programme_choices (application_id, programme_id, programme_label, preference)
        VALUES ($1, 'bsc-nursing', 'BSc Nursing', 1)
      `, [appId]);
    }

    // Check if student already exists
    const existing = await pool.query("SELECT student_id FROM students WHERE student_id = 'WUC/RG/25/0001'");
    if (existing.rows.length > 0) {
      console.log('');
      console.log('⚠️  Test student already exists!');
      console.log('   Student ID: WUC/RG/25/0001');
      console.log('   Password:   Student@123');
      console.log('');
      await pool.end();
      return;
    }

    // Create student account
    const password = 'Student@123';
    const hash = await bcrypt.hash(password, 10);

    await pool.query(`
      INSERT INTO students (
        student_id, application_id, first_name, last_name,
        email, phone, date_of_birth, gender, nationality, hometown, postal_address,
        programme_id, programme_label, enrollment_option, application_type,
        password_hash, must_change_password, status
      ) VALUES (
        'WUC/RG/25/0001', $1, 'John', 'Mensah',
        'john.mensah@example.com', '+233241234567', '2000-05-15', 'Male',
        'Ghanaian', 'Kumasi', 'P.O. Box 123, Kumasi',
        'bsc-nursing', 'BSc Nursing', 'Regular', 'regular',
        $2, false, 'active'
      )
    `, [appId, hash]);

    console.log('');
    console.log('✅ Test student account created!');
    console.log('   ─────────────────────────────────');
    console.log('   Student ID: WUC/RG/25/0001');
    console.log('   Password:   Student@123');
    console.log('   Name:       John Mensah');
    console.log('   Programme:  BSc Nursing (Regular)');
    console.log('');
    console.log('   Login at: http://localhost:3000/student/login');
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createTestStudent();
