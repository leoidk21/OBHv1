require('dotenv').config();

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const pool = require('../db');
const { authenticateToken } = require ('./middleware/mobile-auth');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const router = express.Router();
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

// DEBUG: Check if env variables are loaded
console.log('📧 EMAIL_USER:', process.env.EMAIL_USER ? 'LOADED' : '❌ MISSING');
console.log('📧 EMAIL_PASS:', process.env.EMAIL_PASS ? 'LOADED' : '❌ MISSING');
console.log('🔐 SUPABASE_URL:', process.env.SUPABASE_URL ? 'LOADED' : '❌ MISSING');

router.post('/signup', async (req, res) => {
    console.log('Signup request received:', req.body);
    const { first_name, last_name, email, phone, password } = req.body;

    try {
        // 1. Check if email exists in admin_profiles first
        const adminCheck = await pool.query(
            'SELECT id FROM admin_profiles WHERE email = $1',
            [email]
        );

        if (adminCheck.rows.length > 0) {
            return res.status(400).json({ 
                error: 'This email is reserved for admin accounts. Please use a different email.' 
            });
        }

        // 2. Check if email already exists in mobile_users
        const existingUser = await pool.query(
            'SELECT id FROM mobile_users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ 
                error: 'Email already registered. Please use a different email or login.' 
            });
        }

        // 3. Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await pool.query(
            `INSERT INTO mobile_users (first_name, last_name, email, phone, password)
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING id, first_name, last_name, email, phone, role, created_at`,
            [first_name, last_name, email, phone, hashedPassword]
        );

        const user = newUser.rows[0];

        // 4. Generate JWT token with type: 'mobile'
        const token = jwt.sign(
            { 
                id: user.id,
                email: user.email, 
                role: user.role,
                type: 'mobile'  // ADD THIS LINE
            },
            process.env.JWT_SECRET,
            { 
                expiresIn: '12h' 
            }
        );

        res.json({
            token,
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Signup error:', err.message);
        
        // Handle database trigger exception
        if (err.message.includes('EMAIL_RESERVED_FOR_ADMIN')) {
            return res.status(400).json({ 
                error: 'This email is reserved for admin accounts. Please use a different email.' 
            });
        }
        
        res.status(500).json({ error: 'Server error during signup' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. First check if this is an admin email
        const adminCheck = await pool.query(
            'SELECT id FROM admin_profiles WHERE email = $1',
            [email]
        );

        if (adminCheck.rows.length > 0) {
            return res.status(401).json({ 
                error: 'Admin accounts cannot login through mobile app. Please use the admin portal.' 
            });
        }

        // 2. Check mobile_users table
        const result = await pool.query(
            'SELECT * FROM mobile_users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];

        // 3. Compare password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // 4. Generate token with type: 'mobile'
        const token = jwt.sign(
            { 
                id: user.id,
                email: user.email, 
                role: user.role,
                type: 'mobile'  // ADD THIS LINE
            },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.json({ 
            token, 
            user: { 
                id: user.id,
                first_name: user.first_name, 
                last_name: user.last_name,
                email: user.email, 
                phone: user.phone,
                role: user.role 
            } 
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/user-data', authenticateToken, async (req, res) => {
    try {
        // Since we removed supabase_uuid, always use the numeric ID
        const result = await pool.query(
            `SELECT id, first_name, last_name, email, phone, role
             FROM mobile_users WHERE id = $1`,
            [req.user.id]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/mobile-users', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, first_name, last_name, email, phone, role
             FROM mobile_users
             ORDER BY created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- FORGOT PASSWORD ---
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        // Check if admin exists
        const result = await pool.query("SELECT id FROM mobile_users WHERE email=$1", [email]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        // Generate 4-digit code
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    
        // save to DB
        await pool.query(
            `UPDATE mobile_users SET reset_token=$1, reset_expires=$2 WHERE email=$3`,
            [code, expires, email]
        );

        // Send email with code
        await transporter.sendMail({
            from: `"OBH Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Your Password Reset Code",
            text: `Your verification code is: ${code}`,
            html: `<p>Your verification code is: <b>${code}</b></p>`,
        });

        res.json({ message: "Verification code sent to your email." });
    } catch (err) {
        console.error("Forgot password error:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// --- VERIFY CODE ---
router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;

  try {
    const result = await pool.query(
      "SELECT reset_token, reset_expires FROM mobile_users WHERE email=$1",
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
      "SELECT reset_token, reset_expires FROM mobile_users WHERE email=$1",
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
      "UPDATE mobile_users SET password=$1, reset_token=NULL, reset_expires=NULL WHERE email=$2",
      [hash, email]
    );

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.put('/update-profile', authenticateToken, async (req, res) => {
    const { email, first_name, last_name } = req.body;

    try {
    await pool.query(
      'UPDATE mobile_users SET first_name = $1, last_name = $2, email = $3 WHERE id = $4',
      [first_name, last_name, email, req.user.id]
    );
    res.json({ message: 'Profile updated!' });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

module.exports = router;