import React, { useEffect, useState, useMemo } from "react";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform, Share, Linking  } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp} from "react-native-responsive-screen";
import colors from "../config/colors";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faChevronRight, faCopy, faPaperPlane } from "@fortawesome/free-solid-svg-icons"; // ADDED ICONS
import Svg, { Path } from "react-native-svg";
import { Alert } from "react-native";
import { Guest } from "../../screens/type";
import NavigationSlider from './ReusableComponents/NavigationSlider';
import MenuBar from "./ReusableComponents/MenuBar";

import { useEvent } from '../../context/EventContext';
import * as Clipboard from 'expo-clipboard';

const GuestComponent = () => {
  const {
    addGuest,
    getGuests,
    updateGuest,
    removeGuest,
    getGuestStats,
    eventData,
    copyToClipboard,
    shareViaMessenger,
    generateInviteLink,
    loadEventData // Add this if available in your context
  } = useEvent();

  const [refreshing, setRefreshing] = useState(false);

  // Refresh guest list
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Reload event data which should refresh guests
      if (loadEventData) {
        await loadEventData();
      }
      // You might need to add a specific refreshGuests method to your context
      Alert.alert("Success", "Guest list updated");
    } catch (error) {
      Alert.alert("Error", "Failed to refresh guest list");
    } finally {
      setRefreshing(false);
    }
  };

  const [modalVisible, setModalVisible] = useState(false);
  const [rsvpModal, setrsvpModal] = useState(false);
  const [selectedRSVP, setSelectedRSVP] = useState(-1);
  const [currentGuestName, setCurrentGuestName] = useState('');
  const [generatingLinks, setGeneratingLinks] = useState<{[key: string]: boolean}>({});

  // Get guests from context
  const invitedGuests = useMemo(() => getGuests(), [eventData.guests]);
  const guestStats = useMemo(() => getGuestStats(), [eventData.guests]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);

  // Filter guests when search changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredGuests(invitedGuests);
    } else {
      const filtered = invitedGuests.filter(guest =>
        guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.status.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredGuests(filtered);
    }
  }, [searchQuery, invitedGuests]);

  // Handle generating invitation link
const handleGenerateInviteLink = async (guestId: string, guestName: string) => {
  try {
    setGeneratingLinks(prev => ({ ...prev, [guestId]: true }));
    
    console.log('🔍 DEBUG Before generating link:');
    console.log('   Guest ID:', guestId);
    console.log('   Guest Name:', guestName);
    console.log('   Event Data:', eventData);
    
    const link = await generateInviteLink(guestId, guestName);
    
    console.log('✅ DEBUG After generating link:');
    console.log('   Generated Link:', link);
    
    // Update the guest with the new link
    updateGuest(guestId, { inviteLink: link });
    
    Alert.alert("Success", "Invitation link generated for your LATEST event!");
    
  } catch (error: any) {
    console.error('Generate link error:', error);
    Alert.alert("Error", error.message || "Failed to generate invitation link");
  } finally {
    setGeneratingLinks(prev => ({ ...prev, [guestId]: false }));
  }
};

  const handleCopyLink = async (link: string) => {
    try {
      await copyToClipboard(link);
      Alert.alert("Copied!", "Invitation link copied to clipboard");
    } catch (error) {
      Alert.alert("Error", "Failed to copy link");
      console.error('Copy error:', error);
    }
  };

  // Handle sharing via Messenger
  const handleShareViaMessenger = async (link: string, guestName: string) => {
    try {
      const message = `${guestName}, you're invited to our wedding! 🎉 Click here to RSVP: ${link}`;
      
      await Share.share({
        message: message,
        title: 'Wedding Invitation'
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert("Error", "Failed to share invitation");
    }
  };

  const handleAddGuest = () => {
    if (!currentGuestName.trim()) {
      Alert.alert('Error', 'Please enter guest name');
      return;
    }

    const guestRange = eventData?.guest_range || "0-0";
    
    let minGuests = 0;
    let maxGuests = 0;
    
    if (guestRange.includes('-')) {
      [minGuests, maxGuests] = guestRange.split('-').map((num: string) => parseInt(num.trim(), 10));
    } else {
      minGuests = maxGuests = parseInt(guestRange.trim(), 10);
    }

    // Check guest limit
    if (guestStats.total >= maxGuests) {
      Alert.alert(
        "Guest Limit Reached",
        `You can only invite up to ${maxGuests} guests for your selected package (${guestRange} pax).`
      );
      return;
    }

    const statusOptions = ['Accepted', 'Declined', 'Pending'];
    const guestStatus = selectedRSVP === -1 ? 'Pending' : statusOptions[selectedRSVP];

    addGuest({
      name: currentGuestName.trim(),
      status: guestStatus,
      inviteLink: "" // Empty initially, will be generated later
    });

    setCurrentGuestName('');
    setSelectedRSVP(-1);
    setModalVisible(false);
  };

  const handleRemoveGuest = (id: string) => {
    Alert.alert("Remove guest", "Are you sure you want to remove this guest?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeGuest(id),
      },
    ]);
  };

  const resetGuestForm = () => {
    setSelectedRSVP(-1);
    setCurrentGuestName('');
  };

  const closeModal = () => {
    setModalVisible(false);
    resetGuestForm();
  };

  const closersvpModal = () => setrsvpModal(false);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient colors={["#FFFFFF", "#f2e8e2ff"]} style={{ flex: 1 }}>
          
          {/* HEADER */}
          <View>
              <NavigationSlider headerTitle="Guest" />
          </View>

          {/* SEARCH BAR */}
          <View style={styles.searchBarContainer}>
              <Svg width="19" height="19" viewBox="0 0 19 19" fill="none">
                <Path fillRule="evenodd" clipRule="evenodd" d="M7.99393 14.5217C4.25828 14.5217 1.22998 11.5461 1.22998 7.86966C1.22998 4.19319 4.25828 1.21165 7.99393 1.21165C11.7296 1.21165 14.7585 4.19319 14.7585 7.86966C14.7585 11.5461 11.7296 14.5217 7.99393 14.5217ZM18.8196 17.9666L13.9146 13.1379C15.1986 11.7421 15.9879 9.90092 15.9879 7.86966C15.9879 3.52204 12.409 0 7.99393 0C3.57886 0 0 3.52204 0 7.86966C0 12.2113 3.57886 15.7334 7.99393 15.7334C9.90155 15.7334 11.6512 15.0741 13.0255 13.9753L17.9501 18.8218C18.1907 19.0594 18.5797 19.0594 18.8196 18.8218C19.0601 18.5902 19.0601 18.2042 18.8196 17.9666Z" fill="#343131"/>
              </Svg>

              <TextInput
                  style={styles.searchInput}
                  placeholder="Search by guests list..."
                  placeholderTextColor="#999"
                  autoCorrect={false}
                  value={searchQuery}
                  onChangeText={setSearchQuery} 
                  clearButtonMode="while-editing"
              />
          </View>

          {/* ADD NEW GUEST MODAL */}
          <Modal
              visible={modalVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={closeModal}
              statusBarTranslucent={true}
          >
            <KeyboardAvoidingView 
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={styles.modalOverlay}>
                  <View style={styles.modalContainer}>
                      <View style={styles.closeButtonContainer}>
                          <Text style={styles.modalTitle}>Add New Guest</Text>
                          <TouchableOpacity
                              style={styles.closeBtn}
                              onPress={closeModal}
                          >
                              <Text style={styles.closeButtonText}>&times;</Text>
                          </TouchableOpacity>
                      </View>
                      <View style={styles.underline}></View>

                      <View style={styles.inputGuest}>
                          <TextInput
                              style={styles.inputGuestText}
                              value={currentGuestName}
                              onChangeText={setCurrentGuestName}
                              placeholder="Enter Full Name"
                              placeholderTextColor="#999"
                          />
                      </View>

                      {/* RSVP Selection inside main modal */}
                      <View>
                        <View style={styles.selectRSVPContainer}>
                          {["Accepted", "Pending"].map(
                            (label, index) => (
                              <TouchableOpacity
                                key={index}
                                style={[
                                  styles.selectRSVP,
                                  {
                                    backgroundColor: selectedRSVP === index
                                      ? "#d4edda"
                                      : "#ffffff",
                                  },
                                ]}
                                onPress={() => setSelectedRSVP(index)}
                              >
                                <Text
                                  style={[
                                    styles.selectedRSVPText,
                                    {
                                      color: selectedRSVP === index
                                        ? "#000000"
                                        : "#000000",
                                    },
                                  ]}
                                >
                                  {label}
                                </Text>
                              </TouchableOpacity>
                            )
                          )}
                        </View>
                      </View>

                      <View style={styles.saveButtonContainer}>
                          <TouchableOpacity
                              style={styles.saveButton}
                              onPress={handleAddGuest}
                          >
                              <Text style={styles.saveButtonText}>Add Guest</Text>
                          </TouchableOpacity>
                      </View>
                  </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* Guest Stats */}
          <View style={styles.totalGuests}>
            <View style={styles.totalGuestsText}>
              <Text style={styles.totalText}>Total: {guestStats.total}</Text>
              <Text style={styles.acceptedText}>Accepted: {guestStats.accepted}</Text>
              <Text style={styles.pendingText}>Pending: {guestStats.pending}</Text>
              <Text style={styles.declinedText}>Declined: {guestStats.declined}</Text>
            </View>
          </View>

          {/* GUEST LIST */}
          <View style={styles.invitedGuestsContainer}>
            <ScrollView 
              style={styles.scrollGuests}
              contentContainerStyle={styles.scrollViewContent}
            >
              <View style={styles.guestBadgeContainer}>
                {/* HEADER */}
                <View style={styles.guestLabels}>
                  <Text style={[styles.guestLabelText, styles.columnName]}>Name</Text>
                  <Text style={[styles.guestLabelText, styles.columnStatus]}>Status</Text>
                  <Text style={[styles.guestLabelText, styles.columnLink]}>Invite Link</Text>
                </View>

                {/* ROWS */}
                {filteredGuests.map((guest) => (
                  <View key={guest.id} style={styles.guestRow}>
                    <View style={styles.guestBadge}>
                      <Text style={[styles.filteredGuestText, styles.columnName]}>{guest.name}</Text>
                      <Text
                        style={[
                          styles.filteredGuestText,
                          styles.columnStatus,
                          { color: getStatusColor(guest.status) },
                        ]}
                      >
                        {guest.status}
                      </Text>
                      
                      <View style={[styles.columnLink, styles.linkContainer]}>
                        {guest.inviteLink ? (
                          <Text style={styles.inviteLinkText} numberOfLines={1}>
                            {guest.inviteLink.length > 20 
                              ? `${guest.inviteLink.substring(0, 20)}...` 
                              : guest.inviteLink
                            }
                          </Text>
                        ) : (
                          <Text style={styles.noLinkText}>No link</Text>
                        )}
                      </View>
                      
                      <View style={[styles.columnActions, styles.actionsContainer]}>
                        {!guest.inviteLink ? (
                         <TouchableOpacity
                            style={[styles.actionButton, styles.generateButton]}
                            onPress={() => handleGenerateInviteLink(guest.id, guest.name)}
                            disabled={generatingLinks[guest.id]}
                          >
                            <Text style={styles.actionButtonText}>
                              {generatingLinks[guest.id] ? '...' : 'Generate'}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <>
                            <TouchableOpacity 
                              style={[styles.actionButton, styles.copyButton]}
                              onPress={() => handleCopyLink(guest.inviteLink!)}
                            >
                              <FontAwesomeIcon icon={faCopy} size={14} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.actionButton, styles.shareButton]}
                              onPress={() => handleShareViaMessenger(guest.inviteLink!, guest.name)}
                            >
                              <FontAwesomeIcon icon={faPaperPlane} size={14} color="white" />
                            </TouchableOpacity>
                          </>
                        )}
                        <TouchableOpacity 
                          style={[styles.actionButton, styles.deleteButton]}
                          onPress={() => handleRemoveGuest(guest.id)}
                        >
                          <Text style={styles.deleteButtonText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
              
              {searchQuery && filteredGuests.length === 0 && (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>
                    No guests found for "{searchQuery}"
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
                <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <MenuBar activeScreen="Guest"/>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  // HEADER styles
  searchBarContainer: {
    gap: 10,
    borderWidth: 1,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    marginTop: hp("2.5%"),
    borderRadius: wp("3%"),
    marginBottom: hp("1.5%"),
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("0.5%"),
    borderColor: colors.borderv2,
  },

  searchInput: {
    width: wp("72%"),
    height: hp("5.5%"),
  },

  // ADD NEW GUEST MODAL styles
  modalOverlay: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },

  modalContainer: {
    height: 'auto',
    width: wp("85%"),
    overflow: 'hidden',
    maxHeight: hp("100%"),
    borderRadius: wp("2.5%"),
    backgroundColor: colors.white,
  },

  closeButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: hp("1%"),
    marginHorizontal: wp("4%"),
    justifyContent: "space-between",
  },

  modalTitle: {
    fontSize: wp("4.2%"),
    fontFamily: 'Poppins',
    paddingVertical: hp("0.5%"),
  },

  closeBtn: {
    margin: 0,
    padding: 0,
  },

  closeButtonText: {
    fontSize: wp("7%"),
  },

  underline: {
    width: wp("76%"),
    alignSelf: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  inputGuest: {
    alignSelf: "center",
    marginTop: hp("1.2%"),
  },

  inputGuestText: {
    borderWidth: 1,
    borderRadius: 9,
    width: wp("76%"),
    marginTop: hp("1%"),
    fontFamily: 'Poppins',
    paddingHorizontal: wp("3%"),
    borderColor: colors.borderv3,
  },

  selectRSVPContainer: {
    alignItems: 'center',
    marginBottom: hp("2%"),
    marginHorizontal: wp("3%"),
    alignContent: "flex-start",
    justifyContent: "flex-start",
  },

  selectRSVP: {
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 9,
    width: wp("76%"),
    marginTop: hp("2%"),
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp("1.5%"),
    borderColor: colors.borderv1,
  },

  selectedRSVPText: {
    fontFamily: 'Poppins',
  },

  saveButtonContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp("2.5%"),
  },

  saveButton: {
    width: wp("76%"),
    padding: wp("3%"),
    borderRadius: wp("2.5%"),
    backgroundColor: colors.button,
  },

  saveButtonText: {
    textAlign: "center",
    color: colors.white,
    fontFamily: 'Poppins',
  },

  // Guest Stats styles
  totalGuests: {
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  totalGuestsText: {
    gap: 5,
    display: 'flex',
    flexDirection: 'row',
    borderRadius: wp("8%"),
    marginBottom: hp("1%"),
  },

  totalText: {
    borderRadius: 8,
    padding: wp("5%"),
    color: '#495057',
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontFamily: 'Poppins',
    backgroundColor: '#e9ecef',
  },

  acceptedText: {
    borderRadius: 8,
    color: '#065f46',
    paddingVertical: 5,
    fontFamily: 'Poppins',
    paddingHorizontal: 8,
    backgroundColor: '#d1fae5',
  },

  pendingText: {
    borderRadius: 8,
    color: '#92400e',
    paddingVertical: 5,
    fontFamily: 'Poppins',
    paddingHorizontal: 8,
    backgroundColor: '#fef3c7',
  },

  declinedText: {
    borderRadius: 8,
    color: '#991b1b',
    paddingVertical: 5,
    fontFamily: 'Poppins',
    paddingHorizontal: 8,
    backgroundColor: '#fee2e2',
  },

  // GUEST LIST styles
  invitedGuestsContainer: {
    flex: 1,
    maxHeight: 'auto',
  },

  scrollGuests: {
    flex: 1,
  },

  scrollViewContent: {
    paddingBottom: hp("10%"),
  },

  guestBadgeContainer: {
    alignItems: "center",
    marginBottom: hp("2%"),
    marginHorizontal: wp("5%"),
  },

  guestLabels: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp("1%"),
    borderRadius: wp("2%"),
    paddingVertical: hp("1.6%"),
    paddingHorizontal: wp("3%"),
    backgroundColor: colors.borderv2,
  },

  guestBadge: {
    width: "100%",
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp("1%"),
    borderRadius: wp("2%"),
    paddingVertical: hp("1.6%"),
    paddingHorizontal: wp("3%"),
    backgroundColor: colors.white,
    borderColor: colors.borderv2,
  },

  guestLabelText: {
    fontWeight: 600,
    textAlign: "center",
    color: colors.black,
    fontFamily: 'Poppins',
  },

  filteredGuestText: {
    textAlign: "center",
    color: colors.black,
    fontSize: wp("3%"),
    fontFamily: 'Poppins',
  },

  columnName: { flex: 2, textAlign: "left" },
  columnStatus: { flex: 1, textAlign: "center" },
  columnLink: { flex: 2, textAlign: "right" },

  deleteButton: {},
  deleteButtonText: {},

  noResultsContainer: {},
  noResultsText: {},

  // FLOATING BUTTON styles
  buttonContainer: {
    right: wp("5%"),
    bottom: hp("12%"),
    position: "absolute",
  },

  button: {
    elevation: 5,
    width: wp("14%"),
    height: wp("14%"),
    alignItems: "center",
    borderRadius: wp("100%"),
    justifyContent: "center",
    backgroundColor: colors.button,
  },

  buttonText: {
    fontSize: wp("7%"),
    textAlign: "center",
    color: colors.white,
  },

  // Unused styles
  saveSideRelationship: {},
  rsvpStatusContainer: {
    borderWidth: 1,
    borderRadius: 9,
    width: wp("76%"),
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    marginTop: hp("1.5%"),
    paddingVertical: hp("1.5%"),
    paddingHorizontal: wp("3%"),
    borderColor: colors.borderv3,
    justifyContent: "space-between",
  },
  rsvpText: {
    color: colors.black,
    fontFamily: 'Poppins',
    marginTop: hp("1.5%"),
    marginHorizontal: wp("5%"),
  },

    guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  linkContainer: {
    flex: 2,
    paddingHorizontal: 5,
    justifyContent: 'center',
  },
  actionsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 5,
  },
  inviteLinkText: {
    fontSize: 12,
    color: '#0066cc',
    fontFamily: 'monospace',
  },
  noLinkText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  actionButton: {
    padding: 8,
    borderRadius: 5,
    marginHorizontal: 2,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButton: {
    backgroundColor: '#4CAF50',
  },
  copyButton: {
    backgroundColor: '#2196F3',
  },
  shareButton: {
    backgroundColor: '#0084ff',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  columnActions: {
    flex: 1.5,
  },
});
const getStatusColor = (status: string): string => {
  const statusColors = {
    Accepted: '#4CAF50',
    Pending: '#FF9800',
    Declined: '#F44336',
  };
  return statusColors[status as keyof typeof statusColors] || '#666';
};

export default GuestComponent;