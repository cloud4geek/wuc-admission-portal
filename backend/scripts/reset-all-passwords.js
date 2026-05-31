require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

async function run() {
  const users = [
    { username: 'admin', email: 'admin@wuc.edu.gh', password: 'Admin@2026', role: 'super_admin' },
    { username: 'rahman', email: '233cyber@gmail.com', password: 'Rahman@2026', role: 'admin' },
    { username: 'rAms360', email: 'cloud4geek@gmail.com', password: 'Rams360@2026', role: 'super_admin' },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query(
      `INSERT INTO admin_users (username, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $3, username = $1, role = $4`,
      [u.username, u.email, hash, u.role]
    );
    console.log('✅', u.email, '→', u.password, `(${u.role})`);
  }
  pool.end();
}
run().catch(e => { console.error('Error:', e.message); pool.end(); });
