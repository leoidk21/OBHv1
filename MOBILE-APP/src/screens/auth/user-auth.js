import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE = "https://ela-untraceable-foresakenly.ngrok-free.dev/api";

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
        await SecureStore.setItemAsync('userData', JSON.stringify(userData));
        console.log('User data stored successfully');
    } catch (error) {
        console.error('Error storing user data:', error);
    }
};

// Get User Data
export const getUserData = async () => {
    try {
        const userData = await SecureStore.getItemAsync('userData');
        return userData ? JSON.parse(userData) : null;
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

// ---------------- AUTH CALLS ---------------- //
// SIGNUP
export const signup = async (firstName, lastName, email, password) => {
    console.log('user-auth.js: signUp called');
    console.log('Sending data:', { firstName, lastName, email });

    try {
        const res = await axios.post(`${API_BASE}/signup`, {
            first_name: firstName,
            last_name: lastName,
            email,
            password
        });

        console.log('Signup response:', res.data);

        if (res.data.token) await storeToken(res.data.token);
        if (res.data.user) await storeUserData(res.data.user);

        return res.data;
    } catch (error) {
        throw error.response ? error.response.data : { error: 'Server error' };
    }
};

// LOGIN
export const login = async (email, password) => {
    // console.log('user-auth.js: login called');
    try {
        const res = await axios.post(`${API_BASE}/login`, { email, password });
        // console.log('Login response:', res.data);

        if (res.data.token) await storeToken(res.data.token);
        if (res.data.user) await storeUserData(res.data.user);

        return res.data;
    } catch (error) {
        throw error.response ? error.response.data : { error: 'Server error' };
    }
};

// This is a helper function for making API requests that require the user to be logged in. 
// It automatically attaches the JWT token to every request.
// Parameters:
// endpoint - The API path (e.g., /mobile-users, /profile)
// method - HTTP method: GET, POST, PUT, DELETE (defaults to GET)
// data - Request body for POST/PUT requests (optional)
export const makeAuthenticatedRequest = async (endpoint, method = 'GET', data = null) => {
    try {
        const token = await getToken();
        if (!token) throw { error: 'Not authenticated' };
        console.log('Token being sent:', token ? 'Token exists' : 'No token');

        const config = {
            method,
            url: `${API_BASE}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            ...(data && { data })
        };

        const res = await axios(config);
        return res.data;
    } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
            await logout();
            throw { error: 'Session expired. Please login again.' };
        }
        throw error.response ? error.response.data : { error: 'Server error' };
    }
};

export const forgotPassword = async (email) => {
    try {
        const res = await axios.post(`${API_BASE}/forgot-password`, { email });
        return res.data;
    } catch (error) {
        throw error.response ? error.response.data : { error: 'Server error' };
    }
}

export const verifyCode = async (email, code) => {
    try {
        const res = await axios.post(`${API_BASE}/verify-code`, { email, code });
        return res.data;
    } catch (error) {
        throw error.response ? error.response.data : { error: 'Server error' };
    }
} 

export const resetPassword = async (email, code, newPassword) => {
    try {
        const res = await axios.post(`${API_BASE}/reset-password`, { 
            email,
            code,
            newPassword
        });
        return res.data;
    } catch (error) {
        throw error.response ? error.response.data : { error: 'Server error' };
    }
}

// update user profile
export const updateProfile = async (firstName, lastName, email) => {
    return makeAuthenticatedRequest('/update-profile', 'PUT', {
        first_name: firstName,
        last_name: lastName,
        email
    });
};