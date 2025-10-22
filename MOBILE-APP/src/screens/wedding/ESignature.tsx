import React, { useRef, useState, useEffect } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View, TouchableOpacity, Image, Modal, ScrollView } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp} from "react-native-responsive-screen";
import colors from "../config/colors";
import SignatureScreen from "react-native-signature-canvas";
import { Alert } from "react-native";
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

import NavigationSlider from './ReusableComponents/NavigationSlider';
import MenuBar from "./ReusableComponents/MenuBar";
import { useEvent } from '../../context/EventContext';

const ESignature  = () => {
  const {
    eventData,
    updateEvent,
    submitEventToDesktop,
    getEventSummary,
  } = useEvent();

  useEffect(() => {
    console.log('Event Data Structure:', JSON.stringify(eventData, null, 2));
  }, [eventData]);

  const ref = useRef<any>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const navigation: NavigationProp<ParamListBase> = useNavigation();
  const [loading, setLoading] = useState(false);

  // Step 1: Handle signature capture
  const handleSaveSignature = () => {
    ref.current.readSignature();
  };

  // Step 2: When signature is captured
  const handleOK = (signatureData: string) => {
    // Save signature to context
    updateEvent('eSignature', signatureData);
    setSignature(signatureData);
    
    // Show the submission review modal
    setShowSubmissionModal(true);
  };

  // Step 3: Handle final submission
  const handleConfirmSubmission = async () => {
    setLoading(true);
    try {
        await submitEventToDesktop();
        Alert.alert('Success', 'Event submitted successfully!');
        setShowSubmissionModal(false);
    
        navigation.navigate('Event' as never);
    } catch (error) {
        Alert.alert('Error', 'Failed to submit event. Please try again.');
    }  finally {
      setLoading(false);
    }
  };

  // Step 4: Clear signature
  const handleClear = () => {
    ref.current.clearSignature();
    setSignature(null);
    updateEvent('eSignature', null);
  };

  const validateEventData = () => {
    const errors: string[] = [];

    // Check Part 1 - Basic Event Details (REQUIRED)
    if (!eventData.event_type) {
        errors.push('• Event type is required');
    }
    if (!eventData.event_date) {
        errors.push('• Event date is required');
    }
    if (!eventData.guest_range) {
        errors.push('• Guest count/range is required');
    }
    if (!eventData.client_name && !eventData.full_client_name) {
        errors.push('• Client name is required');
    }
    if (!eventData.client_email) {
        errors.push('• Client email is required');
    }
    
    // Check Part 2 - Detailed Planning (REQUIRED for submission)
    if (!eventData.schedule || eventData.schedule.length === 0) {
        errors.push('• At least one schedule segment is required');
    }
    if (!eventData.guests || eventData.guests.length === 0) {
        errors.push('• At least one guest is required');
    }
    if (!eventData.budget || eventData.budget.length === 0) {
        errors.push('• At least one budget expense is required');
    }
    if (!eventData.venue?.name) {
        errors.push('• Venue is required');
    }
        return errors;
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient colors={["#FFFFFF", "#f2e8e2ff"]} style={{ flex: 1 }}>
          {/* HEADER */}
          <View>
              <NavigationSlider headerTitle="ESignature" />
          </View>
          {/* HEADER */}

          <View style={styles.introContainer}>
            <Text style={styles.introText}>
                Please sign below to confirm and authorize this agreement.
            </Text>
          </View>

          {/* CONTENT */}
          <View style={styles.previewContainer}>
            {/* SIGNATURE PAD */}
            <SignatureScreen
                ref={ref}
                onOK={handleOK}
                autoClear={true}
                descriptionText="Sign here"
                backgroundColor="#fff"
                penColor="black"
                webStyle={`
                    .m-signature-pad {
                        box-shadow: none;
                    }
                    .m-signature-pad--body {
                        border-radius: 12px;
                    }
                    .m-signature-pad--footer {
                        display: none;
                    }
                    canvas {
                        background-color: #fff;
                        border-radius: 12px;
                    }
                `}
            />
            </View>

            <View style={styles.buttonRow}>
                <View>
                    <TouchableOpacity
                        onPress={handleClear}
                        style={styles.clearButton}       
                    >
                        <Text style={styles.clearText}>Clear</Text>
                    </TouchableOpacity>
                </View>

                <View>
                    <TouchableOpacity
                        onPress={handleSaveSignature}
                        style={[
                            styles.confirmButton,
                            loading && styles.disabledButton
                        ]}
                        disabled={loading}   
                    >
                        <Text style={[
                            styles.saveText,
                            loading && styles.disabledText
                        ]}>
                            {loading ? 'Saving...' : 'Save'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* SUBMISSION REVIEW MODAL */}
                <Modal visible={showSubmissionModal} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={styles.submissionModal}>
                            <Text style={styles.modalTitle}>Review & Submit Event</Text>
                            <Text style={styles.reviewText}>Please review the following information:</Text>
                            
                            <ScrollView style={styles.reviewContainer}>
                                {/* Part 1: Basic Event Info */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Event Details</Text>
                                    <Text>Event Type: {eventData.event_type || 'Not set'}</Text>
                                    <Text>Wedding Type: {eventData.wedding_type || 'Not set'}</Text>
                                    <Text>Client Name: {eventData.full_client_name || eventData.client_name || 'Not set'}</Text>
                                    <Text>Event Date: {eventData.event_date || 'Not set'}</Text>
                                    <Text>Packages: {eventData.guest_range || 'Not set'} Pax</Text>
                                    <Text>Price: {eventData.package_price || 'Not set'}</Text>
                                </View>

                                {/* Part 2: Schedule */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Schedule ({eventData.schedule?.length || 0} segments)</Text>
                                    {eventData.schedule?.map((segment: any, index: number) => (
                                    <View key={index} style={styles.segmentItem}>
                                        <Text style={styles.segmentTime}>{segment.time}</Text>
                                        <Text style={styles.segmentName}>{segment.name}</Text>
                                        <Text style={styles.segmentNotes}>{segment.notes}</Text>
                                    </View>
                                    ))}
                                    {(!eventData.schedule || eventData.schedule.length === 0) && (
                                        <Text style={styles.missingField}>No schedule segments added</Text>
                                    )}
                                </View>

                                {/* Part 3: Guests */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Guests ({eventData.guests?.length || 0} total)</Text>
                                    <Text>Accepted: {eventData.guests?.filter((g: any) => g.status === 'Accepted').length || 0}</Text>
                                    <Text>Pending: {eventData.guests?.filter((g: any) => g.status === 'Pending').length || 0}</Text>
                                    <Text>Declined: {eventData.guests?.filter((g: any) => g.status === 'Declined').length || 0}</Text>
                                    {(!eventData.guests || eventData.guests.length === 0) && (
                                        <Text style={styles.missingField}>No guests added</Text>
                                    )}
                                </View>

                                {/* Part 4: Budget */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Budget</Text>
                                    <Text>Total Expenses: {eventData.budget?.length || 0}</Text>
                                    <Text>Total Amount: ₱{eventData.budget?.reduce((sum: number, expense: any) => sum + expense.amount, 0) || 0}</Text>
                                    {(!eventData.budget || eventData.budget.length === 0) && (
                                        <Text style={styles.missingField}>No expenses added</Text>
                                    )}
                                </View>
                            </ScrollView>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity 
                                    style={styles.cancelButton}
                                    onPress={() => setShowSubmissionModal(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.submitButton}
                                    onPress={handleConfirmSubmission}
                                >
                                    <Text style={styles.submitButtonText}>Submit Event</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
            
          {/* CONTENT */}
        </LinearGradient>
        {/* <View>
          <MenuBar activeScreen={"ESignature"} />
        </View> */}
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
    introContainer: {
        marginTop: hp("4%"),
        alignItems: "center",
    },

    introText: {
        textAlign: "center",
        fontSize: wp("4.5%"),
        fontFamily: "Poppins",
        marginHorizontal: wp("10%"),
    },


    previewContainer: {
        borderWidth: 1,
        borderRadius: 12,
        width: wp("90%"),
        height: hp("30%"),
        overflow: "hidden",
        marginVertical: 20,
        alignSelf: "center",
        borderColor: colors.borderv5,
        backgroundColor: colors.white,

        elevation: 3,
        shadowRadius: 3.84,
        shadowOpacity: 0.25,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
    },

    buttonRow: {
        gap: 12,
        alignSelf: "center",
        flexDirection: "row",
        justifyContent: "space-between",
    },

    clearButton: {
        borderRadius: wp("2.5%"),
        paddingVertical: wp("3.5%"),
        paddingHorizontal: wp("18%"),
        backgroundColor: colors.border,
    },

    confirmButton: {
        borderRadius: wp("2.5%"),
        paddingVertical: wp("3.5%"),
        paddingHorizontal: wp("18%"),
        backgroundColor: colors.button,
    },

    clearText: {
        color: colors.black,
    },

    saveText: {
        color: colors.white,
    },

    // SUBMISSION MODAL STYLES
    modalOverlay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    
    submissionModal: {
        width: wp('90%'),
        padding: wp('4%'),
        overflow: 'hidden',
        maxHeight: hp('80%'),
        borderRadius: wp('4%'),
        backgroundColor: 'white',

        elevation: 5,
        shadowRadius: 3.84,
        shadowOpacity: 0.25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
    },

    modalTitle: {
        color: '#333',
        fontSize: wp('5%'),
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: hp('0.5%'),
    },

    reviewContainer: {
        maxHeight: hp('50%'),
        marginBottom: hp('2%'),
    },
    
    reviewText: {
        textAlign: "center",
        fontSize: wp("3.2%"),
        marginBottom: hp('1%'),
    },

    section: {
        borderWidth: 1,
        padding: wp('3%'),
        borderLeftWidth: 4,
        borderRadius: wp('2%'),
        marginBottom: hp('1.5%'),
        borderColor: colors.borderv2,
        backgroundColor: '#f8f9fa',
        borderLeftColor: '#102E50',
    },

    sectionTitle: {
        fontSize: wp('4%'),
        color: '#102E50',
        fontWeight: 'bold',
        marginBottom: hp('1%'),
    },

    segmentItem: {
        borderWidth: 1,
        padding: wp('2.5%'),
        backgroundColor: 'white',
        borderRadius: wp('1.5%'),
        marginBottom: hp('0.8%'),
        borderColor: '#e9ecef',
    },

    segmentTime: {
        color: '#102E50',
        fontWeight: 'bold',
        fontSize: wp('3.5%'),
    },

    segmentName: {
        fontWeight: '600',
        fontSize: wp('3.5%'),
        marginTop: hp('0.3%'),
    },

    segmentNotes: {
        color: '#666',
        fontSize: wp('3%'),
        fontStyle: 'italic',
        marginTop: hp('0.3%'),
    },

    modalButtons: {
        marginTop: hp('1%'),
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    cancelButton: {
        flex: 1,
        padding: hp('1.5%'),
        alignItems: 'center',
        marginRight: wp('2%'),
        borderRadius: wp('2%'),
        backgroundColor: '#6c757d',
    },

    cancelButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: wp('3.5%'),
    },

    submitButton: {
        flex: 1,
        padding: hp('1.5%'),
        marginLeft: wp('2%'),
        alignItems: 'center',
        borderRadius: wp('2%'),
        backgroundColor: '#28a745',
    },

    submitButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: wp('3.5%'),
    },

    missingField: {
        color: '#dc3545',
        fontWeight: '600',
        fontStyle: 'italic',
        marginTop: hp('0.5%'),
    },

    normalField: {
        color: '#333',
    },

    disabledButton: {
        opacity: 0.5,
    },

    disabledText: {
        opacity: 0.5,
    },
});

export default ESignature;