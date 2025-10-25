const { Pool } = require('pg');

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
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Connected to Supabase Session Pooler at:', res.rows[0].now);
  }
});

module.exports = pool;