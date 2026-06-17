require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

async function resetAdmin() {
  const email = 'admin@wuc.edu.gh';
  const newPassword = 'Admin@2025';
  try {
    const hash = await bcrypt.hash(newPassword, 12);
    const result = await pool.query(
      'UPDATE admin_users SET password_hash = $1 WHERE email = $2 RETURNING username, email, role',
      [hash, email]
    );
    if (result.rows.length === 0) {
      console.log('No admin found with that email.');
    } else {
      const admin = result.rows[0];
      console.log('');
      console.log('✅ Admin password reset!');
      console.log('   ─────────────────────────────');
      console.log(`   Email:    ${admin.email}`);
      console.log(`   Username: ${admin.username}`);
      console.log(`   Password: ${newPassword}`);
      console.log(`   Role:     ${admin.role}`);
      console.log('');
      console.log('   Login at: http://localhost:3000/admin/login');
      console.log('');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

resetAdmin();
