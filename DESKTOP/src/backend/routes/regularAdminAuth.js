const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const supabase = require('../supabase');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// Helper: generate JWT
function generateToken(admin) {
  return jwt.sign(
    { 
      id: admin.id, 
      email: admin.email,
      role: admin.role
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}


// --- Nodemailer Transporter ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

  debug: true,
  logger: true
});

// --- SIGNUP ---
// In regularAdminAuth.js - UPDATE SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    // CREATE USER IN SUPABASE AUTH FIRST
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone: phone
      }
    });

    if (authError) throw authError;

    // THEN CREATE IN ADMINS TABLE
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .insert({
        id: authData.user.id, // Use Supabase Auth user ID
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
        password_hash: 'temp_hash_need_to_fix',
        role: 'admin',
        status: 'pending'
      })
      .select();

    if (adminError) throw adminError;

    res.status(201).json({ 
      message: "Account created successfully.", 
      admin: adminData[0] 
    });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// --- USE THIS SINGLE LOGIN ROUTE ---
// REPLACE your current login route with this:
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔑 Login attempt for:', email);

    // 1. Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email, 
      password
    });

    if (authError) {
      console.log('❌ Auth failed:', authError.message);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log('✅ Supabase auth successful');

    // 2. Get admin profile
    const { data: profile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      console.log('❌ Profile not found');
      await supabase.auth.signOut();
      return res.status(403).json({ error: "Admin profile not found" });
    }

    // 3. Check approval status
    if (profile.role !== 'superadmin' && profile.status !== 'approved') {
      await supabase.auth.signOut();
      return res.status(403).json({ error: "Account pending approval" });
    }

    // 4. ✅ CRITICAL: Generate YOUR custom JWT token
    const tokenPayload = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      status: profile.status,
      first_name: profile.first_name,
      last_name: profile.last_name
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });

    console.log('🎫 Custom JWT generated for:', profile.role);

    // 5. Return token to frontend
    res.json({
      success: true,
      token: token, // ⚠️ THIS IS WHAT YOUR MIDDLEWARE EXPECTS
      user: tokenPayload
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- FORGOT PASSWORD ---
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // Check if admin exists using Supabase
    const { data, error } = await supabase
      .from('admins')
      .select('id')
      .eq('email', email)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: "No account with that email." });
    }

    // Generate 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Save to DB using Supabase
    const { error: updateError } = await supabase
      .from('admins')
      .update({
        reset_token: code,
        reset_expires: expires.toISOString()
      })
      .eq('email', email);

    if (updateError) throw updateError;

    // Send email with code (your existing email code here)
    // ...

    res.json({ message: "Verification code sent to your email." });
  } catch (err) {
    console.error("Forgot password error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
});

// --- VERIFY CODE ---
router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;

  try {
    const result = await pool.query(
      "SELECT reset_token, reset_expires FROM admins WHERE email=$1",
      [email]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });

    const user = result.rows[0];
    if (user.reset_token !== code) return res.status(400).json({ error: "Invalid code" });
    if (new Date(user.reset_expires) < new Date()) {
      return res.status(400).json({ error: "Code expired" });
    }

    res.json({ message: "Code verified" });
  } catch (err) {
    console.error("Verify code error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// --- RESET PASSWORD ---
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    const result = await pool.query(
      "SELECT reset_token, reset_expires FROM admins WHERE email=$1",
      [email]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });

    const user = result.rows[0];
    if (user.reset_token !== code) return res.status(400).json({ error: "Invalid code" });
    if (new Date(user.reset_expires) < new Date()) {
      return res.status(400).json({ error: "Code expired" });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    await pool.query(
      "UPDATE admins SET password_hash=$1, reset_token=NULL, reset_expires=NULL WHERE email=$2",
      [hash, email]
    );

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Add this temporary endpoint to generate tokens
router.post('/generate-token', async (req, res) => {
  try {
    const { id, email, role, status, first_name, last_name } = req.body;
    
    console.log('🔑 Generating token for:', email, 'Role:', role);

    const tokenPayload = {
      id,
      email,
      role,
      status,
      first_name,
      last_name
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });

    console.log('✅ Token generated successfully');

    res.json({
      success: true,
      token,
      user: tokenPayload
    });
  } catch (err) {
    console.error('Token generation error:', err);
    res.status(500).json({ error: 'Token generation failed' });
  }
});

module.exports = router;