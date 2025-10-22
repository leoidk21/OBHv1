import React, { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../screens/type';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { widthPercentageToDP as wp, heightPercentageToDP as hp} from "react-native-responsive-screen";

type LoadingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Loading'>;
};

export function LoadingScreen({ navigation }: LoadingScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <TouchableOpacity 
        style={{ flex: 1 }} 
        onPress={() => navigation.navigate('GetStarted')} 
      >
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
            <Text style={styles.text}>Event Planner</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
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

