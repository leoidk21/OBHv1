import React, { useState, useRef, useEffect } from 'react'
import { StyleSheet, Text, View, Image, TextInput , TouchableOpacity, TouchableWithoutFeedback, Keyboard, Button} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../config/colors';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Alert } from 'react-native';
import { useFonts } from 'expo-font';

import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../type';

type SignInScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignIn'>;

import * as SecureStore from 'expo-secure-store';
import { useEvent } from '../../context/EventContext';

import { login } from '../auth/user-auth';
import { signInWithEmail } from '../../lib/supabase-auth';

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SignIn = () => {
  const [fontsLoaded] = useFonts({
      'Poppins': require('../../assets/fonts/Poppins-Regular.ttf'),
      'Loviena': require('../../assets/fonts/lovienapersonaluseonlyregular-yy4pq.ttf'),
      'Canela': require('../../assets/fonts/CanelaCondensed-Regular-Trial.otf'),
      'Senbatsu': require('../../assets/fonts/Senbatsu.otf'),
      'Velista': require('../../assets/fonts/VELISTA.ttf'),
  });

  const eventKeyFor = (userId: string) => `eventData_${userId}`;

  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  
  const dismissKeyboardAndBlur = () => {
    emailRef.current?.blur();
    passwordRef.current?.blur();
    Keyboard.dismiss();
  };

  const clearStorage = async () => {
    Alert.alert(
      "Clear Storage",
      "This will clear all saved login data. Are you sure?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Clear", 
          onPress: async () => {
            try {
              // Clear SecureStore items
              await SecureStore.deleteItemAsync('userToken');
              await SecureStore.deleteItemAsync('userData');
              
              // If you're also using AsyncStorage, clear that too
              // await AsyncStorage.clear();
              
              Alert.alert("Success", "Storage cleared successfully!");
              console.log('✅ SecureStore cleared');
            } catch (error) {
              console.error('Error clearing storage:', error);
              Alert.alert("Error", "Failed to clear storage");
            }
          } 
        }
      ]
    );
  };

  const checkSecureStore = async () => {
  try {
    const token = await SecureStore.getItemAsync('userToken');
    const userData = await SecureStore.getItemAsync('userData');
    
    console.log('🔐 SecureStore - Token exists:', !!token);
    console.log('🔐 SecureStore - UserData exists:', !!userData);
    
    if (userData) {
      console.log('📦 UserData:', JSON.parse(userData));
    }
  } catch (error) {
    console.error('Error checking SecureStore:', error);
  }
  };

  const navigation = useNavigation<SignInScreenNavigationProp>();
  const { loadEventData, resetEventState, recoverEventData } = useEvent();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    checkRememberedUser();
  }, []);

  const checkRememberedUser = async () => {
    try {
      const rememberMeStatus = await AsyncStorage.getItem('rememberMe');
      const token = await SecureStore.getItemAsync('userToken');

      if (rememberMeStatus === 'true' && token) {
        console.log('Auto-login using stored token...');
        navigation.replace('Home');
      }
    } catch (error) {
      console.error('Error checking remembered user:', error);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const toggleRememberMe = () => {
    setRememberMe(!rememberMe);
  };

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const { user, session } = await signInWithEmail(email, password);
      console.log('Logging in as:', user.id);

      // Always store the token securely
      if (session?.access_token) {
        await SecureStore.setItemAsync('userToken', session.access_token);
        await SecureStore.setItemAsync('userId', String(user.id));
        await SecureStore.setItemAsync('userEmail', String(user.email));
      }

      // Handle remember me preference
      if (rememberMe) {
        await AsyncStorage.setItem('rememberMe', 'true');
      } else {
        await AsyncStorage.setItem('rememberMe', 'false');
      }

      // Continue app logic
      await loadEventData();

      const currentData = await AsyncStorage.getItem(eventKeyFor(user.id));
      if (!currentData || currentData === '{}') {
        console.log('No local data, attempting recovery...');
        const recovered = await recoverEventData();
        if (recovered) console.log('Data recovered successfully!');
      }

      navigation.navigate('Home');
    } catch (err: any) {
      Alert.alert("Error", err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

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
            <Text style={[styles.topText, { fontSize: wp('5.5%'), fontFamily: 'Poppins', width: wp("100%"), textAlign: 'center' }]}>Sign In</Text>
          </View>

          <View style={styles.formContainer}>
            <TextInput
              ref={emailRef}
              placeholder='Email' 
              placeholderTextColor="#999"
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
              onFocus={() => setIsEmailFocused(true)}
              onBlur={() => setIsEmailFocused(false)}
            />

            <View style={styles.passwordContainer}>
              <TextInput
                ref={passwordRef}
                placeholder='Password'
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword} 
                secureTextEntry={!showPassword}
                autoComplete="password"
                editable={!loading}
                style={[
                  styles.textInput,
                  styles.passwordInput,
                  isPasswordFocused && styles.textInputFocused
                ]}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={toggleShowPassword}
                disabled={loading}
              >
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={24} 
                  color="#999" 
                />
              </TouchableOpacity>
            </View>

            {/* Clear Storage Button */}
            <TouchableOpacity onPress={clearStorage}>
              <Text>Clear Storage</Text>
            </TouchableOpacity>

            {/* Optional: Debug button */}
            <TouchableOpacity onPress={checkSecureStore}>
              <Text>Check Storage</Text>
            </TouchableOpacity>

            {/* Remember Me Checkbox */}
            <View style={styles.rememberMeContainer}>
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={toggleRememberMe}
                disabled={loading}
              >
                <View style={[
                  styles.checkboxBox,
                  rememberMe && styles.checkboxBoxChecked
                ]}>
                  {rememberMe && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.rememberMeText}>Remember Me</Text>
              </TouchableOpacity>
            </View>

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
              <Text style={{ color: loading ? '#999' : '#000', fontFamily: "Poppins", width: wp("100%"), textAlign: 'center' }}>
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
                <Text style={styles.loginLink}>
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
    color: '#000000',
    fontSize: wp('3.6%'),
    borderRadius: wp('10%'),
    borderColor: colors.border,
    paddingHorizontal: wp('5%'),
    paddingVertical: wp("3%"),
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
    fontFamily: "Poppins"
  },

  topText: {
    fontFamily: "Poppins"
  },

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

  passwordContainer: {
    position: 'relative',
    width: wp('80%'),
    alignSelf: 'center',
  },

  passwordInput: {
    paddingRight: 50,
  },

  eyeIcon: {
    position: 'absolute',
    right: wp('5%'),
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: '100%',
  },

  // Remember Me Styles
  rememberMeContainer: {
    width: wp('80%'),
    alignSelf: 'center',
  },

  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },

  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.border,
    backgroundColor: colors.white,
  },

  checkboxBoxChecked: {
    backgroundColor: colors.button, // Use your button color
    borderColor: colors.button,
  },

  rememberMeText: {
    fontSize: wp('3.2%'),
    fontFamily: 'Poppins',
    color: '#000',
  },
});

export default SignIn;