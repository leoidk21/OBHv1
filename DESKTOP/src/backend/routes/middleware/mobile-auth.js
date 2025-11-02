const pool = require('../../db');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('🔐 AUTH MIDDLEWARE START');
    console.log('   Has token:', !!token);

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ error: 'Access token required' });
    }

    // ✅ VERIFY SUPABASE TOKEN
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('❌ Invalid Supabase token:', error?.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    console.log('✅ Supabase token verified for user:', user.id);

    // ✅ GET MOBILE USER DATA
    const userResult = await pool.query(
      `SELECT id, auth_uid, email, first_name, last_name 
       FROM mobile_users 
       WHERE auth_uid = $1`,
      [user.id]
    );

    if (userResult.rows.length === 0) {
      console.error('❌ User not found in mobile_users for UUID:', user.id);
      return res.status(404).json({ 
        error: 'User not found in database',
        details: 'Please contact support'
      });
    }

    const mobileUser = userResult.rows[0];
    
    console.log('✅ User authenticated:', {
      mobile_id: mobileUser.id,
      auth_uid: mobileUser.auth_uid,
      email: mobileUser.email
    });

    // ✅ Set BOTH IDs
    req.user = {
      id: mobileUser.auth_uid,        // UUID for notifications
      userId: mobileUser.auth_uid,    // UUID backup
      mobile_id: mobileUser.id,       // Integer for foreign keys
      email: mobileUser.email,
      firstName: mobileUser.first_name,
      lastName: mobileUser.last_name,
      type: 'mobile'
    };
    
    console.log('✅ req.user set:', {
      mobile_id: req.user.mobile_id,
      uuid: req.user.id.substring(0, 8) + '...',
      email: req.user.email
    });
    
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      details: error.message 
    });
  }
}

module.exports = { authenticateToken };