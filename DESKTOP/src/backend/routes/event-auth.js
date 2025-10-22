const express = require('express');
const pool = require('../db');
const { authenticateToken: verifyAdminAuth } = require('./middleware/super-admin-auth');

const router = express.Router();

// ============================================
// GET ALL EVENT PLANS (Admin Dashboard)
// ============================================
router.get('/', verifyAdminAuth, async (req, res) => {
  try {
    console.log('Admin fetching all events');
    console.log('Admin ID:', req.user.id);
    
    const result = await pool.query(
      `SELECT 
        ep.id,
        ep.user_id,
        ep.event_type,
        ep.package,
        ep.client_name,
        ep.partner_name,
        ep.event_date,
        ep.event_segments,
        ep.guest_count,
        ep.venue,
        ep.budget,
        ep.e_signature,
        ep.status,
        ep.submitted_at, 
        ep.reviewed_at,
        ep.remarks,
        ep.admin_id,
        CONCAT(mu.first_name, ' ', mu.last_name) AS user_name,  -- Create full_name from first + last
        mu.email AS user_email
       FROM event_plans ep
       LEFT JOIN mobile_users mu ON ep.user_id = mu.id
       ORDER BY ep.submitted_at DESC`
    );
    
    console.log(`Found ${result.rows.length} events`);
    
    // Explicitly set JSON content type
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(200).json({
      success: true,
      event_plans: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('Error fetching events for admin:', err);
    
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ 
      success: false,
      error: 'Failed to fetch events',
      message: err.message 
    });
  }
});

// ============================================
// GET PENDING EVENT PLANS
// ============================================
router.get('/pending', verifyAdminAuth, async (req, res) => {
  try {
    console.log('Fetching pending events');
    
    const result = await pool.query(
      `SELECT 
        ep.id,
        ep.event_type,
        ep.client_name,
        ep.partner_name,
        ep.event_date,
        ep.guest_count,
        ep.venue,
        ep.budget,
        ep.status,
        ep.submitted_at,
        CONCAT(mu.first_name, ' ', mu.last_name) AS user_name,  -- Fixed
        mu.email AS user_email
       FROM event_plans ep
       LEFT JOIN mobile_users mu ON ep.user_id = mu.id
       WHERE ep.status = 'Pending'
       ORDER BY ep.submitted_at DESC`
    );
    
    return res.status(200).json({
      success: true,
      events: result.rows,
      count: result.rows.length
    });
    
  } catch (err) {
    console.error('Error fetching pending events:', err);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to fetch pending events'
    });
  }
});

// ============================================
// GET SINGLE EVENT BY ID
// ============================================
router.get('/:id', verifyAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching event ID: ${id}`);
    
    const result = await pool.query(
      `SELECT 
        ep.id,
        ep.user_id,
        ep.event_type,
        ep.package,
        ep.client_name,
        ep.partner_name,
        ep.event_date,
        ep.event_segments,
        ep.guest_count,
        ep.venue,
        ep.budget,
        ep.e_signature,
        ep.status,
        ep.submitted_at,
        ep.reviewed_at,
        ep.remarks,
        ep.admin_id,
        CONCAT(mu.first_name, ' ', mu.last_name) AS user_name,  -- Fixed
        mu.email AS user_email,
        mu.phone AS user_phone
       FROM event_plans ep
       LEFT JOIN mobile_users mu ON ep.user_id = mu.id
       WHERE ep.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }
    
    const eventData = result.rows[0];
    
    return res.status(200).json({
      success: true,
      event: eventData
    });
    
  } catch (err) {
    console.error('Error fetching event:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch event'
    });
  }
});

// ============================================
// APPROVE / REJECT EVENT
// ============================================
router.put('/review/:id', verifyAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const adminId = req.user.id;

    console.log(`Reviewing event ${id}: ${status}`);

    const validStatuses = ['Approved', 'Rejected', 'Completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be "Approved", "Rejected", or "Completed"',
      });
    }

    const result = await pool.query(
      `UPDATE event_plans
       SET 
          status = $1, 
          remarks = $2, 
          reviewed_at = NOW(), 
          admin_id = $3
       WHERE id = $4 
       RETURNING *`,
      [status, remarks, adminId, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Event ${status.toLowerCase()} successfully`,
      event: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Error reviewing event:', error);
    return res.status(500).json({
      success: false,
      error: 'Error reviewing event plan',
      message: error.message,
    });
  }
});

// ============================================
// GET STATISTICS (Dashboard Summary)
// ============================================
router.get('/stats/summary', verifyAdminAuth, async (req, res) => {
  try {
    console.log('📊 Fetching refined dashboard statistics...');

    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE status = 'Pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'Approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'Rejected') as rejected_count,
        COUNT(*) FILTER (WHERE status = 'Completed') as completed_count,
        COUNT(*) FILTER (
          WHERE (status = 'Pending' OR status = 'Approved')
          AND event_date >= CURRENT_DATE
        ) as upcoming_count,
        COUNT(*) FILTER (WHERE status = 'Completed') as past_count
      FROM event_plans;
    `);

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      success: true,
      stats: stats.rows[0],
    });

  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message,
    });
  }
});

module.exports = router; 