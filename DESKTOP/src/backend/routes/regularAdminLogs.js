const express = require('express');
const pool = require('../db');
const { authenticateToken, requireAdmin, auditLog, logAction } = require('./middleware/super-admin-auth');
const router = express.Router();

// GET /api/admin/me → current logged-in admin
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, role, status
       FROM admins
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get current admin error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// EDIT PROFILE
router.put("/me", authenticateToken, async (req, res) => {
  try {
    const adminId = req.user.id || req.user.userId;
    const { first_name, last_name, email, phone } = req.body;

    const result = await pool.query(
      `UPDATE admins
       SET first_name = $1, last_name = $2, email = $3, phone = $4
       WHERE id = $5
       RETURNING *`,
      [first_name, last_name, email, phone, adminId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Admin not found" });
    }

    res.json({ success: true, admin: result.rows[0] });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ success: false, error: "Server error" });
    }
});

// Example: Event CRUD endpoints with audit logging
// CREATE EVENT
router.post('/events', authenticateToken, requireAdmin, auditLog('Events', 'CREATE_EVENT'), async (req, res) => {
  try {
    const { client_name, event_type, date, status } = req.body;
    
    // Your existing event creation logic here
    // const result = await pool.query(...);
    
    res.json({ success: true, message: "Event created" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// UPDATE EVENT
router.put('/events/:id', authenticateToken, requireAdmin, auditLog('Events', 'UPDATE_EVENT'), async (req, res) => {
  try {
    const { id } = req.params;
    // Your existing event update logic here
    
    res.json({ success: true, message: "Event updated" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE EVENT
router.delete('/events/:id', authenticateToken, requireAdmin, auditLog('Events', 'DELETE_EVENT'), async (req, res) => {
  try {
    const { id } = req.params;
    // Your existing event delete logic here
    
    res.json({ success: true, message: "Event deleted" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Similar patterns for Gallery, Notifications, QR Code, etc.
// Example: Gallery upload
router.post('/gallery', authenticateToken, requireAdmin, auditLog('Gallery', 'UPLOAD_IMAGE'), async (req, res) => {
  try {
    // Your gallery upload logic
    res.json({ success: true, message: "Image uploaded" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Example: Send notification
router.post('/notifications', authenticateToken, requireAdmin, auditLog('Notifications', 'SEND_NOTIFICATION'), async (req, res) => {
  try {
    // Your notification sending logic
    res.json({ success: true, message: "Notification sent" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Example: Generate QR Code
router.post('/qr-code', authenticateToken, requireAdmin, auditLog('QR Code', 'GENERATE_QR'), async (req, res) => {
  try {
    // Your QR code generation logic
    res.json({ success: true, message: "QR code generated" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/log-action - Log admin actions for super admin monitoring
router.post('/log-action', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { action, target_page, details } = req.body;
        const adminId = req.user.id;
        const ipAddress = req.ip || req.connection.remoteAddress;

        // Insert into admin_logs table
        await pool.query(
            `INSERT INTO admin_logs (admin_id, action, target_page, details, ip_address)
             VALUES ($1, $2, $3, $4, $5)`,
            [adminId, action, target_page, JSON.stringify(details), ipAddress]
        );

        res.json({ success: true, message: "Action logged successfully" });
    } catch (err) {
        console.error("Log action error:", err.message);
        res.status(500).json({ error: "Failed to log action" });
    }
});

module.exports = router;