import React, { createContext, useContext, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

const SOCKET_SERVER_URL = 'https://vxukqznjkdtuytnkhldu.supabase.co'; 

import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';

interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  markAsRead: (id: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  markAsRead: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ userId: number; children: React.ReactNode }> = ({ userId, children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // 1️⃣ Fetch existing notifications
  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) console.error('❌ Error fetching notifications:', error);
    else setNotifications(data || []);
  };

  // 2️⃣ Mark as read
  const markAsRead = async (id: number) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);

    if (error) console.error('❌ Error updating notification:', error);
    else {
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  };

  // 3️⃣ Subscribe to new notifications
  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel(`realtime:notifications:user:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`, // filter for this specific user
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);

          Alert.alert(newNotification.title, newNotification.message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <NotificationContext.Provider value={{ notifications, markAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};