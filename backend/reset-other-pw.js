require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./config/database');

async function run() {
  const resets = [
    { email: '233cyber@gmail.com', password: 'Rahman@2026' },
    { email: 'cloud4geek@gmail.com', password: 'Rams360@2026' },
  ];

  for (const { email, password } of resets) {
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE admin_users SET password_hash=$1 WHERE email=$2', [hash, email]);
    console.log(`✅ ${email} → ${password}`);
  }
  pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
