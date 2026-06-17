require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false
});

console.log('Testing connection with:');
console.log('Host:', process.env.DB_HOST);
console.log('Port:', process.env.DB_PORT);
console.log('Database:', process.env.DB_NAME);
console.log('User:', process.env.DB_USER);
console.log('Password:', process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-3) : 'NOT SET');

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('Error code:', err.code);
  } else {
    console.log('✅ Connection successful!');
    console.log('Server time:', res.rows[0].now);
  }
  pool.end();
});
