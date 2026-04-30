/**
 * Seeds the database with test data for local testing.
 * Run: node scripts/seed-test-data.js
 *
 * Creates:
 *  - Admin user:  admin@wuc.edu.gh / Admin@WUC2025
 *  - Test vouchers: WUC-TEST-001 (unused), WUC-TEST-002 (unused), WUC-TEST-003 (used)
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('SET search_path TO wuc, public');
    console.log('🌱 Seeding test data...\n');

    // 1. Admin user
    const adminPassword = 'Admin@WUC2025';
    const hash = await bcrypt.hash(adminPassword, 10);

    await client.query(`
      INSERT INTO admin_users (username, email, password_hash, role, is_active)
      VALUES ('admin', 'admin@wuc.edu.gh', $1, 'super_admin', true)
      ON CONFLICT (email) DO UPDATE SET password_hash = $1
    `, [hash]);
    console.log('✅ Admin user created/updated');
    console.log(`   Email:    admin@wuc.edu.gh`);
    console.log(`   Password: ${adminPassword}\n`);

    // 2. Test vouchers
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    for (const v of [
      { code: 'WUC-TEST-001', first: 'Test', last: 'Regular', email: 'test.regular@example.com', phone: '+233241000001', status: 'unused' },
      { code: 'WUC-TEST-002', first: 'Test', last: 'TopUp',   email: 'test.topup@example.com',   phone: '+233241000002', status: 'unused' },
      { code: 'WUC-TEST-003', first: 'Test', last: 'Used',    email: 'test.used@example.com',    phone: '+233241000003', status: 'used' },
    ]) {
      await client.query(`
        INSERT INTO vouchers (voucher_code, first_name, last_name, email, phone, payment_method, amount, status, expires_at)
        VALUES ($1, $2, $3, $4, $5, 'mtn', 220, $6, $7)
        ON CONFLICT (voucher_code) DO UPDATE SET status = $6, expires_at = $7
      `, [v.code, v.first, v.last, v.email, v.phone, v.status, expires]);
      console.log(`✅ Voucher ${v.code} (${v.status})`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('🧪 TEST SCENARIOS:');
    console.log('='.repeat(50));
    console.log('');
    console.log('1. VOUCHER PURCHASE');
    console.log('   → Go to /purchase-voucher');
    console.log('   → Fill form, payment is simulated in dev mode');
    console.log('   → You\'ll get a voucher code on screen');
    console.log('');
    console.log('2. REGULAR APPLICATION (valid voucher)');
    console.log('   → Go to /apply');
    console.log('   → Use voucher: WUC-TEST-001');
    console.log('   → Complete all steps and submit');
    console.log('');
    console.log('3. TOP-UP APPLICATION (valid voucher)');
    console.log('   → Go to /apply-topup');
    console.log('   → Use voucher: WUC-TEST-002');
    console.log('   → Complete all steps and submit');
    console.log('');
    console.log('4. INVALID VOUCHER');
    console.log('   → Use code: INVALID-CODE');
    console.log('   → Should get "Invalid, already used, or expired" error');
    console.log('');
    console.log('5. USED VOUCHER');
    console.log('   → Use code: WUC-TEST-003');
    console.log('   → Should get "Invalid, already used, or expired" error');
    console.log('');
    console.log('6. APPLICATION STATUS');
    console.log('   → Go to /application-status');
    console.log('   → Search by the Application ID you got after submitting');
    console.log('');
    console.log('7. ADMIN DASHBOARD');
    console.log('   → Go to /admin/login (add this route or navigate directly)');
    console.log('   → Email: admin@wuc.edu.gh');
    console.log('   → Password: Admin@WUC2025');
    console.log('   → View applications, approve/reject, filter by type');
    console.log('');
    console.log('8. EMAILS & SMS');
    console.log('   → In dev mode, all emails/SMS print to the backend console');
    console.log('   → Look for 📧 [DEV EMAIL] and 📱 [DEV SMS] lines');
    console.log('');
    console.log('='.repeat(50));
    console.log('🚀 Ready! Start backend: npm run dev');
    console.log('🚀 Start frontend: npm start (in frontend/)');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Seed failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
