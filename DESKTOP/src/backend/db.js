const { Pool } = require('pg');
require('dotenv').config();

console.log('🔧 Debug - Environment variables in db.js:');
console.log('DB_USER:', process.env.DB_USER || 'UNDEFINED');
console.log('DB_HOST:', process.env.DB_HOST || 'UNDEFINED');
console.log('DB_NAME:', process.env.DB_NAME || 'UNDEFINED');
console.log('DB_PORT:', process.env.DB_PORT || 'UNDEFINED');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'MISSING');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 6543, // Supabase Pooler port
  ssl: { rejectUnauthorized: false },
  max: 5, // limit connections to avoid overload
});

pool.on('error', (err) => {
  console.error('⚠️ Unexpected database error:', err.message);
});

(async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Connected to Supabase Pooler at:', res.rows[0].now);
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
})();

module.exports = pool;