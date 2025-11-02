// notifications.js - FIXED VERSION
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('./middleware/mobile-auth');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ================ //
// GET MOBILE USER NOTIFICATIONS
// ================ //
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userUuid = req.user.id;
        
        console.log('Fetching notifications for user UUID:', userUuid);
        
        const { data: notifications, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_uuid', userUuid)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Get notifications error:', error);
            return res.status(500).json({ error: 'Failed to get notifications' });
        }

        console.log(`Found ${notifications?.length || 0} notifications`);

        res.json({
            success: true,
            notifications: notifications || []
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
        const userUuid = req.user.id;
        
        console.log('Marking notification as read:', id);
        
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_uuid', userUuid);

        if (error) {
            console.error('Mark notification read error:', error);
            return res.status(500).json({ error: 'Failed to mark notification as read' });
        }

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
        const userUuid = req.user.id;
        
        console.log('Marking all notifications as read for user:', userUuid);
        
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('user_uuid', userUuid)
            .eq('is_read', false);

        if (error) {
            console.error('Mark all read error:', error);
            return res.status(500).json({ error: 'Failed to mark all as read' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
});

// ================ //
// GET UNREAD NOTIFICATION COUNT
// ================ //
router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
        const userUuid = req.user.id;
        
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_uuid', userUuid)
            .eq('is_read', false);

        if (error) {
            console.error('Unread count error:', error);
            return res.status(500).json({ error: 'Failed to get unread count' });
        }

        res.json({
            success: true,
            unreadCount: count || 0
        });
    } catch (error) {
        console.error('Unread count error:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

module.exports = router;