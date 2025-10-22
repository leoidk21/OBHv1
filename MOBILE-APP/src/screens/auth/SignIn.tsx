import React, { useState, useRef, useEffect } from 'react'
import { StyleSheet, Text, View, Image, TextInput , TouchableOpacity, TouchableWithoutFeedback, Keyboard, Button} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../config/colors';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Alert } from 'react-native';

import * as SecureStore from 'expo-secure-store';
import { login } from '../auth/user-auth';
import { useEvent } from '../../context/EventContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SignIn = () => {
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  
  const dismissKeyboardAndBlur = () => {
    emailRef.current?.blur();
    passwordRef.current?.blur();
    Keyboard.dismiss();
  };

  const navigation: NavigationProp<ParamListBase> = useNavigation();
  const { loadEventData, resetEventState } = useEvent();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const data = await login(email, password);
      const { token, user } = data;

      console.log('Logging in as:', user.id);

      // GET CURRENT USER ID BEFORE STORING NEW ONE
      const previousUserId = await SecureStore.getItemAsync('userId');
      
      // Store NEW user info - FIXED SECURESTORE USAGE
      await SecureStore.setItemAsync('userToken', token, {});
      await SecureStore.setItemAsync('userId', String(user.id), {});
      await SecureStore.setItemAsync('userEmail', user.email, {});
      console.log('User credentials stored.');

      // CRITICAL: CLEAR REACT STATE WHEN SWITCHING USERS
      if (previousUserId && previousUserId !== String(user.id)) {
        console.log('Switching users, clearing React state...');
        const { resetEventState } = useEvent();
        await resetEventState();
      }

      // Now load event data for the NEW user
      console.log('Loading existing event data for user...');
      await loadEventData();

      navigation.navigate('Home');
    } catch (err: any) {
      Alert.alert("Error", err.error || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check for existing data
  const checkForExistingEventData = async (userId: string): Promise<boolean> => {
    try {
      const eventData = await AsyncStorage.getItem(`eventData_${userId}`);
      const hasData = !!eventData && eventData.length > 50; // Basic validation
      console.log('📊 Existing data check:', hasData ? 'Data found' : 'No data');
      return hasData;
    } catch (error) {
      console.error('Error checking existing data:', error);
      return false;
    }
  };

  // const debugCurrentStorage = async () => {
  //   const userId = await SecureStore.getItemAsync('userId');
  //   if (userId) {
  //     const stored = await AsyncStorage.getItem(`eventData_${userId}`);
  //     console.log('=== CURRENT STORAGE STATE ===');
  //     console.log('Total keys:', stored ? Object.keys(JSON.parse(stored)).length : 0);
  //     console.log('All keys:', stored ? Object.keys(JSON.parse(stored)) : []);
  //     console.log('=============================');
  //   }
  // };

  // const checkAllUsers = async () => {
  //   console.log('🔍 CHECKING ALL USERS IN ASYNCSTORAGE:');
    
  //   // Get all keys from AsyncStorage
  //   const allKeys = await AsyncStorage.getAllKeys();
  //   const eventDataKeys = allKeys.filter(key => key.startsWith('eventData_'));
    
  //   console.log('📋 Users with event data:', eventDataKeys);
    
  //   for (const key of eventDataKeys) {
  //     const data = await AsyncStorage.getItem(key);
  //     const parsed = JSON.parse(data || '{}');
  //     console.log(`👤 ${key}:`, Object.keys(parsed).length, 'keys');
  //   }
  // };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={dismissKeyboardAndBlur}>
        <LinearGradient
            colors={['#FFFFFF', '#f2e8e2ff']}
            style={styles.container}
        >
          <View style={styles.centeredContent}> 
            <Image 
              source={require('../../assets/Logo.png')}
              style={{
                width: wp('58%'),
                height: wp('58%'),
              }} 
              resizeMode='contain'
            />
            <Text style={[styles.topText, { fontSize: wp('5.5%') }]}>Login</Text>
          </View>

          {/* <View>
            <TouchableOpacity onPress={debugCurrentStorage}>
              <Text>Check Storage</Text>
            </TouchableOpacity>
          </View>

          <View>
            <TouchableOpacity onPress={checkAllUsers}>
              <Text>Check DWADADAW</Text>
            </TouchableOpacity>
          </View> */}

          <View style={styles.formContainer}>
            <TextInput
              ref={emailRef}
              placeholder='Email' 
              value={email}
              onChangeText={setEmail} 
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
              style={[
                styles.textInput,
                isEmailFocused && styles.textInputFocused
              ]}
              onFocus={() => {
                setIsEmailFocused(true);
              }}
              onBlur={() => {
                setIsEmailFocused(false);
              }}
            />

            <TextInput
              ref={passwordRef}
              placeholder='Password' 
              value={password}
              onChangeText={setPassword} 
              secureTextEntry={true}
              autoComplete="password"
              editable={!loading}
              style={[
                styles.textInput,
                isPasswordFocused && styles.textInputFocused
              ]}
              onFocus={() => {
                setIsPasswordFocused(true);
              }}
              onBlur={() => {
                setIsPasswordFocused(false);
              }}
            />

            <TouchableOpacity 
              style={[styles.submitBtn, loading && { opacity: 0.5 }]}
              onPress={handleSignIn}
              disabled={!!loading}
            >
              <Text style={styles.submitText}>
                {loading ? 'SIGNING IN...' : 'SIGN IN'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPass')}
              disabled={!!loading}
            >
              <Text style={{ color: loading ? '#999' : '#000' }}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.loginContainer}>
            <TouchableOpacity
              onPress={() => navigation.navigate('SignUp')}
            >
            <Text style={styles.loginText}>
                Don't have an account?{' '}
                <Text 
                  style={styles.loginLink}>
                  Sign Up
                </Text>
            </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
       </TouchableWithoutFeedback>
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  centeredContent: {
    alignItems: 'center',
  },  

  formContainer: {
    gap: 14,
    marginTop: hp('2%'),
    alignItems: 'center',
    justifyContent: 'center',
  },

  textInput: {
    borderWidth: 1,
    width: wp('80%'),
    fontSize: wp('4%'),
    borderRadius: wp('10%'),
    borderColor: colors.border,
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('1.6%'),
    backgroundColor: colors.white,
  },

  textInputFocused: {
    elevation: 5,
    borderWidth: 2,
    shadowRadius: 4,
    shadowOpacity: 0.3,
    shadowColor: colors.indicator,
    borderColor: colors.facebookBtn,
    shadowOffset: { width: 0, height: 2 },
  },

  submitBtn: {
    width: wp('80%'),
    fontSize: wp('4%'),
    marginTop: hp('0.7%'),
    borderRadius: wp('50%'),
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('1.6%'),
    backgroundColor: colors.button,
  },

  submitText: {
    fontSize: wp('3.5%'),
    textAlign: 'center',
    color: colors.white,
  },

  topText: {},

  loginContainer: {
    bottom: hp('3%'),
    width: wp('100%'),
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loginText: {},
  
  loginLink: {
    fontWeight: 'bold',
  },
});

export default SignIn;
  // import * as Linking from 'expo-linking';
  // import * as AuthSession from 'expo-auth-session';
  // import * as Google from 'expo-auth-session/providers/google';
  // import * as WebBrowser from 'expo-web-browser';
  // import { GOOGLE_WEB_CLIENT_ID } from '@env';
  // WebBrowser.maybeCompleteAuthSession();

  // const [googleLoading, setGoogleLoading] = useState(false);

  // const handleGoogleSignIn = async () => {
  //   try {
  //     setGoogleLoading(true);
  //     console.log('🚀 Starting manual Google OAuth...');

  //     const redirectUri = 'https://auth.expo.io/@leochavez2002/Mobile';
  //     const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  //       `client_id=${GOOGLE_WEB_CLIENT_ID}` +
  //       `&redirect_uri=${encodeURIComponent(redirectUri)}` +
  //       `&response_type=id_token` +
  //       `&scope=${encodeURIComponent('openid profile email')}` +
  //       `&nonce=${Math.random().toString(36)}`;

  //     console.log('🔗 Auth URL:', authUrl);

  //     const result = await WebBrowser.openAuthSessionAsync(
  //       authUrl,
  //       redirectUri
  //     );

  //     console.log('📥 Result:', result);

  //     if (result.type === 'success') {
  //       const url = result.url;
  //       console.log('✅ Success URL:', url);
        
  //       // Extract id_token from URL fragment
  //       const idToken = extractIdToken(url);
        
  //       if (idToken) {
  //         console.log('✅ ID token extracted');
  //         await sendToBackend({ idToken });
  //       } else {
  //         console.error('❌ No ID token in URL');
  //         Alert.alert('Error', 'No authentication token received');
  //         setGoogleLoading(false);
  //       }
  //     } else {
  //       console.log('❌ Auth cancelled or failed');
  //       setGoogleLoading(false);
  //     }
  //   } catch (error) {
  //     console.error('❌ Auth error:', error);
  //     Alert.alert('Error', 'Failed to sign in with Google');
  //     setGoogleLoading(false);
  //   }
  // };

  // const extractIdToken = (url: string): string | null => {
  //   try {
  //     // Extract fragment (everything after #)
  //     const fragment = url.split('#')[1];
  //     if (!fragment) return null;

  //     // Parse fragment parameters
  //     const params = new URLSearchParams(fragment);
  //     return params.get('id_token');
  //   } catch (error) {
  //     console.error('Error extracting token:', error);
  //     return null;
  //   }
  // };

  // const sendToBackend = async (authData: any) => {
  //   try {
  //     console.log('🔄 Sending to backend...');
      
  //     const response = await fetch('http://192.168.1.7:3000/api/auth/google', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify(authData),
  //     });

  //     const data = await response.json();
  //     console.log('✅ Backend response:', data);

  //     if (data.ok) {
  //       Alert.alert('Success! 🎉', `Welcome ${data.user?.first_name || data.user?.email}!`);
  //       // TODO: Store token and navigate
  //     } else {
  //       Alert.alert('Login Failed', data.error || 'Unknown server error');
  //     }
  //   } catch (error) {
  //     console.error('❌ Backend error:', error);
  //     Alert.alert('Connection Error', 'Could not connect to server');
  //   } finally {
  //     setGoogleLoading(false);
  //   }
  // };

{/* <View style={styles.divider}>
  <View style={styles.dividerLine} />
  <Text style={styles.dividerText}>OR</Text>
  <View style={styles.dividerLine} />
</View>

  <View style={styles.continueContainer}>
  <TouchableOpacity 
    style={styles.googleBtn}
    onPress={handleGoogleSignIn}
    disabled={googleLoading}
  >
    <Image
      source={require('../../assets/google.png')}
      style={{
        width: wp('6%'),
        height: wp('6%'),
      }}
      resizeMode='contain'
    />
    <Text style={styles.googleText}>
      {googleLoading ? 'Signing in...' : 'Sign in with Google'}
    </Text>
  </TouchableOpacity>
</View> */}