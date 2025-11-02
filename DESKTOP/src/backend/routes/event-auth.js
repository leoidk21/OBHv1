const express = require('express');
const pool = require('../db');
const { authenticateToken: verifyAdminAuth } = require('./middleware/super-admin-auth');
const { createClient } = require('@supabase/supabase-js');

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const router = express.Router();
// ============================================
// NOTIFICATION HELPER FUNCTION
// ============================================
// event-auth.js - FIXED sendEventStatusNotification function
const sendEventStatusNotification = async (userId, eventId, status, eventName, remarks = '') => {
  try {
    console.log('🎯 Attempting to send notification to user ID:', userId);
    
    // First, get the user's UUID from mobile_users
    const userResult = await pool.query(
      `SELECT auth_uid as user_uuid 
       FROM mobile_users 
       WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      console.error('❌ User not found in mobile_users:', userId);
      return false;
    }

    const userUuid = userResult.rows[0].user_uuid;
    console.log('✅ Found user UUID:', userUuid);

    const statusText = String(status || 'updated').toLowerCase();
    
    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          user_uuid: userUuid, // Use the UUID
          type: 'EVENT_STATUS_UPDATE',
          title: 'Event Status Update',
          message: `Your event "${eventName}" has been ${statusText}`,
          data: {
            eventId: eventId,
            status: status,
            remarks: remarks,
            eventName: eventName
          },
          is_read: false,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('❌ Supabase insert error:', error);
      return false;
    }

    console.log('✅ Notification inserted successfully for user:', userUuid);
    return true;
    
  } catch (error) {
    console.error('❌ Error in sendEventStatusNotification:', error);
    return false;
  } 
};

// ============================================
// APPROVE / REJECT EVENT (UPDATED WITH NOTIFICATIONS)
// ============================================
// In event-auth.js - UPDATE THE REVIEW ENDPOINT
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

    // ✅ FIXED: Get event with user UUID
    const eventResult = await pool.query(
      `SELECT 
          ep.*, 
          mu.auth_uid as user_uuid,  // Get the UUID
          CONCAT(mu.first_name, ' ', mu.last_name) AS user_name 
       FROM event_plans ep 
       LEFT JOIN mobile_users mu ON ep.user_id = mu.id 
       WHERE ep.id = $1`,
      [id]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    const event = eventResult.rows[0];

    // Update the event status
    const updateResult = await pool.query(
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

    if (updateResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    const updatedEvent = updateResult.rows[0];

    console.log('🔄 Calling sendEventStatusNotification with:', {
      userId: event.user_id,
      userUuid: event.user_uuid, // This is what we need
      eventId: event.id,
      status: status,
      eventName: event.event_type
    });

    // ✅ FIXED: Send notification with UUID
    if (event.user_uuid) {
      const notificationData = {
        user_uuid: event.user_uuid, // Use the UUID
        type: 'EVENT_STATUS_UPDATE',
        title: `Event ${status}!`,
        message: `Your event "${event.client_name}" has been ${status.toLowerCase()}.`,
        data: {
          eventId: parseInt(id),
          eventName: event.client_name,
          newStatus: status,
          eventType: event.event_type,
          eventDate: event.event_date,
          remarks: remarks
        },
        is_read: false,
        created_at: new Date().toISOString()
      };

      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .insert([notificationData])
        .select();

      if (notifError) {
        console.error('❌ Notification insert error:', notifError);
      } else {
        console.log('✅ Notification sent successfully! ID:', notifData[0]?.id);
        console.log('   For user UUID:', event.user_uuid);
      }
    } else {
      console.error('❌ Cannot send notification - no user_uuid found');
    }

    return res.status(200).json({
      success: true,
      message: `Event ${status.toLowerCase()} successfully`,
      event: updatedEvent,
      notificationSent: !!event.user_uuid
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
// GET ALL EVENT PLANS (Admin Dashboard)
// ============================================
router.get('/', verifyAdminAuth, async (req, res) => {
  try {
    console.log('Admin fetching all events');
    console.log('Admin ID:', req.user.id);
    
    const result = await pool.query(
      `SELECT 
        ep.id,
        ep.user_uuid,
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
        CONCAT(mu.first_name, ' ', mu.last_name) AS user_name,
        mu.email AS user_email
       FROM event_plans ep
       LEFT JOIN mobile_users mu ON ep.user_uuid = mu.id
       ORDER BY ep.submitted_at DESC`
    );
    
    console.log(`Found ${result.rows.length} events`);
    
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
        CONCAT(mu.first_name, ' ', mu.last_name) AS user_name,
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
        CONCAT(mu.first_name, ' ', mu.last_name) AS user_name,
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