const express = require('express');
const pool = require('../db');
const { authenticateToken: verifMobileAuth, authenticateToken } = require('./middleware/mobile-auth');
const router = express.Router();

const fs = require('fs');
const path = require('path');

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

// FIXED: GET /event-plans/status - Correct parameter handling
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

// POST /submit - Create a new event plan
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

// GET /event-plans - Retrieve all event plans (FOR ADMIN DASHBOARD)
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

// Get reminders for mobile app
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

// GET /event-plans/:id - Get single event plan
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

// DELETE /event-plans/:id - Delete event plan
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

// PUT /event-plans/:id/status - Update event status (SIMPLIFIED)
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
/*
// SCHEDULE PAGE
*/
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

// Get approved events for dropdown (names only)
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

// Get guests for specific approved event
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

// Get approved events with budget information
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

// Get approved events for clients page WITH email from mobile_users
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

// Send reminder endpoint
router.post('/send-reminder', authenticateToken, async (req, res) => {
  console.log("🔔 Send-reminder route hit! Body:", req.body);

  try {
    const { eventId, clientName, gcashName, gcashNumber, dueDate, notes } = req.body;
    
    console.log("Sending reminder for event:", eventId);
    
    // Store reminder in database
    const result = await pool.query(
      `INSERT INTO payment_reminders
       (event_id, client_name, gcash_name, gcash_number, due_date, notes, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [eventId, clientName, gcashName, gcashNumber, dueDate, notes]
    );

    res.json({ 
      success: true, 
      message: "Reminder sent successfully",
      reminder: result.rows[0]
    });
  } catch (err) {
    console.error("❌ Send reminder error:", err);
    res.status(500).json({ error: "Failed to send reminder" });
  }
});
module.exports = router;