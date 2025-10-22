import React, { useState } from 'react'
import { StyleSheet, Text, View, Image, TextInput, TouchableOpacity } from 'react-native';
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

import { resetPassword } from '../auth/user-auth';

const ResetPass = () => {
  // reset pass route
  type ResetPassRouteProp = RouteProp<{ ResetPass: { email: string; code: string } }, 'ResetPass'>;

  const navigation: NavigationProp<ParamListBase> = useNavigation();
  const route = useRoute<ResetPassRouteProp>();
  const { email, code } = route.params;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleResetPassword = async () => {
    // Validation
    if (!newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    // Password validation
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    try {
      await resetPassword(email, code, newPassword);
      Alert.alert("Success", "Password reset successfully!", [
        { text: "OK", onPress: () => navigation.navigate('SignIn') }
      ]);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      const errorMessage = error?.error || 'Failed to reset password';
      Alert.alert("Error", errorMessage);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient
          colors={['#FFFFFF', '#f2e8e2ff']}
          style={styles.container}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('SendCode')}
          >
            <FontAwesomeIcon icon={faChevronLeft} size={24} color="#343131" />
            <Text>Back</Text>
          </TouchableOpacity>
          <View style={styles.centeredContent}>
            <Image
              source={require('../../assets/resetIcon.png')}
              style={{
                width: wp('25%'),
                height: wp('25%'),
              }}
              resizeMode='contain'
            />
            <Text style={[{ fontSize: wp('5.5%'), marginTop: hp('2.5%') }]}>Reset Password</Text>
          </View>

          <View style={styles.formContainer}>
            <TextInput
              placeholder='New Password' 
              value={newPassword}
              onChangeText={setNewPassword}
              style={styles.textInput}
              secureTextEntry={true}
            />
            <TextInput
              placeholder='Confirm Password' 
              value={confirmPassword}
              onChangeText={setConfirmPassword}       
              style={styles.textInput}
              secureTextEntry={true}
            />
            <TouchableOpacity 
              style={styles.submitBtn}
              onPress={handleResetPassword}
            >
              <Text style={styles.submitText}>RESET PASSWORD</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.noteText}>
            <Text style={{ textAlign: 'center' }}>
              Kindly remember and save your password.
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
    borderRadius: wp('50%'),
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('1.6%'),
  },

  submitBtn: {
    width: wp('80%'),
    borderRadius: wp('50%'),
    backgroundColor: colors.button,
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('1.6%'),
  },

  submitText: {
    textAlign: 'center',
    color: colors.white,
  },

  noteText: {
    marginTop: hp('2%'),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp('25%'),
  },
});

export default ResetPass;

