const express = require('express');
const supabase = require('../supabase'); // Import Supabase
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

router.get('/logs', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, admin_id, target_page, action, date_from, date_to } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('admin_logs')
      .select(`
        id,
        admin_id,
        action,
        target_page,
        details,
        ip_address,
        timestamp,
        admins (
          first_name,
          last_name,
          email,
          role
        )
      `, { count: 'exact' });

    // Apply filters
    if (admin_id) query = query.eq('admin_id', admin_id);
    if (target_page) query = query.eq('target_page', target_page);
    if (action) query = query.ilike('action', `%${action}%`);
    if (date_from) query = query.gte('timestamp', date_from);
    if (date_to) query = query.lte('timestamp', date_to);

    // Apply pagination
    query = query
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: logs, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      logs: logs || [],
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
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
    const { data, error } = await supabase
      .from('admins')
      .select('id, first_name, last_name, email, phone, role, status, created_at')
      .neq('id', req.user.id)
      .order('status', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log("=== DEBUG: Admin Statuses ===");
    data.forEach(admin => {
      console.log(`Admin: ${admin.email}, Status: ${admin.status}, Role: ${admin.role}`);
    });

    res.json({
      success: true,
      admins: data
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
    const { decision } = req.body;
    const status = decision === 'approve' ? 'approved' : 'rejected';

    console.log(`Approval request: Admin ${id}, Decision: ${decision}, Status: ${status}`);

    const { data, error } = await supabase
      .from('admins')
      .update({
        status: status,
        approved_by: req.user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, first_name, last_name, email, status');

    if (error || !data || data.length === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const admin = data[0];
    console.log(`Successfully updated admin ${admin.email} to status: ${admin.status}`);

    // Email sending logic here...

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