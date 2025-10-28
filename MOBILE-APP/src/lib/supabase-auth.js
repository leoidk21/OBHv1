// supabase-auth.js - JAVASCRIPT VERSION
import { supabase } from './supabase';
import * as SecureStore from 'expo-secure-store';

// Authentication functions
export const signUpWithEmail = async (firstName, lastName, email, password) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });

    if (error) throw error;
    
    if (data.user) {
      // Store user data in mobile_users table
      const { error: profileError } = await supabase
        .from('mobile_users')
        .insert([
          {
            auth_uid: data.user.id,
            first_name: firstName,
            last_name: lastName,
            email: email,
            role: 'user',
            provider: 'email'
          }
        ]);

      if (profileError) {
        console.warn('Profile creation warning:', profileError);
      }
    }

    return { user: data.user, session: data.session };
  } catch (error) {
    throw new Error(error.message || 'Signup failed');
  }
};

export const signInWithEmail = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Get user profile from mobile_users table
    const { data: profile, error: profileError } = await supabase
      .from('mobile_users')
      .select('*')
      .eq('auth_uid', data.user.id)
      .single();

    if (profileError) {
      console.warn('Profile fetch warning:', profileError);
    }

    const userData = {
      ...data.user,
      ...profile,
      first_name: profile?.first_name || data.user.user_metadata.first_name,
      last_name: profile?.last_name || data.user.user_metadata.last_name,
    };

    return { user: userData, session: data.session };
  } catch (error) {
    throw new Error(error.message || 'Login failed');
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  
  // Clear SecureStore
  await SecureStore.deleteItemAsync('userToken');
  await SecureStore.deleteItemAsync('userId');
  await SecureStore.deleteItemAsync('userEmail');
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('mobile_users')
    .select('*')
    .eq('id', user.id)
    .single();

  return {
    ...user,
    ...profile,
    first_name: profile?.first_name || user.user_metadata.first_name,
    last_name: profile?.last_name || user.user_metadata.last_name,
  };
};

export const resetPassword = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
};

export const updateUserProfile = async (updates) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No user logged in');

  // Update in auth metadata
  if (updates.first_name || updates.last_name) {
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        first_name: updates.first_name,
        last_name: updates.last_name,
      }
    });
    if (authError) throw authError;
  }

  // Update email if changed
  if (updates.email && updates.email !== user.email) {
    const { error: emailError } = await supabase.auth.updateUser({
      email: updates.email
    });
    if (emailError) throw emailError;
  }

  // Update in mobile_users table
  const { error: profileError } = await supabase
    .from('mobile_users')
    .update(updates)
    .eq('id', user.id);

  if (profileError) throw profileError;

  return { success: true };
};

// Check authentication status
export const checkAuthStatus = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    console.error('Auth status check failed:', error);
    return false;
  }
};

// Get session token for authenticated requests
export const getSessionToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};