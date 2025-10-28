import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard'; // For Expo

import { supabase } from '../lib/supabase';

// Storage keys
const eventKeyFor = (userId: string) => `eventData_${userId}`;
const flagKeyFor = (userId: string) => `hasSubmittedEvent_${userId}`;

interface EventStatus {
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
}

interface EventSegment {
  name: string;
  venue: string;
  startTime: string;
  endTime: string;
}

interface Guest {
  id: string;
  name: string;
  status: string;
  inviteLink: string;
  guest_name?: string; // Add this for database compatibility
  invite_link?: string; // Add this for database compatibility
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  status: string;
  proofUri?: string | null;
}

interface EventContextType {
    userId: string | null;
    eventData: Record<string, any>;
    updateEvent: (key: string, value: any) => Promise<void>;
    saveEventToBackend: () => Promise<void>;
    calculateCountdown: (eventDate: string) => {
      days: number;
      hours: number;
      minutes: number;
    };
    submitEventToDesktop: () => Promise<void>;
    getEventSummary: () => Record<string, any>;
    addGuest: (guest: Omit<Guest, "id">) => Promise<void>;
    updateGuest: (id: string, updates: Partial<Guest>) => Promise<void>;
    removeGuest: (id: string) => Promise<void>;
    getGuests: () => Guest[];
    getGuestStats: () => {
      total: number;
      accepted: number;
      declined: number;
      pending: number;
    };
    markEventAsSubmitted: () => Promise<void>;
    resetEventSubmission: () => Promise<void>;
    loadEventData: () => Promise<void>;
    isEventSubmitted: () => Promise<boolean>;
    debugStorageKeys: () => Promise<void>;
    clearAllUserData: (userId: string) => Promise<void>;
    resetEventState: (userId?: string) => Promise<void>;

    eventStatus: string;
    refreshEventStatus: () => Promise<void>;
    recoverEventData: () => Promise<boolean>;

    generateInviteLink: (guestId: string, guestName: string) => Promise<string>;
    copyToClipboard: (text: string) => void;
    shareViaMessenger: (link: string) => void;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

interface EventProviderProps {
  children: ReactNode;
}

class StorageMutex {
  private locks: Map<string, Promise<any>> = new Map();

  async runExclusive<T>(userId: string, operation: () => Promise<T>): Promise<T> {
    // If there's already a lock for this user, wait for it
    if (this.locks.has(userId)) {
      await this.locks.get(userId);
    }

    // Create new lock
    const lock = operation();
    this.locks.set(userId, lock);

    try {
      const result = await lock;
      return result;
    } finally {
      // Clean up lock if it's still the current one
      if (this.locks.get(userId) === lock) {
        this.locks.delete(userId);
      }
    }
  }
}

const storageMutex = new StorageMutex();

const validateUserSession = async (): Promise<{userId: string, token: string} | null> => {
  try {
    console.log('🔍 Checking Supabase auth session...');
    
    // ✅ Get the current session from Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Supabase session error:', sessionError);
      return null;
    }
    
    if (!session) {
      console.log('❌ No Supabase session found');
      return null;
    }
    
    console.log('✅ Supabase session found:', {
      userId: session.user?.id,
      email: session.user?.email,
      expiresAt: session.expires_at
    });
    
    // ✅ Get the token from SecureStore for backup
    const storedToken = await SecureStore.getItemAsync("userToken");
    const storedUserId = await SecureStore.getItemAsync("userId");
    
    console.log('📦 Stored credentials:', {
      storedUserId: storedUserId,
      storedToken: storedToken ? 'exists' : 'missing'
    });
    
    // ✅ Use the session user ID (this should be the UUID)
    if (session.user) {
      return { 
        userId: session.user.id, 
        token: session.access_token || storedToken || '' 
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Session validation failed:', error);
    return null;
  }
};

export const EventProvider: React.FC<EventProviderProps> = ({ children }) => {
  const [eventData, setEventData] = useState<Record<string, any>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [eventStatus, setEventStatus] = useState<string>('Pending');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // NEW: Track current user

  const dataVersion = useRef(0);

  // GET CURRENT EVENT ID
  const validateUserSession = async (): Promise<{userId: string, token: string} | null> => {
    try {
      console.log('🔍 Checking Supabase auth session...');
      
      // ✅ Get the current session from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Supabase session error:', sessionError);
        return null; // Explicit return
      }
      
      if (!session) {
        console.log('❌ No Supabase session found');
        return null; // Explicit return
      }
      
      console.log('✅ Supabase session found:', {
        userId: session.user?.id,
        email: session.user?.email,
        expiresAt: session.expires_at
      });
      
      // ✅ Get the token from SecureStore for backup
      const storedToken = await SecureStore.getItemAsync("userToken");
      const storedUserId = await SecureStore.getItemAsync("userId");
      
      console.log('📦 Stored credentials:', {
        storedUserId: storedUserId,
        storedToken: storedToken ? 'exists' : 'missing'
      });
      
      // ✅ Use the session user ID (this should be the UUID)
      if (session.user) {
        return { 
          userId: session.user.id, 
          token: session.access_token || storedToken || '' 
        }; // Explicit return
      }
      
      // ✅ Explicit return null if no user found
      return null;
      
    } catch (error) {
      console.error('❌ Session validation failed:', error);
      return null; // Explicit return
    }
  };

  const generateInviteLink = async (guestId: string, guestName: string): Promise<string> => {
    try {
      console.log('🔗 Generating invite link for:', { guestId, guestName });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      // Get the latest event for this user
      const { data: events, error: eventsError } = await supabase
        .from('event_plans')
        .select('id, client_name, event_date')
        .eq('user_uuid', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (eventsError || !events || events.length === 0) {
        throw new Error("No events found. Please submit an event first.");
      }

      const event = events[0];
      
      // Generate a simple token
      const inviteToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Generate the invite link using the frontend URL
      const inviteLink = `https://wedding-invites-six.vercel.app/invite/${event.id}/${guestId}/${inviteToken}`;
      
      console.log('🔗 Generated invite link:', inviteLink);
      
      // Try multiple ways to find the guest
      let guestData;
      
      // First try: Find by mobile_guest_id (string)
      const { data: guestByMobileId, error: mobileError } = await supabase
        .from('event_guests')
        .select('id')
        .eq('mobile_guest_id', guestId)
        .eq('event_plan_id', event.id)
        .single();

      if (!mobileError && guestByMobileId) {
        guestData = guestByMobileId;
        console.log('✅ Found guest by mobile_guest_id');
      } else {
        // Second try: Find by numeric ID (if guestId is a number)
        const numericGuestId = parseInt(guestId);
        if (!isNaN(numericGuestId)) {
          const { data: guestById, error: idError } = await supabase
            .from('event_guests')
            .select('id')
            .eq('id', numericGuestId)
            .eq('event_plan_id', event.id)
            .single();

          if (!idError && guestById) {
            guestData = guestById;
            console.log('✅ Found guest by numeric ID');
          }
        }
        
        // Third try: Find by guest_name as fallback
        if (!guestData) {
          const { data: guestByName, error: nameError } = await supabase
            .from('event_guests')
            .select('id')
            .eq('guest_name', guestName)
            .eq('event_plan_id', event.id)
            .single();

          if (!nameError && guestByName) {
            guestData = guestByName;
            console.log('✅ Found guest by name');
          }
        }
      }

      if (!guestData) {
        console.error('❌ Guest not found in database. Available guests:');
        
        // Debug: List all guests for this event
        const { data: allGuests, error: listError } = await supabase
          .from('event_guests')
          .select('id, guest_name, mobile_guest_id, event_plan_id')
          .eq('event_plan_id', event.id);

        if (!listError && allGuests) {
          console.log('📋 All guests for event:', allGuests);
        }
        
        throw new Error(`Guest "${guestName}" not found in database for event ${event.id}`);
      }

      // Use the numeric database ID to update the guest
      const { error: updateError } = await supabase
        .from('event_guests')
        .update({ 
          invite_link: inviteLink,
          invite_token: inviteToken
        })
        .eq('id', guestData.id); // Use the numeric database ID

      if (updateError) {
        console.error('❌ Error updating guest with invite link:', updateError);
        throw updateError;
      }

      console.log('✅ Guest updated with invite link successfully');
      return inviteLink;
      
    } catch (error) {
      console.error('❌ Error generating invite link:', error);
      throw error;
    }
  };

  // GET LATEST SUBMITTED EVENT
  const getLatestSubmittedEventId = async (): Promise<string | null> => {
    try {
      console.log('🔄 Fetching latest submitted events...');
      
      const session = await validateUserSession();
      if (!session) return null;

      const { userId } = session;
      
      // Get ALL events for this user, sorted by most recent using Supabase
      const { data, error } = await supabase
        .from('event_plans')
        .select('id, client_name, event_date, status, submitted_at, created_at')
        .eq('user_uuid', userId)
        .order('submitted_at', { ascending: false }) // Sort by submitted_at directly in query
        .limit(1);

      if (error) {
        console.error('❌ Supabase error:', error);
        return null;
      }

      console.log('📋 All user events:', data);
      
      if (data && data.length > 0) {
        const latestEvent = data[0];
        console.log('🎯 LATEST EVENT FOUND:', {
          id: latestEvent.id,
          client_name: latestEvent.client_name,
          event_date: latestEvent.event_date,
          status: latestEvent.status,
          submitted_at: latestEvent.submitted_at
        });
        
        return latestEvent.id.toString();
      }
      
      console.log('❌ No events found for user');
      return null;
    } catch (error) {
      console.error('Error fetching latest event:', error);
      return null;
    }
  };

  // GET LATEST APPROVED EVENT
  const getLatestApprovedEventId = async (): Promise<string | null> => {
    try {
      console.log('🔄 Fetching approved events...');
      
      const session = await validateUserSession();
      if (!session) return null;

      const { userId } = session;
      
      // Get approved events for this user using Supabase
      const { data, error } = await supabase
        .from('event_plans')
        .select('id, client_name, event_date, status, submitted_at')
        .eq('user_uuid', userId)
        .eq('status', 'Approved') // Filter for approved events only
        .order('event_date', { ascending: false }) // Get most recent event date first
        .limit(1);

      if (error) {
        console.error('❌ Supabase error:', error);
        return null;
      }

      console.log('📋 Approved events:', data);
      
      if (data && data.length > 0) {
        const latestApproved = data[0];
        console.log('🎯 LATEST APPROVED EVENT:', latestApproved);
        return latestApproved.id.toString();
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching approved events:', error);
      return null;
    }
  };

  // COPY TO CLIPBOARD
  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      // React Native only - using expo-clipboard
      await Clipboard.setStringAsync(text);
      console.log('Copied to clipboard:', text);
    } catch (error) {
      console.error('Copy to clipboard error:', error);
      throw error;
    }
  };

  // SHARE VIA MESSANGER
  const shareViaMessenger = async (link: string, guestName?: string): Promise<void> => {
    try {
      const message = guestName 
        ? `${guestName}, you're invited to our wedding! 🎉 Click here to RSVP: ${link}`
        : `You're invited to our wedding! 🎉 Click here to RSVP: ${link}`;

      // React Native - use Share API (CORRECTED - only one parameter)
      await Share.share({
        message: message,
        title: 'Wedding Invitation'
        // Remove the url property as it's not needed for basic sharing
      });
    } catch (error) {
      console.error('Share error:', error);
      throw error;
    }
  };

  // TRANSFORM BACKEND TO FRONTEND
  const transformBackendToFrontend = async (backendEvent: any) => {
    try {
      // Load guests from event_guests table with proper typing
      let guests: Guest[] = []; // Explicitly type as Guest[]
      if (backendEvent.id) {
        const { data: guestsData, error } = await supabase
          .from('event_guests')
          .select('*')
          .eq('event_plan_id', backendEvent.id);
        
        if (!error && guestsData) {
          guests = guestsData.map(guest => ({
            id: guest.id?.toString() || '',
            name: guest.guest_name || '',
            status: guest.status || 'Pending',
            inviteLink: guest.invite_link || '',
            guest_name: guest.guest_name, // Keep for compatibility
            invite_link: guest.invite_link // Keep for compatibility
          }));
        }
      }

      // Parse event segments with proper typing
      let schedule: EventSegment[] = []; // Explicitly type as EventSegment[]
      if (backendEvent.event_segments) {
        try {
          if (typeof backendEvent.event_segments === 'string') {
            const parsed = JSON.parse(backendEvent.event_segments);
            schedule = Array.isArray(parsed) ? parsed : [];
          } else if (Array.isArray(backendEvent.event_segments)) {
            schedule = backendEvent.event_segments;
          }
        } catch (e) {
          console.error('Error parsing event segments:', e);
          schedule = [];
        }
      }

      // Parse expenses/budget with proper typing
      let budget: Expense[] = []; // Explicitly type as Expense[]
      if (backendEvent.expenses) {
        try {
          if (typeof backendEvent.expenses === 'string') {
            const parsed = JSON.parse(backendEvent.expenses);
            budget = Array.isArray(parsed) ? parsed : [];
          } else if (Array.isArray(backendEvent.expenses)) {
            budget = backendEvent.expenses;
          }
        } catch (e) {
          console.error('Error parsing expenses:', e);
          budget = [];
        }
      }

      return {
        event_type: backendEvent.event_type,
        wedding_type: backendEvent.category,
        selected_package: { 
          pax: backendEvent.package, 
          price: backendEvent.budget 
        },
        package_price: backendEvent.budget,
        guest_range: backendEvent.guest_count?.toString(),
        client_name: backendEvent.client_name,
        partner_name: backendEvent.partner_name,
        full_client_name: backendEvent.client_name + (backendEvent.partner_name ? ` & ${backendEvent.partner_name}` : ''),
        event_date: backendEvent.event_date,
        formatted_event_date: backendEvent.event_date,
        venue: backendEvent.venue,
        budget: budget,
        guests: guests,
        guestCount: backendEvent.guest_count || guests.length,
        schedule: schedule,
        eSignature: backendEvent.e_signature,
        status: backendEvent.status,
        client_email: backendEvent.client_email,
        client_phone: backendEvent.client_phone
      };
    } catch (error) {
      console.error('Error in transformBackendToFrontend:', error);
      return {
        event_type: backendEvent.event_type,
        wedding_type: backendEvent.category,
        selected_package: { pax: backendEvent.package, price: backendEvent.budget },
        package_price: backendEvent.budget,
        guest_range: backendEvent.guest_count?.toString(),
        client_name: backendEvent.client_name,
        partner_name: backendEvent.partner_name,
        full_client_name: backendEvent.client_name + (backendEvent.partner_name ? ` & ${backendEvent.partner_name}` : ''),
        event_date: backendEvent.event_date,
        formatted_event_date: backendEvent.event_date,
        venue: backendEvent.venue,
        budget: [] as Expense[],
        guests: [] as Guest[],
        guestCount: backendEvent.guest_count || 0,
        schedule: [] as EventSegment[],
        eSignature: backendEvent.e_signature,
        status: backendEvent.status,
        client_email: backendEvent.client_email,
        client_phone: backendEvent.client_phone
      };
    }
  };

  // RECOVER EVENT DATA
  const recoverEventData = async (): Promise<boolean> => {
    try {
      const session = await validateUserSession();
      if (!session) return false;

      const { userId } = session;
      console.log('🔄 Attempting data recovery for user:', userId);

      // Check if userId is UUID or integer
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

      let query = supabase
        .from('event_plans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      // Use the appropriate column based on userId type
      if (isUUID) {
        console.log('✅ User ID is UUID, using user_uuid column');
        query = query.eq('user_uuid', userId);
      } else {
        console.log('✅ User ID is integer, using user_id column');
        query = query.eq('user_id', parseInt(userId));
      }

      const { data: events, error } = await query;

      if (error) {
        console.error('❌ Recovery query error:', error);
        return false;
      }

      if (events && events.length > 0) {
        console.log('✅ Found event in database, recovering...');
        const eventData = await transformBackendToFrontend(events[0]);
        await AsyncStorage.setItem(eventKeyFor(userId), JSON.stringify(eventData));
        setEventData(eventData);
        return true;
      }

      console.log('❌ No events found for recovery');
      return false;
    } catch (error) {
      console.error('❌ Recovery failed:', error);
      return false;
    }
  };

  // RESET EVENT STATE
  const resetEventState = async (userId?: string): Promise<void> => {
    setEventData({});
    setEventStatus('Pending');
    setCurrentUserId(null);
  };

  // CLEAR ALL USER DATA
  const clearAllUserData = async (userId: string): Promise<void> => {
    console.log('🧹 Clearing ALL data for user:', userId);
    
    const storageKeys = [
      eventKeyFor(userId),
      `${eventKeyFor(userId)}_backup`,
      `${eventKeyFor(userId)}_temp`,
      flagKeyFor(userId),
    ];

    const deleteOperations = storageKeys.map(key => 
      AsyncStorage.removeItem(key).catch(e => console.log(`⚠️ Could not delete ${key}:`, e))
    );

    deleteOperations.push(
      SecureStore.deleteItemAsync(flagKeyFor(userId)).catch(e => 
        console.log('⚠️ Could not delete SecureStore flag:', e))
    );

    await Promise.all(deleteOperations);
    
    // Also clear React state
    setEventData({});
    setEventStatus('Pending');
    
    console.log('✅ Complete data clearance for user:', userId);
  };

  // LOAD EVENT DATA
  const loadEventData = async (): Promise<void> => {
    const session = await validateUserSession();
    if (!session) {
      setEventData({});
      setCurrentUserId(null);
      return;
    }

    const { userId } = session;

    console.log('👤 Loading event data for user:', userId, 'Type:', typeof userId);

    try {
      setIsLoading(true);
      
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      
      if (isUUID) {
        console.log('✅ User ID is UUID, checking backend...');
        
        // Check for approved events in backend using user_uuid
        const { data: approvedEvents, error } = await supabase
          .from('event_plans')
          .select('*')
          .eq('user_uuid', userId)  // Use user_uuid for UUID users
          .eq('status', 'Approved')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('❌ Error fetching approved events:', error);
        }

        if (approvedEvents && approvedEvents.length > 0) {
          console.log('✅ Found approved event in backend');
          const eventData = await transformBackendToFrontend(approvedEvents[0]);
          await AsyncStorage.setItem(eventKeyFor(userId), JSON.stringify(eventData));
          setEventData(eventData);
          return;
        }
      } else {
        console.log('ℹ️ User ID is integer, using user_id column');
        // For integer users, use user_id column
        const { data: approvedEvents, error } = await supabase
          .from('event_plans')
          .select('*')
          .eq('user_id', parseInt(userId))  // Use user_id for integer users
          .eq('status', 'Approved')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('❌ Error fetching approved events:', error);
        }

        if (approvedEvents && approvedEvents.length > 0) {
          console.log('✅ Found approved event in backend');
          const eventData = await transformBackendToFrontend(approvedEvents[0]);
          await AsyncStorage.setItem(eventKeyFor(userId), JSON.stringify(eventData));
          setEventData(eventData);
          return;
        }
      }

      // ✅ Fallback to local storage
      const eventDataString = await AsyncStorage.getItem(eventKeyFor(userId));
      if (eventDataString) {
        const parsedData = JSON.parse(eventDataString);
        setEventData(parsedData);
        console.log('✅ Loaded from local storage');
      } else {
        console.log('📭 No data found anywhere');
        setEventData({});
      }

    } catch (error) {
      console.error('❌ Error loading event data:', error);
      setEventData({});
    } finally {
      setIsLoading(false);
    }
  };

  // UPDATE AN EVENT
  const updateEvent = async (key: string, value: any): Promise<void> => {
    const session = await validateUserSession();
    if (!session) {
      console.log('❌ No valid session for update');
      return;
    }

    const { userId } = session;

    return storageMutex.runExclusive(userId, async () => {
      try {
        // Verify we're still operating on the same user
        const currentSession = await validateUserSession();
        if (!currentSession || currentSession.userId !== userId) {
          console.log('⚠️ User changed during update, aborting');
          return;
        }

        // Atomic read-modify-write operation
        const existingDataString = await AsyncStorage.getItem(eventKeyFor(userId));
        const existingData = existingDataString ? JSON.parse(existingDataString) : {};
        
        console.log("📖 Storage currently has", Object.keys(existingData).length, "keys for user:", userId);
        console.log("🔄 Updating key:", key, "with value:", value);

        let newData;
        
        if (key === "guests_and_count" && typeof value === "object") {
          newData = { 
            ...existingData,
            guests: value.guests,
            guestCount: value.guestCount 
          };
        } else {
          newData = { ...existingData, [key]: value };
        }

        console.log("🆕 New data will have", Object.keys(newData).length, "keys");

        // Update React state
        setEventData(newData);

        // Atomic write with error handling
        try {
          await AsyncStorage.setItem(eventKeyFor(userId), JSON.stringify(newData));
          dataVersion.current++;
          console.log("💾 Saved to AsyncStorage for user:", userId, "Version:", dataVersion.current);
        } catch (storageError) {
          console.error("❌ AsyncStorage save failed:", storageError);
          // Save to backup
          await AsyncStorage.setItem(`${eventKeyFor(userId)}_backup`, JSON.stringify(newData));
        }
        
      } catch (error) {
        console.error("❌ Failed to update event:", error);
      }
    });
  };

  // ENHANCED: Mark event as submitted
  const markEventAsSubmitted = async (): Promise<void> => {
    const session = await validateUserSession();
    if (!session) return;

    const { userId } = session;
    
    await SecureStore.setItemAsync(flagKeyFor(userId), "true");
    console.log('✅ Event marked as submitted for user:', userId);
  };

  // Check if event was submitted
  const isEventSubmitted = async (): Promise<boolean> => {
    const session = await validateUserSession();
    if (!session) return false;

    const { userId } = session;
    const flag = await SecureStore.getItemAsync(flagKeyFor(userId));
    return flag === 'true';
  };

  // ENHANCED: Reset event submission with complete cleanup
  const resetEventSubmission = async (): Promise<void> => {
    const session = await validateUserSession();
    if (!session) return;

    const { userId } = session;
    
    await clearAllUserData(userId);
    console.log('🔄 Event data reset for user:', userId);
  };

  // REFRESH EVENT STATUS
  const refreshEventStatus = async (): Promise<void> => {
    const session = await validateUserSession();
    if (!session) return;

    const { userId } = session;

    try {
      // Get the latest event status using Supabase
      const { data, error } = await supabase
        .from('event_plans')
        .select('status')
        .eq('user_uuid', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.log('No event found or error:', error.message);
        setEventStatus('Not Found');
        return;
      }

      if (data) {
        const newStatus = data.status || 'Pending';
        setEventStatus(newStatus);
        console.log('✅ Event status updated:', newStatus);
      } else {
        setEventStatus('Not Found');
      }
    } catch (error) {
      console.error('❌ Error refreshing event status:', error);
      setEventStatus('Error');
    }
  };

  // ENHANCED: Guest management with async and locking
  const addGuest = async (guest: Omit<Guest, "id">): Promise<void> => {
    console.log('👥 ADD GUEST - Before:', eventData.guests?.length || 0);
    
    const newGuest: Guest = {
      ...guest,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };

    const currentGuests = eventData.guests || [];

    if (currentGuests.find((g: Guest) => g.name === guest.name && g.inviteLink === guest.inviteLink)) {
      console.log('⚠️ Guest already exists');
      return;
    }

    const updatedGuests = [...currentGuests, newGuest];
    console.log('👥 ADD GUEST - After:', updatedGuests.length);

    await updateEvent("guests_and_count", {
      guests: updatedGuests,
      guestCount: updatedGuests.length
    });
  };

  // ENHANCED: Guest management with async and locking
  const updateGuest = async (id: string, updates: Partial<Guest>): Promise<void> => {
    console.log('👥 UPDATE GUEST - ID:', id, 'Updates:', updates);

    const currentGuests = eventData.guests || [];
    const updatedGuests = currentGuests.map((guest: Guest) =>
      guest.id === id ? { ...guest, ...updates } : guest
    );

    await updateEvent("guests", updatedGuests);
  };

  const removeGuest = async (id: string): Promise<void> => {
    console.log('👥 REMOVE GUEST - ID:', id);
    
    const currentGuests = eventData.guests || [];
    const updatedGuests = currentGuests.filter((guest: Guest) => guest.id !== id);
    
    console.log('👥 REMOVE GUEST - Before:', currentGuests.length, 'After:', updatedGuests.length);

    await updateEvent("guests_and_count", {
      guests: updatedGuests,
      guestCount: updatedGuests.length
    });
  };

  const getGuests = (): Guest[] => {
    return eventData.guests || [];
  };

  const getGuestStats = () => {
    const guests = getGuests();
    return {
      total: guests.length,
      accepted: guests.filter((g) => g.status === "Accepted").length,
      declined: guests.filter((g) => g.status === "Declined").length,
      pending: guests.filter((g) => g.status === "Pending").length,
    };
  };

  // Calculate countdown (unchanged)
  const calculateCountdown = (eventDate: string) => {
    const now = new Date().getTime();
    const eventTime = new Date(eventDate).getTime();
    const difference = eventTime - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0 };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes };
  };

  // Placeholder for backend save (unchanged)
  const saveEventToBackend = async (): Promise<void> => {
    try {
      console.log("📤 Event data ready for backend:", Object.keys(eventData));
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  };

  // Get event summary (unchanged)
  const getEventSummary = (): Record<string, any> => {
    const guests: Guest[] = eventData.guests || [];
    const guestStats = getGuestStats();
    const budgetArray: Expense[] = eventData.budget || [];

    const totalBudget = budgetArray.reduce(
      (sum: number, expense: Expense) => sum + (expense.amount || 0),
      0
    );

    return {
      event_type: eventData.event_type || "Wedding",
      event_date: eventData.event_date,
      guest_range: eventData.guest_range,
      client_name: eventData.client_name,
      client_email: eventData.client_email,
      client_phone: eventData.client_phone,
      package_price: eventData.package_price,
      partner_name: eventData.partner_name,
      full_client_name: eventData.full_client_name,
      formatted_event_date: eventData.formatted_event_date,
      schedule: eventData.schedule || [],
      guests: guests,
      budget: eventData.budget || [],
      eSignature: eventData.eSignature || null,
      totalGuests: guestStats.total,
      totalBudget: totalBudget,
      submissionDate: new Date().toISOString(),
      mobile_app_id: generateMobileAppId(),
      submitted_from: "OBH-APP",
      venue: eventData.venue || '',
      selected_package: eventData.selected_package || { name: '', pax: 0, price: 0 }
    };
  };

  const generateMobileAppId = (): string => {
    return "mobile-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9);
  };

  const submitEventToDesktop = async (): Promise<any> => {
    try {
      console.log('🚀 Starting submission to Supabase...');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Not authenticated");

      const eventSummary = getEventSummary();
      
      if (!eventSummary.eSignature) throw new Error("E-Signature required");

      console.log('🌐 Saving to Supabase...');
      
      // Insert event plan with ALL fields
      const { data, error } = await supabase
        .from('event_plans')
        .insert([
          {
            user_uuid: user.id,
            event_type: eventSummary.event_type,
            package: eventSummary.selected_package?.name || eventSummary.guest_range || null,
            client_name: eventSummary.client_name || eventSummary.full_client_name,
            partner_name: eventSummary.partner_name,
            event_date: eventSummary.event_date,
            guest_count: eventSummary.totalGuests || eventSummary.guest_range,
            budget: eventSummary.totalBudget,
            status: 'Pending',
            expenses: eventSummary.budget,
            category: eventSummary.event_type,
            client_email: eventSummary.client_email,
            client_phone: eventSummary.client_phone,
            venue: eventSummary.venue?.name || eventSummary.venue,
            event_segments: JSON.stringify(eventSummary.schedule),
            eSignature: eventSummary.eSignature,
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase insert error:', error);
        throw new Error(`Failed to save event: ${error.message}`);
      }

      // FIX: Insert guests with proper typing
      if (eventSummary.guests && eventSummary.guests.length > 0) {
        console.log('👥 Saving guests:', eventSummary.guests);
        
        const guestInserts: any[] = eventSummary.guests.map((guest: Guest) => ({
          event_plan_id: data.id,
          guest_name: guest.name || guest.guest_name || '',
          status: guest.status || 'Pending',
          invite_link: guest.inviteLink || guest.invite_link || null,
        }));

        console.log('👥 Guest inserts:', guestInserts);

        const { error: guestsError } = await supabase
          .from('event_guests')
          .insert(guestInserts);

        if (guestsError) {
          console.error('❌ Could not save guests:', guestsError);
          throw new Error(`Failed to save guests: ${guestsError.message}`);
        } else {
          console.log('✅ Guests saved successfully');
        }
      } else {
        console.log('⚠️ No guests to save');
      }

      console.log('✅ Event saved successfully with ID:', data.id);
      
      await markEventAsSubmitted();

      return data;
    } catch (err) {
      console.error('Submission error:', err);
      throw err;
    }
  };

  // Debug function
  const debugStorageKeys = async (): Promise<void> => {
    try {
      const session = await validateUserSession();
      if (!session) {
        console.log('🐛 No valid user session');
        return;
      }

      const { userId } = session;
      console.log('🐛 Current UserId:', userId);
      console.log('🐛 Tracked in state:', currentUserId);
      
      const stored = await AsyncStorage.getItem(eventKeyFor(userId));
      console.log('🐛 AsyncStorage data exists:', !!stored);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('🐛 Keys:', Object.keys(parsed));
        console.log('🐛 Guests count:', parsed.guests?.length || 0);
      }

      // Check backup
      const backup = await AsyncStorage.getItem(`${eventKeyFor(userId)}_backup`);
      console.log('🐛 Backup exists:', !!backup);

      // Check flag
      const flag = await SecureStore.getItemAsync(flagKeyFor(userId));
      console.log('🐛 Submission flag:', flag);
    } catch (error) {
      console.error('🐛 Debug error:', error);
    }
  };

  // 🚀 ENHANCED: Initialize with user tracking
  useEffect(() => {
    const initializeEventContext = async () => {
      const session = await validateUserSession();
      
      if (!session) {
        console.log('❌ No user credentials found, clearing data');
        setEventData({});
        setCurrentUserId(null);
        setIsInitialized(true);
        return;
      }

      const { userId } = session;
      console.log(`👤 Initializing for user ${userId}`);
      
      // Set current user before loading data
      setCurrentUserId(userId);
      
      // Load data first, then refresh status
      await loadEventData();
      await refreshEventStatus();
      
      setIsInitialized(true);
      console.log('✅ Event context initialized for user:', userId);
    };

    initializeEventContext();
  }, []);

  return (
    <EventContext.Provider
      value={{
        userId: currentUserId,
        eventData,
        updateEvent,
        eventStatus,
        saveEventToBackend,
        calculateCountdown,
        submitEventToDesktop,
        getEventSummary,
        addGuest,
        updateGuest,
        removeGuest,
        getGuests,
        getGuestStats,
        markEventAsSubmitted,
        resetEventSubmission,
        loadEventData: () => loadEventData(),
        isEventSubmitted,
        debugStorageKeys,
        refreshEventStatus,
        recoverEventData,
        clearAllUserData,
        resetEventState,
        generateInviteLink,
        copyToClipboard,
        shareViaMessenger,
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

export const useEvent = (): EventContextType => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEvent must be used within an EventProvider");
  }
  return context;
};

function generateSimpleToken() {
  throw new Error("Function not implemented.");
}
