import React, { useState, useEffect } from "react";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Modal, Image } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp} from "react-native-responsive-screen";
import colors from "../config/colors";
import Svg, { Path, G, Rect, ClipPath, Defs } from "react-native-svg";
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { Alert } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import NavigationSlider from './ReusableComponents/NavigationSlider';
import { updateUserProfile, getCurrentUser } from '../../lib/supabase-auth';

import * as SecureStore from 'expo-secure-store';
import { getUserData, updateProfile, storeUserData } from "../auth/user-auth";
import { logout } from "../auth/user-auth";
import { useEvent } from "../../context/EventContext";

const Account  = () => {
  const { resetEventSubmission, clearAllUserData } = useEvent(); // Get cleanup functions
  const [modalVisible, setModalVisible] = React.useState(false);
  const { eventData } = useEvent();

  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  useEffect(() => {
      if (eventData.event_date) {
        const updateCountdown = () => {
          const now = new Date().getTime();
          const eventTime = new Date(eventData.event_date).getTime();
          const difference = eventTime - now;
  
          if (difference <= 0) {
            setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            return;
          }
  
          const days = Math.floor(difference / (1000 * 60 * 60 * 24));
          const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((difference % (1000 * 60)) / 1000);
  
          setCountdown({ days, hours, minutes, seconds });
        };
  
        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
  
        return () => clearInterval(interval);
      }
  }, [eventData.event_date]);

    // Format date for display
  const formatEventDate = (dateString: string) => {
    if (!dateString) return 'Date not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleOptionPress = (screen: string) => {
    setModalVisible(false);
    setTimeout(() => navigation.navigate(screen), 100);
  };

  // load user data
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await getUserData();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout", 
      "Are you sure you want to logout?", 
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚪 Logging out...');

              // ✅ ONLY CLEAR AUTH TOKENS, NOT EVENT DATA
              await Promise.all([
                SecureStore.deleteItemAsync('userToken'),
                SecureStore.deleteItemAsync('userId'),
                SecureStore.deleteItemAsync('userEmail'),
                logout() // Your existing logout
              ]);
              
              console.log('✅ Logout complete - event data preserved');
              
              // Navigate to sign in
              navigation.reset({
                index: 0,
                routes: [{ name: "SignIn" }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              navigation.reset({
                index: 0,
                routes: [{ name: "SignIn" }],
              });
            }
          }
        }
      ]
    );
  };

const [firstName, setFirstName] = useState<string>('');
const [lastName, setLastName] = useState<string>('');
const [email, setEmail] = useState<string>('');
const [loading, setLoading] = useState<boolean>(false);
const [error, setError] = useState<string>('');

useEffect(() => {
  if (user) {
    setFirstName(user.first_name);
    setLastName(user.last_name);
    setEmail(user.email);
  }
}, [user]);

const handleSave = async () => {
  setLoading(true);
  setError('');
  
  try {
    await updateUserProfile({
      first_name: firstName,
      last_name: lastName,
      email: email
    });
    
    // Refresh user data
    const updatedUser = await getCurrentUser();
    setUser(updatedUser);
    
    setModalVisible(false);
    Alert.alert('Success', 'Profile updated successfully!');
  } catch (error: any) {
    const errorMsg = error.message || 'Failed to update profile';
    setError(errorMsg);
    Alert.alert('Error', errorMsg);
  } finally {
    setLoading(false);
  }
};

const navigation: NavigationProp<ParamListBase> = useNavigation();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient colors={["#FFFFFF", "#f2e8e2ff"]} style={{ flex: 1 }}>
          {/* HEADER */}
          <View>
              <NavigationSlider headerTitle="Account" />
          </View>
          {/* HEADER */}

          <ScrollView contentContainerStyle={{ paddingBottom: hp("3%") }}>
            {/* ================== CONTENT ================== */}
            <View>
                {/* -------- PROFILE -------- */}
                <LinearGradient
                  colors={["#fbe6e4ff", "#faeeeeff", "#e5c699ff"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.profile}
                >
                  <View style={styles.userProfileContainer}>
                      <Image 
                        style={styles.userProfile}
                        resizeMode="contain"
                        source={require("../../assets/PROFILEPIC.png")} 
                      />
                      <View style={styles.editIcon}>
                        <Svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                          <Path d="M9.57688 3.45545L3.6674 9.40369C3.13968 9.93988 1.56149 10.1854 1.17815 9.82959C0.794804 9.4738 1.07359 7.88532 1.60131 7.34912L7.5108 1.4009C7.78367 1.13933 8.14736 0.995488 8.52413 1.00011C8.9009 1.00473 9.26095 1.15745 9.5274 1.42565C9.79385 1.69384 9.94559 2.05627 9.95017 2.43552C9.9548 2.81478 9.81187 3.1808 9.55199 3.45545H9.57688Z" stroke="#343131" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"/>
                          <Path d="M10.0002 10H5.51953" stroke="#343131" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </Svg>
                      </View>
                  </View>

                  <Text style={styles.profileName}>
                    {user?.first_name && user?.last_name 
                    ? `${user.first_name} ${user.last_name}` 
                    : 'Loading...'}
                  </Text>
                  <Text style={styles.profileEmail}>
                    {user?.email}
                  </Text>
                  
                  <TouchableOpacity
                    onPress={() => setModalVisible(true)}
                    activeOpacity={0.9}
                    style={styles.editProfileButton}
                  >
                    <Text style={styles.editProfileText}>Edit Profile</Text>
                  </TouchableOpacity>
                </LinearGradient>
                {/* -------- PROFILE -------- */}

                {/* EDIT PROFILE MODAL */}
                <Modal
                  visible={modalVisible}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setModalVisible(false)}
                  statusBarTranslucent={true}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                      <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setModalVisible(false)}
                        disabled={loading}
                      >
                        <Text style={styles.closeButtonText}>&times;</Text>
                      </TouchableOpacity>

                      <Text style={styles.modalTitle}>Edit Profile</Text>

                      {error && (
                        <Text style={styles.errorText}>{error}</Text>
                      )}

                      <View style={styles.formContainer}>
                        <Text style={styles.formLabel}>First Name:</Text>
                        <TextInput
                          style={styles.formInput}
                          value={firstName}
                          onChangeText={setFirstName}
                          editable={!loading}
                        />

                        <Text style={styles.formLabel}>Last Name:</Text>
                        <TextInput
                          style={styles.formInput}
                          value={lastName}
                          onChangeText={setLastName}
                          editable={!loading}
                        />

                        <Text style={styles.formLabel}>Email:</Text>
                        <TextInput
                          style={styles.formInput}
                          value={email}
                          onChangeText={setEmail}
                          editable={!loading}
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                      </View>

                      <TouchableOpacity
                        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={!!loading}
                      >
                        <Text style={styles.saveButtonText}>
                          {loading ? 'Saving...' : 'Save'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
                {/* EDIT PROFILE MODAL */}

                {/* -------- EVENT SUMMARY -------- */}
                <View style={styles.personalInfo}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderText}>Event Summary</Text>
                    </View>

                    {/* EVENT */}
                    <View style={styles.infoRowContainer}>
                      <View style={styles.infoRow}>
                          <Svg width="28" height="26" viewBox="0 0 24 23" fill="none">
                              <G clip-path="url(#clip0_2001_81)">
                                  <Path
                                      d="M15.8438 19.3617C15.4688 19.3617 15.1875 19.0699 15.1875 18.7105V15.5207C15.1875 15.1613 15.4688 14.8918 15.8438 14.8918H19.1722C19.5472 14.8918 19.8517 15.1613 19.8517 15.5207V18.7105C19.8517 19.0699 19.5472 19.3617 19.1722 19.3617H15.8438ZM19.1722 15.5207H15.8438V18.7105H19.1722V15.5207ZM22.5 2.15625C23.3205 2.15625 24 2.80744 24 3.59375V21.5625C24 22.3488 23.3205 23 22.5 23H1.5C0.6795 23 0 22.3488 0 21.5625V3.59375C0 2.80744 0.6795 2.15625 1.5 2.15625H7.5V0.71875C7.5 0.314094 7.8285 0 8.25 0C8.6715 0 9 0.314813 9 0.71875V2.15625H15V0.71875C15 0.314094 15.3285 0 15.75 0C16.1715 0 16.5 0.314813 16.5 0.71875V2.15625H22.5ZM1.5 21.5625H22.5V3.59375H16.5V4.3125C16.5 4.71716 16.1715 5.03125 15.75 5.03125C15.3285 5.03125 15 4.71644 15 4.3125V3.59375H9V4.3125C9 4.71716 8.6715 5.03125 8.25 5.03125C7.8285 5.03125 7.5 4.71644 7.5 4.3125V3.59375H1.5V21.5625Z"
                                      fill="#343131"
                                  />
                              </G>
                              <Defs>
                                  <ClipPath id="clip0_2001_81">
                                      <Rect width="24" height="23" fill="white" />
                                  </ClipPath>
                              </Defs>
                          </Svg>
                          <View>
                              <Text style={styles.infoTitle}>Event</Text>
                              <Text style={{ fontFamily: "Poppins" }}>
                                 {eventData.wedding_type}
                              </Text>
                          </View>
                      </View>
                      <View>
                        <FontAwesomeIcon icon={faChevronRight} size={16} color="#333" />
                      </View>
                    </View>
                    {/* EVENT */}

                    {/* WHEN */}
                    <View style={styles.infoRowContainer}>
                      <View style={styles.infoRow}>
                          <Svg width="28" height="26" viewBox="0 0 24 24" fill="none">
                              <Path
                                  d="M0 0V23.1909H23.1909V0H0ZM22.2249 0.966062V5.31425H0.966969V0.966062H22.2249ZM0.966062 22.2249V6.28122H22.224V22.2249H0.966062Z"
                                  fill="black"
                              />
                              <Path
                                  d="M7.24609 2.41602H8.69609V3.86511H7.24609V2.41602Z"
                                  fill="black"
                              />
                              <Path
                                  d="M14.4941 2.41602H15.9432V3.86511H14.4941V2.41602Z"
                                  fill="black"
                              />
                              <Path
                                  d="M8.28565 9.71857C8.11255 10.894 7.5534 10.9148 6.42784 10.9556L6.25293 10.9619V11.7812H8.15968V17.1408H9.17105V9.5636H8.3074L8.28565 9.71857Z"
                                  fill="black"
                              />
                              <Path
                                  d="M13.9898 11.9961C13.5403 11.9961 13.079 12.1429 12.7138 12.3885L13.0582 10.6168H16.2436V9.65613H12.3042L11.5357 13.7596H12.4102L12.4637 13.6763C12.7691 13.2005 13.3264 12.9041 13.9191 12.9041C14.8834 12.9041 15.583 13.6173 15.583 14.5988C15.583 15.4869 15.0256 16.3859 13.9608 16.3859C13.0509 16.3859 12.3966 15.7715 12.3694 14.8915L12.364 14.7157H11.3535L11.358 14.9015C11.3907 16.3334 12.4156 17.2949 13.91 17.2949C15.4162 17.2949 16.5953 16.1422 16.5953 14.6713C16.5953 13.0709 15.5495 11.9952 13.9925 11.9952L13.9898 11.9961Z"
                                  fill="black"
                              />
                          </Svg>
                          <View>
                              <Text style={styles.infoTitle}>When</Text>
                              <Text style={{ fontFamily: "Poppins" }}>{formatEventDate(eventData.event_date)}</Text>
                          </View>
                      </View>
                      <View>
                        <FontAwesomeIcon icon={faChevronRight} size={16} color="#333" />
                      </View>
                    </View>
                    {/* WHEN */}

                    {/* TIME */}
                    <View style={styles.infoRowContainer}>
                      <View style={styles.infoRow}>
                          <Svg width="28" height="26" viewBox="0 0 24 24" fill="none">
                              <Path
                                  d="M12 23C18.0752 23 23 18.0752 23 12C23 5.92487 18.0752 1 12 1C5.92487 1 1 5.92487 1 12C1 18.0752 5.92487 23 12 23Z"
                                  stroke="#343131"
                                  stroke-width="1.5"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                              />
                              <Path
                                  d="M12 4.66663V12"
                                  stroke="#343131"
                                  stroke-width="1.5"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                              />
                              <Path
                                  d="M17.1822 17.1822L12 12"
                                  stroke="#343131"
                                  stroke-width="1.5"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                              />
                          </Svg>
                          <View>
                              <Text style={styles.infoTitle}>Package</Text>
                              <Text style={{ fontFamily: "Poppins" }}>{eventData.guest_range} Pax</Text>
                          </View>
                      </View>
                      <View>
                        <FontAwesomeIcon icon={faChevronRight} size={16} color="#333" />
                      </View>
                    </View>
                    {/* TIME */}

                    <View style={styles.infoRowContainer}>
                      <View style={styles.infoRow}>
                          <Svg width="28" height="26" viewBox="0 0 24 24" fill="none">
                              <Path
                                  d="M12 23C18.0752 23 23 18.0752 23 12C23 5.92487 18.0752 1 12 1C5.92487 1 1 5.92487 1 12C1 18.0752 5.92487 23 12 23Z"
                                  stroke="#343131"
                                  stroke-width="1.5"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                              />
                              <Path
                                  d="M12 4.66663V12"
                                  stroke="#343131"
                                  stroke-width="1.5"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                              />
                              <Path
                                  d="M17.1822 17.1822L12 12"
                                  stroke="#343131"
                                  stroke-width="1.5"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                              />
                          </Svg>
                          <View>
                              <Text style={styles.infoTitle}>Price</Text>
                              <Text style={{ fontFamily: "Poppins" }}>{eventData.package_price}</Text>
                          </View>
                      </View>
                      <View>
                        <FontAwesomeIcon icon={faChevronRight} size={16} color="#333" />
                      </View>
                    </View>
                    {/* TIME */}
                </View>
                {/* -------- EVENT SUMMARY -------- */}

                {/* -------- MORE -------- */}
                <View style={styles.personalInfo}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderText}>Account</Text>
                    </View>

                    {/* LOGOUT */}
                    <TouchableOpacity
                      onPress={handleLogout}
                    >
                      <View style={styles.infoRow}>
                          <Svg width="28" height="26" viewBox="0 0 22 22" fill="none">
                            <Path d="M13.998 5.99995C13.9859 3.82494 13.8895 2.64704 13.1211 1.87867C12.2424 1 10.8282 1 7.99986 1H6.99987C4.1715 1 2.75721 1 1.87862 1.87867C0.999928 2.75734 0.999928 4.17154 0.999928 6.99994V14.9999C0.999928 17.8282 0.999928 19.2424 1.87862 20.1211C2.75721 20.9998 4.1715 20.9998 6.99987 20.9998H7.99986C10.8282 20.9998 12.2424 20.9998 13.1211 20.1211C13.8895 19.3527 13.9859 18.1748 13.998 15.9998" stroke="#343131" stroke-width="2" stroke-linecap="round"/>
                            <Path d="M8.00013 10.9998H21M21 10.9998L17.5 7.99988M21 10.9998L17.5 13.9998" stroke="#343131" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                          </Svg>
                          <Text>Logout</Text>
                      </View>
                    </TouchableOpacity>
                    {/* LOGOUT */}
                </View>
                {/* -------- MORE -------- */}
            </View>
            {/* ================== END CONTENT ================== */}
          </ScrollView>
        </LinearGradient>
        {/* <View>
          <MenuBar activeScreen={"Account"} />
        </View> */}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  profile: {
    alignItems: 'center',
    marginTop: hp('2.5%'),
    marginBottom: hp('2%'),
    width: wp('90%'),
    alignSelf: 'center',
    borderRadius: wp('5%'),
    justifyContent: 'center',
    backgroundColor: colors.checklist,
    paddingVertical: hp('2%'),
  },

  userProfileContainer: {
    position: 'relative',
  },

  editIcon: {
    right: 4,
    bottom: 4,
    borderRadius: 50,
    padding: wp('2%'),
    position: 'absolute',
    backgroundColor: colors.white,

    elevation: 3,
    shadowOpacity: 1,
    shadowRadius: 1,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
  },

  userProfile: {
    width: wp('20%'),
    height: wp('20%'),
    marginTop: hp('0.5%'),
    marginBottom: hp('1.5%'),
  },

  profileName: {
    fontWeight: '600',
    fontSize: wp('4.5%'),
    fontFamily: 'Loviena',
    marginTop: hp('0.5%'),
  },

  profileEmail: {
    fontSize: wp('3.5%'),
    fontFamily: 'Poppins',
    color: colors.borderv4,
    marginBottom: hp('0.5%'),
  },
  
  editProfileButton: {
    borderRadius: wp('5%'),
    marginVertical: hp('1%'),
    paddingVertical: hp('1.2%'),
    paddingHorizontal: wp('15%'),
    backgroundColor: colors.white,
  },

  editProfileText: {
    fontFamily: 'Poppins',
    color: colors.black,
  },

  personalInfo: {
    fontFamily: 'Poppins',
    marginHorizontal: wp('6%'),
  },

  sectionHeader: {
    marginTop: hp('1%'),
  },

  sectionHeaderText: {
    fontWeight: '600',
    fontSize: wp('4%'),
    color: colors.borderv5,
    marginBottom: hp('1.5%'),
    fontFamily: "Poppins",
  },

  infoRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  infoRow: {
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp('2%'),
  },

  infoTitle: {
    fontFamily: "Poppins",
    color: colors.borderv5,
  },

  modalOverlay: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
},

modalContainer: {
  borderRadius: 20,
  width: '90%',
  maxWidth: 400,
  alignItems: 'center',
  paddingVertical: hp('2.5%'),
  paddingHorizontal: wp('5%'),
  backgroundColor: colors.white,
  position: 'relative',
},

closeButton: {
  position: 'absolute',
  top: 10,
  right: 10,
  width: 40,
  height: 40,
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1,
},

closeButtonText: {
  fontSize: 36,
},

modalTitle: {
  fontSize: wp('6%'),
  textAlign: 'center',
  fontFamily: 'Loviena',
  marginBottom: hp('2%'),
  marginTop: hp('1%'),
},

formContainer: {
  width: '100%',
  marginBottom: hp('2%'),
},

formLabel: {
  fontSize: 16,
  marginTop: 10,
  fontFamily: "Poppins"
},

formInput: {
  width: '100%',
  borderWidth: 1,
  borderColor: '#ced4da',
  borderRadius: 10,
  paddingHorizontal: 16,
  paddingVertical: 12,
  fontSize: 16,
  fontFamily: "Poppins",
  backgroundColor: '#ffffff',
  color: '#212529',
},

saveButton: {
  width: '100%',
  paddingVertical: 14,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.button,
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},

saveButtonDisabled: {
  opacity: 0.6,
  backgroundColor: '#adb5bd',
},

saveButtonText: {
  fontSize: 16,
  fontWeight: '700',
  color: '#ffffff',
  letterSpacing: 0.5,
},

errorText: {
  fontSize: 14,
  marginBottom: 12,
  textAlign: 'center',
  color: '#e03131',
  backgroundColor: '#ffe3e3',
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 6,
  width: '100%',
  fontWeight: '500',
},
});

export default Account;