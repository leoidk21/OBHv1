// routes/auth-google.js
const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const GOOGLE_WEB_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = '60526703767-lfo43dadhj4s1caonlfaujrhku776fep.apps.googleusercontent.com';
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;

router.get('/google', (req, res) => {
  res.json({ 
    message: 'Google auth endpoint is working! Use POST to authenticate.',
    timestamp: new Date().toISOString()
  });
});

// POST /api/auth/google
// body: { idToken: "<google id_token>" }
router.post('/google', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'Missing idToken' });
 
  try {
    // Try to verify with both client IDs (web and android)
    let ticket;
    let clientUsed = 'unknown';
    
    // First try web client
    try {
      const webClient = new OAuth2Client(GOOGLE_WEB_CLIENT_ID);
      ticket = await webClient.verifyIdToken({
        idToken,
        audience: GOOGLE_WEB_CLIENT_ID
      });
      clientUsed = 'web';
      console.log('✅ Token verified using WEB client');
    } catch (webErr) {
      // If web client fails, try Android client
      console.log('⚠️ Web client verification failed, trying Android client...');
      try {
        const androidClient = new OAuth2Client(GOOGLE_ANDROID_CLIENT_ID);
        ticket = await androidClient.verifyIdToken({
          idToken,
          audience: GOOGLE_ANDROID_CLIENT_ID
        });
        clientUsed = 'android';
        console.log('✅ Token verified using ANDROID client');
      } catch (androidErr) {
        // Both failed
        console.error('❌ Both web and android verification failed');
        throw new Error('Token verification failed with both clients');
      }
    }
    
    const payload = ticket.getPayload();
    const { sub: provider_id, email, given_name: first_name = '', family_name: last_name = '' } = payload;

    console.log(`📧 User email: ${email}, Provider ID: ${provider_id}`);

    if (!email) return res.status(400).json({ error: 'Google account has no email' });

    // Look up user by provider_id OR email
    const findUserQuery = `
      SELECT * FROM mobile_users
      WHERE provider = 'google' AND provider_id = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(findUserQuery, [provider_id]);

    let user;
    if (rows.length > 0) {
      user = rows[0];
      console.log(`✅ Existing user found: ${user.email}`);
    } else {
      // If there's no provider match, check if an account with same email exists
      const { rows: emailRows } = await pool.query(
        `SELECT * FROM mobile_users WHERE email = $1 LIMIT 1`,
        [email]
      );

      if (emailRows.length > 0) {
        // update existing local user to link google provider
        user = emailRows[0];
        console.log(`🔗 Linking existing user to Google: ${user.email}`);
        const updateQuery = `
          UPDATE mobile_users
          SET provider = 'google', provider_id = $1, first_name = $2, last_name = $3
          WHERE id = $4
          RETURNING *
        `;
        const { rows: updated } = await pool.query(updateQuery, [provider_id, first_name, last_name, user.id]);
        user = updated[0];
      } else {
        // create a new user
        console.log(`➕ Creating new user: ${email}`);
        const insertQuery = `
          INSERT INTO mobile_users (first_name, last_name, email, phone, password, provider, provider_id)
          VALUES ($1,$2,$3,NULL,NULL,'google',$4)
          RETURNING *
        `;
        const { rows: inserted } = await pool.query(insertQuery, [first_name, last_name, email, provider_id]);
        user = inserted[0];
      }
    }

    // Create your own JWT for the app
    const tokenPayload = { id: user.id, email: user.email, role: user.role || 'user' };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    console.log(`🎉 Login successful for: ${user.email}`);

    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('❌ Google auth error:', err);
    res.status(401).json({ error: 'Invalid Google ID token' });
  }
});

module.exports = router;