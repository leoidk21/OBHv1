const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const pool = require('../db');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// Helper: generate JWT
function generateToken(admin) {
  return jwt.sign(
    { 
      id: admin.id, 
      email: admin.email ,
      role: admin.role
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

// --- SIGNUP ---
// regularAdminAuth.js - Update signup
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, role } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Prevent anyone from registering as super_admin
    if (role === 'super_admin') {
      return res.status(403).json({ error: "Cannot register as super admin" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO admins (first_name, last_name, email, phone, password_hash, status, role)
       VALUES ($1, $2, $3, $4, $5, 'pending', 'admin')
       RETURNING id, first_name, last_name, email, phone, role, status`,
      [firstName, lastName, email, phone, passwordHash]
    );

    res.status(201).json({ 
      message: "Account created successfully. Waiting for super admin approval.", 
      admin: result.rows[0] 
    });
  } catch (err) {
    console.error("Signup error:", err.message);
    if (err.code === '23505') {
      res.status(400).json({ error: "Email already exists" });
    } else {
      res.status(500).json({ error: "Server error" });
    }
  }
});

// --- LOGIN ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const result = await pool.query(
      `SELECT * FROM admins WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const admin = result.rows[0];

    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (admin.status !== 'approved') {
      return res.status(403).json({ error: "Your account is awaiting approval by Super Admin." });
    }

    const token = generateToken(admin);

    const safeAdmin = {
      id: admin.id,
      first_name: admin.first_name,
      last_name: admin.last_name,
      email: admin.email,
      phone: admin.phone,
      role: admin.role
    };

    res.json({ token, admin: safeAdmin });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

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

// --- FORGOT PASSWORD ---
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // Check if admin exists
    const result = await pool.query("SELECT id FROM admins WHERE email=$1", [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No account with that email." });
    }

    // Generate 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Save to DB
    await pool.query(
      `UPDATE admins SET reset_token=$1, reset_expires=$2 WHERE email=$3`,
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

module.exports = router;