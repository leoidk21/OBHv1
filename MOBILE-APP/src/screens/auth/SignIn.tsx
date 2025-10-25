import React, { useState, useRef, useEffect } from 'react'
import { StyleSheet, Text, View, Image, TextInput , TouchableOpacity, TouchableWithoutFeedback, Keyboard, Button} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../config/colors';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Alert } from 'react-native';
import { useFonts } from 'expo-font';

import * as SecureStore from 'expo-secure-store';
import { login } from '../auth/user-auth';
import { useEvent } from '../../context/EventContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SignIn = () => {
  const [fontsLoaded] = useFonts({
      'Poppins': require('../../assets/fonts/Poppins-Regular.ttf'),
      'Loviena': require('../../assets/fonts/lovienapersonaluseonlyregular-yy4pq.ttf'),
      'Canela': require('../../assets/fonts/CanelaCondensed-Regular-Trial.otf'),
      'Senbatsu': require('../../assets/fonts/Senbatsu.otf'),
      'Velista': require('../../assets/fonts/VELISTA.ttf'),
  });

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
              placeholderTextColor="#999"
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
    color: '#000000',
    borderWidth: 1,
    width: wp('80%'),
    fontSize: wp('4%'),
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
});

export default SignIn;