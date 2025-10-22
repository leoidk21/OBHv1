import React, { useEffect, useRef, useState } from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Animated, StyleSheet, Text, View, Image, TouchableOpacity, ScrollView } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import colors from "../config/colors";

import { RootStackParamList } from "../../screens/type";
import { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";

import NavigationSlider from './ReusableComponents/NavigationSlider';
import MenuBar from "./ReusableComponents/MenuBar";

import { useFocusEffect } from '@react-navigation/native';
import { useEvent } from "../../context/EventContext";

const Event = () => {
    const { eventData, eventStatus, refreshEventStatus } = useEvent();
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();

    useFocusEffect(
        React.useCallback(() => {
            refreshEventStatus();
        }, [])
    );

    // Color map for each status
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Pending':
            return { backgroundColor: '#fce4ec', color: '#c2185b' };
            case 'Approved':
            return { backgroundColor: '#d4edda', color: '#155724' };
            case 'Rejected':
            return { backgroundColor: '#f5f5f5', color: '#c2185b' };
            case 'Completed':
            return { backgroundColor: '#90caf9', color: '#1565c0' };
            default:
            return { backgroundColor: '#f5f5f5', color: '#000000' };
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return '#4CAF50';
            case 'Rejected': return '#F44336';
            case 'Completed': return '#2196F3';
            default: return '#F44336';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'Approved': return 'Approved';
            case 'Rejected': return 'Rejected';
            case 'Completed': return 'Completed';
            default: return 'Pending';
        }
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
                        <NavigationSlider headerTitle="Event" />
                    </View>
                    {/* HEADER */}
                    {/* CONTENT */}
                    <View style={styles.header}>
                        <Text style={styles.highlightText}>Your Event Summary</Text>
                    </View>
                    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: hp("8%") }}>
                        <View style={styles.eventStatusContainer}>
                            <View style={[styles.eventStatus, ]}>
                                <Text style={styles.eventStatusHeader}>Event Status:</Text>
                                    <Text 
                                        style={[
                                            styles.eventStatusText, 
                                            { 
                                                color: getStatusStyle(eventStatus).color,
                                                backgroundColor: getStatusStyle(eventStatus).backgroundColor
                                            }
                                        ]}
                                    >
                                    {getStatusText(eventStatus)}
                                </Text>
                            </View>
                        </View>
                        
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Event Details:</Text>
                            <Text style={styles.fields}>Event Type: {eventData.event_type || 'Not set'}</Text>
                            <Text style={styles.fields}>Wedding Type: {eventData.wedding_type || 'Not set'}</Text>
                            <Text style={styles.fields}>Client Name: {eventData.full_client_name || eventData.client_name || 'Not set'}</Text>
                            <Text style={styles.fields}>Event Date: {eventData.event_date || 'Not set'}</Text>
                            <Text style={styles.fields}>Packages: {eventData.guest_range || 'Not set'} Pax</Text>
                            <Text style={styles.fields}>Price: {eventData.package_price || 'Not set'}</Text>
                        </View>

                        {/* Part 2: Schedule */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Schedule ({eventData.schedule?.length || 0} segments)</Text>
                                {eventData.schedule?.map((segment: any, index: number) => (
                                    <View key={index} style={styles.segmentItem}>
                                        <Text style={styles.fields}>Starting Time: {segment.startTime || 'Not set'}</Text>
                                        <Text style={styles.fields}>Segment: {segment.name}</Text>
                                        <Text style={styles.fields}>Venue: {segment.venue}</Text>
                                    </View>
                                ))}
                        </View>

                        {/* Part 3: Guests */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Guests ({eventData.guests?.length || 0} total)</Text>
                            <Text style={styles.fields}>Accepted: {eventData.guests?.filter((g: any) => g.status === 'Accepted').length || 0}</Text>
                            <Text style={styles.fields}>Pending: {eventData.guests?.filter((g: any) => g.status === 'Pending').length || 0}</Text>
                            <Text style={styles.fields}>Declined: {eventData.guests?.filter((g: any) => g.status === 'Declined').length || 0}</Text>
                        </View>

                        {/* Part 4: Budget */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Budget</Text>
                            <Text style={styles.fields}>Total Expenses: {eventData.budget?.length || 0}</Text>
                            <Text style={styles.fields}>Total Amount: ₱{eventData.budget?.reduce((sum: number, expense: any) => sum + expense.amount, 0) || 0}</Text>
                        </View>
                    </ScrollView>
                </LinearGradient>
                <MenuBar activeScreen="Event"/>
            </SafeAreaView>
        </SafeAreaProvider>
    );
};

const styles = StyleSheet.create({
    header: {
        marginTop: hp("2.5%"),
        marginHorizontal: wp("5%"),
    },

    highlightText: {
        fontSize: wp('6%'),
        color: colors.brown,
        fontFamily: "Loviena",
    },

    section: {
        marginBottom: hp("1%"),
        borderRadius: wp("4%"),
        justifyContent: "center",
        marginHorizontal: wp("5%"),
        paddingVertical: hp("1.5%"),
        paddingHorizontal: wp("4%"),
        backgroundColor: colors.white,
        
        borderWidth: 0.5,
        borderColor: '#B47D4C',
    },

    eventStatusContainer: {
        marginVertical: hp("1.2%"),
        marginHorizontal: wp("5%"),
    },

    eventStatusHeader: {
        lineHeight: 20,
        fontSize: wp("4%"),
        fontFamily: "Poppins",
    },

    eventStatusText: {
        lineHeight: 20,
        fontSize: wp("3%"),
        padding: hp("0.8%"),
        fontFamily: "Poppins",
        borderRadius: wp("2%"),
    },

    eventStatus: {
        borderWidth: 0.5,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: wp("6%"),
        borderColor: '#B47D4C',
        paddingVertical: hp("1.2%"),
        paddingHorizontal: wp("5%"),
        justifyContent: "space-between",
    },

    sectionTitle: {
        fontSize: wp("4%"),
        color: colors.brown,
        fontFamily: "Poppins",
    },

    fields: {                   
        fontSize: wp("3.1%"),
        color: colors.brown,
        fontFamily: "Poppins",
    },

    segmentItem: {
        marginTop: hp("0.8%"),
        borderRadius: wp("4%"),
        justifyContent: "center",
        paddingVertical: hp("1.2%"),
        paddingHorizontal: wp("4%"),
        backgroundColor: colors.white,
        
        borderWidth: 0.5,
        borderColor: '#9e9e9e',
    },

    statusDetails: {},
    statusDetailText: {},
    statusComment: {},
});

export default Event;