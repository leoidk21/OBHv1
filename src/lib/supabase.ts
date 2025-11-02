import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://vxukqznjkdtuytnkhldu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4dWtxem5qa2R0dXl0bmtobGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDQxODAsImV4cCI6MjA3NjgyMDE4MH0.oTdBNJufBWSrQ1H1UHfQckKAtNnPEmgtS08fii1uRb0';

// Debug the URL
console.log('🔧 URL length:', supabaseUrl.length);
console.log('🔧 URL:', `"${supabaseUrl}"`);
console.log('🔧 Key length:', supabaseAnonKey.length);

// Validate URL
try {
  new URL(supabaseUrl); // This will throw if URL is invalid
  console.log('✅ URL is valid');
} catch (error: any) {
  console.log('❌ Invalid URL:', error.message);
  throw error;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});