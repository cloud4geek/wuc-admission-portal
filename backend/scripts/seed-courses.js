/**
 * Seeds sample courses for BSc Nursing programme.
 * Run: node scripts/seed-courses.js
 */
require('dotenv').config();
const { pool } = require('../config/database');

const courses = [
  // Level 100, Semester 1
  { code: 'NUR 101', title: 'Fundamentals of Nursing I', credits: 3, level: 100, semester: 1, type: 'core', lecturer: 'Dr. Adwoa Mensah' },
  { code: 'ANA 101', title: 'Human Anatomy I', credits: 4, level: 100, semester: 1, type: 'core', lecturer: 'Prof. K. Asante' },
  { code: 'PHY 101', title: 'Human Physiology I', credits: 3, level: 100, semester: 1, type: 'core', lecturer: 'Dr. Emmanuel Boateng' },
  { code: 'BIO 101', title: 'Biochemistry for Health Sciences', credits: 3, level: 100, semester: 1, type: 'core', lecturer: 'Mrs. Grace Owusu' },
  { code: 'ENG 101', title: 'Communication Skills I', credits: 2, level: 100, semester: 1, type: 'elective', lecturer: 'Mr. Francis Adjei' },
  { code: 'ICT 101', title: 'Introduction to ICT', credits: 2, level: 100, semester: 1, type: 'elective', lecturer: 'Mr. Daniel Quaye' },
  // Level 100, Semester 2
  { code: 'NUR 102', title: 'Fundamentals of Nursing II', credits: 3, level: 100, semester: 2, type: 'core', lecturer: 'Dr. Adwoa Mensah' },
  { code: 'ANA 102', title: 'Human Anatomy II', credits: 4, level: 100, semester: 2, type: 'core', lecturer: 'Prof. K. Asante' },
  { code: 'PHY 102', title: 'Human Physiology II', credits: 3, level: 100, semester: 2, type: 'core', lecturer: 'Dr. Emmanuel Boateng' },
  { code: 'MIC 102', title: 'Microbiology for Nurses', credits: 3, level: 100, semester: 2, type: 'core', lecturer: 'Dr. Rita Amponsah' },
  { code: 'PSY 102', title: 'Introduction to Psychology', credits: 2, level: 100, semester: 2, type: 'elective', lecturer: 'Dr. Samuel Tetteh' },
  { code: 'SOC 102', title: 'Sociology of Health', credits: 2, level: 100, semester: 2, type: 'elective', lecturer: 'Mrs. Abena Darko' },
];

async function seed() {
  try {
    let created = 0;
    for (const c of courses) {
      const existing = await pool.query('SELECT id FROM courses WHERE course_code = $1', [c.code]);
      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO courses (course_code, course_title, credit_hours, programme_id, semester, level, course_type, lecturer)
           VALUES ($1, $2, $3, 'bsc-nursing', $4, $5, $6, $7)`,
          [c.code, c.title, c.credits, c.semester, c.level, c.type, c.lecturer]
        );
        created++;
      }
    }
    console.log(`✅ Seeded ${created} courses for BSc Nursing (${courses.length - created} already existed)`);

    // Seed timetable for Semester 1
    const sem1Courses = await pool.query("SELECT id, course_code FROM courses WHERE programme_id='bsc-nursing' AND semester=1 AND level=100");
    const timetableSlots = [
      { day: 'Monday', start: '08:00', end: '10:00', venue: 'Lecture Hall A' },
      { day: 'Monday', start: '10:30', end: '12:30', venue: 'Lab 1' },
      { day: 'Tuesday', start: '08:00', end: '10:00', venue: 'Lecture Hall B' },
      { day: 'Tuesday', start: '14:00', end: '16:00', venue: 'Lecture Hall A' },
      { day: 'Wednesday', start: '08:00', end: '10:00', venue: 'Skills Lab' },
      { day: 'Thursday', start: '10:00', end: '12:00', venue: 'ICT Lab' },
    ];
    
    let ttCreated = 0;
    for (let i = 0; i < Math.min(sem1Courses.rows.length, timetableSlots.length); i++) {
      const course = sem1Courses.rows[i];
      const slot = timetableSlots[i];
      const existing = await pool.query(
        "SELECT id FROM timetable WHERE course_id=$1 AND day_of_week=$2 AND academic_year='2025/2026'",
        [course.id, slot.day]
      );
      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO timetable (course_id, programme_id, level, semester, academic_year, day_of_week, start_time, end_time, venue)
           VALUES ($1, 'bsc-nursing', 100, 1, '2025/2026', $2, $3, $4, $5)`,
          [course.id, slot.day, slot.start, slot.end, slot.venue]
        );
        ttCreated++;
      }
    }
    console.log(`✅ Seeded ${ttCreated} timetable entries`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
