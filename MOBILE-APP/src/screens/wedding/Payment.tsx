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
                <Text style={styles.paymentHeaderTitle}>Payment Reminder - Coordinators Fee</Text>
                <Text style={styles.paymentSubTitle}>Request by Admin</Text>
                <Text style={styles.paymentSubText}>
                  Coordinator's Fee for {reminder.event_type}
                </Text>
              </View>
              <View>
                <Text style={styles.pendingText}>{reminder.notes}</Text>
              </View>
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
    marginHorizontal: wp("5%"),
    marginVertical: hp("1.5%"),
    padding: wp("4%"),
    borderRadius: wp("3%"),
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffeaa7',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },

  paymentHeader: {
    marginBottom: hp("1.5%"),
    paddingBottom: hp("1%"),
    borderBottomWidth: 1,
    borderBottomColor: '#f1c40f',
  },

  paymentHeaderTitle: {
    fontSize: wp("4%"),
    fontWeight: 'bold',
    color: '#856404',
    fontFamily: 'Poppins',
    marginBottom: hp("0.5%"),
  },

  paymentSubTitle: {
    fontSize: wp("3.2%"),
    color: '#b08c2d',
    fontFamily: 'Poppins',
    fontStyle: 'italic',
    marginBottom: hp("0.5%"),
  },

  paymentSubText: {
    fontSize: wp("3.5%"),
    color: '#856404',
    fontFamily: 'Poppins',
    fontWeight: '600',
  },

  pendingText: {
    fontSize: wp("3.5%"),
    color: '#856404',
    fontFamily: 'Poppins',
    lineHeight: hp("2.5%"),
    textAlign: 'left',
  },

});

export default Payment;