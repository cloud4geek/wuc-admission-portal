const { Pool } = require('pg');

const passwords = ['postgres', 'admin', '123456', 'root', '', 'password'];

async function testPassword(password) {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: password,
    ssl: false
  });

  try {
    await pool.query('SELECT 1');
    console.log(`✅ SUCCESS! Password is: "${password}"`);
    pool.end();
    return true;
  } catch (err) {
    pool.end();
    return false;
  }
}

(async () => {
  console.log('Testing common passwords...\n');
  
  for (const pwd of passwords) {
    const display = pwd === '' ? '(empty string)' : pwd;
    process.stdout.write(`Testing "${display}"... `);
    const success = await testPassword(pwd);
    if (success) {
      console.log('\n\n⚠️ Update your .env file with: DB_PASSWORD=' + pwd);
      process.exit(0);
    } else {
      console.log('❌');
    }
  }
  
  console.log('\n❌ None of the common passwords worked.');
  console.log('\nYou need to reset your PostgreSQL password:');
  console.log('1. Find PostgreSQL in Windows Services and note the data directory');
  console.log('2. Or reinstall PostgreSQL and remember the password you set');
})();
