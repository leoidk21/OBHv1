import React, { useState, useEffect } from 'react'
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../screens/type';
import colors from '../config/colors';
import { StyleSheet, Text, View, Image, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Loading'>;

const DebutScreen = () => {
  const [dimensions, setDimensions] = useState({
    window: wp('100%'),
    screen: hp('100%'),
  }) 

  useEffect(() => {
    const onChange = ({ window, screen }: { window: any; screen: any }) => {};
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  const navigation = useNavigation<NavigationProp>();

  const TopContainerStyle = {
    paddingTop: hp(4),
    marginBottom: hp(2),
    paddingBottom: hp(8),
    borderBottomLeftRadius: wp(50),
    borderBottomRightRadius: wp(50),
  }

  const BottomContainerStyle = {
    marginTop: hp(1.2),
  }

  const getStartedBtnStyle = {
    borderRadius: wp(50),
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(25),
  }

  const LoginButtonStyle = {
    borderRadius: wp(50),
    marginTop: hp(1.5),
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(31),
  }

  const size = Math.min(wp(100), hp(100)) * 0.026;
  const IndicatorStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    marginTop: hp(2),
    marginBottom: hp(2.5),
  };

  const ButtonContainer = {
    marginTop: hp(1.2),
  }

  const IndicatorBlank = {
    backgroundColor: colors.indicatorBlank,
  }

  return (
    <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <LinearGradient
            colors={['#FFF4F0', '#f2e8e2ff']}
            style={styles.container}
          >
            <LinearGradient
              colors={['#FDF6ED', '#f7f1f1ff']}
              style={[styles.topContainer, TopContainerStyle]}
            >
              <View>
                <Text style={styles.topText}>
                  Debut
                </Text>
                <Image
                  source={require('../../assets/DebutIllustration.png')}
                  style={[
                    {
                      width: wp('60%'),
                      height: wp('60%'),
                      marginTop: hp('4%'),
                    }
                  ]} 
                  resizeMode='contain'
                />
              </View>
            </LinearGradient>
            <View style={[styles.bottomContainer, BottomContainerStyle]}>
              <Text style={styles.bottomText}>
                Celebrate eighteen with {'\n'}
                Style and Grace
              </Text>
              <Text style={[styles.bottomParagraph, BottomContainerStyle]}>
                Celebrate your 18th with a dream  {'\n'}
                celebration — we’ll take care of  {'\n'}
                the rest!{'\n'}
              </Text>
              <View style={styles.indicator}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('GetStarted')}
                  style={[styles.indicatorSlides, IndicatorStyle, IndicatorBlank]}
                >
                </TouchableOpacity>
                <TouchableOpacity 
                    onPress={() => navigation.navigate('Wedding')}
                    style={[styles.indicatorSlides, IndicatorStyle, IndicatorBlank]}>
                </TouchableOpacity>
                 <TouchableOpacity 
                    onPress={() => navigation.navigate('Debut')}
                    style={[styles.indicatorSlides, IndicatorStyle]}>
                </TouchableOpacity>
                <TouchableOpacity 
                    onPress={() => navigation.navigate('Parties')}
                    style={[styles.indicatorSlides, IndicatorStyle, IndicatorBlank]}>
                </TouchableOpacity>
              </View>
              <View style={ButtonContainer}>
                <LinearGradient
                    colors={['#19579C', '#102E50']}
                    start={{ x: 1, y: 0.5 }}
                    end={{ x: 0, y: 0.5 }}
                    style={getStartedBtnStyle}
                >
                  <TouchableOpacity
                    onPress={() => navigation.navigate('SignUp')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.getBtnText}>GET STARTED</Text>
                  </TouchableOpacity>
                </LinearGradient>

                <TouchableOpacity style={[styles.LoginBtn, LoginButtonStyle]}
                    onPress={() => navigation.navigate('SignIn')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.loginBtnText}>LOGIN</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },

  topContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    elevation: 20,
    shadowRadius: 10,
    shadowOpacity: 0.25,
    shadowColor: '#D8C5AA',
    shadowOffset: { width: 0, height: 7 },
  },

  topText: {
    fontSize: 26,
    textAlign: 'center',
  },

  bottomContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomText: {
    fontSize: 26,
    textAlign: 'center',
  },

  bottomParagraph: {
    textAlign: 'center',
  },

  indicator: {
    gap: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  indicatorSlides: {
    backgroundColor: colors.indicator,
  },

  getStartedBtn: {
    backgroundColor: colors.button,
  },

  getBtnText: {
    fontSize: 14,
    color: colors.white,
  },

  LoginBtn: {
    elevation: 1,
    borderWidth: 1,
    shadowOpacity: 0.25,
    borderColor: colors.border,
    shadowColor: '#222020ff',
    backgroundColor: colors.secondary,
    shadowOffset: { width: 1, height: 1 },
  },

  loginBtnText: {
    fontSize: 14,
  }
})

export default DebutScreen


