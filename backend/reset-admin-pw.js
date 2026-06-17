require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./config/database');

async function run() {
  const NEW_PASSWORD = 'Admin@2026';
  const hash = await bcrypt.hash(NEW_PASSWORD, 10);
  
  await pool.query(
    'UPDATE admin_users SET password_hash=$1 WHERE email=$2',
    [hash, 'admin@wuc.edu.gh']
  );
  
  console.log('✅ Password reset for admin@wuc.edu.gh');
  console.log('   New password: ' + NEW_PASSWORD);
  pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
