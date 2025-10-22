import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from "@react-navigation/native";
import { NavigationProp, ParamListBase } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import colors from "../config/colors";
import Icon from "react-native-vector-icons/Feather";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {Calendar, CalendarList, Agenda} from 'react-native-calendars';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";

import { Alert } from "react-native";

import { useEvent } from '../../context/EventContext';

const ClientsName = () => {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const navigation: NavigationProp<ParamListBase> = useNavigation();
  
  const [selectedDate, setSelectedDate] = useState("");
  const [formattedDate, setFormattedDate] = useState(""); 

  const { updateEvent, debugStorageKeys } = useEvent();

  const handleDateSelect = async   (rawDate: string) => {
    setSelectedDate(rawDate);

    const date = new Date(rawDate);
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
    const monthName = ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"][date.getMonth()];

    const formatted = `${dayName}, ${date.getDate()} ${monthName}`;
    setFormattedDate(formatted);

    // Save to EventContext
    await updateEvent('event_date', rawDate);
    await updateEvent('formatted_event_date', formatted);

    await debugStorageKeys();
  };

  const handleCreateEvent = async () => {
    if (!selectedDate) {
      Alert.alert('Please select an event date');
      return;
    }

    await new Promise<void>((resolve) => setTimeout(() => resolve(), 100));
    navigation.navigate("CompanyPolicy");
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient
          colors={["#FFFFFF", "#f2e8e2ff"]}
          style={styles.container}
        >
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.navigate("ClientsName")}
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
                <View style={[styles.stepDot, { backgroundColor: colors.brown }]} />
            </View>
            
            <View>
                <Text style={styles.stepText}>
                    4/4
                </Text>
            </View>
          </View>
          <View style={styles.topContent}>
            <Text style={styles.topText}>
              Set Your{"\n"}Wedding Date
            </Text>
          </View>

          <View style={styles.selectedDate}>
            <Text 
              style={{ 
                textAlign: "left", 
                fontSize: 16, 
                color: "#102E50",
                fontFamily: "Poppins", 
              }}>
              {formattedDate ? formattedDate : "Select a date"}
            </Text>
          </View>  

          <Calendar
            onDayPress={(day) => {
              handleDateSelect(day.dateString);
            }}

            dayComponent={({ date, state }) => {
              const isSelected = date?.dateString === selectedDate;
              const isToday = date?.dateString === new Date().toISOString().split("T")[0];

              return (
                <TouchableOpacity
                  onPress={() => {
                    if (date && state !== "disabled") {
                      handleDateSelect(date.dateString);
                    }
                  }}
                  activeOpacity={1}
                  style={{
                    width: wp("8.5%"),
                    height: wp("8.5%"),
                    borderRadius: 50,
                    backgroundColor:
                      isToday && !isSelected
                        ? "#BA4557"
                        : isSelected
                          ? "#2A65DD"
                          : "transparent",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  disabled={state === "disabled"}
                >
                  <Text
                    style={{
                      color:
                        (isToday && !isSelected) || isSelected
                          ? "#ffffff"
                          : state === "disabled"
                            ? "#a7aeb4ff"
                            : "#102E50",
                      fontSize: 12,
                    }}
                  >
                    {date?.day != null
                      ? date.day < 10
                        ? `0${date.day}`
                        : date.day
                      : ""}
                  </Text>
                </TouchableOpacity>
              );
            }}

            renderArrow={(direction) => (
              <Icon
                name={direction === "left" ? "chevron-left" : "chevron-right"}
                size={24}
                color="#102E50"
              />
            )}
            theme={{
              textMonthFontSize: 16,
              arrowColor: "#102E50",
              textDayHeaderFontSize: 14,
              dayTextColor: "#102E50",
              textMonthFontWeight: "bold",
              monthTextColor: "#102E50",
              todayTextColor: "#ffffff",
              backgroundColor: "#ffffff",
              textDisabledColor: "#d9e1e8",
              calendarBackground: "#ffffff",
              todayBackgroundColor: "#BA4557",
              selectedDayTextColor: "#ffffff",
              textSectionTitleColor: "#102E50",
              selectedDayBackgroundColor: "#2A65DD",
            }}
            style={{
              elevation: 3,
              width: wp("88%"),
              borderRadius: 10,
              paddingBottom: 10,
              alignSelf: "center",
              backgroundColor: "#fff",
            }}
            enableSwipeMonths={true}
          />

            <View style={styles.bottomContent}>
            <TouchableOpacity
              style={[
                styles.createButton,
                !selectedDate && styles.createButtonDisabled
              ]}
              onPress={handleCreateEvent}
              disabled={!selectedDate}
            >
              <Text style={styles.buttonText}>
                Create Event
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  createButtonDisabled: {},
  container: {
    flex: 1,
  },

  bottomContent: {
    bottom: hp("4%"),
    alignSelf: "center",
    position: "absolute",
  },

  createButton: {
    width: wp('88%'),
    alignItems: 'center',
    borderRadius: wp('50%'),
    paddingVertical: hp('1.4%'),
    paddingHorizontal: wp('5%'),
    backgroundColor: colors.button,
  },

  buttonText: {
    fontSize: 15,
    color: colors.white,
    fontFamily: 'Poppins',
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
    justifyContent: "center",
  },

  topText: {
    left: wp("6%"),
    textAlign: "left",
    fontSize: wp("8%"),
    color: colors.black,
    lineHeight: wp("8%"),
    fontFamily: "Loviena",
    marginTop: hp("4%"),
    marginBottom: hp("1%"),
  },

  faUser: {
    backgroundColor: colors.faUser,
  },

  textInput: {
    borderWidth: 1,
    width: wp("82%"),
    height: hp("7%"),
    borderRadius: 50,
    marginTop: hp("1%"),
    borderColor: colors.border,
    paddingHorizontal: wp("7%"),
    backgroundColor: colors.white,
  },

  selectedDate: {
    elevation: 3,
    width: wp("88%"),
    height: hp("7%"),
    borderRadius: 10,
    marginTop: hp("2%"),
    alignSelf: "center",
    marginBottom: hp("2%"),
    justifyContent: "center",
    borderColor: colors.border,
    paddingHorizontal: wp("7%"),
    backgroundColor: colors.white,
  }
});

export default ClientsName;

