const express = require('express');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const { authenticateToken: verifMobileAuth, authenticateToken } = require('./middleware/mobile-auth');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

console.log("🧩 SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("🧩 SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "LOADED" : "MISSING");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const router = express.Router();

router.post('/cancel', verifMobileAuth, async (req, res) => {
    try {
        const { eventId, reason } = req.body;
        const userId = req.user.id;
        
        console.log('❌ Event cancellation request:', { eventId, userId, reason });

        // First check the current status and valid statuses
        const checkResult = await pool.query(
            `SELECT status FROM event_plans WHERE id = $1 AND user_id = $2`,
            [eventId, userId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: "Event not found or you don't have permission to cancel this event" });
        }

        const currentStatus = checkResult.rows[0].status;
        console.log('📋 Current event status:', currentStatus);

        // Update event status to 'Rejected' instead of 'Cancelled' since that's a valid status
        // Or you can use 'Completed' if that makes more sense for your business logic
        const result = await pool.query(
            `UPDATE event_plans SET status = 'Rejected', remarks = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
            [reason, eventId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Event not found or you don't have permission to cancel this event" });
        }

        console.log('✅ Event cancelled successfully. Status changed to:', result.rows[0].status);

        // Send notification to all admins
        await sendCancellationNotificationToAdmins(userId, eventId, reason);

        res.json({ 
            success: true, 
            message: "Event cancelled successfully",
            newStatus: 'Rejected'
        });
    } catch (err) {
        console.error("Cancel event error:", err);
        res.status(500).json({ error: "Failed to cancel event" });
    }
});

// Notification to all admins
// Notification to all admins
const sendCancellationNotificationToAdmins = async (userId, eventId, reason) => {
    try {
        // Get all admin user IDs
        const adminResult = await pool.query(
            `SELECT id FROM admins WHERE status = 'approved'`
        );

        const adminIds = adminResult.rows.map(admin => admin.id);
        console.log('📢 Sending cancellation notifications to admins:', adminIds);

        // Create notifications for each admin
        const notifications = adminIds.map(adminId => ({
            user_id: adminId,
            type: 'EVENT_CANCELLATION',
            title: 'Event Cancelled',
            message: `User ${userId} cancelled event ${eventId}. Reason: ${reason}`,
            data: { 
                userId: userId, 
                eventId: eventId, 
                reason: reason,
                timestamp: new Date().toISOString()
            },
            is_read: false,
            created_at: new Date().toISOString()
        }));

        // Insert all notifications
        const { data, error } = await supabase
            .from('notifications')
            .insert(notifications);

        if (error) {
            console.error('❌ Admin notification error:', error);
            
            // If UUID fails, try with admin user IDs as strings
            console.log('🔄 Retrying with string user IDs...');
            const stringNotifications = adminIds.map(adminId => ({
                user_id: String(adminId), // Convert to string
                type: 'EVENT_CANCELLATION',
                title: 'Event Cancelled',
                message: `User ${userId} cancelled event ${eventId}. Reason: ${reason}`,
                data: { 
                    userId: userId, 
                    eventId: eventId, 
                    reason: reason,
                    timestamp: new Date().toISOString()
                },
                is_read: false,
                created_at: new Date().toISOString()
            }));

            const { data: retryData, error: retryError } = await supabase
                .from('notifications')
                .insert(stringNotifications);

            if (retryError) {
                console.error('❌ Second attempt failed:', retryError);
            } else {
                console.log(`✅ Notifications sent to ${adminIds.length} admins (string IDs)`);
            }
        } else {
            console.log(`✅ Notifications sent to ${adminIds.length} admins`);
        }
    } catch (error) {
        console.error('❌ Error sending admin notifications:', error);
    }
};

// ================ //
// SEND REMINDER END POINTS
// ================ //
router.post('/send-reminder', authenticateToken, async (req, res) => {
  try {
    const { eventId, clientName, gcashName, gcashNumber, dueDate, notes } = req.body;
    
    // Get user_id from event
    const eventResult = await pool.query(
      `SELECT user_id FROM event_plans WHERE id = $1`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const userId = eventResult.rows[0].user_id;

    // Store reminder
    const result = await pool.query(
      `INSERT INTO payment_reminders (event_id, client_name, gcash_name, gcash_number, due_date, notes, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
      [eventId, clientName, gcashName, gcashNumber, dueDate, notes]
    );

    // Send notification
    await sendPaymentReminderNotification(userId, eventId, clientName, dueDate, gcashName, gcashNumber, notes);

    res.json({ 
      success: true, 
      message: "Reminder sent successfully"
    });
    
  } catch (err) {
    console.error("Send reminder error:", err);
    res.status(500).json({ error: err.message });
  }
});
// ================= //
// PAYMENT REMINDER NOTIFICATION FUNCTION
// ================= //
const sendPaymentReminderNotification = async (userId, eventId, clientName, dueDate, gcashName, gcashNumber, notes = '') => {
  try {
    console.log('💰 Sending payment reminder to user:', userId);
    
    const formattedDueDate = new Date(dueDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const message = `Payment reminder for ${clientName}. Due date: ${formattedDueDate}`;

    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: userId,
          type: 'PAYMENT_REMINDER',
          title: 'Payment Reminder',
          message: message,
          data: {
            eventId: eventId,
            clientName: clientName,
            dueDate: dueDate,
            formattedDueDate: formattedDueDate,
            gcashName: gcashName,
            gcashNumber: gcashNumber,
            notes: notes
          },
          is_read: false,
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('❌ Payment reminder insert error:', error);
      return false;
    }

    console.log('✅ Payment reminder notification sent to user:', userId);
    return true;
    
  } catch (error) {
    console.error('❌ Error in sendPaymentReminderNotification:', error);
    return false;
  }
};

// ================ //
// FILE UPLOAD
// ================ //
router.post('/upload-proof-base64', verifMobileAuth, async (req, res) => {
  try {
    const { expenseId, eventId, imageData } = req.body;
    
    console.log("📨 Received upload request:");
    console.log("   eventId:", eventId);
    console.log("   expenseId:", expenseId);
    console.log("   imageData length:", imageData?.length);

    if (!eventId || !expenseId || !imageData) {
      console.log("❌ Missing required fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    // First, get the current event data
    const eventResult = await pool.query(
      'SELECT expenses FROM event_plans WHERE id = $1',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      console.log("❌ Event not found with id:", eventId);
      return res.status(404).json({ error: "Event not found" });
    }

    const currentExpenses = eventResult.rows[0].expenses || [];
    console.log("📊 Current expenses count:", currentExpenses.length);

    // Find and update the specific expense
    let expenseFound = false;
    const updatedExpenses = currentExpenses.map(expense => {
      console.log("🔍 Checking expense:", expense.id, "vs", expenseId);
      if (expense.id === expenseId) {
        expenseFound = true;
        console.log("✅ Found matching expense, updating proofUri");
        return {
          ...expense,
          proofUri: imageData
        };
      }
      return expense;
    });

    if (!expenseFound) {
      console.log("❌ Expense not found in event expenses");
      return res.status(404).json({ error: "Expense not found in event" });
    }

    console.log("🔄 Updated expenses:", updatedExpenses.length);

    // Update the database with the modified expenses array
    const updateResult = await pool.query(
      'UPDATE event_plans SET expenses = $1 WHERE id = $2 RETURNING id',
      [JSON.stringify(updatedExpenses), eventId]
    );

    console.log("💾 Database updated successfully:", updateResult.rows[0]);

    res.json({ 
      success: true, 
      proofUrl: imageData,
      message: "Proof uploaded successfully"
    });

  } catch (err) {
    console.error("❌ Base64 upload error:", err);
    console.error("❌ Error details:", err.stack);
    res.status(500).json({ error: "Upload failed: " + err.message });
  }
});

// ================ //
// EVENT PLANS STATUS
// ================ //
router.get('/status', verifMobileAuth, async (req, res) => {
    const numericUserId = parseInt(req.user.id);
    const result = await pool.query(`
        SELECT status, event_type, client_name, event_date, submitted_at
        FROM event_plans
        WHERE user_id = $1
        ORDER BY submitted_at DESC
        LIMIT 1
    `, [numericUserId]);
    res.json({ status: result.rows[0]?.status || 'Pending' });
});

// ================ //
// CREATE A NEW EVENT
// ================ //
router.post('/submit', verifMobileAuth, async (req, res) => {
    try {
        const {
            event_type,
            wedding_type,
            package_price,
            guest_range, 
            client_name,
            client_email,
            client_phone,
            partner_name,
            full_client_name,
            event_date,
            schedule,
            guests,
            budget,
            venue,
            eSignature,
            mobile_app_id
        } = req.body;

        // Get user_id from token
        const user_id = req.user.id;

        // Validate required fields
        if (!event_type || !client_name || !event_date) {
            return res.status(400).json({ 
                error: 'Missing required fields: event_type, client_name, event_date' 
            });
        }

        let e_signature_data = null;
        if (eSignature) {
            const base64Data = eSignature.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `signature-${Date.now()}.png`;
            const filePath = path.join(__dirname, '../uploads/signatures', fileName);
            
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, buffer);
            e_signature_data = `/uploads/signatures/${fileName}`;
        }

        const existingEvent = await pool.query(
            `SELECT id, client_name, event_type
            FROM event_plans
            WHERE event_date = $1 AND status IN ('Pending', 'Approved')`,
                [event_date]
        );

        // In event-plans.js - FIX THE INSERT QUERY
        const result = await pool.query(
            `INSERT INTO event_plans 
                (user_id, event_type, package, client_name, client_email, client_phone, partner_name, event_date,
                event_segments, guest_count, venue, budget, e_signature, status, expenses)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *`,
            [
                user_id, 
                event_type, 
                package_price, 
                full_client_name || client_name, 
                client_email,
                client_phone,
                partner_name, 
                event_date,
                JSON.stringify(schedule || []), 
                parseInt(guest_range) || 0,
                venue?.name || '',
                0.00,
                e_signature_data || eSignature,
                'Pending',
                JSON.stringify(budget || []),
            ]
        );

        const eventPlan = result.rows[0];

        // Save guests to event_guests table
        if (guests && guests.length > 0) {
            for (const guest of guests) {
                await pool.query(
                    `INSERT INTO event_guests (event_plan_id, guest_name, status, invite_link)
                     VALUES ($1, $2, $3, $4)`,
                    [eventPlan.id, guest.name, guest.status, guest.inviteLink]
                );
            }
        }

        res.status(201).json({
            message: 'Event submitted successfully',
            id: eventPlan.id,
            status: 'Pending',
            expenses: budget
        });
    } catch (error) {
        console.error('Error submitting event:', error);
        res.status(500).json({ error: 'Server error while submitting event' });
    }
});

// ================ //
// AVAILABILITY OF DATES
// ================ //
router.get('/availability', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT event_date
      FROM event_plans
      WHERE status IN ('Pending', 'Approved')
    `);

    const bookedDates = result.rows.map(r => r.event_date);
    res.json({ success: true, bookedDates });
  } catch (error) {
    console.error('Error fetching booked dates:', error);
    res.status(500).json({ error: 'Server error while fetching booked dates' });
  }
});

// ================ //
// RETRIEVE ALL EVENT PLANS
// ================ //
router.get('/', verifMobileAuth, async (req, res) => {
    try {
        console.log('Fetching all event plans for user:', req.user.id);
        
        const result = await pool.query(
            'SELECT * FROM event_plans WHERE user_id = $1 ORDER BY submitted_at DESC',
            [req.user.id]
        );

        res.json({
            message: 'Event plans retrieved successfully',
            event_plans: result.rows,
        });
    } catch (error) {
        console.error('Error retrieving event plans:', error);
        res.status(500).json({ error: 'Server error while retrieving event plans' });
    }
});

// ================ //
// REMINDERS FOR PAYMENT
// ================ //
router.get('/payment-reminders', verifMobileAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT pr.*, ep.client_name, ep.event_type 
       FROM payment_reminders pr
       JOIN event_plans ep ON pr.event_id = ep.id
       WHERE ep.user_id = $1 AND pr.status = 'pending'
       ORDER BY pr.sent_at DESC`,
      [userId]
    );

    res.json({ 
      success: true, 
      reminders: result.rows 
    });
  } catch (err) {
    console.error("❌ Get reminders error:", err);
    res.status(500).json({ error: "Failed to fetch reminders" });
  }
});

// ================ //
// GET A SINGLE EVENT PLAN
// ================ //
router.get('/:id', verifMobileAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM event_plans WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event plan not found' });
        }

        res.json({
            message: 'Event plan retrieved successfully',
            event_plan: result.rows[0],
        });
    } catch (error) {
        console.error('Error retrieving event plan:', error);
        res.status(500).json({ error: 'Server error while retrieving event plan' });
    }
});

// ================ //
// DELETE AN EVENT
// ================ //
router.delete('/:id', verifMobileAuth, async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        await client.query('BEGIN');

        // First delete all guests for this event
        await client.query('DELETE FROM event_guests WHERE event_plan_id = $1', [id]);

        // Then delete the main event plan
        const result = await client.query(
            'DELETE FROM event_plans WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, user_id]
        );

        await client.query('COMMIT');

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found or not owned by user' });
        }

        res.json({ success: true, message: 'Event deleted successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Server error while deleting event' });
    } finally {
        client.release();
    }
});

// ================ //
// UPDATE EVENT STATUS
// ================ //
router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        console.log(`Updating event ${id} status to: ${status}`);

        const validStatuses = ['Pending', 'Approved', 'Rejected', 'Completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const result = await pool.query(
            'UPDATE event_plans SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event plan not found' });
        }

        res.json({
            message: `Event status updated to ${status}`,
            status: status
        });
    } catch (error) {
        console.error('Error updating event status:', error);
        res.status(500).json({ error: 'Server error while updating event status' });
    }
});

// ======= APPROVED EVENTS DETAILS FETCH HERE ======= //
// ================ //
// SCHEDULE
// ================ //
router.get('/approved/schedule', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                id,
                event_type,
                client_name, 
                event_date,
                event_segments,
                venue,
                partner_name
                FROM event_plans
                WHERE status = 'Approved'
                ORDER BY event_date, submitted_at`
        );

        res.json({ success: true, events: result.rows });
    } catch (err) {
        console.error("Get approved schedule events error:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// ================ //
// GET APPROVED GUESTS
// ================ //
router.get('/approved/guests', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                ep.id,
                ep.client_name,
                ep.event_type,
                ep.event_date
             FROM event_plans ep
             WHERE ep.status = 'Approved'
             ORDER BY ep.event_date DESC`
        );

        res.json({ success: true, events: result.rows });
    } catch (err) {
        console.error("Get approved events error:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// ================ //
// GET GUESTS LIST
// ================ //
router.get('/approved/events/guests/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const eventCheck = await pool.query(
            `SELECT id FROM event_plans WHERE id = $1 AND status = 'Approved'`,
            [id]
        );

        if (eventCheck.rows.length === 0) {
            return res.status(404).json({ error: "Approved event not found" });
        }

        const result = await pool.query(
             `SELECT 
                eg.id,
                eg.guest_name,
                eg.status,
                eg.invite_link,
                eg.created_at
             FROM event_guests eg
             WHERE eg.event_plan_id = $1
             ORDER BY eg.created_at DESC`,
            [id]
        );

        res.json({ success: true, guests: result.rows });
    } catch (err) {
        console.error("Get approved event guests error:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// ================ //
// GET APPROVED EVENTS
// ================ //
router.get('/approved/budget', authenticateToken, async (req, res) => {
        try {
        const result = await pool.query(
            `SELECT 
                id,
                event_type,
                category,
                client_name,
                event_date,
                package,
                budget,
                guest_count,
                venue,
                partner_name,
                expenses
             FROM event_plans 
             WHERE status = 'Approved'
             ORDER BY event_date`
        );

        const eventsWithExpenses = result.rows.map(event => {
            let parsedExpenses = [];
            try {
                parsedExpenses = Array.isArray(event.expenses)
                ? event.expenses
                : JSON.parse(event.expenses || '[]');
            } catch {
                parsedExpenses = [];
            }
            return { ...event, expenses: parsedExpenses };
        });
        
        res.json({ success: true, events: result.rows });
    } catch (err) {
        console.error("Get approved budget events error:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// ================ //
// GET APPROVED CLIENTS
// ================ //
router.get('/approved/clients', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                ep.id,
                ep.client_name,
                mu.email as client_email,  -- Get email from mobile_users
                ep.client_phone,
                ep.event_type,
                ep.event_date,
                ep.package,
                ep.guest_count,
                ep.venue,
                ep.partner_name,
                ep.submitted_at,
                ep.status,
                ep.user_id  -- Make sure this links to mobile_users.id
             FROM event_plans ep
             LEFT JOIN mobile_users mu ON ep.user_id = mu.id  -- Join with mobile_users
             WHERE ep.status = 'Approved'
             ORDER BY ep.client_name, ep.event_date DESC`
        );
        
        res.json({ success: true, events: result.rows });
    } catch (err) {
        console.error("Get approved clients events error:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});


module.exports = router;