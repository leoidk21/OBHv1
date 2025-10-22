const express = require('express');
const pool = require('../db');
const { authenticateToken, requireSuperAdmin } = require('./middleware/super-admin-auth');
const router = express.Router();

const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// GET /api/superadmin/logs - View all admin logs
router.get('/logs', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, admin_id, target_page, action, date_from, date_to } = req.query;
    const offset = (page - 1) * limit;

    // Build dynamic WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 1;

    if (admin_id) {
      whereConditions.push(`al.admin_id = $${paramCount}`);
      queryParams.push(admin_id);
      paramCount++;
    }

    if (target_page) {
      whereConditions.push(`al.target_page = $${paramCount}`);
      queryParams.push(target_page);
      paramCount++;
    }

    if (action) {
      whereConditions.push(`al.action ILIKE $${paramCount}`);
      queryParams.push(`%${action}%`);
      paramCount++;
    }

    if (date_from) {
      whereConditions.push(`al.timestamp >= $${paramCount}`);
      queryParams.push(date_from);
      paramCount++;
    }

    if (date_to) {
      whereConditions.push(`al.timestamp <= $${paramCount}`);
      queryParams.push(date_to);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ') 
      : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM admin_logs al ${whereClause}`,
      queryParams
    );
    const totalLogs = parseInt(countResult.rows[0].count);

    // Get paginated logs with admin info
    queryParams.push(limit, offset);
    const result = await pool.query(
      `SELECT 
        al.id,
        al.admin_id,
        al.action,
        al.target_page,
        al.details,
        al.ip_address,
        al.timestamp,
        a.first_name,
        a.last_name,
        a.email,
        a.role
       FROM admin_logs al
       JOIN admins a ON al.admin_id = a.id
       ${whereClause}
       ORDER BY al.timestamp DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      queryParams
    );

    res.json({
      success: true,
      logs: result.rows,
      pagination: {
        total: totalLogs,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalLogs / limit)
      }
    });
  } catch (err) {
    console.error("Get logs error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/superadmin/logs/summary - Get activity summary
router.get('/logs/summary', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    let dateFilter = '';
    let queryParams = [];

    if (date_from && date_to) {
      dateFilter = 'WHERE timestamp BETWEEN $1 AND $2';
      queryParams = [date_from, date_to];
    }

    // Get actions by page
    const pageStats = await pool.query(
      `SELECT target_page, COUNT(*) as count
       FROM admin_logs
       ${dateFilter}
       GROUP BY target_page
       ORDER BY count DESC`,
      queryParams
    );

    // Get actions by admin
    const adminStats = await pool.query(
      `SELECT 
        a.id,
        a.first_name,
        a.last_name,
        a.email,
        COUNT(al.id) as action_count
       FROM admins a
       LEFT JOIN admin_logs al ON a.id = al.admin_id
       ${dateFilter ? 'AND al.timestamp BETWEEN $1 AND $2' : ''}
       GROUP BY a.id, a.first_name, a.last_name, a.email
       ORDER BY action_count DESC`,
      queryParams
    );

    // Get recent actions
    const recentActions = await pool.query(
      `SELECT action, COUNT(*) as count
       FROM admin_logs
       ${dateFilter}
       GROUP BY action
       ORDER BY count DESC
       LIMIT 10`,
      queryParams
    );

    res.json({
      success: true,
      summary: {
        byPage: pageStats.rows,
        byAdmin: adminStats.rows,
        topActions: recentActions.rows
      }
    });
  } catch (err) {
    console.error("Get summary error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/superadmin/admins - List all admins
router.get('/admins', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        id, 
        first_name, 
        last_name, 
        email, 
        phone, 
        role, 
        status,
        created_at
       FROM admins
       WHERE id != $1
       ORDER BY 
         CASE WHEN status = 'pending' THEN 1 ELSE 2 END,
         created_at DESC`,
      [req.user.id]
    );

    console.log("=== DEBUG: Admin Statuses ===");
    result.rows.forEach(admin => {
      console.log(`Admin: ${admin.email}, Status: ${admin.status}, Role: ${admin.role}`);
    });

    res.json({
      success: true,
      admins: result.rows
    });
  } catch (err) {
    console.error("Get admins error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/superadmin/admins/:id/approve
router.put('/admins/:id/approve', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { decision } = req.body; // 'approve' or 'reject'
    const status = decision === 'approve' ? 'approved' : 'rejected';

    console.log(`Approval request: Admin ${id}, Decision: ${decision}, Status: ${status}`);

    const result = await pool.query(
      `UPDATE admins 
       SET status = $1, approved_by = $2, approved_at = NOW()
       WHERE id = $3
       RETURNING id, first_name, last_name, email, status`,
      [status, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const admin = result.rows[0];
    console.log(`Successfully updated admin ${admin.email} to status: ${admin.status}`);

    // Optional: send notification email (comment out if email not configured)
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail({
          from: `"OBH Admin" <${process.env.EMAIL_USER}>`,
          to: admin.email,
          subject: `Your admin account has been ${status}`,
          html: `<p>Hello ${admin.first_name},<br>Your admin account has been <b>${status}</b> by the Super Admin.</p>`
        });
        console.log(`Notification email sent to ${admin.email}`);
      }
    } catch (emailError) {
      console.error("Email sending failed, but admin was updated:", emailError.message);
      // Don't fail the request if email fails
    }

    res.json({ 
      success: true, 
      admin,
      message: `Admin ${status} successfully`
    });
  } catch (err) {
    console.error("Approval error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/superadmin/admins/:id/role - Update admin role
router.put('/admins/:id/role', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['admin', 'super_admin'].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const result = await pool.query(
      `UPDATE admins 
       SET role = $1 
       WHERE id = $2
       RETURNING id, first_name, last_name, email, role`,
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.json({
      success: true,
      admin: result.rows[0]
    });
  } catch (err) {
    console.error("Update role error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/superadmin/admins/:id - Delete admin (super admin only)
router.delete('/admins/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    const result = await pool.query(
      `DELETE FROM admins WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.json({
      success: true,
      message: "Admin deleted successfully"
    });
  } catch (err) {
    console.error("Delete admin error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;