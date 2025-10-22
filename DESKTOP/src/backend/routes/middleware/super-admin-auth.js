const jwt = require('jsonwebtoken');
const pool = require('../../db');

const JWT_SECRET = process.env.JWT_SECRET;

// Basic token authentication
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

// Verify user is Super Admin
function requireSuperAdmin(req, res, next) {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Access denied. Super Admin privileges required.' });
  }
  next();
}

// Verify user is Admin or Super Admin
function requireAdmin(req, res, next) {
  if (!['admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
}

// Log admin actions to audit log
async function logAction(adminId, action, targetPage, details = {}, ipAddress = null) {
  try {
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, target_page, details, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, action, targetPage, JSON.stringify(details), ipAddress]
    );
  } catch (err) {
    console.error('Error logging action:', err.message);
  }
}

// Middleware to automatically log actions
function auditLog(targetPage, action) {
  return async (req, res, next) => {
    // Store original res.json to intercept successful responses
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      // Only log if response is successful (status < 400)
      if (res.statusCode < 400) {
        const details = {
          method: req.method,
          path: req.path,
          body: req.body,
          query: req.query
        };
        
        const ipAddress = req.ip || req.connection.remoteAddress;
        
        logAction(
          req.user.id,
          action || `${req.method} ${targetPage}`,
          targetPage,
          details,
          ipAddress
        ).catch(err => console.error('Audit log failed:', err));
      }
      
      return originalJson(data);
    };
    
    next();
  };
}

module.exports = {
  authenticateToken,
  requireSuperAdmin,
  requireAdmin,
  logAction,
  auditLog
};