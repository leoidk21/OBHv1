import React, { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../screens/type';
import * as SecureStore from 'expo-secure-store';
import { ActivityIndicator } from 'react-native';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { widthPercentageToDP as wp, heightPercentageToDP as hp} from "react-native-responsive-screen";

type LoadingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Loading'>;
};

export function LoadingScreen({ navigation }: LoadingScreenProps) {
  const [loading, setLoading] = useState(true);

    useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        // Get stored user token
        const token = await SecureStore.getItemAsync('userToken');
        console.log("🔍 Checking user token:", token);

        // Wait a bit for the logo animation effect
        await new Promise<void>(resolve => setTimeout(resolve, 2000));

        if (token) {
          console.log("✅ Token found — redirecting to Login screen...");
          navigation.replace('SignIn');
        } else {
          console.log("🚪 No token — redirecting to GetStarted screen...");
          navigation.replace('GetStarted');
        }
      } catch (error) {
        console.error("Error checking login status:", error);
        navigation.replace('GetStarted');
      } finally {
        setLoading(false);
      }
    };

    checkLoginStatus();
  }, [navigation]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient
          colors={['#FFF8E7', '#FAF3E0', '#FFF4F0']}
          style={styles.container}
        >
          <View style={styles.centeredContent}>
            <Image
              source={require('../../assets/Logo.png')}
              style={{
                width: wp('60%'),
                height: hp('60%'),
              }}
              resizeMode="contain"
            />
            <Text style={styles.text}>
              {loading && <ActivityIndicator size="large" color="#000" style={{ marginTop: 10 }} />}
            </Text>
          </View>
        </LinearGradient>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  centeredContent: {
    alignItems: 'center',
    marginTop: hp('-38%'),
  },

  text: {
    fontSize: 13,
    width: wp('100%'),
    textAlign: 'center',
    marginTop: hp('-16%'),
    fontFamily: 'Poppins',
  },
});