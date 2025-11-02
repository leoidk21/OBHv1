// src/lib/supabase-test.ts
import { supabase } from './supabase';

export async function testSupabaseConnection() {
  try {
    console.log('🧪 Testing Supabase connection...');
    
    // Test basic query (replace 'your_table' with an actual table)
    const { data, error } = await supabase
      .from('your_table')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Supabase error:', error);
      return false;
    }

    console.log('✅ Supabase connected successfully!');
    console.log('📊 Sample data:', data);
    return true;
  } catch (error) {
    console.log('❌ Connection failed:', error);
    return false;
  }
}