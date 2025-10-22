const jwt = require('jsonwebtoken');
const pool = require('../../db');

const JWT_SECRET = process.env.JWT_SECRET;

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
}

async function getMobileUser(userId = null) {
    const result = await pool.query(
      `SELECT first_name, last_name
       FROM mobile_users
       WHERE id = $1`,
      [userId]
    );
    return result.rows[0];
}

module.exports = { authenticateToken, getMobileUser };