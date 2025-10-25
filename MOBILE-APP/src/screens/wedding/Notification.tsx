import React, { useState, useEffect } from "react";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, Alert } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp} from "react-native-responsive-screen";
import colors from "../config/colors";

import NavigationSlider from './ReusableComponents/NavigationSlider';
import MenuBar from "./ReusableComponents/MenuBar";
import { useNotifications } from '../../context/NotificationContext';

const Notification = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, refreshNotifications, loading } = useNotifications();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups: any, notification) => {
    const date = formatDate(notification.created_at);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {});

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient colors={["#FFFFFF", "#f2e8e2ff"]} style={{ flex: 1 }}>
          {/* HEADER */}
          <View>
            <NavigationSlider headerTitle="Notification" />
          </View>
          {/* HEADER */}

          {/* MARK ALL AS READ BUTTON */}
          {unreadCount > 0 && (
            <TouchableOpacity 
              style={styles.markAllButton}
              onPress={markAllAsRead}
            >
              <Text style={styles.markAllText}>Mark all as read</Text>
            </TouchableOpacity>
          )}

          {/* ===== CONTENT ===== */}
          <ScrollView style={styles.container}>
            {Object.keys(groupedNotifications).map((date) => (
              <View key={date}>
                <View style={styles.notificationHeader}>
                  <Text style={styles.notificationHeaderText}>{date}</Text>
                </View>

                {groupedNotifications[date].map((notification: any) => (
                  <TouchableOpacity 
                    key={notification.id}
                    style={[
                      styles.notifCard,
                      !notification.is_read && styles.unreadCard
                    ]}
                    onPress={() => markAsRead(notification.id)}
                  >
                    <View style={styles.notifCardImageContainer}>
                      <Image
                        source={
                          notification.type === 'PAYMENT_REMINDER' 
                            ? require("../../assets/notif.png")
                            : require("../../assets/notif.png")
                        }
                        style={styles.notifCardImage}
                        resizeMode="contain"
                      />
                      {!notification.is_read && <View style={styles.unreadDot} />}
                    </View>
                    <View style={styles.notifContent}>
                      <Text style={styles.notifCardText}>{notification.title}</Text>
                      <Text style={styles.notifCardSubText}>{notification.message}</Text>
                      
                      {/* Payment Reminder Specific Details */}
                      {notification.type === 'PAYMENT_REMINDER' && notification.data && (
                        <View style={styles.paymentDetails}>
                          <Text style={styles.paymentText}>
                            Due: {notification.data.formattedDueDate}
                          </Text>
                          {notification.data.gcashName && (
                            <Text style={styles.paymentText}>
                              GCash: {notification.data.gcashName} ({notification.data.gcashNumber})
                            </Text>
                          )}
                          {notification.data.notes && (
                            <Text style={styles.remarksText}>
                              Note: {notification.data.notes}
                            </Text>
                          )}
                        </View>
                      )}
                      
                      {/* Event Status Specific Details */}
                      {notification.type === 'EVENT_STATUS_UPDATE' && notification.data?.remarks && (
                        <Text style={styles.remarksText}>
                          Remarks: {notification.data.remarks}
                        </Text>
                      )}
                    </View>
                    <View style={styles.timeContainer}>
                      <Text style={styles.timeText}>
                        {formatTime(notification.created_at)}
                      </Text>
                    </View>
                  </TouchableOpacity>
              ))}
              </View>
            ))}

            {notifications.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No notifications yet</Text>
                <Text style={styles.emptyStateSubText}>
                  You'll see notifications here when your event status changes
                </Text>
              </View>
            )}

            {loading && (
              <View style={styles.loadingState}>
                <Text style={styles.loadingText}>Loading notifications...</Text>
              </View>
            )}
          </ScrollView>
          {/* ===== CONTENT ===== */}
        </LinearGradient>
        <MenuBar activeScreen={"Notification"} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  markAllButton: {
    backgroundColor: colors.brown,
    padding: 10,
    margin: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  
  markAllText: {
    color: 'white',
    fontWeight: 'bold',
  },
  
  notificationHeader: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
  },
  
  notificationHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  
  notifCard: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  
  unreadCard: {
    backgroundColor: '#f8f9fa',
  },
  
  notifCardImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  
  notifCardImage: {
    width: 40,
    height: 40,
  },
  
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    backgroundColor: '#FF3B30',
    borderRadius: 4,
  },
  
  notifContent: {
    flex: 1,
  },
  
  notifCardText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  
  notifCardSubText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  
  remarksText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  
  timeContainer: {
    alignItems: 'flex-end',
  },
  
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  
  emptyStateSubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  
  paymentText: {
    fontSize: 12,
    color: '#888',
  },
  
  paymentDetails: {
    padding: 4,
    marginTop: 4,
  },
});

export default Notification;