const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('./middleware/mobile-auth');

// ================ //
// GET ADMIN NOTIFICATIONS
// ================ //
router.get('/', authenticateToken, async (req, res) => {
    try {
        const adminId = req.user.id;
        
        console.log('📢 Fetching notifications for admin ID:', adminId);
        
        const result = await pool.query(
            `SELECT * FROM notifications 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 50`,
            [adminId]
        );

        console.log(`✅ Found ${result.rows.length} notifications for admin ${adminId}`);

        res.json({
            success: true,
            notifications: result.rows
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
});

// ================ //
// MARK NOTIFICATION AS READ
// ================ //
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('📢 Marking notification as read:', id);
        
        await pool.query(
            `UPDATE notifications SET is_read = true WHERE id = $1`,
            [id]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// ================ //
// MARK ALL NOTIFICATIONS AS READ
// ================ //
router.put('/mark-all-read', authenticateToken, async (req, res) => {
    try {
        const adminId = req.user.id;
        
        console.log('📢 Marking all notifications as read for admin:', adminId);
        
        await pool.query(
            `UPDATE notifications SET is_read = true WHERE user_id = $1`,
            [adminId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
});

module.exports = router;