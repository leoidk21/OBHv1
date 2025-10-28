import React, { useEffect, useState, useMemo } from "react";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform, Share } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp} from "react-native-responsive-screen";
import colors from "../config/colors";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faChevronRight, faCopy, faPaperPlane, faExclamationTriangle, faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import Svg, { Path } from "react-native-svg";
import { Alert } from "react-native";
import { Guest } from "../../screens/type";
import NavigationSlider from './ReusableComponents/NavigationSlider';
import MenuBar from "./ReusableComponents/MenuBar";

import { useEvent } from '../../context/EventContext';

const GuestComponent = () => {
  const {
    addGuest,
    getGuests,
    updateGuest,
    removeGuest,
    getGuestStats,
    eventData,
    copyToClipboard,
    generateInviteLink,
    loadEventData
  } = useEvent();

  // State for refresh functionality
  const [refreshing, setRefreshing] = useState(false);

  // Modal and form state management
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRSVP, setSelectedRSVP] = useState(-1);
  const [currentGuestName, setCurrentGuestName] = useState('');
  const [generatingLinks, setGeneratingLinks] = useState<{[key: string]: boolean}>({});

  // Modal state management for error and success messages
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [selectedGuestToRemove, setSelectedGuestToRemove] = useState<string | null>(null);

  // Get guests from context using memoization
  const invitedGuests = useMemo(() => getGuests(), [eventData.guests]);
  const guestStats = useMemo(() => getGuestStats(), [eventData.guests]);

  // Local state for guests and search functionality
  const [guests, setGuests] = useState<Guest[]>([]);
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync local guests with context guests
  useEffect(() => {
    setGuests(invitedGuests);
  }, [invitedGuests]);

  // Filter guests based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredGuests(guests);
    } else {
      const filtered = guests.filter(guest =>
        guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.status.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredGuests(filtered);
    }
  }, [searchQuery, guests]);

  // Refresh guest list function
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (loadEventData) {
        await loadEventData();
      }
    } catch (error) {
      showErrorModal("Error", "Failed to refresh guest list");
    } finally {
      setRefreshing(false);
    }
  };

  // Handle generating invitation link for a guest
  const handleGenerateInviteLink = async (guestId: string, guestName: string) => {
    try {
      setGeneratingLinks(prev => ({ ...prev, [guestId]: true }));
      
      const link = await generateInviteLink(guestId, guestName);
      
      // Update the guest with the new link
      updateGuest(guestId, { inviteLink: link });
      
      showSuccessModal("Success", "Invitation link generated!");
      
    } catch (error: any) {
      // Show error modal if link generation fails
      if (error.message?.includes('No submitted event found')) {
        showErrorModal("Event Required", "Please submit your event first before generating invitation links.");
      } else {
        showErrorModal("Error", error.message || "Failed to generate invitation link");
      }
    } finally {
      setGeneratingLinks(prev => ({ ...prev, [guestId]: false }));
    }
  };

  // Handle copying invitation link to clipboard
  const handleCopyLink = async (link: string) => {
    try {
      await copyToClipboard(link);
      showSuccessModal("Copied!", "Invitation link copied to clipboard");
    } catch (error) {
      showErrorModal("Error", "Failed to copy link");
    }
  };

  // Handle sharing invitation via messaging apps
  const handleShareViaMessenger = async (link: string, guestName: string) => {
    try {
      const message = `${guestName}, you're invited to our wedding! 🎉 Click here to RSVP: ${link}`;
      
      await Share.share({
        message: message,
        title: 'Wedding Invitation'
      });
    } catch (error) {
      showErrorModal("Error", "Failed to share invitation");
    }
  };

  // Handle adding a new guest to the list
  const handleAddGuest = () => {
    if (!currentGuestName.trim()) {
      showErrorModal('Error', 'Please enter guest name');
      return;
    }

    const statusOptions = ['Accepted', 'Declined', 'Pending'];
    const guestStatus = selectedRSVP === -1 ? 'Pending' : statusOptions[selectedRSVP];

    // Add new guest with provided details
    addGuest({
      name: currentGuestName.trim(),
      status: guestStatus,
      inviteLink: ""
    });

    // Reset form state
    setCurrentGuestName('');
    setSelectedRSVP(-1);
    setModalVisible(false);
  };

  // Handle guest badge click for removal
  const handleGuestBadgeClick = (guestId: string) => {
    const guest = guests.find(g => g.id === guestId);
    const guestName = guest?.name || 'this guest';
    
    // Show confirmation modal
    setModalTitle("Remove Guest");
    setModalMessage(`Are you sure you want to remove ${guestName}?`);
    setSelectedGuestToRemove(guestId);
    setErrorModalVisible(true);
  };

  // Handle confirmed guest removal
  const handleConfirmRemove = () => {
    if (selectedGuestToRemove) {
      removeGuest(selectedGuestToRemove);
    }
    setErrorModalVisible(false);
    setSelectedGuestToRemove(null);
  };

  // Reset guest form to initial state
  const resetGuestForm = () => {
    setSelectedRSVP(-1);
    setCurrentGuestName('');
  };

  // Close add guest modal and reset form
  const closeModal = () => {
    setModalVisible(false);
    resetGuestForm();
  };

  // Show error modal with custom title and message
  const showErrorModal = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setErrorModalVisible(true);
  };

  // Show success modal with custom title and message
  const showSuccessModal = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setSuccessModalVisible(true);
  };

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

          {/* Error/Confirmation Modal */}
          <Modal
            visible={errorModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => {
              setErrorModalVisible(false);
              setSelectedGuestToRemove(null);
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.messageModalContainer}>
                <FontAwesomeIcon 
                  icon={modalTitle === "Remove Guest" ? faExclamationTriangle : faExclamationTriangle} 
                  size={40} 
                  color={modalTitle === "Remove Guest" ? "#ffc107" : "#dc3545"} 
                />
                <Text style={styles.modalTitle}>{modalTitle}</Text>
                <Text style={styles.modalMessage}>{modalMessage}</Text>
                
                {modalTitle === "Remove Guest" ? (
                  // CONFIRMATION BUTTONS FOR REMOVE
                  <View style={styles.confirmationButtons}>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => {
                        setErrorModalVisible(false);
                        setSelectedGuestToRemove(null);
                      }}
                    >
                      <Text style={styles.modalButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.confirmRemoveButton]}
                      onPress={handleConfirmRemove}
                    >
                      <Text style={styles.modalButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // REGULAR OK BUTTON FOR ERRORS
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.errorButton]}
                    onPress={() => setErrorModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>OK</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Modal>

          {/* Success Modal */}
          <Modal
            visible={successModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setSuccessModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.messageModalContainer}>
                <FontAwesomeIcon icon={faCheckCircle} size={40} color="#28a745" />
                <Text style={styles.modalTitle}>{modalTitle}</Text>
                <Text style={styles.modalMessage}>{modalMessage}</Text>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.successButton]}
                  onPress={() => setSuccessModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

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
              horizontal={true}
              showsHorizontalScrollIndicator={true}
            >
              <View style={styles.guestBadgeContainer}>
                {/* HEADER */}
                <View style={styles.guestLabels}>
                  <Text style={[styles.guestLabelText, styles.columnName]}>Name</Text>
                  <Text style={[styles.guestLabelText, styles.columnStatus]}>Status</Text>
                  <Text style={[styles.guestLabelText, styles.columnLink]}>Invite Link</Text>
                  <Text style={[styles.guestLabelText, styles.columnActions]}>Actions</Text>
                </View>

                {/* ROWS */}
                {filteredGuests.map((guest) => (
                  <TouchableOpacity 
                    key={guest.id} 
                    style={styles.guestRow}
                    onPress={() => handleGuestBadgeClick(guest.id)}
                  >
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
                            onPress={(e) => {
                              e.stopPropagation();
                              handleGenerateInviteLink(guest.id, guest.name);
                            }}
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
                              onPress={(e) => {
                                e.stopPropagation();
                                handleCopyLink(guest.inviteLink!);
                              }}
                            >
                              <FontAwesomeIcon icon={faCopy} size={14} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.actionButton, styles.shareButton]}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleShareViaMessenger(guest.inviteLink!, guest.name);
                              }}
                            >
                              <FontAwesomeIcon icon={faPaperPlane} size={14} color="white" />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
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

          {/* ADD GUEST BUTTON */}
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

  // MODAL styles
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
    minWidth: wp("100%"),
    paddingBottom: hp("10%"),
  },

  guestBadgeContainer: {
    minWidth: wp("90%"),
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
    minWidth: wp("80%"),
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
    minWidth: wp("80%"),
  },

  guestRow: {
    width: "100%",
    borderRadius: wp("2%"),
    marginBottom: hp("1%"),
  },

  guestLabelText: {
    fontWeight: "600",
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

  columnName: { 
    flex: 2, 
    textAlign: "left",
    minWidth: wp("25%"),
  },
  columnStatus: { 
    flex: 1, 
    textAlign: "center",
    minWidth: wp("15%"),
  },
  columnLink: { 
    flex: 2, 
    textAlign: "right",
    minWidth: wp("25%"),
  },
  columnActions: {
    flex: 1.5,
    minWidth: wp("25%"),
  },

  linkContainer: {
    flex: 2,
    paddingHorizontal: 5,
    justifyContent: 'center',
  },
  actionsContainer: {
    flex: 1.5,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 5,
    gap: 6,
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
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
  },

  generateButton: {
    backgroundColor: '#4CAF50',
    width: 80,
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
    textAlign: 'center',
  },

  // MESSAGE MODAL styles
  messageModalContainer: {
    width: wp("80%"),
    padding: wp("5%"),
    borderRadius: wp("4%"),
    alignItems: 'center',
    backgroundColor: colors.white,
  },

  modalButton: {
    padding: wp("3%"),
    borderRadius: wp("2%"),
    marginTop: hp("2%"),
    minWidth: wp("30%"),
    alignItems: 'center',
  },

  errorButton: {
    backgroundColor: '#dc3545',
  },
  successButton: {
    backgroundColor: '#28a745',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  confirmRemoveButton: {
    backgroundColor: '#dc3545',
  },

  modalButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },

  modalMessage: {
    fontSize: wp("4%"),
    textAlign: 'center',
    marginTop: hp("2%"),
    fontFamily: 'Poppins',
    color: colors.black,
  },

  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: hp("2%"),
    gap: 10,
  },

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
  noResultsContainer: {},
  noResultsText: {},
  saveSideRelationship: {},
  rsvpStatusContainer: {},
  rsvpText: {},
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