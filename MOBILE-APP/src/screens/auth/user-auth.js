import * as SecureStore from 'expo-secure-store';
import { supabase } from '../../lib/supabase';

export const storeToken = async (token) => {
    try {
        await SecureStore.setItemAsync('userToken', token);
        console.log('Token stored successfully');
    } catch (error) {
        console.error('Error storing token:', error);
    }
};

// Store User Data
export const storeUserData = async (userData) => {
    try {
        if (!userData || typeof userData !== 'object') {
            console.error('Invalid user data format');
            return;
        }
        
        console.log('Storing user data:', userData);
        await SecureStore.setItemAsync('userData', JSON.stringify(userData));
        console.log('User data stored successfully');
    } catch (error) {
        console.error('Error storing user data:', error);
    }
};

export const fetchUserData = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            // Check if user is in mobile_users table
            const { data: mobileUser } = await supabase
                .from('mobile_users')
                .select('*')
                .eq('email', user.email)
                .single();

            if (mobileUser) {
                const userData = {
                    id: mobileUser.id,
                    auth_id: user.id,
                    email: user.email,
                    first_name: mobileUser.first_name,
                    last_name: mobileUser.last_name,
                    role: 'mobile_user'
                };
                
                console.log('🔄 FRESH MOBILE USER DATA:', userData);
                await SecureStore.setItemAsync('userData', JSON.stringify(userData));
                return userData;
            }
        }
        return null;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
};

export const getUserData = async () => {
    try {
        const userDataString = await SecureStore.getItemAsync('userData');
        if (!userDataString) {
            console.log('No user data found in storage');
            return null;
        }
        
        const userData = JSON.parse(userDataString);
        console.log('Retrieved user data:', userData);
        return userData;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
};

export const getToken = async () => {
    try {
        const token = await SecureStore.getItemAsync('userToken');
        return token;
    } catch (error) {
        console.error('Error getting token:', error);
        return null;
    }
};

export const logout = async () => {
    try {
        await SecureStore.deleteItemAsync('userToken');
        await SecureStore.deleteItemAsync('userData');
        console.log('Logged out successfully');
    } catch (error) {
        console.error('Error logging out:', error);
    }
};

export const isLoggedIn = async () => {
    const token = await getToken();
    return token !== null;
};

// ---------------- AUTH CALLS USING SUPABASE ---------------- //

// SIGNUP - Mobile users only
export const signup = async (firstName, lastName, email, password) => {
    console.log('user-auth.js: signUp called');
    try {
        // Clear any old cached data
        await SecureStore.deleteItemAsync('userData');
        
        // Check if email is already used by an admin
        const { data: adminCheck } = await supabase
            .from('admin_profiles')
            .select('id')
            .eq('email', email)
            .single();

        if (adminCheck) {
            throw new Error('This email is registered as an admin. Please use a different email for the mobile app.');
        }

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                }
            }
        });

        if (authError) throw authError;

        // ✅ FIX: Create mobile user record WITH auth_uid
        const { data: mobileUser, error: mobileError } = await supabase
            .from('mobile_users')
            .insert([{
                first_name: firstName,
                last_name: lastName,
                email: email,
                auth_uid: authData.user.id, // ✅ ADD THIS LINE
                role: 'user'
            }])
            .select()
            .single();

        if (mobileError) {
            console.error('Error creating mobile user:', mobileError);
            throw mobileError;
        }

        const userData = {
            id: mobileUser.id,
            auth_id: authData.user.id,
            email: email,
            first_name: firstName,
            last_name: lastName,
            role: 'mobile_user'
        };

        await storeUserData(userData);
        await storeToken(authData.session?.access_token);

        return { user: userData, session: authData.session };
    } catch (error) {
        console.error('Signup error:', error);
        throw error;
    }
};

// LOGIN - Mobile users only
export const login = async (email, password) => {
    console.log('user-auth.js: login called');
    try {
        // Clear any old cached data first
        await SecureStore.deleteItemAsync('userData');
        
        // Check if this email belongs to an admin
        const { data: adminCheck } = await supabase
            .from('admin_profiles')
            .select('id, role')
            .eq('email', email)
            .single();

        if (adminCheck) {
            throw new Error('Admin accounts cannot log in to the mobile app. Please use different account.');
        }

        // Sign in with Supabase
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) throw authError;

        // Get mobile user data
        const { data: mobileUser, error: mobileError } = await supabase
            .from('mobile_users')
            .select('*')
            .eq('email', email)
            .single();

        if (mobileError) {
            throw new Error('Mobile user account not found. Please sign up first.');
        }

        const userData = {
            id: mobileUser.id,
            auth_id: authData.user.id,
            email: email,
            first_name: mobileUser.first_name,
            last_name: mobileUser.last_name,
            role: 'mobile_user'
        };

        await storeUserData(userData);
        await storeToken(authData.session?.access_token);

        return { user: userData, session: authData.session };
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
};

// Get current user from Supabase
export const getCurrentUser = async () => {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('Error getting current user:', error);
            return null;
        }

        if (user) {
            // Get mobile user data
            const { data: mobileUser } = await supabase
                .from('mobile_users')
                .select('*')
                .eq('email', user.email)
                .single();

            if (mobileUser) {
                const userData = {
                    id: mobileUser.id,
                    auth_id: user.id,
                    email: user.email,
                    first_name: mobileUser.first_name,
                    last_name: mobileUser.last_name,
                    role: 'mobile_user'
                };
                
                await storeUserData(userData);
                return userData;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error in getCurrentUser:', error);
        return null;
    }
};

// Update user profile with Supabase
export const updateProfile = async (firstName, lastName, email) => {
    try {
        // Update auth user
        const { data: authData, error: authError } = await supabase.auth.updateUser({
            email: email,
            data: {
                first_name: firstName,
                last_name: lastName,
            }
        });

        if (authError) throw authError;

        // Update mobile_users table
        const { data: mobileData, error: mobileError } = await supabase
            .from('mobile_users')
            .update({
                first_name: firstName,
                last_name: lastName,
                email: email
            })
            .eq('email', authData.user.email)
            .select()
            .single();

        if (mobileError) throw mobileError;

        const userData = {
            id: mobileData.id,
            auth_id: authData.user.id,
            email: email,
            first_name: firstName,
            last_name: lastName,
            role: 'mobile_user'
        };
        
        await storeUserData(userData);
        return { user: userData };
    } catch (error) {
        console.error('Update profile error:', error);
        throw error;
    }
};

// Password reset with Supabase
export const resetPassword = async (email) => {
    try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Reset password error:', error);
        throw error;
    }
};

// Check Supabase session
export const checkAuthSession = async () => {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Session check error:', error);
            return null;
        }

        return session;
    } catch (error) {
        console.error('Error checking auth session:', error);
        return null;
    }
};

// Enhanced logout with Supabase
export const logoutWithSupabase = async () => {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error('Supabase logout error:', error);
        }
        
        await logout(); // Clear local storage
        console.log('Logged out from Supabase successfully');
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
};