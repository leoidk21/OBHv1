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
        user_uuid: userId,
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
                    `INSERT INTO event_guests (event_plan_id, guest_name, status, invite_link, mobile_guest_id)
                    VALUES ($1, $2, $3, $4)`,
                    [eventPlan.id, guest.name, guest.status, guest.inviteLink, guest.id]
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

// ================ //
// SERVE INVITATION PAGE
// ================ //
router.get('/invitation-page/:eventId/:guestId/:token', async (req, res) => {
    try {
        const { eventId, guestId, token } = req.params;

        // Verify the invitation is valid
        const result = await pool.query(
            `SELECT 
                eg.*,
                ep.client_name,
                ep.partner_name,
                ep.event_type,
                ep.event_date,
                ep.venue
             FROM event_guests eg
             JOIN event_plans ep ON eg.event_plan_id = ep.id
             WHERE eg.id = $1 AND eg.event_plan_id = $2 AND eg.invite_token = $3`,
            [guestId, eventId, token]
        );

        if (result.rows.length === 0) {
            return res.status(404).send(`
                <html>
                    <body>
                        <h1>Invalid Invitation</h1>
                        <p>This invitation link is invalid or has expired.</p>
                    </body>
                </html>
            `);
        }

        const guest = result.rows[0];

        const displayNames = guest.client_name || 'The Couple';
        
        // Serve the HTML page with the invitation data
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Wedding Invitation</title>
                <style>
                    /* Add your CSS styles here */
                    body {
                        font-family: 'Arial', sans-serif;
                        margin: 0;
                        padding: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .invitation-container {
                        background: white;
                        border-radius: 20px;
                        padding: 40px;
                        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                        max-width: 500px;
                        width: 90%;
                        text-align: center;
                    }
                    
                    .invitation-title {
                        font-size: 18px;
                        color: #666;
                        margin-bottom: 10px;
                    }
                    
                    .line {
                        width: 100px;
                        height: 2px;
                        background: #667eea;
                        margin: 20px auto;
                    }
                    
                    .client-name {
                        font-size: 28px;
                        color: #333;
                        margin: 20px 0;
                    }
                    
                    .invitation-date {
                        font-size: 18px;
                        color: #666;
                        margin-bottom: 30px;
                    }
                    
                    .button-container {
                        display: flex;
                        gap: 15px;
                        justify-content: center;
                        margin-top: 30px;
                    }
                    
                    .btn {
                        padding: 12px 30px;
                        border: none;
                        border-radius: 25px;
                        font-size: 16px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    }
                    
                    .btn.going {
                        background: #4CAF50;
                        color: white;
                    }
                    
                    .btn.decline {
                        background: #f44336;
                        color: white;
                    }
                    
                    .btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                    }
                    
                    .response-message {
                        display: none;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 10px;
                        text-align: center;
                        font-weight: bold;
                    }
                    
                    .response-success {
                        background-color: #d4edda;
                        color: #155724;
                        border: 1px solid #c3e6cb;
                    }
                    
                    .response-error {
                        background-color: #f8d7da;
                        color: #721c24;
                        border: 1px solid #f5c6cb;
                    }
                    
                    .loading {
                        opacity: 0.6;
                        pointer-events: none;
                    }
                </style>
            </head>
            <body>
                <main class="invitation-container">
                    <section class="invitation-content">
                        <div id="responseMessage" class="response-message"></div>
                        
                        <div id="invitationContent">
                            <h1>YOU ARE INVITED</h1>
                            <p class="invitation-title">THE WEDDING OF</p>
                            <div class="line"></div>

                            <h2 class="client-name">${displayNames}</h2>
                            <h4 id="eventDate" class="invitation-date">
                                ${new Date(guest.event_date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </h4>

                            <p class="invitation-message">Kindly confirm your attendance to reserve your seat.</p>

                            ${guest.status === 'Accepted' || guest.status === 'Declined' ? 
                                `<div class="response-message response-success">
                                    You have already ${guest.status.toLowerCase()} this invitation.
                                </div>` :
                                `<section class="button-container">
                                    <button class="btn going" onclick="respondToInvitation('Accepted')">Going</button>
                                    <button class="btn decline" onclick="respondToInvitation('Declined')">Decline</button>
                                </section>`
                            }
                        </div>
                    </section>
                </main>

                <script>
                    const eventId = '${eventId}';
                    const guestId = '${guestId}';
                    const token = '${token}';

                    async function respondToInvitation(status) {
                        try {
                            document.getElementById('invitationContent').classList.add('loading');
                            
                            const response = await fetch('/api/event-plans/invitation/' + eventId + '/' + guestId + '/' + token + '/respond', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ status })
                            });

                            const data = await response.json();

                            if (data.success) {
                                showResponseMessage(data.message, 'success');
                                document.querySelector('.button-container').style.display = 'none';
                            } else {
                                showResponseMessage(data.error, 'error');
                            }
                        } catch (error) {
                            console.error('Error responding to invitation:', error);
                            showResponseMessage('Failed to send response', 'error');
                        } finally {
                            document.getElementById('invitationContent').classList.remove('loading');
                        }
                    }

                    function showResponseMessage(message, type) {
                        const messageEl = document.getElementById('responseMessage');
                        messageEl.textContent = message;
                        messageEl.className = 'response-message response-' + type;
                        messageEl.style.display = 'block';
                    }
                </script>
            </body>
            </html>
        `);
        
    } catch (err) {
        console.error("Serve invitation page error:", err);
        res.status(500).send(`
            <html>
                <body>
                    <h1>Server Error</h1>
                    <p>Something went wrong. Please try again later.</p>
                </body>
            </html>
        `);
    }
});

// ================ //
// GENERATE INVITATION LINK (FIXED VERSION)
// ================ //
router.post('/:eventId/guests/:guestId/generate-invite', authenticateToken, async (req, res) => {
    try {
        const { eventId, guestId } = req.params;
        const { guestName } = req.body;
        
        console.log('📧 GENERATE INVITE - Fixed version called');
        console.log('📧 Request details:', { eventId, guestId, guestName });

        // Validate inputs
        if (!guestName) {
            return res.status(400).json({ error: "Guest name is required" });
        }

        // 1. Check if event exists and get the numeric ID
        console.log('🔍 Checking event exists...');
        const eventCheck = await pool.query(
            'SELECT id, client_name FROM event_plans WHERE id = $1',
            [eventId] // Use eventId directly, let PostgreSQL handle the conversion
        );

        if (eventCheck.rows.length === 0) {
            return res.status(404).json({ error: "Event not found" });
        }

        const numericEventId = eventCheck.rows[0].id;
        console.log('✅ Event found:', eventCheck.rows[0].client_name, 'ID:', numericEventId);

        // 2. Find or create guest using mobile_guest_id
        console.log('🔍 Looking for guest by mobile_guest_id:', guestId);
        let guestResult = await pool.query(
            'SELECT id, guest_name FROM event_guests WHERE mobile_guest_id = $1 AND event_plan_id = $2',
            [guestId, numericEventId]
        );

        console.log('📋 Guest search result:', guestResult.rows);

        let dbGuestId;

        if (guestResult.rows.length === 0) {
            console.log('👤 Creating new guest with mobile_guest_id...');
            
            // Create new guest with mobile_guest_id reference
            const newGuest = await pool.query(
                `INSERT INTO event_guests (event_plan_id, guest_name, status, mobile_guest_id) 
                 VALUES ($1, $2, $3, $4) RETURNING id, guest_name, mobile_guest_id`,
                [numericEventId, guestName, 'Pending', guestId]
            );
            
            dbGuestId = newGuest.rows[0].id;
            console.log('✅ SUCCESS: Created new guest with mobile_guest_id:', {
                database_id: newGuest.rows[0].id,
                name: newGuest.rows[0].guest_name,
                mobile_guest_id: newGuest.rows[0].mobile_guest_id
            });
            
        } else {
            dbGuestId = guestResult.rows[0].id;
            console.log('✅ Found existing guest with mobile_guest_id:', {
                database_id: guestResult.rows[0].id,
                name: guestResult.rows[0].guest_name
            });
        }

        // 3. Generate unique token and link
        const inviteToken = require('crypto').randomBytes(32).toString('hex');
        const inviteLink = `https://wedding-invites-six.vercel.app/api/event-plans/invitation-page/${numericEventId}/${dbGuestId}/${inviteToken}`;
        
        console.log('🔗 Generated invitation link:', inviteLink);

        // 4. Update guest with invite link and token
        console.log('💾 Updating guest with invitation data...');
        const updateResult = await pool.query(
            `UPDATE event_guests 
             SET invite_link = $1, invite_token = $2, invite_generated_at = NOW()
             WHERE id = $3
             RETURNING id, guest_name, invite_link`,
            [inviteLink, inviteToken, dbGuestId]
        );

        console.log('✅ Update successful for:', updateResult.rows[0].guest_name);
        console.log('🎉 INVITATION LINK GENERATED SUCCESSFULLY!');

        res.json({ 
            success: true, 
            inviteLink: inviteLink,
            message: "Invitation link generated successfully"
        });
        
    } catch (err) {
        console.error("❌ Generate invite error:", err);
        console.error("❌ Error details:", err.message);
        
        // More specific error handling
        if (err.message.includes('invalid input syntax for type integer')) {
            return res.status(400).json({ 
                error: "Invalid event ID format. Please check the event ID." 
            });
        }
        
        res.status(500).json({ error: "Failed to generate invitation link: " + err.message });
    }
});

// ================ //
// REDIRECT EMBEDDED LINKS
// ================ //
router.get('/invite/:encodedLink', async (req, res) => {
    try {
        const { encodedLink } = req.params;
        
        // Decode the embedded link
        const decodedLink = Buffer.from(encodedLink, 'base64url').toString();
        
        // Extract the actual invitation URL
        const invitationUrl = new URL(decodedLink);
        
        // Redirect to the actual invitation page
        res.redirect(invitationUrl.pathname + invitationUrl.search);
        
    } catch (err) {
        console.error("Redirect embedded link error:", err);
        res.status(404).send(`
            <html>
                <body>
                    <h1>Invalid Invitation Link</h1>
                    <p>This invitation link is invalid or has expired.</p>
                </body>
            </html>
        `);
    }
});

// ================ //
// GET GUEST INVITATION STATUS (FIXED - NO DUPLICATES)
// ================ //
router.get('/invitation/:eventId/:guestId/:token', async (req, res) => {
    try {
        const { eventId, guestId, token } = req.params;

        console.log('🔍 GET INVITATION:', { eventId, guestId, token });

        // Convert to integers
        const numericEventId = parseInt(eventId);
        const numericGuestId = parseInt(guestId);

        const result = await pool.query(
            `SELECT 
                eg.id,
                eg.guest_name,
                eg.status,
                eg.invite_token,
                eg.responded_at,
                ep.client_name,
                ep.partner_name,
                ep.event_type,
                ep.event_date,
                ep.venue
             FROM event_guests eg
             JOIN event_plans ep ON eg.event_plan_id = ep.id
             WHERE eg.id = $1 AND eg.event_plan_id = $2 AND eg.invite_token = $3
             LIMIT 1`,  // ADD LIMIT 1 to ensure only one record
            [numericGuestId, numericEventId, token]
        );

        console.log('📊 Query result:', result.rows);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Invalid invitation link" });
        }

        const guest = result.rows[0];
        
        // Debug: Check what names we're getting
        console.log('👥 Client names:', {
            client_name: guest.client_name,
            partner_name: guest.partner_name
        });
        
        res.json({
            success: true,
            guest: {
                id: guest.id,
                guest_name: guest.guest_name,
                status: guest.status,
                event: {
                    client_name: guest.client_name,
                    partner_name: guest.partner_name,
                    event_type: guest.event_type,
                    event_date: guest.event_date,
                    venue: guest.venue
                }
            }
        });
        
    } catch (err) {
        console.error("Get invitation error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// In event-plan.js - ENHANCE RSVP ENDPOINT
router.post('/invitation/:eventId/:guestId/:token/respond', async (req, res) => {
  try {
    const { eventId, guestId, token } = req.params;
    const { status } = req.body;

    console.log('🎯 RSVP REQUEST:', { eventId, guestId, token, status });

    if (!['Accepted', 'Declined'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Convert to integers
    const numericEventId = parseInt(eventId);
    const numericGuestId = parseInt(guestId);

    console.log('🔢 Converted IDs:', { numericEventId, numericGuestId });

    const result = await pool.query(
      `UPDATE event_guests 
       SET status = $1, responded_at = NOW()
       WHERE id = $2 AND event_plan_id = $3 AND invite_token = $4
       RETURNING *`,
      [status, numericGuestId, numericEventId, token]
    );

    console.log('📊 Update result:', result.rows);

    if (result.rows.length === 0) {
      console.log('❌ No rows updated - invalid invitation');
      return res.status(404).json({ error: "Invalid invitation link" });
    }

    const guest = result.rows[0];
    
    // ✅ CREATE NOTIFICATION FOR CLIENT ABOUT RSVP
    const eventResult = await pool.query(
      `SELECT user_uuid, client_name FROM event_plans WHERE id = $1`,
      [numericEventId]
    );
    
    if (eventResult.rows.length > 0) {
      const event = eventResult.rows[0];
      
      await supabase
        .from('notifications')
        .insert([
          {
            user_uuid: event.user_id,
            type: 'GUEST_RSVP',
            title: 'Guest RSVP Update',
            message: `${guest.guest_name} has ${status.toLowerCase()} your invitation`,
            data: {
              eventId: numericEventId,
              guestId: numericGuestId,
              guestName: guest.guest_name,
              status: status,
              eventName: event.client_name
            },
            is_read: false,
            created_at: new Date().toISOString()
          }
        ]);
    }

    console.log('✅ RSVP updated successfully');

    res.json({ 
      success: true, 
      message: `Thank you for your response! You have ${status.toLowerCase()} the invitation.`
    });
    
  } catch (err) {
    console.error("❌ Update RSVP error:", err);
    console.error("❌ Error details:", err.message);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

// Helper function to generate embedded link
function generateEmbeddedLink(originalLink) {
    // Create a more "trustworthy" looking embedded link
    const domain = process.env.FRONTEND_DOMAIN || 'yourdomain.com';
    const path = Buffer.from(originalLink).toString('base64url');
    return `https://${domain}/invite/${path}`;
}

module.exports = router;