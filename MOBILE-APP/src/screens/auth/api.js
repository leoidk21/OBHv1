import { Platform } from 'react-native';

// Use your network IP for physical devices
const DEV_BACKEND_URL = Platform.select({
  android: 'http://192.168.1.7:3000',
  ios: 'http://192.168.1.7:3000',
  default: 'http://192.168.1.7:3000',
});

// For production, replace with your actual deployed URL
// const PROD_BACKEND_URL = 'https://your-production-api.com';

export const API_URL = __DEV__ ? DEV_BACKEND_URL : PROD_BACKEND_URL;

export const API_ENDPOINTS = {
  GOOGLE_AUTH: `${API_URL}/api/auth/auth-google`,
};