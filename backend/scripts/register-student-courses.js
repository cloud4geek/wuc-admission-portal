require('dotenv').config();
const { pool } = require('../config/database');

async function register() {
  try {
    const student = await pool.query("SELECT id FROM students WHERE student_id = 'WUC/RG/25/0001'");
    if (student.rows.length === 0) { console.log('Student not found'); await pool.end(); return; }
    const studentId = student.rows[0].id;

    const courses = await pool.query("SELECT id FROM courses WHERE programme_id = 'bsc-nursing' AND semester = 1 AND level = 100");
    let registered = 0;
    for (const c of courses.rows) {
      await pool.query(
        `INSERT INTO course_registrations (student_id, course_id, academic_year, semester) VALUES ($1, $2, '2025/2026', 1) ON CONFLICT DO NOTHING`,
        [studentId, c.id]
      );
      registered++;
    }
    console.log(`✅ Registered student WUC/RG/25/0001 for ${registered} courses (Sem 1, Level 100)`);
  } catch (err) { console.error('Error:', err.message); }
  finally { await pool.end(); }
}

register();
