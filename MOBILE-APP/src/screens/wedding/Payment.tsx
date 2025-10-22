import React, { useState, useEffect } from "react";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Modal, Alert, Image, ImageSourcePropType } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp} from "react-native-responsive-screen";
import colors from "../config/colors";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary, MediaType, Asset } from 'react-native-image-picker';

import NavigationSlider from './ReusableComponents/NavigationSlider';
import MenuBar from "./ReusableComponents/MenuBar";

import * as SecureStore from 'expo-secure-store';
import { useEvent } from '../../context/EventContext';

const API_BASE = "https://ela-untraceable-foresakenly.ngrok-free.dev/api";

interface PaymentReminder {
  id: string;
  gcash_name: string;
  gcash_number: string;
  due_date: string;
  notes: string;
  client_name: string;
  event_type: string;
  sent_at: string;
}

const Payment = () => {
  const [image, setImage] = useState<Asset | null>(null);
  const [message, setMessage] = useState("Proof of payment");
  const [uploading, setUploading] = useState(false);
  const [reminder, setReminder] = useState<PaymentReminder | null>(null);
  const [loading, setLoading] = useState(true);

  const { eventData } = useEvent();

  // Fetch payment reminders
  const fetchReminders = async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const response = await fetch(`${API_BASE}/event-plans/payment-reminders`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.reminders && result.reminders.length > 0) {
          setReminder(result.reminders[0]); // Show most recent reminder
        }
      }
    } catch (error) {
      console.error('❌ Fetch reminders error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const selectImage = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      includeBase64: false,
      maxHeight: 1000,
      maxWidth: 1000,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        Alert.alert('Error', 'Failed to pick image');
      } else if (response.assets && response.assets.length > 0) {
        const source = response.assets[0];
        setImage(source);
      }
    });
  };

  const handleUpload = async () => {
    if (!image) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setUploading(true);
    try {
      // Your existing upload logic here
      // After successful upload, you might want to mark reminder as paid
      Alert.alert('Success', 'Proof of payment uploaded successfully!');
    } catch (error) {
      Alert.alert('Error', 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImage(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!reminder) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <LinearGradient colors={["#FFFFFF", "#f2e8e2ff"]} style={{ flex: 1 }}>
            <View style={styles.paymentContainer}>
              <Text style={styles.paymentHeaderTitle}>No Payment Reminders</Text>
              <Text style={styles.paymentSubText}>You don't have any pending payments at the moment.</Text>
            </View>
          </LinearGradient>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient colors={["#FFFFFF", "#f2e8e2ff"]} style={{ flex: 1 }}>
          {/* HEADER */}
          <View>
            <NavigationSlider headerTitle="Payment" />
          </View>

          {/* PAYMENT CONTENT */}
          <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: hp("8%") }}>
            <View style={styles.paymentContainer}>
              <View style={styles.paymentHeader}>
                <Text style={styles.paymentHeaderTitle}>Payment Pending</Text>
                <Text style={styles.paymentSubTitle}>Request by Admin</Text>
                <Text style={styles.paymentSubText}>
                  Coordinator's Fee for {reminder.event_type}
                </Text>
              </View>
              
              <View style={styles.divider}></View>

              <View>
                <View style={styles.paymentMethod}>
                  <Text style={styles.paymentHeaderTitle}>Payment Method:</Text>
                  <Text style={styles.gcashText}>GCash</Text>
                </View>
                <View style={styles.paymentMethod}>
                  <Text style={styles.paymentHeaderTitle}>Due Date:</Text>
                  <Text style={styles.deadlineText}>{formatDate(reminder.due_date)}</Text>
                </View>
              </View>

              <View style={styles.divider}></View>

              <View>
                <Text style={styles.paymentHeaderTitle}>GCash account to send to:</Text>
                <Text style={styles.paymentSubText}>{reminder.gcash_name}</Text>
                <Text style={styles.paymentHeaderTitle}>{reminder.gcash_number}</Text>
                <TouchableOpacity style={styles.gcashBtn} onPress={() => {}}>
                  <Text style={styles.gcashBtnText}>Open GCash</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider}></View>

              <View>
                <Text style={styles.pendingText}>{reminder.notes}</Text>
              </View>
            </View>

            {/* UPLOAD PROOF SECTION */}
            <View style={[styles.paymentContainer, styles.uploadContainer]}>
              <View>
                <Text style={styles.paymentHeaderTitle}>Upload your proof of payment here</Text>
              </View>
              
              <View style={styles.divider}></View>
              
              <View>
                <Text style={styles.paymentSubText}>Message</Text>    
                <TextInput
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={message}
                  onChangeText={setMessage}
                  style={styles.messageInput}
                />
              </View>

              <View style={styles.uploadImageContainer}>
                {image ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image 
                      source={{ uri: image.uri }} 
                      style={styles.imagePreview}
                      resizeMode="contain"
                    />
                    <TouchableOpacity style={styles.removeButton} onPress={removeImage}>
                      <Text style={styles.removeButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.uploadButton} onPress={selectImage}>
                    <Text style={styles.uploadText}>📷 Tap to upload proof</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity 
                style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]} 
                onPress={handleUpload}
                disabled={uploading}
              >
                <Text style={styles.uploadButtonText}>
                  {uploading ? 'Uploading...' : 'Submit Proof'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </LinearGradient>
        <MenuBar activeScreen={"Payment"} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
    paymentContainer: {
        height: 'auto',
        width: wp("90%"),
        borderRadius: 12,
        marginVertical: 20,
        alignSelf: "center",
        backgroundColor: "white",
        paddingVertical: wp("5%"),
        paddingHorizontal: wp("5%"),

        elevation: 3,
        shadowRadius: 3.84,
        shadowOpacity: 0.25,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
    },

    paymentHeader: {
        flexDirection: "column",
    },

    paymentHeaderTitle: {
        fontWeight: "600",
        fontSize: wp("4.4%"),
        paddingBottom: hp("0.5%"),
    },

    paymentSubTitle: {
        fontSize: wp("3.5%"),
        color: colors.borderv4,
    },

    paymentSubText: {
        fontSize: wp("4.2%"),
    },

    paymentMethod: {
        flexDirection: "row",
        justifyContent: "space-between",
    },

    gcashText: {
        fontSize: wp("4.5%"),
        color: colors.facebookBtn,
    },

    deadlineText: {
        color: colors.red,
        fontSize: wp("4.5%"),
    },

    gcashBtn: {
        borderRadius: 12,
        alignItems: "center",
        marginTop: hp("1.5%"),
        marginBottom: hp("0.8%"),
        justifyContent: "center",
        paddingVertical: hp("1.5%"),
        backgroundColor: colors.facebookBtn,
    },

    gcashBtnText: {
        color: colors.white,
        fontSize: wp("4.5%"),
    },

    pendingText: {
        color: colors.borderv4,
    },

    divider: {
        borderWidth: 0.5,
        marginVertical: hp("1.5%"),
        borderColor: colors.borderv1,
    },

    uploadContainer: {
        marginTop: hp("-1%"),
    },
    
    messageInput: {
        borderWidth: 0.5,
        borderRadius: 12,
        marginTop: hp("1%"),
        fontSize: wp("4.5%"),
        paddingLeft: wp("5%"),
        color: colors.borderv3,
        paddingVertical: hp("1.5%"),
        borderColor: colors.borderv4,
    },

    uploadImageContainer: {
        borderWidth: 1,
        height: hp("12%"),
        marginTop: hp("2%"),
        alignItems: 'center',
        borderStyle: 'dashed',
        borderRadius: wp("3%"),
        justifyContent: 'center',
        borderColor: colors.borderv4,
    },

    uploadButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    uploadText: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.facebookBtn,
    },

    uploadSubtext: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },

    imagePreviewContainer: {
        width: '100%',
        height: '100%',
        position: 'relative',
    },

    imagePreview: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },

    removeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 15,
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },

    removeButtonText: {},
    uploadButtonText: {},
    uploadButtonDisabled: {},
});

export default Payment;