import React from "react";
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, Pressable } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { useNavigation } from "@react-navigation/native";
import { NavigationProp, ParamListBase } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import colors from "../config/colors";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";

import { useEvent } from '../../context/EventContext';

const EventPrice = () => {
  const { updateEvent, debugStorageKeys } = useEvent();

  const navigation: NavigationProp<ParamListBase> = useNavigation();
  const packages = [
    {
    pax: "50-90",
    price: "₱ 14,500",
    coordinators: [
      "1 Head / Venue Coor",
      "1 Bride Coor",
      "1 Groom Coor",
      "1 Guest Coor",
    ],
    },
    {
    pax: "100-140",
    price: "₱ 17,500",
    coordinators: [
        "1 Head Coor",
        "1 Bride Coor",
        "1 Groom Coor",
        "1 Guest Coor",
        "1 Venue Coor",
    ],
    },
    {
    pax: "150-190",
    price: "₱ 19,500",
    coordinators: [
        "1 Head Coor",
        "1 Bride Coor",
        "1 Groom Coor",
        "2 Guest Coor",
        "1 Venue Coor",
    ],
    },
    {
    pax: "200-240",
    price: "₱ 23,000",
    coordinators: [
        "1 Head Coor",
        "1 Bride Coor",
        "1 Groom Coor",
        "2 Guest Coor",
        "1 Venue Coor",
        "1 Sound Tech",
    ],
    },
    {
    pax: "250-300",
    price: "₱ 27,000",
    coordinators: [
        "1 Head Coor",
        "1 Bride Coor",
        "1 Groom Coor",
        "2 Guest Coor",
        "1 Venue Coor",
        "1 Sound Tech",
        "1 Seat Locator",
    ],
    },
  ];

  const handlePackageSelect = async (selectedPackage: any) => {
    let paxRange = selectedPackage.pax;
    // If pax is a single number, convert to min-max format
    if (!paxRange.includes('-')) {
        paxRange = `${paxRange}-${paxRange}`;
    }

    await updateEvent('selected_package', selectedPackage);
    await updateEvent('package_price', selectedPackage.price);
    await updateEvent('guest_range', paxRange);
    await debugStorageKeys();

    navigation.navigate('ClientsName');
    };

  return (
    <SafeAreaProvider>
      <>
        <SafeAreaView style={{ flex: 1 }}>
          
          <LinearGradient
            colors={["#FFFFFF", "#f2e8e2ff"]}
            style={styles.container}
            >
            <ScrollView
                contentContainerStyle={{ paddingBottom: hp("2%") }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <View>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => navigation.navigate("ChooseEvent")}
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
                        <View style={[styles.stepDot, { backgroundColor: colors.border }]} />
                        <View style={[styles.stepDot, { backgroundColor: colors.border }]} />
                    </View>

                    <View>
                        <Text style={styles.stepText}>
                            2/4
                        </Text>
                    </View>
                </View>

                <View style={styles.topContent}>
                    <Text style={styles.topContentText}>
                        O.B.H Wedding{"\n"}Packages
                    </Text>
                </View>

                <View style={styles.packagesContainer}>
                    <View>
                        {packages.map((pkg, index) => (
                            <Pressable
                                key={index}
                                onPress={() => handlePackageSelect(pkg)}
                            >
                                <View key={index} style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.pax}>{pkg.pax} pax</Text>
                                        <Text style={styles.price}>{pkg.price}</Text>
                                    </View>

                                    <Text style={styles.subHeader}>Coordinators:</Text>
                                    {pkg.coordinators.map((role, i) => (
                                        <Text key={i} style={styles.coordinator}>
                                        - {role}
                                        </Text>
                                    ))}
                                </View>
                            </Pressable>
                        ))}

                        {/* Additional Section */}
                        <View style={styles.extraCard}>
                            <Text style={styles.extraHeader}>Additional</Text>
                            <Text style={styles.extraText}>
                                Out of Town Fee (OOTF) — depends on location
                            </Text>
                        </View>

                        {/* Promo Section */}
                        <View style={styles.promoCard}>
                            <Text style={styles.extraHeader}>Promo</Text>
                            <Text style={styles.extraText}>
                                Book 6 months in advance and get a{" "}
                                <Text style={{ fontWeight: "bold" }}>10% Discount!</Text>
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
          </LinearGradient>
        </SafeAreaView>
      </>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    backBtn: {
        gap: 5,
        top: hp("2.3%"),
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
        marginTop: hp("3%"),
        justifyContent: "center",
    },

    topContentText: {
        fontSize: wp("8%"),
        marginTop: hp("1%"),
        textAlign: "left",
        paddingLeft: wp("6%"),
        fontFamily: "Loviena",
        color: colors.black,
        lineHeight: wp("7%"),
        height: hp("8%"),
    },

    packagesContainer: {
        marginTop: hp("1%"),
        marginHorizontal: wp("6%"),
    },

    card: {
        marginTop: hp("1.5%"),
        borderRadius: wp("2.5%"),
        paddingVertical: hp("2%"),
        paddingHorizontal: wp("4%"),
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
    },

    cardHeader: {
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        
        borderBottomWidth: 1,
        paddingBottom: hp("1.5%"),
        borderBottomColor: colors.border,
    },

    pax: {
        fontFamily: "Poppins",
        fontWeight: 500,
        color: colors.brown,
        fontSize: wp("3.5%"),
    },

    price: {
        fontFamily: "Poppins",
        fontWeight: 500,
        fontSize: wp("3.5%"),
        color: colors.redv2,
    },

    subHeader: {
        fontFamily: "Poppins",
        color: colors.brown,
        fontSize: wp("4%"),
        marginTop: hp("0.8%"),
        marginBottom: hp("0.5%"),
    },

    coordinator: {
        fontFamily: "Poppins",
        color: colors.brown,
        fontSize: wp("3.3%"),
        marginVertical: hp("0.2%"),
    },

    extraCard: {
        marginTop: hp("1.5%"),
        borderRadius: wp("2.5%"),
        paddingVertical: hp("2%"),
        paddingHorizontal: wp("4%"),
        backgroundColor: colors.white,

         borderWidth: 1, 
        borderColor: colors.border,
    },

    extraHeader: {
        fontWeight: 500,
        fontFamily: "Poppins",
        color: colors.brown,
        fontSize: wp("4.5%"),
    },

    extraText: {
        fontFamily: "Poppins",
        color: colors.brown,
        fontSize: wp("3.6%"),
    },

    promoCard: {
        marginTop: hp("1.5%"),
        borderRadius: wp("2.5%"),
        paddingVertical: hp("2%"),
        paddingHorizontal: wp("4%"),
        
        backgroundColor: colors.white,
        borderWidth: 1, 
        borderColor: colors.border,
    },
});

export default EventPrice;
