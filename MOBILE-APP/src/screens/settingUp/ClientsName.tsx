import React, { useState } from "react";
import { StyleSheet, Text, View, Image, Dimensions, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { faUser } from '@fortawesome/free-solid-svg-icons';
import { faHeart } from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from "@react-navigation/native";
import { NavigationProp, ParamListBase } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import colors from "../config/colors";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { Alert } from "react-native";

import { useEvent } from '../../context/EventContext';

const ClientsName = () => {
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const navigation: NavigationProp<ParamListBase> = useNavigation();

  const { updateEvent, debugStorageKeys } = useEvent();
  const [myName, setMyName] = useState('');
  const [partnerName, setPartnerName] = useState('');

  const handleContinue = async () => {
    if (myName.trim() && partnerName.trim()) {
      // Wait for all updates to complete
      await updateEvent('client_name', myName.trim());
      await updateEvent('partner_name', partnerName.trim());  
      await updateEvent('full_client_name', `${myName.trim()} & ${partnerName.trim()}`);
      await debugStorageKeys();

      // Navigate after data is saved
      navigation.navigate("EventDate");
    } else {
      Alert.alert('Please enter both names to continue.');
    }
  };

  return (
    <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1 }}>
           <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <LinearGradient
              colors={["#FFFFFF", "#f2e8e2ff"]}
              style={styles.container}
            >
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? hp('2%') : 0}
            >
              <ScrollView 
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
              > 
                  <View
                    style={{ flexDirection: "row", justifyContent: "space-between" }}
                  >
                    <View>
                      <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.navigate("EventPrice")}
                      >
                        <FontAwesomeIcon
                          icon={faChevronLeft}
                          size={18}
                          color="#343131"
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.step}>
                        <View style={[styles.stepDot, { backgroundColor: colors.brown }]} />
                        <View style={[styles.stepDot, { backgroundColor: colors.brown }]} />
                        <View style={[styles.stepDot, { backgroundColor: colors.brown }]} />
                        <View style={[styles.stepDot, { backgroundColor: colors.border }]} />
                    </View>
                    
                    <View>
                        <Text style={styles.stepText}>
                            3/4
                        </Text>
                    </View>
                  </View>

                  <View style={styles.topContent}>
                    <Image
                      source={require("../../assets/couple.png")}
                      style={{
                        width: wp("55%"),
                        height: wp("55%"),
                      }}
                      resizeMode="contain"
                    />
                    <Text style={{ fontSize: wp("8%"), marginTop: hp("1%"), textAlign: "center", fontFamily: "Loviena", color: colors.black, lineHeight: wp("8%"),}} >
                      Let's Get to Know {"\n"} the Happy Couple!
                    </Text>
                  </View>

                  <View>
                    {/* your name */}
                    <View style={styles.myName}>
                      <View style={styles.myNameIcon}>
                        <FontAwesomeIcon
                          icon={faUser}
                          size={16}
                          color="#333446"
                          style={styles.faUser}
                        />
                      </View>
                      <Text style={styles.myNameText}>What's your name</Text>
                    </View>

                    <View style={styles.enterName}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter your first name"
                        placeholderTextColor="#999"
                        value={myName}
                        onChangeText={(text) => setMyName(text)}
                      />
                    </View>

                    {/* partner's name */}
                    <View style={styles.partnerName}>
                      <View style={styles.myNameIcon}>
                        <FontAwesomeIcon
                          icon={faHeart}
                          size={16}
                          color="#333446"
                          style={styles.faUser}
                        />
                      </View>
                      <Text style={styles.myNameText}>
                        Your partner's name?
                      </Text>
                    </View>

                    <View style={styles.enterName}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter your first name"
                        placeholderTextColor="#999"
                        value={partnerName}
                        onChangeText={(text) => setPartnerName(text)}
                      />
                    </View>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
              <View style={styles.bottomContent}>
                  <TouchableOpacity
                    style={[
                      styles.continueButton,
                      (!myName.trim() || !partnerName.trim()) && styles.continueButtonDisabled
                    ]}
                    onPress={handleContinue}
                    disabled={!myName.trim() || !partnerName.trim()}
                  >
                    <Text style={styles.continueButtonText}>
                      Continue
                    </Text>
                  </TouchableOpacity>
              </View> 
            </LinearGradient>
          </TouchableWithoutFeedback>
        </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  bottomContent: {
    bottom: hp("4%"),
    alignSelf: "center",
    position: "absolute",
  },
  
  backBtn: {
    gap: 5,
    top: hp("2.2%"),
    left: wp("5%"),
    flexDirection: "row",
    alignItems: "center",
  },

  step: {
    gap: wp("3%"),
    flexDirection: "row",
    marginTop: hp("3.2%"),
  },
    
  stepDot: {
    alignItems: "center",
    justifyContent: "center",
    width: wp("15%"),
    height: hp("0.8%"),
    borderRadius: 50,
  },

  stepText: {
      top: hp("2%"), 
      right: wp("6%"), 
      fontSize: wp("4%"), 
      color: colors.brown
  },

  topContent: {
    marginTop: hp("2%"),
    alignItems: "center",
    justifyContent: "center",
  },

  faUser: {
    backgroundColor: colors.faUser,
  },

  textInput: {
    borderWidth: 1,
    width: wp("82%"),
    height: hp("6.2%"),
    borderRadius: 50,
    marginTop: hp("1%"),
    fontFamily: "Poppins",
    borderColor: colors.border,
    paddingHorizontal: wp("7%"),
    backgroundColor: colors.white,
  },

  continueButton: {
    width: wp('88%'),
    alignItems: 'center',
    borderRadius: wp('50%'),
    paddingVertical: hp('1.4%'),
    paddingHorizontal: wp('5%'),
    backgroundColor: colors.button,
  },

  continueButtonText: {
    fontSize: 15,
    color: colors.white,
    fontFamily: 'Poppins',
  },

  myName: {
    alignItems: "center",
    flexDirection: "row",
    gap: 15,
    marginTop: hp("5%"),
    marginLeft: wp("10%"),
  },

  partnerName: {
    alignItems: "center",
    flexDirection: "row",
    gap: 15,
    marginTop: hp("2%"),
    marginLeft: wp("10%"),
  },

  myNameIcon: {
    backgroundColor: "#E0F2FE",
    borderRadius: 50,
    padding: 10,
    alignItems: "center",
  },

  myNameText: {
    fontSize: wp("4.2%"),
    width: wp("100%"),
    fontFamily: "Poppins",
  },

  enterName: {
      fontFamily: "Poppins",
      alignItems: "center",
      justifyContent: "center",
  },

  continueButtonDisabled: {},

  scrollContent: {
      flexGrow: 1,
      paddingBottom: hp("6%"),
  },
});

export default ClientsName;
