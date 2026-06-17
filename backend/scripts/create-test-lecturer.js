/**
 * Creates a test lecturer and assigns them courses.
 * Run: node scripts/create-test-lecturer.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

async function create() {
  try {
    // Check if lecturer exists
    const existing = await pool.query("SELECT id FROM lecturers WHERE staff_id = 'WUC/LEC/001'");
    if (existing.rows.length > 0) {
      console.log('');
      console.log('⚠️  Test lecturer already exists.');
      console.log('   Staff ID: WUC/LEC/001');
      console.log('   Password: Lecturer@2025');
      console.log('');
      await pool.end();
      return;
    }

    const hash = await bcrypt.hash('Lecturer@2025', 12);
    const result = await pool.query(
      `INSERT INTO lecturers (staff_id, first_name, last_name, email, phone, department, title, password_hash)
       VALUES ('WUC/LEC/001', 'Adwoa', 'Mensah', 'a.mensah@wuc.edu.gh', '+233201234567', 'Nursing Sciences', 'Dr.', $1)
       RETURNING id`,
      [hash]
    );
    const lecturerId = result.rows[0].id;

    // Assign all BSc Nursing Semester 1 courses to this lecturer
    const courses = await pool.query(
      "SELECT id FROM courses WHERE programme_id = 'bsc-nursing' AND semester = 1 AND level = 100"
    );

    for (const course of courses.rows) {
      await pool.query(
        `INSERT INTO lecturer_courses (lecturer_id, course_id, academic_year, semester) VALUES ($1, $2, '2025/2026', 1) ON CONFLICT DO NOTHING`,
        [lecturerId, course.id]
      );
    }

    console.log('');
    console.log('✅ Test lecturer created!');
    console.log('   ────────────────────────────');
    console.log('   Staff ID:    WUC/LEC/001');
    console.log('   Password:    Lecturer@2025');
    console.log('   Name:        Dr. Adwoa Mensah');
    console.log('   Department:  Nursing Sciences');
    console.log(`   Courses:     ${courses.rows.length} assigned (BSc Nursing Sem 1)`);
    console.log('');
    console.log('   Login at: http://localhost:3000/lecturer/login');
    console.log('');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

create();
