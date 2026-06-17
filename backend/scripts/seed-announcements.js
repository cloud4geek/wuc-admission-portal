require('dotenv').config();
const { pool } = require('../config/database');

async function seed() {
  try {
    const announcements = [
      { title: 'Welcome to 2025/2026 Academic Year', content: 'All freshmen are expected to report on campus by September 8, 2025. Orientation begins September 9.', priority: 'important', target: 'all' },
      { title: 'Course Registration Open', content: 'Semester 1 course registration is now open. Please register your courses before September 15 to avoid late penalties.', priority: 'urgent', target: 'all' },
      { title: 'Library Hours', content: 'The university library is open Monday-Friday 8AM-8PM, Saturday 9AM-4PM. Students must present their ID cards.', priority: 'normal', target: 'all' },
    ];

    for (const a of announcements) {
      const existing = await pool.query('SELECT id FROM announcements WHERE title = $1', [a.title]);
      if (existing.rows.length === 0) {
        await pool.query(
          'INSERT INTO announcements (title, content, priority, target) VALUES ($1, $2, $3, $4)',
          [a.title, a.content, a.priority, a.target]
        );
      }
    }
    console.log('✅ Announcements seeded');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
