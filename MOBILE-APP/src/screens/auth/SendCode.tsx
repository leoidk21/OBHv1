import React, { useState, useEffect, useRef, createRef } from 'react'
import { StyleSheet, Text, View, Image, Dimensions, TextInput , Button, TouchableOpacity} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../config/colors';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Alert } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';

import { verifyCode } from '../auth/user-auth';

const SignUp = () => {
  const [digits, setDigits] = useState(['', '', '', '']);
  const inputRefs = useRef(digits.map(() => createRef()));

  const handleDigitChange = (index: number, value: string) => {
    const cleanedValue = value.replace(/\D/, '');
    setDigits(digits.map((digit, i) => i === index ? cleanedValue : digit));
    if (cleanedValue.length === 1) {
      const nextIndex = index + 1;
      if (nextIndex < digits.length) {
        (inputRefs.current[nextIndex] as React.RefObject<TextInput>).current.focus();
      }
    }
  };

  const forgotText = "We've sent a code to your email address. Enter it below to verify.";
  const navigation: NavigationProp<ParamListBase> = useNavigation();

  // send code route
  type SendCodeRouteProp = RouteProp<{ SendCode: { email: string } }, 'SendCode'>;
  const route = useRoute<SendCodeRouteProp>();
  const { email } = route.params;

  const [loading, setLoading] = useState(false);

  const handleVerifyCode = async () => {
    const code = digits.join('');

    if (code.length !== 4) {
      Alert.alert("Error", "Please enter a 4-digit code.");
      return;
    }

    if (!email) {
      Alert.alert("Error", "Email is missing. Please go back and try again.");
      return;
    }

    setLoading(true);
    try {
      await verifyCode(email, code);
      Alert.alert("Success", "Code verified successfully!");
      navigation.navigate('ResetPass', { email, code });
    } catch (error: any) {
      console.log(error);
      const errorMessage = error?.error || 'Invalid or expired code';
      Alert.alert("Verification Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient
            colors={['#FFFFFF', '#f2e8e2ff']}
            style={styles.container}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('ForgotPass')}
          >
            <FontAwesomeIcon icon={faChevronLeft} size={24} color="#343131" />
            <Text>Back</Text>
          </TouchableOpacity>
          <View style={styles.centeredContent}> 
            <Image 
              source={require('../../assets/verificationIcon.png')}
              style={{
                width: wp('25%'),
                height: wp('25%'),
              }} 
              resizeMode='contain'
            />
            <Text style={[{ fontSize: wp('5.5%'), marginTop: hp('2.5%') }]}>Enter Verification Code</Text>
            <Text style={[{ fontSize: wp('3.5%'), marginTop: hp('1%'), textAlign: 'center', paddingHorizontal: wp('10%')}]}>{forgotText}</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.codeContainer}>
                {digits.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(inputRefs.current[index] as React.RefObject<TextInput>)}
                  value={digit}
                  onChangeText={(value) => handleDigitChange(index, value)}
                  keyboardType='number-pad'
                  maxLength={1}
                  style={styles.textInput}
                />
              ))}
            </View>
            <TouchableOpacity 
                style={styles.submitBtn}
                onPress={handleVerifyCode}
                disabled={loading}
            >
                <Text style={styles.submitText}>VERIFY CODE</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  backBtn: {
    gap: 5,
    top: hp('3%'),
    left: wp('5%'),
    flexDirection: 'row',
    alignItems: 'center',
  },

  centeredContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp('6%'),
  },  

  formContainer: {
    gap: 14,
    marginTop: hp('2%'),
    alignItems: 'center',
    justifyContent: 'center',
  },

  codeContainer: {
    gap: 10,
    flexDirection: 'row',
    marginBottom: hp('1%'),
  },

  textInput: {
    borderWidth: 1,
    width: wp('14%'),
    height: wp('14%'),
    textAlign: 'center',  
    borderRadius: wp('10%'),
    borderColor: colors.border,
    backgroundColor: colors.white,
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
  },
});

export default SignUp;

