const jwt = require('jsonwebtoken');
const pool = require('../../db');

const JWT_SECRET = process.env.JWT_SECRET; 

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    // Ensure this is a mobile token, not admin
    if (user.type !== 'mobile') {
      return res.status(403).json({ error: 'Invalid token type for mobile app' });
    }
    
    req.user = user;
    next();
  });
}

// ADD THIS LINE - YOU'RE MISSING THE EXPORT!
module.exports = { authenticateToken };