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

// GET /api/superadmin/logs - Get admin logs
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
        admin_profiles (
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

// GET /api/superadmin/logs/summary - Get activity summary (FIXED)
router.get('/logs/summary', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    // ⚠️ FIXED: Use Supabase consistently instead of pool
    let query = supabase
      .from('admin_logs')
      .select('*', { count: 'exact' });

    // Apply date filters if provided
    if (date_from && date_to) {
      query = query.gte('timestamp', date_from).lte('timestamp', date_to);
    }

    const { data: logs, error, count } = await query;

    if (error) throw error;

    // Calculate summary data
    const byPage = {};
    const byAdmin = {};
    const topActions = {};

    logs.forEach(log => {
      // Count by page
      byPage[log.target_page] = (byPage[log.target_page] || 0) + 1;
      
      // Count by admin
      byAdmin[log.admin_id] = (byAdmin[log.admin_id] || 0) + 1;
      
      // Count actions
      topActions[log.action] = (topActions[log.action] || 0) + 1;
    });

    // Convert to arrays and sort
    const byPageArray = Object.entries(byPage)
      .map(([target_page, count]) => ({ target_page, count }))
      .sort((a, b) => b.count - a.count);

    const topActionsArray = Object.entries(topActions)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get admin details for byAdmin summary
    const adminDetails = [];
    for (const [adminId, action_count] of Object.entries(byAdmin)) {
      const { data: admin } = await supabase
        .from('admin_profiles')
        .select('id, first_name, last_name, email')
        .eq('id', adminId)
        .single();
      
      if (admin) {
        adminDetails.push({
          id: admin.id,
          first_name: admin.first_name,
          last_name: admin.last_name,
          email: admin.email,
          action_count
        });
      }
    }

    adminDetails.sort((a, b) => b.action_count - a.action_count);

    res.json({
      success: true,
      summary: {
        byPage: byPageArray,
        byAdmin: adminDetails,
        topActions: topActionsArray,
        totalLogs: count
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
      .from('admin_profiles')
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
      .from('admin_profiles')
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

// PUT /api/superadmin/admins/:id/role - Update admin role (FIXED)
router.put('/admins/:id/role', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // ⚠️ FIXED: Use Supabase instead of pool
    const { data, error } = await supabase
      .from('admin_profiles')
      .update({ role: role })
      .eq('id', id)
      .select('id, first_name, last_name, email, role');

    if (error || !data || data.length === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.json({
      success: true,
      admin: data[0]
    });
  } catch (err) {
    console.error("Update role error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/superadmin/admins/:id - Delete admin (FIXED)
router.delete('/admins/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    // ⚠️ FIXED: Use Supabase instead of pool
    const { data, error } = await supabase
      .from('admin_profiles')
      .delete()
      .eq('id', id)
      .select('id');

    if (error || !data || data.length === 0) {
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

// ADD THIS DEBUG ENDPOINT TO TEST AUTH
router.get('/debug-auth', authenticateToken, requireSuperAdmin, async (req, res) => {
  res.json({
    success: true,
    message: "Super Admin access confirmed!",
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      status: req.user.status
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;