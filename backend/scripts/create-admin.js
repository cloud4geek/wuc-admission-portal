/**
 * Create initial super admin user.
 * Run: node scripts/create-admin.js
 * 
 * Usage:
 *   node scripts/create-admin.js                          # Interactive prompts
 *   node scripts/create-admin.js admin@wuc.edu.gh Pa$$w0rd  # Command line args
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

async function createAdmin() {
  const email = process.argv[2] || 'admin@wuc.edu.gh';
  const password = process.argv[3] || 'WUC@Admin2025!';
  const username = process.argv[4] || 'admin';

  try {
    // Check if admin exists
    const existing = await pool.query('SELECT id FROM admin_users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log(`⚠️  Admin user with email ${email} already exists.`);
      process.exit(0);
    }

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      `INSERT INTO admin_users (username, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'super_admin', true)`,
      [username, email, hash]
    );

    console.log('');
    console.log('✅ Super admin created successfully!');
    console.log('   ─────────────────────────────────');
    console.log(`   Username: ${username}`);
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role:     super_admin`);
    console.log('');
    console.log('   🔐 Change this password immediately after first login.');
    console.log('');
  } catch (error) {
    console.error('❌ Failed to create admin:', error.message);
  } finally {
    await pool.end();
  }
}

createAdmin();
