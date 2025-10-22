import React, { useState } from "react";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp} from "react-native-responsive-screen";
import colors from "../config/colors";
import Svg, { Path } from "react-native-svg";

import NavigationSlider from './ReusableComponents/NavigationSlider';
import MenuBar from "./ReusableComponents/MenuBar";

const Notification  = () => {

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient colors={["#FFFFFF", "#f2e8e2ff"]} style={{ flex: 1 }}>
          {/* HEADER */}
          <View>
              <NavigationSlider headerTitle="Notification" />
          </View>
          {/* HEADER */}

          {/* ===== CONTENT ===== */}
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationHeaderText}>Today</Text>
          </View>

            <View style={styles.notificationContainer}>
                    <View style={styles.notifCard}>
                        <View style={styles.notifCardImageContainer}>
                            <Image
                                source={require("../../assets/PAYMENT.png")}
                                style={styles.notifCardImage}
                                resizeMode="contain"
                            />
                        </View>
                        <View>
                            <Text style={styles.notifCardText}>Payment Pending</Text>
                            <Text style={styles.notifCardSubText}>Request by Admin</Text>
                            <Text>Pay ₱ 10,000 for Venue Deposit</Text>
                        </View>
                        <View style={styles.timeContainer}>
                            <Text style={styles.timeText}>12:00</Text>
                        </View>
                    </View>
            </View>
          {/* ===== CONTENT ===== */}
        </LinearGradient>
        <MenuBar activeScreen={"Notification"} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
    notificationHeader: {
        marginTop: hp("3%"),
        marginHorizontal: wp("6%"),
        paddingVertical: hp("0.8%"),
        paddingHorizontal: wp("4%"),
        width: wp("20%"),
        borderRadius: wp("10%"),
        alignItems: "center",
        backgroundColor: colors.borderv5,
    },

    notificationHeaderText: {
        color: colors.white,
        fontSize: wp("3.5%"),
        fontWeight: "600",
    },

    notificationContainer: {
        borderRadius: wp("3%"),
        paddingVertical: hp("2%"),
        marginVertical: hp("2.5%"),
        marginHorizontal: wp("6%"),
        paddingHorizontal: wp("4%"),
        backgroundColor: colors.white,
        overflow: "hidden",
        elevation: 3,
        shadowRadius: 3.84,
        shadowOpacity: 0.25,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
    },

    systemMessageContainer: {
        marginTop: hp("1.5%"),
    },
    
    systemMessage: {
        width: wp("60%"),
        fontSize: wp("4%"),
        color: colors.borderv5,
    },

    notifCard: {
        gap: wp("4%"),
        flexDirection: "row",
    },

    notifCardText: {
        fontWeight: "600",
        fontSize: wp("5%"),
    },

    notifCardSubText: {
        fontSize: wp("3.5%"),
        color: colors.borderv5,
    },

    notifCardImage: {
        width: wp("6%"),
    },

    notifCardImageContainer: {
        elevation: 3,
        width: wp("10%"),
        height: wp("10%"),
        shadowRadius: 3.84,
        shadowOpacity: 0.25,
        aspectRatio: 1 / 1,
        alignItems: "center",
        borderRadius: wp("10%"),
        justifyContent: "center",
        shadowColor: colors.black,
        backgroundColor: colors.white,
        shadowOffset: { width: 0, height: 2 },
    },

    timeText: {
        color: colors.borderv5,
    },

    timeContainer: {
        marginLeft: wp("-2.2%"),
    },

    readMore: {
        marginTop: hp("2%"),
        alignItems: "flex-end",
    },
});

export default Notification;