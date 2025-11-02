// NotificationContext.tsx - FIXED VERSION
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useEvent } from './EventContext';

interface Notification {
  id: number;
  user_uuid: string;
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
  const [subscription, setSubscription] = useState<any>(null);
  
  // Get user data from EventContext
  const eventContext = useEvent();
  
  // ✅ FIXED: Use the available userId which should be the UUID based on your logs
  // Your logs show: "Setting up Supabase real-time for user: 132" 
  // But we need the UUID: "a1166d38-7714-4710-b410-7bd65bd597a0"
  const userUuid = eventContext.userId; // This should be the UUID
  
  console.log('🎯 NotificationContext Debug:', {
    userUuid: userUuid,
    hasUserId: !!eventContext.userId,
  });

  // Fetch notifications
  const refreshNotifications = async () => {
    if (!userUuid) {
      console.log('❌ No userUuid available for fetching notifications');
      return;
    }
    
    console.log('🔄 Fetching notifications for user UUID:', userUuid);
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_uuid', userUuid)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching notifications:', error);
      } else {
        console.log(`✅ Found ${data?.length || 0} notifications for UUID: ${userUuid}`);
        setNotifications(data || []);
        
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

  // Setup real-time subscription with UUID
  useEffect(() => {
    if (!userUuid) {
      console.log('❌ No userUuid for real-time subscription');
      return;
    }

    console.log('🎯 Setting up real-time for user UUID:', userUuid);
    refreshNotifications(); // Initial fetch

    // Clean up existing subscription
    if (subscription) {
      subscription.unsubscribe();
    }

    const newSubscription = supabase
      .channel(`notifications-${userUuid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_uuid=eq.${userUuid}`,
        },
        (payload) => {
          console.log('📢 REAL-TIME UPDATE:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification;
            setNotifications(prev => {
              const exists = prev.some(n => n.id === newNotification.id);
              if (exists) return prev;
              console.log('🆕 New notification received:', newNotification);
              return [newNotification, ...prev];
            });
            
            if (!newNotification.is_read) {
              setUnreadCount(prev => prev + 1);
            }
          }
          else if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new as Notification;
            setNotifications(prev => 
              prev.map(notification =>
                notification.id === updatedNotification.id
                  ? updatedNotification
                  : notification
              )
            );
            
            // Recalculate unread count
            const updatedUnreadCount = notifications
              .map(n => n.id === updatedNotification.id ? updatedNotification : n)
              .filter(n => !n.is_read).length;
            setUnreadCount(updatedUnreadCount);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Supabase subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to real-time notifications for UUID:', userUuid);
        }
      });

    setSubscription(newSubscription);

    return () => {
      console.log('🧹 Cleaning up subscription for UUID:', userUuid);
      newSubscription.unsubscribe();
    };
  }, [userUuid]);

  // Mark as read
  const markAsRead = async (id: number) => {
    if (!userUuid) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', id)
        .eq('user_uuid', userUuid);

      if (error) {
        console.error('❌ Error updating notification:', error);
      } else {
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
    if (!userUuid) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_uuid', userUuid)
        .eq('is_read', false);

      if (error) {
        console.error('❌ Error marking all as read:', error);
      } else {
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