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

// Store User Data - Improved version
export const storeUserData = async (userData) => {
    try {
        // Validate userData structure
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
            const userData = {
                id: user.id,
                email: user.email,
                first_name: user.user_metadata?.first_name,
                last_name: user.user_metadata?.last_name,
            };
            
            console.log('🔄 FRESH DATA:', userData);
            await SecureStore.setItemAsync('userData', JSON.stringify(userData));
            return userData;
        }
        return null;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
};

// Get User Data - Improved version
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

// Get stored token
export const getToken = async () => {
    try {
        const token = await SecureStore.getItemAsync('userToken');
        return token;
    } catch (error) {
        console.error('Error getting token:', error);
        return null;
    }
};

// Remove token (logout)
export const logout = async () => {
    try {
        await SecureStore.deleteItemAsync('userToken');
        await SecureStore.deleteItemAsync('userData');
        console.log('Logged out successfully');
    } catch (error) {
        console.error('Error logging out:', error);
    }
};

// Check if user is logged in
export const isLoggedIn = async () => {
    const token = await getToken();
    return token !== null;
};

// ---------------- AUTH CALLS USING SUPABASE ---------------- //

// SIGNUP with Supabase
export const signup = async (firstName, lastName, email, password) => {
    console.log('user-auth.js: signUp called');
    try {
        // Clear any old cached data
        await SecureStore.deleteItemAsync('userData');
        
        const res = await axios.post(`${API_BASE}/signup`, {
            first_name: firstName,
            last_name: lastName,
            email,
            password
        });

        console.log('Signup response:', res.data);

        if (res.data.token) await storeToken(res.data.token);
        if (res.data.user) await storeUserData(res.data.user);

        // Force fetch fresh data
        await fetchUserData();
        
        return res.data;
    } catch (error) {
        console.error('Signup error:', error);
        throw error.response ? error.response.data : { error: 'Server error' };
    }
};


// LOGIN with Supabase
export const login = async (email, password) => {
    console.log('user-auth.js: login called');
    try {
        // Clear any old cached data first
        await SecureStore.deleteItemAsync('userData');
        
        const res = await axios.post(`${API_BASE}/login`, { email, password });
        console.log('Login response data:', res.data);

        if (res.data.token) {
            await storeToken(res.data.token);
        }
        
        if (res.data.user) {
            console.log('Storing user data from login:', res.data.user);
            await storeUserData(res.data.user);
        }

        // Force fetch fresh data from backend to ensure it's correct
        await fetchUserData();
        
        return res.data;
    } catch (error) {
        console.error('Login error:', error);
        throw error.response ? error.response.data : { error: 'Server error' };
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
            const userData = {
                id: user.id,
                email: user.email,
                first_name: user.user_metadata?.first_name,
                last_name: user.user_metadata?.last_name,
            };
            
            // Update stored data
            await storeUserData(userData);
            return userData;
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
        const { data, error } = await supabase.auth.updateUser({
            email: email,
            data: {
                first_name: firstName,
                last_name: lastName,
            }
        });

        if (error) {
            console.error('Supabase update profile error:', error);
            throw error;
        }

        console.log('Supabase profile update response:', data);

        if (data.user) {
            const userData = {
                id: data.user.id,
                email: data.user.email,
                first_name: data.user.user_metadata?.first_name,
                last_name: data.user.user_metadata?.last_name,
            };
            
            await storeUserData(userData);
        }

        return data;
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