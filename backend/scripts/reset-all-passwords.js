require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

async function run() {
  const resets = [
    { email: 'admin@wuc.edu.gh', password: 'Admin@2026' },
    { email: '233cyber@gmail.com', password: 'Rahman@2026' },
    { email: 'cloud4geek@gmail.com', password: 'Rams360@2026' },
  ];

  for (const { email, password } of resets) {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'UPDATE admin_users SET password_hash=$1 WHERE email=$2 RETURNING email',
      [hash, email]
    );
    if (result.rows.length > 0) {
      console.log('✅', email, '→', password);
    } else {
      console.log('❌', email, '— not found in database');
    }
  }
  pool.end();
}
run().catch(e => { console.error('Error:', e.message); pool.end(); });
