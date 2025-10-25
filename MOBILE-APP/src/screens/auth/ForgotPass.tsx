import React, { useState, useEffect } from 'react'
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

import { forgotPassword } from '../auth/user-auth'; 

const SignUp = () => {
  const [email, setEmail] = useState('');
  const forgotText = "Enter your account email and we’ll send a reset code.";
  const navigation: NavigationProp<ParamListBase> = useNavigation();

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Missing email", "Please enter your email address.");
      return;
    }
    try {
      await forgotPassword(email);
      Alert.alert("Success", "Verification code sent to your email.");
      navigation.navigate('SendCode', { email });
    } catch (error: any) {
      const errorMessage = error?.error || 'Failed to send code';
      Alert.alert("Error", errorMessage);
      console.log(error);
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
            onPress={() => navigation.navigate('SignIn')}
          >
            <FontAwesomeIcon icon={faChevronLeft} size={24} color="#343131" />
            <Text>Back</Text>
          </TouchableOpacity>
          <View style={styles.centeredContent}> 
            <Image 
              source={require('../../assets/forgotpassIcon.png')}
              style={{
                width: wp('25%'),
                height: wp('25%'),
              }} 
              resizeMode='contain'
            />
            <Text style={[{ fontSize: wp('5.5%'), marginTop: hp('2.5%'), fontFamily: 'Poppins' }]}>Forgot Password?</Text>
            <Text style={[{ fontSize: wp('3.5%'), marginTop: hp('1%'), textAlign: 'center', paddingHorizontal: wp('10%'), fontFamily: 'Poppins'}]}>{forgotText}</Text>
          </View>

          <View style={styles.formContainer}>
            <TextInput
              placeholder='Enter your email address'
              placeholderTextColor="#999"
              value={email}
              onChangeText={(text) => setEmail(text)}           
              style={styles.textInput}
            />
            <TouchableOpacity 
                style={styles.submitBtn}
                onPress={handleForgotPassword}
            >
                <Text style={styles.submitText}>SEND</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.noteText}>
            <Text style={{textAlign: 'center', fontFamily: "Poppins" }}>
              Code not received? Try again in a few minutes.
            </Text>
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

  textInput: {
    borderWidth: 1,
    width: wp('80%'),
    fontSize: wp('4%'),
    borderRadius: wp('10%'),
    borderColor: colors.border,
    paddingHorizontal: wp('5%'),
    paddingVertical: wp("3%"),
    backgroundColor: colors.white,
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
    textAlign: 'center',
    color: colors.white,
    fontFamily: "Poppins",
  },

  noteText: {
    marginTop: hp('2%'),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp('25%'),
  },


});

export default SignUp;

