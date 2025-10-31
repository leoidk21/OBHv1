import React, { useEffect, useRef, useState } from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Animated, StyleSheet, Text, View, Image, TouchableOpacity, ScrollView } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import colors from "../config/colors";
import { Alert } from "react-native";

import { RootStackParamList } from "../../screens/type";
import { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";

import { ActivityIndicator } from "react-native";

import NavigationSlider from './ReusableComponents/NavigationSlider';
import MenuBar from "./ReusableComponents/MenuBar";

import { supabase } from '../../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useEvent } from "../../context/EventContext";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const Event = () => {
    const { eventData, eventStatus, refreshEventStatus } = useEvent();
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [canCancel, setCanCancel] = useState(true);
    const [submissionDate, setSubmissionDate] = useState<string | null>(null);

    const getAuthToken = async (): Promise<string | null> => {
        try {
            console.log('🔍 Checking SecureStore for token...');
            
            // Method 1: Check SecureStore (where your login actually saves it)
            const token = await SecureStore.getItemAsync('userToken');
            if (token) {
                console.log('Token found in SecureStore');
                return token;
            }
            
            // Method 2: Fallback to AsyncStorage (just in case)
            const asyncToken = await AsyncStorage.getItem('userToken');
            if (asyncToken) {
                console.log('Token found in AsyncStorage');
                return asyncToken;
            }
            
            console.log('No token found in SecureStore or AsyncStorage');
            return null;
        } catch (error) {
            console.error('Error retrieving token:', error);
            return null;
        }
    };

    useEffect(() => {
        const getUserId = async () => {
            try {
                // Check SecureStore first (where login saves it)
                let userIdStr = await SecureStore.getItemAsync('userId');
                
                if (userIdStr) {
                    setUserId(userIdStr);
                    console.log('User ID from SecureStore:', userIdStr);
                    return;
                }
                
                // Fallback to AsyncStorage userData
                const userData = await AsyncStorage.getItem('userData');
                if (userData) {
                    const user = JSON.parse(userData);
                    setUserId(String(user.id));
                    console.log('User ID from AsyncStorage:', user.id);
                }
            } catch (error) {
                console.log('Error getting user ID:', error);
            }
        };
        getUserId();
    }, []);

    // Check if cancellation is allowed (within 72 hours of submission)
    useEffect(() => {
        const checkCancellationEligibility = async () => {
            try {
                const submissionDateStr = await AsyncStorage.getItem('eventSubmissionDate');
                if (submissionDateStr) {
                    setSubmissionDate(submissionDateStr);
                    const submissionTime = new Date(submissionDateStr).getTime();
                    const currentTime = new Date().getTime();
                    const hoursSinceSubmission = (currentTime - submissionTime) / (1000 * 60 * 60);
                    
                    setCanCancel(hoursSinceSubmission <= 72);
                }
            } catch (error) {
                console.log('Error checking cancellation eligibility:', error);
            }
        };

        checkCancellationEligibility();
    }, []);

    // Listen for real-time notifications
    useEffect(() => {
        if (!userId) return;

        console.log('Setting up Supabase real-time for user:', userId);

        const subscription = supabase
            .channel(`user-${userId}-notifications`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_uuid=eq.${userId}`,
                },
                (payload) => {
                    console.log('📢 REAL-TIME NOTIFICATION:', payload.new);
                    
                    const notification = payload.new as any;
                    
                    Alert.alert(
                        'Event Status Updated',
                        notification.message,
                        [
                            {
                                text: 'Refresh',
                                onPress: () => refreshEventStatus()
                            },
                            { text: 'OK' }
                        ]
                    );

                    refreshEventStatus();
                }
            )
            .subscribe((status) => {
                console.log('🔔 Supabase subscription status:', status);
            });

        return () => {
            console.log('🧹 Cleaning up Supabase subscription');
            subscription.unsubscribe();
        };
    }, [userId, refreshEventStatus]);

    useFocusEffect(
        React.useCallback(() => {
            const fetchData = async () => {
                setLoading(true);
                await refreshEventStatus();
                setLoading(false);
            };
            fetchData();
        }, [refreshEventStatus])
    );

    // Update event function
    const handleUpdateEvent = () => {
        Alert.alert(
            "Update Event",
            "What would you like to update?",
            [
                {
                    text: "Event Details",
                    onPress: () => navigation.navigate('ChooseEvent' as never)
                },
                {
                    text: "Schedule",
                    onPress: () => navigation.navigate('Schedule' as never)
                },
                {
                    text: "Guests",
                    onPress: () => navigation.navigate('Guest' as never)
                },
                {
                    text: "Budget",
                    onPress: () => navigation.navigate('Budget' as never)
                },
                {
                    text: "Cancel",
                    style: "cancel"
                }
            ]
        );
    };

    // Add this helper function to get event ID from backend using your existing route
    const getEventIdFromBackend = async (userId: string): Promise<string | null> => {
    try {
        console.log('🔍 Getting event ID from Supabase...');
        
        const { data, error } = await supabase
        .from('event_plans')
        .select('id, client_name, event_type, event_date, status')
        .eq('user_uuid', userId)
        .order('created_at', { ascending: false })
        .limit(1);

        if (error) {
        console.error('Error getting events:', error);
        return null;
        }

        if (data && data.length > 0) {
        const eventId = data[0].id;
        console.log('✅ Found event ID from Supabase:', eventId);
        return eventId;
        }
        
        return null;
    } catch (error) {
        console.error('Error getting events:', error);
        return null;
    }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Pending': return { backgroundColor: '#fce4ec', color: '#c2185b' };
            case 'Approved': return { backgroundColor: '#d4edda', color: '#155724' };
            case 'Rejected': return { backgroundColor: '#f5f5f5', color: '#c2185b' };
            case 'Completed': return { backgroundColor: '#90caf9', color: '#1565c0' };
            default: return { backgroundColor: '#f5f5f5', color: '#000000' };
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
                {/* Connection Status Indicator */}
                    {/* HEADER */}
                    <View>
                        <NavigationSlider headerTitle="Event" />
                    </View>
                    {/* HEADER */}
    
                    {/* CONTENT */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large"/>
                            <Text style={styles.loadingText}>Updating event status...</Text>
                        </View>
                    ) : (
                        <>
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

                            {/* ADD ACTION BUTTONS HERE */}
                            {/* {(eventStatus === 'Pending' || eventStatus === 'Approved') && (
                                <View style={styles.actionButtonsContainer}>
                                    <TouchableOpacity 
                                        style={[
                                            styles.cancelButton,
                                            !canCancel && styles.disabledButton
                                        ]}
                                        onPress={handleCancelEvent}
                                        disabled={!canCancel}
                                    >
                                        <Text style={styles.cancelButtonText}>
                                            {canCancel ? 'Cancel Event' : 'Cancellation Expired'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )} */}
                        </ScrollView>
                    </>
                )}
                </LinearGradient>
                <MenuBar activeScreen="Event"/>
            </SafeAreaView>
        </SafeAreaProvider>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },

    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: "#333",
    },

    purple: {},

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
    connectionStatus: {},
    connectionStatusText: {},
    actionButtonsContainer: {},
    updateButton: {},
    updateButtonText: {},

    cancelButton: {
        flex: 1,
        padding: hp("1.5%"),
        alignItems: "center",
        borderRadius: wp("2%"),
        marginHorizontal: wp("5%"),
        marginTop: hp("1%"),
        marginBottom: hp("2.5%"),
        backgroundColor: colors.brown,
    },
    
    disabledButton: {},
    
    cancelButtonText: {
        color: "white",
        fontFamily: "Poppins",
        fontWeight: "600",
        fontSize: wp("3.5%"),
    },
});

export default Event;