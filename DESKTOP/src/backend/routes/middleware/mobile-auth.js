const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const pool = require('../../db');

const JWT_SECRET = process.env.JWT_SECRET; 

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function authenticateSupabaseToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Find the user in your mobile_users table by Supabase UUID
    const result = await pool.query(
      'SELECT * FROM mobile_users WHERE supabase_uuid = $1',
      [user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    req.user = {
      id: result.rows[0].id,
      supabase_uuid: user.id,
      email: user.email,
      ...result.rows[0]
    };
    
    next();
  } catch (err) {
    console.error('Supabase auth error:', err);
    return res.status(403).json({ error: 'Authentication failed' });
  }
}

// Keep your existing JWT auth for backward compatibility
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Check if it's a Supabase token (longer) or your JWT token
  if (token.length > 100) {
    // Likely a Supabase token - use Supabase auth
    return authenticateSupabaseToken(req, res, next);
  }

  // Your existing JWT auth
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
}

// THIS WAS MISSING - Export the function!
module.exports = { authenticateToken, authenticateSupabaseToken };