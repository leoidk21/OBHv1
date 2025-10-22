import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = "https://ela-untraceable-foresakenly.ngrok-free.dev/api";

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
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  status: string;
  proofUri?: string | null;
}

interface EventContextType {
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
}

const EventContext = createContext<EventContextType | undefined>(undefined);

interface EventProviderProps {
  children: ReactNode;
}

// 🚀 ENHANCED: Proper mutex lock for storage operations
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

export const EventProvider: React.FC<EventProviderProps> = ({ children }) => {
  const [eventData, setEventData] = useState<Record<string, any>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [eventStatus, setEventStatus] = useState<string>('Pending');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // NEW: Track current user

  const dataVersion = useRef(0);

  // 🚀 ENHANCED: User session validation
  const validateUserSession = async (): Promise<{userId: string, token: string} | null> => {
    try {
      const userId = await SecureStore.getItemAsync("userId");
      const token = await SecureStore.getItemAsync("userToken");
      
      if (!userId || !token) {
        console.log('❌ No valid user session found');
        return null;
      }
      
      return { userId, token };
    } catch (error) {
      console.error('❌ Session validation failed:', error);
      return null;
    }
  };

  const resetEventState = async (userId?: string): Promise<void> => {
    setEventData({});
    setEventStatus('Pending');
    setCurrentUserId(null);
  };

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

  // 🚀 ENHANCED: Load event data with proper locking and validation
  const loadEventData = async (forceReload = false): Promise<void> => {
    const session = await validateUserSession();
    if (!session) {
      setEventData({});
      setCurrentUserId(null);
      return;
    }

    const { userId } = session;

    return storageMutex.runExclusive(userId, async () => {
      try {
        setIsLoading(true);
        
        console.log('👤 Loading event data for userId:', userId);
        
        // Verify session is still valid after lock acquisition
        const currentSession = await validateUserSession();
        if (!currentSession || currentSession.userId !== userId) {
          console.log('⚠️ User changed during load operation, aborting');
          return;
        }

        setCurrentUserId(userId);

        // Read from AsyncStorage
        const eventDataString = await AsyncStorage.getItem(eventKeyFor(userId));
        console.log('📦 Retrieved event data:', eventDataString ? `Length: ${eventDataString.length}` : 'NULL');
        
        if (eventDataString) {
          try {
            const parsedData = JSON.parse(eventDataString);
            
            // Validate data structure
            if (parsedData && typeof parsedData === 'object') {
              console.log('✅ Loaded event data keys:', Object.keys(parsedData));
              setEventData(parsedData);
              dataVersion.current++;
            } else {
              console.warn('⚠️ Invalid data structure, resetting');
              await AsyncStorage.removeItem(eventKeyFor(userId));
              setEventData({});
            }
          } catch (parseError) {
            console.error('❌ Data corruption detected, resetting storage');
            await AsyncStorage.removeItem(eventKeyFor(userId));
            setEventData({});
          }
        } else {
          console.log('📭 No event data found, setting empty object');
          setEventData({});
        }
      } catch (error) {
        console.error('❌ Error loading event data:', error);
      } finally {
        setIsLoading(false);
      }
    });
  };

  // 🚀 ENHANCED: Update event with atomic operations
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

  // 🚀 ENHANCED: Mark event as submitted
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

  // 🚀 ENHANCED: Reset event submission with complete cleanup
  const resetEventSubmission = async (): Promise<void> => {
    const session = await validateUserSession();
    if (!session) return;

    const { userId } = session;
    
    await clearAllUserData(userId);
    console.log('🔄 Event data reset for user:', userId);
  };

  const refreshEventStatus = async (): Promise<void> => {
    const session = await validateUserSession();
    if (!session) return;

    const { userId, token } = session;

    try {
      const response = await fetch(`${API_BASE}/event-plans/status`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (response.ok) {
        const statusData = await response.json();
        const newStatus = statusData.status || 'Pending';
        setEventStatus(newStatus);
      } else {
        console.log('Server response not OK:', response.status);
        if (response.status === 404) {
          setEventStatus('Not Found');
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing event status:', error);
    }
  };

  // 🚀 ENHANCED: Guest management with async and locking
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
    const guests = eventData.guests || [];
    const guestStats = getGuestStats();
    const budgetArray = eventData.budget || [];

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
    };
  };

  const generateMobileAppId = (): string => {
    return "mobile-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9);
  };

  // Submit to desktop (unchanged except async)
  const submitEventToDesktop = async (): Promise<any> => {
    try {
      console.log('🚀 Starting submission...');
      
      const session = await validateUserSession();
      if (!session) throw { error: "Not authenticated" };
      
      const { token } = session;
      const eventSummary = getEventSummary();
      
      if (!eventSummary.eSignature) throw new Error("E-Signature required");

      console.log('🌐 Sending to backend...');
      const response = await fetch(`${API_BASE}/event-plans/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(eventSummary),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed: ${response.status} ${errText}`);
      }

      const result = await response.json();
      console.log('✅ Submission successful');
      
      await markEventAsSubmitted();

      return result;
    } catch (err) {
      console.error('❌ Submission error:', err);
      throw err;
    }
  };

  // 🚀 ENHANCED: Recover event data
  const recoverEventData = async (): Promise<boolean> => {
    const session = await validateUserSession();
    if (!session) return false;

    const { userId } = session;

    return storageMutex.runExclusive(userId, async () => {
      try {
        // Try to load from backup
        const backupData = await AsyncStorage.getItem(`${eventKeyFor(userId)}_backup`);
        if (backupData) {
          console.log('🔄 Recovering data from backup');
          const parsedData = JSON.parse(backupData);
          setEventData(parsedData);
          await AsyncStorage.setItem(eventKeyFor(userId), backupData);
          await AsyncStorage.removeItem(`${eventKeyFor(userId)}_backup`);
          return true;
        }
        return false;
      } catch (error) {
        console.error('❌ Recovery failed:', error);
        return false;
      }
    });
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
        loadEventData: () => loadEventData(true),
        isEventSubmitted,
        debugStorageKeys,
        refreshEventStatus,
        recoverEventData,
        clearAllUserData,
        resetEventState,
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