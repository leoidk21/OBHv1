import React, { useState, useRef } from 'react'
import { StyleSheet, Text, View, Image, TextInput , TouchableOpacity, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform, ScrollView} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../config/colors';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

import { signup } from '../auth/user-auth';
import { useEvent } from '../../context/EventContext';
import * as SecureStore from 'expo-secure-store';

const SignUp = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const { resetEventSubmission, loadEventData } = useEvent();

  const handleSignUp = async () => {
    console.log('Values:', { firstName, lastName, email });

    if (!firstName || !lastName || !email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    try {
      // 1. Sign up via API
      const data = await signup(
        firstName.trim(),
        lastName.trim(), 
        email.trim(), 
        password.trim()
      );
      
      const { token, user } = data; // ADD THIS - get the response data
      console.log('🆕 NEW USER SIGNED UP:', user.id);

      // 2. ⚠️ CRITICAL: Clear any previous user data
      await resetEventSubmission?.();

      // 3. ⚠️ CRITICAL: Store NEW user credentials
      await SecureStore.setItemAsync('userToken', token);
      await SecureStore.setItemAsync('userId', String(user.id));
      await SecureStore.setItemAsync('userEmail', user.email);
      
      console.log('✅ New user credentials stored:', user.id);

      // 4. Load fresh data for new user
      await loadEventData();

      Alert.alert("Success", "Account created successfully!");
      navigation.navigate("ChooseEvent");
      
    } catch (err: any) {
      console.error('Signup error:', err);
      Alert.alert("Error", err.error || "Something went wrong");
    }
  };

  const navigation: NavigationProp<ParamListBase> = useNavigation();

  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [isFirstNameFocused, setIsFirstNameFocused] = useState(false);
  const [isLastNameFocused, setIsLastNameFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const dismissKeyboardAndBlur = () => {
    emailRef.current?.blur();
    passwordRef.current?.blur();
    Keyboard.dismiss();
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={dismissKeyboardAndBlur}>
          <View style={{ flex: 1 }}>
              <LinearGradient
                colors={['#FFFFFF', '#f2e8e2ff']}
                style={styles.container}
              >
              <KeyboardAwareScrollView
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  enableOnAndroid={true}
                  extraScrollHeight={20}
                  enableAutomaticScroll={true}
                >
                  <ScrollView 
                      contentContainerStyle={styles.scrollContent}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
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
                      <Text style={[styles.topText, { fontSize: wp('5.5%') }]}>Create an account</Text>
                    </View>

                    <View style={styles.formContainer}>
                      <TextInput
                        ref={firstNameRef}
                        placeholder="First Name"
                        value={firstName}
                        onChangeText={setFirstName}
                        style={[
                          styles.textInput,
                          isFirstNameFocused && styles.textInputFocused
                        ]}
                        onFocus={() => setIsFirstNameFocused(true)}
                        onBlur={() => setIsFirstNameFocused(false)}
                      />

                      <TextInput
                        ref={lastNameRef}
                        placeholder="Last Name"
                        value={lastName}
                        onChangeText={setLastName}
                        style={[
                          styles.textInput,
                          isLastNameFocused && styles.textInputFocused
                        ]}
                        onFocus={() => setIsLastNameFocused(true)}
                        onBlur={() => setIsLastNameFocused(false)}
                      />

                      <TextInput
                        ref={emailRef}
                        placeholder='Email' 
                        value={email}
                        onChangeText={setEmail}           
                        style={[
                          styles.textInput,
                          isEmailFocused && styles.textInputFocused
                        ]}
                        onFocus={() => setIsEmailFocused(true)}
                        onBlur={() => setIsEmailFocused(false)}
                      />

                      <TextInput
                        ref={passwordRef}
                        placeholder='Password' 
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        style={[
                          styles.textInput,
                          isPasswordFocused && styles.textInputFocused
                        ]}
                        onFocus={() => setIsPasswordFocused(true)}
                        onBlur={() => setIsPasswordFocused(false)}        
                      />
                      
                      <TouchableOpacity 
                        style={styles.submitBtn}
                        onPress={handleSignUp}
                      >
                        <Text style={styles.submitText}>SIGN UP</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </KeyboardAwareScrollView>
              </LinearGradient>
              <View style={styles.loginContainer}>
                <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                  <Text style={styles.loginText}>
                    Already have an account?{' '}
                    <Text style={styles.loginLink}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              </View>
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView> 
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: hp('12%'),
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
    shadowOffset: { width: 0, height: 0 },
  },

  submitBtn: {
    width: wp('80%'),
    borderRadius: wp('50%'),
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('1.6%'),
    backgroundColor: colors.button,
  },

  submitText: {
    textAlign: 'center',
    color: colors.white,
    fontSize: wp('3.5%'),
  },

  loginContainer: {
    bottom: hp('3%'),
    width: wp('100%'),
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loginLink: {
    fontWeight: 'bold',
  },

  loginText: {},
  topText: {},
});

export default SignUp;

