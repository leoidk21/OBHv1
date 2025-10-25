import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useEvent } from './EventContext'; // Import from EventContext

interface Notification {
  id: number;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  loading: boolean;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  refreshNotifications: async () => {},
  loading: false,
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Get user ID from EventContext
  const eventContext = useEvent();
  const userId = eventContext.userId?.toString(); // Convert to string if needed

  console.log('🎯 NotificationContext - User ID from EventContext:', userId);

  // Fetch notifications
  const refreshNotifications = async () => {
    if (!userId) {
      console.log('❌ No userId available for fetching notifications');
      return;
    }
    
    console.log('🔄 Fetching notifications for user:', userId);
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching notifications:', error);
      } else {
        console.log(`✅ Found ${data?.length || 0} notifications for user ${userId}`);
        setNotifications(data || []);
        
        // Calculate unread count
        const unread = data?.filter(notification => !notification.is_read).length || 0;
        console.log(`🔴 Unread count: ${unread}`);
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark as read
  const markAsRead = async (id: number) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Error updating notification:', error);
      } else {
        // Update local state
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === id 
              ? { ...notification, is_read: true, read_at: new Date().toISOString() }
              : notification
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!userId) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('❌ Error marking all as read:', error);
      } else {
        // Update local state
        setNotifications(prev =>
          prev.map(notification => ({
            ...notification,
            is_read: true,
            read_at: new Date().toISOString()
          }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Real-time subscription
  useEffect(() => {
    if (!userId) {
      console.log('❌ No userId for real-time subscription');
      return;
    }

    console.log('🎯 Setting up real-time for user:', userId);
    refreshNotifications(); // Initial fetch

    const subscription = supabase
      .channel(`user-${userId}-notifications`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('📢 REAL-TIME: New notification received:', payload.new);
          const newNotification = payload.new as Notification;
          
          // Add to notifications list
          setNotifications(prev => [newNotification, ...prev]);
          
          // Increment unread count if not read
          if (!newNotification.is_read) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Supabase subscription status:', status);
      });

    return () => {
      console.log('🧹 Cleaning up subscription for user:', userId);
      subscription.unsubscribe();
    };
  }, [userId]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      refreshNotifications,
      loading
    }}>
      {children}
    </NotificationContext.Provider>
  );
};