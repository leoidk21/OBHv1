import React, { useRef, useState, useEffect } from "react";
import { Animated, Text, View, Image, TouchableOpacity, ScrollView, StyleSheet, ImageSourcePropType} from "react-native";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { RootStackParamList } from "../../../screens/type";
import colors from "../../config/colors";
import { NavigationProp, useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

// ICONS
import { HomeIcon } from "../../icons/HomeIcon";
import { EventIcon } from "../../icons/EventIcon";
import { ScheduleIcon } from "../../icons/ScheduleIcon";
import { GuestIcon } from "../../icons/GuestIcon";
import { BudgetIcon } from "../../icons/BudgetIcon";
import { ESignatureIcon } from "../../icons/ESignatureIcon";
import { ChecklistIcon } from "../../icons/ChecklistIcon";

import { getUserData } from "../../auth/user-auth"; 

const NavigationSlider: React.FC<{ headerTitle?: string }> = ({ headerTitle }) => {
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

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();
  const currentScreen = route.name;

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const slideAnimation = useRef(new Animated.Value(-wp("80%"))).current;
  const overlayAnimation = useRef(new Animated.Value(0)).current;

  const openSlider = () => {
    setSidebarVisible(true);
    Animated.parallel([
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.timing(overlayAnimation, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSlider = () => {
    Animated.parallel([
      Animated.timing(slideAnimation, {
        toValue: -wp("80%"),
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.timing(overlayAnimation, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSidebarVisible(false);
    });
  };

  const MenuItem = ({
    icon,
    label,
    screen,
    active = false,
  }: {
    icon: React.ComponentType<any> | ImageSourcePropType;
    label: string;
    screen: string;
    active?: boolean;
  }) => (
  <View style={active ? styles.menuIndicatorActive : styles.menuIndicatorInactive}>
    <View style={styles.menuItem}>
      <TouchableOpacity
        onPress={() => {
          closeSlider();
          navigation.navigate(screen as never);
        }}
      >
        <View style={styles.menuSubItem}>
          {typeof icon === "function" ? (
            React.createElement(icon, { color: active ? "#000" : "#000" })
          ) : (
            <Image source={icon} style={{ width: 22, height: 22, resizeMode: "contain" }} />
          )}
          <Text style={styles.menuText}>{label}</Text>
        </View>
      </TouchableOpacity>
    </View>
  </View>
);

  const mainMenu = [
    { label: "Home", icon: HomeIcon, screen: "Home" },
    { label: "Event", icon: EventIcon, screen: "Event" },
    { label: "Schedule", icon: ScheduleIcon, screen: "Schedule" },
    { label: "Guest", icon: GuestIcon, screen: "Guest" },
    { label: "Budget", icon: BudgetIcon, screen: "Budget" },
    { label: "Checklist", icon: ChecklistIcon, screen: "Checklist" },
  ];

  const accountMenu = [
    {
      label: "Account",
      icon: require("../../../assets/PROFILE.png"),
      screen: "Account",
    },
    {
      label: "E-Signature",
      icon: require("../../../assets/SIGNATURE.png"),
      screen: "ESignature",
    },
    {
      label: "Notification",
      icon: require("../../../assets/notif.png"),
      screen: "Notification",
    },
    {
      label: "Payment",
      icon: require("../../../assets/PAYMENT.png"),
      screen: "Payment",
    },
  ];

  return (
    <View>
      {/* HEADER */}
      <View style={styles.headerContainer} >
        <View style={styles.openSliderContainer} >
          <TouchableOpacity onPress={openSlider}>
            <Image
              resizeMode="contain"
              style={styles.openSliderPng}
              source={require("../../../assets/burger.png")}
            />
          </TouchableOpacity> 
          <Text style={styles.headerText}>{headerTitle ?? ""}</Text>
        </View>

        <View style={styles.notifAccountContainer} >
            <Image
              resizeMode="contain"
              style={styles.notifAccPng}
              source={require("../../../assets/notif.png")}
            />
            <Image
              resizeMode="contain"
              style={styles.notifAccPng}
              source={require("../../../assets/account.png")}
            />
        </View>
      </View>
      {/* HEADER */}

      {/* SIDEBAR */}
      <>
        {sidebarVisible && (
          <Animated.View style={[styles.sideBarVisibleContainer, { opacity: overlayAnimation }]}>
            <TouchableOpacity
              style={styles.closeSliderBtn}
              onPress={closeSlider}
              activeOpacity={1}
            />
          </Animated.View>
        )}

        <Animated.View style={[styles.sideBarVisible, { left: slideAnimation }]} >
          <LinearGradient 
            colors={["#fffefeff", "#f8f0e3ff"]} 
            style={styles.sidebarContainer}
          >
            <ScrollView 
              contentContainerStyle={{ flexGrow: 1, paddingBottom: hp("2%") }}
              showsVerticalScrollIndicator={false} 
              showsHorizontalScrollIndicator={false} 
            >
              {/* SIDEBAR HEADER */}
              <View style={styles.closeButton}>
                <TouchableOpacity onPress={closeSlider}>
                  <Image
                    source={require("../../../assets/burger.png")}
                    style={styles.openSliderPng}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <Text style={styles.headerText}>Menu</Text>
              </View>
              {/* SIDEBAR HEADER */}

              {/* PROFILE */}
              <View style={styles.sidebarContent}>
                <View style={styles.sideBarProfileContainer}>
                  <View style={styles.sideBarProfile}>
                    <Image
                      style={styles.profilePic}
                      source={require("../../../assets/PROFILEPIC.png")}
                    />
                    <View>
                      <Text style={styles.profileName}>
                        {user?.first_name && user?.last_name 
                          ? `${user.first_name} ${user.last_name}` 
                          : 'Guest User'}
                      </Text>
                      <Text style={styles.profileEmail} numberOfLines={1} ellipsizeMode="tail">
                        {user?.email || 'No email'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.sidebarLine}></View>

                {/* MAIN MENU */}
                <View style={styles.sidebarMenu}>
                  <Text style={styles.menuHeader}>Main Menu</Text>
                  {mainMenu.map((item, idx) => (
                    <MenuItem
                      key={idx}
                      {...item}
                      active={currentScreen === item.screen}
                    />
                  ))}
                </View>

                {/* ACCOUNT MENU */}
                <View>
                  <Text style={styles.accMenuHeader}>Account</Text>
                    {accountMenu.map((item, idx) => (
                      <MenuItem
                        key={idx}
                        {...item}
                        active={currentScreen === item.screen}
                      />
                    ))}
                </View>
              </View>
            </ScrollView>
          </LinearGradient>
        </Animated.View>
      </>
      {/* SIDEBAR */}
    </View>
  );
};

const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    openSliderContainer: {
        gap: 8,
        flexDirection: "row",
        alignItems: "center",
        marginTop: hp("2.5%"),
        marginLeft: wp("4%"),
    },

    notifAccountContainer: {
        gap: 10,
        flexDirection: "row",
        alignItems: "center",
        marginTop: hp("2.5%"),
        marginRight: wp("4%"),
    },

    notifAccPng: {
        width: wp("5%"),
        height: wp("5%"),
        objectFit: "contain",
    },

    openSliderPng: {
        width: wp("5.5%"),
        height: wp("5.5%"),
        objectFit: "contain",
    },

    sideBarVisibleContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        width: wp("100%"),
        height: hp("100%"),
        backgroundColor: "rgba(0,0,0,0.2)",
        zIndex: 999,
    },

    sideBarVisible: {
        position: "absolute",
        top: 0,
        width: wp("80%"),
        height: hp("100%"),
        zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.5)",
    },

    sideBarProfileContainer: {
        marginLeft: wp("6%"),
        paddingBottom: hp("2.5%"),
    },

    sideBarProfile: {
        gap: 10,
        alignItems: "center",
        flexDirection: "row",
    },

    closeSliderBtn: {
        width: "100%",
        height: "100%",
    },

    closeButton: {
        gap: 12,
        flexDirection: "row",
        alignItems: "center",
        marginTop: hp("2.5%"),
        marginLeft: wp("6%"),
    },
    
    headerText: {
        top: hp("0.4%"),  
        fontFamily: "Poppins",
        width: wp("60%"),
        fontSize: wp("4.5%"),
    },
    
    burgerIcon: {
        width: wp("6%"),
        height: wp("6%"),
    },

    sidebarContainer: {
        flex: 1,
        zIndex: 1000,
    },

    menuIndicatorActive: {
        width: wp("70%"),
        alignSelf: "center",
        borderRadius: wp("2%"),
        justifyContent: "center",
        paddingVertical: hp("1.5%"),
        paddingHorizontal: wp("2.5%"),
        backgroundColor: colors.borderv2,
    },

    menuIndicatorInactive: {
        padding: wp("2.5%"),
        justifyContent: "center",
        marginLeft: wp("4.5%"),
        marginTop: hp("0.5%"),
    },

    menuHeader: {
        marginLeft: wp("6%"),
        fontSize: wp("4.5%"),
        fontFamily: "Poppins",
        marginBottom: hp("1.5%"),
    },

    accMenuHeader: {
        fontFamily: "Poppins",
        marginLeft: wp("6%"),
        marginBottom: hp("1%"),
        fontSize: wp("4.5%"),
    },

    sidebarLine: {
        width: wp("68%"),
        alignSelf: "center",
        borderBottomWidth: 1,
        borderColor: "rgba(0, 0, 0, 0.2)",
    },

    sidebarContent: {
        zIndex: 1001,
        marginTop: hp("2.5%"),
    },

    sidebarMenu: {
        marginTop: hp("2.5%"),
        marginBottom: hp("2%"),
    },

    menuItem: {
        marginLeft: wp("2%"),
    },

    menuText: {
        top: hp("0.5%"),
        color: colors.black,
        fontSize: wp("4%"),
        fontFamily: "Poppins",
    },

    menuSubItem: {
        gap: 12,
        flexDirection: "row",
        alignItems: "center",
    },

    menuIcon: {
        objectFit: "contain",
        width: wp("6%"),
        height: wp("6%"),
    },

    profilePic: {
        width: wp("11%"),
        height: wp("11%"),
        objectFit: "contain",
    },

    profileName: {
        top: hp("0.5%"),
        fontWeight: "600",
        fontSize: wp("4%"),
        fontFamily: "Loviena",
    },

    profileEmail: {
        top: hp("0.5%"),
        width: wp("45%"),
        fontSize: wp("3.2%"),
        fontFamily: "Poppins",
    },
});

export default NavigationSlider;