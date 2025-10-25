import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "../../type";
import colors from "../../config/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";

// Import your icons
import { HomeIcon } from "../../icons/HomeIcon";
import { EventIcon } from "../../icons/EventIcon";
import { ScheduleIcon } from "../../icons/ScheduleIcon";
import { GuestIcon } from "../../icons/GuestIcon";
import { BudgetIcon } from "../../icons/BudgetIcon";

type MenuBarProps = {
  activeScreen: keyof RootStackParamList;
};

const MenuBar: React.FC<MenuBarProps> = ({ activeScreen }) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const navItems = [
    { label: "Home", screen: "Home", icon: HomeIcon },
    { label: "Event", screen: "Event", icon: EventIcon },
    { label: "Schedule", screen: "Schedule", icon: ScheduleIcon },
    { label: "Guest", screen: "Guest", icon: GuestIcon },
    { label: "Budget", screen: "Budget", icon: BudgetIcon },
  ];

  return (
    <View style={[styles.navigationContainer, { paddingBottom: insets.bottom }]}>
      {navItems.map((item, index) => {
        const Icon = item.icon;
        const active = activeScreen === item.screen;

        return (
          <TouchableOpacity
            key={index}
            style={styles.navigation}
            onPress={() => navigation.navigate(item.screen as never)}
          >
            {active && <View style={styles.navigationLine} />}
            <Icon 
              color={active ? "#000000" : "gray"} 
            />
            <Text style={active ? styles.activeText : styles.inactiveText}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  navigationContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    height: 'auto',
    width: wp("100%"),
    flexDirection: "row",
    paddingTop: hp("1.6%"),
    backgroundColor: colors.white,
    justifyContent: "space-between",
  },
           
  navigation: {
    flex: 1,
    alignItems: "center",
  },
      
  navigationLine: {
    top: -12,
    zIndex: 1,
    left: "50%",
    height: "6%",
    width: wp("12%"),
    position: "absolute",
    borderRadius: wp("2.5%"),
    backgroundColor: colors.black,
    transform: [{ translateX: -wp("6%") }],
  },
      
  inactiveText: {
    color: "gray",
    top: hp("0.5%"),
    fontSize: wp("3%"),
    textAlign: "center",
    fontFamily: "Poppins",
  },
      
  activeText: {
    top: hp("0.5%"),
    fontSize: wp("3%"),
    textAlign: "center",
    fontFamily: "Poppins",
    paddingBottom: hp("1%"),
  },
});

export default MenuBar;