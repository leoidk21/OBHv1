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
import { signUpWithEmail } from '../../lib/supabase-auth';
import { signup } from '../auth/user-auth';
import { useEvent } from '../../context/EventContext';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

const SignUp = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);

  const { resetEventSubmission, loadEventData } = useEvent();

  const handleSignUp = async () => {
    setLoading(true);
    
    if (!firstName || !lastName || !email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      const { user, session } = await signUpWithEmail(
        firstName.trim(),
        lastName.trim(), 
        email.trim(), 
        password.trim()
      );
      
      if (!user) {
        throw new Error('User creation failed - no user returned');
      }

      console.log('NEW USER SIGNED UP:', user.id);

      await resetEventSubmission?.();

      if (session?.access_token) {
        await SecureStore.setItemAsync('userToken', session.access_token);
      }
      await SecureStore.setItemAsync('userId', String(user.id));
      await SecureStore.setItemAsync('userEmail', String(user.email!));
      
      console.log('New user credentials stored:', user.id);

      await loadEventData();

      Alert.alert("Success", "Account created successfully!");
      navigation.navigate("ChooseEvent");
      
    } catch (err: any) {
      console.error('Signup error:', err);
      Alert.alert("Error", err.message || "Something went wrong");
    } finally {
      setLoading(false);
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
                      <Text style={[styles.topText, { fontSize: wp('5.5%'), fontFamily: "Poppins" }]}>Create an account</Text>
                    </View>

                    <View style={styles.formContainer}>
                      <TextInput
                        ref={firstNameRef}
                        placeholder="First Name"
                        placeholderTextColor="#999"
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
                        placeholderTextColor="#999"
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
                        placeholderTextColor="#999"
                        value={email}
                        onChangeText={setEmail}           
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
                        style={[
                          styles.textInput,
                          isPasswordFocused && styles.textInputFocused,
                          { paddingRight: wp('12%') } // add space for the icon
                        ]}
                        onFocus={() => setIsPasswordFocused(true)}
                        onBlur={() => setIsPasswordFocused(false)}
                      />

                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeIcon}
                      >
                        <Ionicons
                          name={showPassword ? 'eye' : 'eye-off'}
                          size={wp('5%')}
                          color="#999"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* SIGN UP BUTTON */}
                    <TouchableOpacity 
                      style={[styles.submitBtn, loading && { opacity: 0.5 }]}
                      onPress={handleSignUp}
                      disabled={!!loading}
                    >
                      <Text style={styles.submitText}>
                        {loading ? 'SIGNING UP...' : 'SIGN UP'}
                      </Text>
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
    paddingBottom: hp('5%'),
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
    fontSize: wp('3.6%'),
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

  passwordContainer: {
    position: 'relative',
    width: wp('80%'),
    justifyContent: 'center',
  },

  eyeIcon: {
    position: 'absolute',
    right: wp('4%'),
    top: '50%',
    transform: [{ translateY: -wp('2.5%') }],
  },
});

export default SignUp;

