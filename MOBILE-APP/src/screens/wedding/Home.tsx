import React, { useEffect, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets  } from "react-native-safe-area-context";
import { Animated, StyleSheet, Text, View, Image, TouchableOpacity, ScrollView } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp} from "react-native-responsive-screen";
import { useFonts } from "expo-font";
import colors from "../config/colors";
import { RootStackParamList } from "../../screens/type";
import { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import CheckBox from 'react-native-check-box';
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import NavigationSlider from './ReusableComponents/NavigationSlider';
import MenuBar from "./ReusableComponents/MenuBar";

import { EventSvg } from "../icons/svg/EventSvg";
import { ChecklistSvg } from "../icons/svg/ChecklistSvg";
import { ScheduleSvg } from "../icons/svg/ScheduleSvg";
import { BudgetSvg } from "../icons/svg/BudgetSvg";
import { GuestSvg } from "../icons/svg/GuestSvg";
import { ESignatureSvg } from "../icons/svg/ESignatureSvg";
import { PaymentSvg } from "../icons/svg/PaymentSvg";
import { AccountSvg } from "../icons/svg/AccountSvg";

import { useEvent } from '../../context/EventContext';
import * as SecureStore from 'expo-secure-store';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ProgressBar = ({ progress }: { progress: number }) => {
   return (
     <View style={styles.progressBarContainer}>
       <View style={[styles.progressBar, { width: `${progress}%` }]} />
     </View>
   );
 };

const Home = () => {
   const [fontsLoaded] = useFonts({
      'Poppins': require('../../assets/fonts/Poppins-Regular.ttf'),
      'Loviena': require('../../assets/fonts/lovienapersonaluseonlyregular-yy4pq.ttf'),
      'Canela': require('../../assets/fonts/CanelaCondensed-Regular-Trial.otf'),
      'Senbatsu': require('../../assets/fonts/Senbatsu.otf'),
      'Velista': require('../../assets/fonts/VELISTA.ttf'),
   });

   const navigation = useNavigation<HomeScreenNavigationProp>();

   type IconItem = {
      label: string;
      image: any;
      route: keyof RootStackParamList;
   }

   const icons: IconItem[] = [
      { label: "Event", image: EventSvg, route: "Event" },
      { label: "Checklist", image: ChecklistSvg, route: "Checklist" },
      { label: "Schedule", image: ScheduleSvg, route: "Schedule" },
      { label: "Budget", image: BudgetSvg, route: "Budget" },
      { label: "Guest", image: GuestSvg, route: "Guest" },
      { label: "Payment", image: PaymentSvg, route: "Payment" },
      { label: "ESignature", image: ESignatureSvg, route: "ESignature" },
      { label: "Account", image: AccountSvg, route: "Account" },
   ];

   const [progress, setProgress] = useState(0);

   const [checkboxes, setcheckboxes] = useState({
      checklist1: false,
      checklist2: false,
      checklist3: false,
   });

   useEffect(() => {
      const checkedCount = Object.values(checkboxes).filter(checked => checked).length;
      const total = Object.keys(checkboxes).length;
      setProgress((checkedCount / total) * 100);
   }, [checkboxes]);

   const toggleCheckbox = (key: keyof typeof checkboxes) => {
      setcheckboxes(prev => ({
         ...prev,
         [key]: !prev[key]
      }));
   };

   const { eventData, debugStorageKeys, loadEventData } = useEvent();
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

   return (
      <SafeAreaProvider>
         <SafeAreaView style={{ flex: 1 }}>
            <LinearGradient
               colors={["#FFFFFF", "#f2e8e2ff"]}
               style={{ flex: 1 }}
            >
            {/* HEADER */}
            <View>
               <NavigationSlider headerTitle="Home" />
            </View>
            {/* HEADER */}
            <View>  
               <ScrollView
                     contentContainerStyle={{ 
                        flexGrow: 1,
                        paddingBottom: hp("14%")
                     }}
                     showsVerticalScrollIndicator={false}
                  >
                  {/* COUNTDOWN */}
                  <View style={styles.countDownContainer}>
                     <View style={styles.countDownContent}>
                        <Image
                              source={require("../../assets/WEDDINGIMG.png")}
                              style={styles.weddingImage}
                        />
                        <View style={styles.beforeImage} />
                        
                        <Text style={styles.overlayTextTop}>
                           {eventData.client_name} & {eventData.partner_name}
                        </Text>
                        
                        <View style={styles.overlayTextBottom}>
                           <Text style={styles.countdown}>{countdown.days.toString().padStart(2, '0')}.</Text>
                           <Text style={styles.countdown}>{countdown.hours.toString().padStart(2, '0')}.</Text>
                           <Text style={styles.countdown}>{countdown.minutes.toString().padStart(2, '0')}.</Text>
                           <Text style={styles.countdown}>{countdown.seconds.toString().padStart(2, '0')}</Text>
                        </View>

                        <View style={styles.overlayTextBottom2}>
                           <Text style={styles.countdownText}>Days</Text>
                           <Text style={styles.countdownText}>Hours</Text>
                           <Text style={styles.countdownText}>Mins</Text>
                           <Text style={styles.countdownText}>Secs</Text>
                        </View>

                        <View style={styles.overlayTextBottom3}>
                           <Text style={styles.countdownDate}>{formatEventDate(eventData.event_date)}</Text>
                        </View>
                     </View>
                  </View>
                  {/* COUNTDOWN */}

                  {/* ICON SECTION */}
                  <View style={styles.iconSection}>
                     <View style={styles.iconSectionContainer}>
                        {icons.map((item, index) => (
                           <TouchableOpacity
                              key={index}
                              style={styles.iconItem}
                              onPress={() => navigation.navigate(icons[index].route as never)}
                           >
                              <item.image width={36} height={36} />
                              <Text style={styles.iconLabel}>{item.label}</Text>
                           </TouchableOpacity>
                        ))}
                     </View>
                  </View>
                  {/* ICON SECTION */}

                  {/* EVENT TYPE & DATE */}
                  <View style={styles.eventType}>
                     <View>
                        <Image
                           source={require('../../assets/WEDDING-ICON.png')}
                           style={styles.eventImage}
                        />
                     </View> 
                     <View style={styles.weddingTypeContainer}>
                        <Text style={[styles.weddingType, styles.weddingTypeText]}>
                           {eventData.wedding_type}
                        </Text>  
                        <Text style={styles.weddingType}>
                           {eventData.client_name} & {eventData.partner_name}
                        </Text>
                     </View>
                     <View style={styles.eventDateContainer}>
                        <Text style={styles.eventDate}>
                           {formatEventDate(eventData.event_date)}
                        </Text>
                     </View>
                  </View>
                  {/* EVENT TYPE & DATE */}

                  {/* CHECKLIST */}
                  <View style={styles.checkList}>
                     <View style={styles.checkListContainer}>
                        <Text style={styles.checkListText}>Checklist</Text>
                        <TouchableOpacity 
                            onPress={() => navigation.navigate("Checklist" as never)}
                           style={styles.viewAll}
                        >
                           <Text style={styles.viewAllText}>View All</Text>
                           <FontAwesomeIcon
                              icon={faChevronRight}
                              size={12}
                              color="#343131"
                           />
                        </TouchableOpacity>
                     </View>
                     <View style={styles.checkListLine}></View>

                     <View style={styles.checkListItems}>
                        <CheckBox
                           style={{ padding: 5 }}
                           onClick={() => toggleCheckbox("checklist1")}
                           rightText="Set a budget"
                           isChecked={checkboxes.checklist1}
                           checkedImage={
                              <View style={styles.radioChecked}>
                                 <View style={styles.innerCheckedRadio}>
                                    <FontAwesomeIcon 
                                       icon={faCheck} 
                                       size={12} 
                                       color="#102E50" 
                                    />
                                 </View>
                              </View>
                           }
                           unCheckedImage={<View style={styles.radioUnchecked} />}
                        />
                        <CheckBox
                           style={{ padding: 5 }}
                           onClick={() => toggleCheckbox("checklist2")}
                           rightText="Add event time frame"
                           isChecked={checkboxes.checklist2}
                           checkedImage={
                              <View style={styles.radioChecked}>
                                 <View style={styles.innerCheckedRadio}>
                                    <FontAwesomeIcon 
                                       icon={faCheck} 
                                       size={12}
                                       color="#102E50" 
                                    />
                                 </View>
                              </View>
                           }
                           unCheckedImage={<View style={styles.radioUnchecked} />}
                        />
                        <CheckBox
                           style={{ padding: 5 }}
                           onClick={() => toggleCheckbox("checklist3")}
                           rightText="Set your wedding date"
                           isChecked={checkboxes.checklist3}
                           checkedImage={
                              <View style={styles.radioChecked}>
                                 <View style={styles.innerCheckedRadio}>
                                    <FontAwesomeIcon 
                                       icon={faCheck} 
                                       size={12} 
                                       color="#102E50" 
                                    />
                                 </View>
                              </View>
                           }
                           unCheckedImage={<View style={styles.radioUnchecked} />}
                        />
                        <ProgressBar progress={progress} />
                        <Text style={styles.progressText}>{Math.round(progress)}% Completed</Text>
                     </View>
                  </View>
                  {/* CHECKLIST */}

                  <View style={styles.notesContainer}>
                     <Text style={styles.notesText}>Complete required fields to submit.</Text>

                     <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContainer}
                     >
                        <TouchableOpacity
                           style={styles.screenContainer}
                           // onPress={() => navigation.navigate("Schedule" as never)}
                        >
                           <View style={styles.screenSection}>
                              <Text style={styles.screenSectionText}>Schedule</Text>
                           </View>
                           <View style={styles.screenItem}>
                              <Text style={styles.screenItemText}>Wedding Ceremony</Text>
                           <Text style={styles.screenItemText}>
                              {formatEventDate(eventData.event_date)}
                           </Text>
                           </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                           style={styles.screenContainer}
                           // onPress={() => navigation.navigate("Guest" as never)}
                        >
                           <View style={styles.screenSection}>
                              <Text style={styles.screenSectionText}>Guests</Text>
                           </View>
                           <View style={styles.screenItem}>
                              <Text style={styles.screenItemText}>Total Guests</Text>
                           <Text style={styles.screenItemText}>{eventData.guest_range}</Text>
                           </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                           style={styles.screenContainer}
                           // onPress={() => navigation.navigate("Budget" as never)}
                        >
                           <View style={styles.screenSection}>
                              <Text style={styles.screenSectionText}>Budget</Text>
                           </View>
                           <View style={styles.screenItem}>
                              <Text style={styles.screenItemText}>Total Budget</Text>
                           <Text style={styles.screenItemText}>
                              {eventData.package_price}
                           </Text>
                           </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                           style={styles.screenContainer}
                           // onPress={() => navigation.navigate("ESignature" as never)}
                        >
                           <View style={styles.screenSection}>
                              <Text style={styles.screenSectionText}>E-Signature</Text>
                           </View>
                           <View style={styles.screenItem}>
                              <Text style={styles.screenItemText}></Text>
                           </View>
                        </TouchableOpacity>
                     </ScrollView>
                  </View>
               </ScrollView>
            </View>
            </LinearGradient>
            <MenuBar activeScreen="Home"/>
         </SafeAreaView>
      </SafeAreaProvider>
   );
};

const styles = StyleSheet.create({
   countDownContainer: {
      alignItems: "center", 
      justifyContent: "center", 
      position: "relative",
   },

   countDownContent: {
      alignItems: "center", 
      justifyContent: "center", 
      position: "relative"
   },

   weddingImage: {
      width: wp("90%"),
      height: wp("50%"),
      marginTop: hp("2.5%"),
      borderRadius: wp("2.5%"),
   },

   eventType: {
      gap: wp("3%"),
      marginTop: hp("1.5%"),
      flexDirection: "row",
      alignItems: "center",
      borderRadius: wp("2.5%"),  
      marginHorizontal: wp("4.5%"),
      paddingHorizontal: wp("5%"),   
      backgroundColor: colors.white,
   },

   eventImage: {
      width: wp("8.5%"),
      height: hp("8.5%"),
      objectFit: "contain",
      borderRadius: wp("50%"),
   },

   eventDateContainer: {
      bottom: 10,
      right: 15,
      position: "absolute",
   },

   eventDate: {
      fontFamily: "Poppins",
   },

   weddingType: {
      fontFamily: "Poppins",
   },

   weddingTypeText: {
      fontWeight: "600",
      fontSize: wp("4%"),
      top: hp("0.5%"),
      width: wp("100%")
   },

   weddingTypeContainer: {
      margin: 0,
      padding: 0,
      flexDirection: "column",
   },

   eventDateText: {
      fontSize: wp("3.2%"),
      fontFamily: "Poppins",
   },

   radioUnchecked: {
      borderWidth: 2,
      width: 24,
      height: 24,
      borderRadius: 12,
      borderColor: colors.button,
      alignItems: "center",
      justifyContent: "center",
   },

   radioChecked: {
      width: 24,
      height: 24,
      borderWidth: 2,
      borderRadius: 12,
      borderColor: colors.button,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
   },

   innerCheckedRadio: {
      alignSelf: "center",
   },

   progressBarContainer: {
      width: wp("80%"),
      height: hp("1.5%"),
      alignSelf: "center",
      marginTop: hp("0.8%"),  
      borderRadius: wp("5%"),
      backgroundColor: colors.border,
   },

   progressBar: {
      height: hp("1.5%"),
      borderRadius: wp("5%"),
      backgroundColor: '#4CAF50',
   },

   progressText: {
      color: colors.black,
      marginTop: hp("0.8%"),
      fontFamily: "Poppins",
      paddingHorizontal: wp("1.5%"),
   },
  
   checkListItems: {
      marginTop: hp("1.5%"),
      paddingHorizontal: wp("1%"),
   },

   checkList: {
      padding: wp("1.5%"),
      marginTop: hp("1.5%"),
      borderRadius: wp("2.5%"),
      paddingBottom: hp("1.5%"),
      marginHorizontal: wp("4.5%"),
      backgroundColor: colors.white,
   },

   checkListContainer: {
      flexDirection: "row",
      alignItems: 'center',
      paddingVertical: hp("1%"),
      paddingHorizontal: wp("2%"),
      justifyContent: "space-between",
   },

   checkListText: {
      fontWeight: "600",
      fontSize: wp("4.2%"), 
      fontFamily: "Poppins",
   },

   viewAll: {
      alignItems: "center",
      flexDirection: "row",
   },

   viewAllText: {
      margin: 0,
      padding: 0,
      fontSize: wp("3.6%"),
      fontFamily: "Poppins",
      marginRight: wp("1%"),
   },

   checkListLine: {
      width: wp("82%"),
      height: hp("0.1%"),
      alignSelf: "center",
      backgroundColor: colors.borderv3,
   },

   navigationContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      width: wp("100%"),
      padding: wp("2.2%"),
      flexDirection: "row",
      paddingBottom: hp("1.5%"),
      backgroundColor: colors.white,
      justifyContent: "space-around",
   },

   navigation: {
      alignItems: "center",
   },

   navigationLine: {
      top: -10,
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
      fontSize: wp("3%"),
      marginTop: hp("0.5%"),
   },

   activeText: {
      fontSize: wp("3%"),
      marginTop: hp("0.5%"),
   },

   beforeImage: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: "90%",
      marginTop: hp("2.5%"),
      borderRadius: wp("2.5%"),
      backgroundColor: "rgba(0, 0, 0, 0.35)",
   },

   overlayTextTop: {
      zIndex: 2,
      color: "white",
      top: wp("10%"),
      fontWeight: "400",
      width: wp("100%"),
      textAlign: 'center',
      fontSize: wp("5.5%"),
      alignSelf: "center",
      position: "absolute",
      fontFamily: "Loviena",
   },

   overlayTextBottom: {
      gap: 22,
      zIndex: 12,
      fontFamily: "Poppins",
      marginTop: -hp("1%"),
      flexDirection: "row",
      position: "absolute",
      justifyContent: "space-between",
   },

   overlayTextBottom2: {
      gap: 20,
      zIndex: 12,
      marginTop: hp("6%"),
      flexDirection: "row",
      position: "absolute",
      justifyContent: "space-between",
   },

   overlayTextBottom3: {
      gap: 20,
      zIndex: 12,
      marginTop: hp("18%"),
      flexDirection: "row",
      position: "absolute",
      justifyContent: "space-between",
   },

   countdown: {
      color: "white",
      fontSize: wp("8%"),
      fontFamily: "Poppins",
   },

   countdownText: {
      color: "white",
      fontSize: wp("4.5%"),
      fontFamily: "Poppins",
   },

   countdownDate: {
      color: "white",
      textShadowRadius: 1,
      fontSize: wp("4.5%"),
      fontFamily: "Poppins",
   },

   headerText: {
      fontSize: wp("4.5%"),
   },

   burgerIcon: {
      width: wp("6%"),
      height: wp("6%"),
   },

   closeButton: {
      gap: 12,
      flexDirection: "row",
      alignItems: "center",
      marginTop: hp("2.5%"),
      marginLeft: wp("6%"),
   },

   sidebarContainer: {
      flex: 1,
      zIndex: 1000,
   },

   menuIndicatorActive: {
      width: wp("70%"),
      height: hp("7%"),  
      alignSelf: "center",
      padding: wp("2.5%"),
      borderRadius: wp("2%"),
      justifyContent: "center",
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
      marginBottom: hp("2%"),
      fontSize: wp("4.5%"),
   },

   accMenuHeader: {
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
      marginBottom: hp("2.5%"),
   },

   menuItem: {
      marginLeft: wp("2%"),
   },

   menuText: {
      fontSize: wp("4%"),
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
      fontSize: wp("4%"),
      fontWeight: "600",
   },

   profileEmail: {
      width: wp("45%"),
      fontSize: wp("3.2%"),
   },

   iconSection: {
      width: wp("90%"),  
      alignSelf: "center",
      marginTop: hp("1.5%"),
      paddingHorizontal: wp("2%"),
      borderRadius: wp("2.5%"),   
      borderWidth: 1,
      borderColor: colors.borderv2,
      // iOS
      shadowColor: 'rgba(216, 197, 170, 0.25)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      // Android
      elevation: 10,  
      backgroundColor: colors.white,
   },

   iconSectionContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
   },

   iconItem: {
      width: "25%",
      alignItems: "center",
      justifyContent: "center",
      marginTop: hp("1.8%"),
      marginBottom: hp("1.5%"),
   },

   iconLabel: {
      width: wp("100%"),
      fontSize: wp("3%"),
      textAlign: "center",
      marginTop: hp("0.5%"),
      fontFamily: "Poppins",
   },

   Svg: {
      marginBottom: 5,
      objectFit: "contain",
      resizeMode: "contain",
   },

   notesContainer: {
      marginTop: hp("1.5%"),
      paddingHorizontal: wp("5%"),
      paddingVertical: hp("1.5%"),
      backgroundColor: '#FAF9F6',
   },
   
   notesText: {
      fontSize: wp("4%"),
      color: colors.black,
      fontFamily: "Loviena",
      marginLeft: wp("1%"),
      marginBottom: hp("1.5%"),
   },

   screenContainer: {
      borderWidth: 0.5,
      borderColor: '#C6A664',
      width: wp("60%"),
      marginBottom: hp("1%"),
      borderRadius: wp("2%"),
      justifyContent: "center",
      paddingVertical: hp("1.5%"),
      paddingHorizontal: wp("4%"),
      backgroundColor: colors.white,
      borderLeftWidth: 5,
      borderLeftColor: '#C6A664',
   },

   screenSection: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
   },

   screenSectionText: {
      width: wp("100%"),
      fontSize: wp("4%"),
      fontFamily: "Poppins",
   },

   viewScreens: {},

   viewScreenText: {
      fontSize: wp("3.4%"),
      fontFamily: "Poppins",
      lineHeight: wp("4.5%"),
   },
   
   viewAllScreens: {
      gap: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
   },
   
   screenItem: {},
   screenItemText: {
      fontSize: wp("3.4%"),
      fontFamily: "Poppins",
   },

   scheduleItemDate: {},

   scrollContainer: {
      gap: 10,
   },
});

export default Home;