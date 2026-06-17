require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

async function create() {
  try {
    const staffId = 'WUC/STF/001';
    const password = 'Staff@2025';
    const existing = await pool.query('SELECT id FROM lecturers WHERE staff_id = $1', [staffId]);
    if (existing.rows.length > 0) {
      // Reset password
      const hash = await bcrypt.hash(password, 12);
      await pool.query('UPDATE lecturers SET password_hash = $1 WHERE staff_id = $2', [hash, staffId]);
      console.log('\n⚠️  Staff account already exists — password reset.\n');
    } else {
      const hash = await bcrypt.hash(password, 12);
      await pool.query(
        `INSERT INTO lecturers (staff_id, first_name, last_name, email, phone, department, title, password_hash)
         VALUES ($1, 'rAms', 'Admin', 'staff@wuc.edu.gh', '+233551234567', 'ICT Department', 'Mr.', $2)`,
        [staffId, hash]
      );
    }

    // Assign all courses to this staff
    const lecturer = await pool.query('SELECT id FROM lecturers WHERE staff_id = $1', [staffId]);
    const lecturerId = lecturer.rows[0].id;
    const courses = await pool.query('SELECT id FROM courses');
    for (const c of courses.rows) {
      await pool.query(
        `INSERT INTO lecturer_courses (lecturer_id, course_id, academic_year, semester)
         VALUES ($1, $2, '2025/2026', 1) ON CONFLICT DO NOTHING`,
        [lecturerId, c.id]
      );
      await pool.query(
        `INSERT INTO lecturer_courses (lecturer_id, course_id, academic_year, semester)
         VALUES ($1, $2, '2025/2026', 2) ON CONFLICT DO NOTHING`,
        [lecturerId, c.id]
      );
    }

    console.log('');
    console.log('✅ Your staff account is ready!');
    console.log('   ─────────────────────────────');
    console.log(`   Staff ID:    ${staffId}`);
    console.log(`   Password:    ${password}`);
    console.log('   Name:        Mr. rAms Admin');
    console.log('   Department:  ICT Department');
    console.log(`   Courses:     ${courses.rows.length} assigned (all)`);
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
