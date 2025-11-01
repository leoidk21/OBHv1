const jwt = require('jsonwebtoken');
const pool = require('../../db');
const supabase = require('../../supabase');

const JWT_SECRET = process.env.JWT_SECRET;

// Enhanced token authentication with role fetching
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    // ✅ Validate Supabase token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(403).json({ error: 'Invalid or expired Supabase token' });

    req.user = user;

    // ✅ Fetch the admin profile and role
    const { data: profile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('role, status, id, first_name, last_name, email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: 'User profile not found' });
    }

    req.user.role = profile.role;
    req.user.status = profile.status;

    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Updated role verification (support both naming conventions)
function requireSuperAdmin(req, res, next) {
  const userRole = req.user.role?.toLowerCase();
  if (!['superadmin', 'super_admin'].includes(userRole)) {
    return res.status(403).json({ 
      error: 'Access denied. Super Admin privileges required.',
      userRole: userRole,
      required: 'superadmin or super_admin'
    });
  }
  next();
}

function requireAdmin(req, res, next) {
  const userRole = req.user.role?.toLowerCase();
  const allowedRoles = ['admin', 'superadmin', 'super_admin'];
  
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({ 
      error: 'Access denied. Admin privileges required.',
      userRole: userRole,
      required: 'admin, superadmin, or super_admin'
    });
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