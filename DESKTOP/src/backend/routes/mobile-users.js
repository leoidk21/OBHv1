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
        // 1. Hash password first
        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. Create user in Supabase
        const { data: supabaseData, error: supabaseError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm for mobile
            user_metadata: {
                first_name,
                last_name,
                phone
            }
        });

        if (supabaseError) {
            console.error('Supabase error:', supabaseError);
            return res.status(400).json({ error: supabaseError.message });
        }

        const supabaseUser = supabaseData.user;

        // 3. Create user in your database with Supabase UUID
        const newUser = await pool.query(
            `INSERT INTO mobile_users (first_name, last_name, email, phone, password, supabase_uuid)
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING id, first_name, last_name, email, phone, role, supabase_uuid`,
            [first_name, last_name, email, phone, hashedPassword, supabaseUser.id]
        );

        const user = newUser.rows[0];

        // 4. Generate your JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                supabase_uuid: user.supabase_uuid,
                email: user.email, 
                role: user.role 
            },
            process.env.JWT_SECRET,
            { 
                expiresIn: '12h' 
            }
        );

        // 5. Return token and user data
        res.json({
            token,
            user: {
                id: user.id,
                supabase_uuid: user.supabase_uuid,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM mobile_users WHERE email = $1',
            [email]
        );

        // validation
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // compare password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // generate token
        const token = jwt.sign(
            { 
                id: user.id, 
                supabase_uuid: user.supabase_uuid, // Include if exists
                email: user.email, 
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        console.log('User object:', user);

        res.json({ 
            token, 
            user: { 
                id: user.id,
                supabase_uuid: user.supabase_uuid,
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
        let user;
        
        // If user has supabase_uuid (new system)
        if (req.user.supabase_uuid) {
            const result = await pool.query(
                `SELECT id, first_name, last_name, email, phone, role, supabase_uuid
                 FROM mobile_users WHERE supabase_uuid = $1`,
                [req.user.supabase_uuid]
            );
            user = result.rows[0];
        } 
        // Fallback to numeric ID (old system)
        else {
            const result = await pool.query(
                `SELECT id, first_name, last_name, email, phone, role
                 FROM mobile_users WHERE id = $1`,
                [req.user.id]
            );
            user = result.rows[0];
        }

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