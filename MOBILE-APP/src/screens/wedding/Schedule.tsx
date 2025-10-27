import React, { useRef, useState, useMemo } from "react";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform  } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp} from "react-native-responsive-screen";
import colors from "../config/colors";
import { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Alert } from "react-native";

import NavigationSlider from './ReusableComponents/NavigationSlider';
import MenuBar from "./ReusableComponents/MenuBar";
import { useEvent } from "../../context/EventContext";
import { RootStackParamList } from "../../screens/type";

type EventSegment = {
    name: string;
    venue: string;
    startTime: string;
    endTime: string;
};

const Schedule = () => {
    const { eventData, updateEvent } = useEvent();
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const eventSegments = eventData.schedule || [];
    
    // Main Modal States
    const [modalVisible, setModalVisible] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [inputValue2, setInputValue2] = useState('');
    const [startTime, setStartTime] = useState<Date>(new Date());
    const [endTime, setEndTime] = useState<Date>(new Date());
    const [startTimeSelected, setStartTimeSelected] = useState(false);
    const [endTimeSelected, setEndTimeSelected] = useState(false);
    const [timeType, setTimeType] = useState<"start" | "end">("start");
    const [showPicker, setShowPicker] = useState(false);

    // Edit Modal States
    const [showEditModal, setShowEditModal] = useState(false);
    const [segmentToEdit, setSegmentToEdit] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editVenue, setEditVenue] = useState('');
    const [editStartTime, setEditStartTime] = useState("");
    const [editEndTime, setEditEndTime] = useState("");
    const [editTempDate, setEditTempDate] = useState(new Date());
    const [showEditPicker, setShowEditPicker] = useState(false);
    const [editTimeType, setEditTimeType] = useState<"start" | "end">("start");

    // Delete Modal States
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [segmentToDelete, setSegmentToDelete] = useState<number | null>(null);

    const formatEventDate = (dateString: string) => {
        if (!dateString) return 'Date not set';
        
        const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
        });
    };

    const showMode = (currentMode: "date" | "time", type: "start" | "end") => {
        setTimeType(type);
        setShowPicker(true);
    };

    const onChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (event.type === "set" && selectedDate) {
            if (timeType === "start") {
                setStartTime(selectedDate);
                setStartTimeSelected(true);
            } else {
                setEndTime(selectedDate);
                setEndTimeSelected(true);
            }
        }
        setShowPicker(false);
    };

    const addEventSegment = (newSegment: EventSegment) => {
        const updatedSegments = [...eventSegments, newSegment];
        updateEvent('schedule', updatedSegments);
    };

    const updateEventSegment = (index: number, updatedSegment: EventSegment) => {
        const updatedSegments = [...eventSegments];
        updatedSegments[index] = updatedSegment;
        updateEvent('schedule', updatedSegments);
    };

    const deleteEventSegment = (index: number) => {
        const updatedSegments = eventSegments.filter((_: any, i: number) => i !== index);
        updateEvent('schedule', updatedSegments);
    };

    const openEditModal = (index: number) => {
        const seg = eventSegments[index];
        setSegmentToEdit(index);
        setEditName(seg.name);
        setEditStartTime(seg.startTime);
        setEditEndTime(seg.endTime);
        setEditVenue(seg.venue);
        setShowEditModal(true);
    };

    const resetMainModal = () => {
        setInputValue("");
        setInputValue2("");
        setStartTimeSelected(false);
        setEndTimeSelected(false);
        setModalVisible(false);
    };

    const resetEditModal = () => {
        setShowEditModal(false);
        setSegmentToEdit(null);
        setEditName("");
        setEditStartTime("");
        setEditEndTime("");
        setEditVenue("");
    };

    return (
        <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1 }}>
                <LinearGradient colors={["#FFFFFF", "#f2e8e2ff"]} style={{ flex: 1 }}>
                    
                    {/* HEADER */}
                    <NavigationSlider headerTitle="Schedule" />
                    
                    {/* TITLE CONTENT */}
                    <View style={styles.titleContainer}>
                        <Text style={styles.titleText}>Event Schedule</Text>
                        <View style={styles.dateContainer}>
                            <Text style={styles.dateText}>
                                {formatEventDate(eventData.event_date)}
                            </Text>
                        </View>
                    </View>

                    <ScrollView
                        contentContainerStyle={{ 
                            flexGrow: 1,
                            paddingBottom: hp("10%")
                        }}
                            showsVerticalScrollIndicator={false}
                    >
                        {/* EVENT SEGMENTS */}
                        <View>
                            {eventSegments.map((segment: EventSegment, index: number) => (
                                <View key={index} style={styles.segmentItem}>
                                <TouchableOpacity 
                                    onPress={() => {
                                    setSegmentToDelete(index);
                                    setShowDeleteModal(true);
                                    }}
                                    style={styles.eventSegmentTouchable}
                                >
                                    <View style={styles.eventSegment}>
                                    <View style={styles.eventTimeFrame}>
                                        <View style={styles.timeCircleContainer}>
                                        <View style={styles.eventTimeCon}>
                                            <Text style={styles.eventTimeText}>
                                            {segment.startTime || "No Time"} - {segment.endTime || "No Time"}
                                            </Text>
                                        </View>
                                        {/* Connecting line below the circle - show for all except last segment */}
                                        {index < eventSegments.length - 1 && (
                                            <View style={styles.connectorLine} />
                                        )}
                                        </View>
                                        <View style={styles.eventNotesCon}>
                                        <Text style={styles.eventSegmentText}>{segment.name}</Text>
                                        <Text style={styles.eventNotesText}>📍{segment.venue}</Text>
                                        </View>
                                    </View>
                                    </View>
                                </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </ScrollView>

                    {/* ADD SEGMENT BUTTON */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
                            <Text style={styles.buttonText}>+</Text>
                        </TouchableOpacity>
                    </View>

                    {/* MAIN MODAL - ADD SEGMENT */}
                    <Modal visible={modalVisible} transparent animationType="fade" statusBarTranslucent>
                        <KeyboardAvoidingView 
                            style={{ flex: 1 }}
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        >
                            <View style={styles.modalOverlay}>
                                <View style={styles.modalContainer}>
                                    <View style={styles.closeButtonContainer}>
                                        <Text style={styles.modalTitle}>Add Event Time Frame</Text>
                                        <TouchableOpacity onPress={resetMainModal}>
                                            <Text style={styles.closeButtonText}>&times;</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.underline} />

                                    <View style={styles.inputEvent}>
                                        <Text style={styles.addEventText}>Name</Text>
                                        <TextInput
                                            style={styles.inputEventText}
                                            value={inputValue}
                                            onChangeText={setInputValue}
                                            placeholder="Enter Event Segment"
                                            placeholderTextColor="#999"
                                        />
                                    </View>

                                    <View style={styles.dateTimeContainer}>
                                        <TouchableOpacity onPress={() => showMode("time", "start")}>
                                            <Text style={styles.addEventText}>Start Time</Text>
                                            <View style={styles.timePicker}> 
                                                <Text style={styles.addEventTextInput}>
                                                    {startTimeSelected ? startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Select start time"}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity onPress={() => showMode("time", "end")}>
                                            <Text style={styles.addEventText}>End Time</Text>
                                            <View style={styles.timePicker}> 
                                                <Text style={styles.addEventTextInput}>
                                                    {endTimeSelected ? endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Select end time"}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.inputNotesContainer}>
                                        <Text style={styles.addEventText}>Venue</Text>
                                        <TextInput
                                            style={styles.inputNotes}
                                            value={inputValue2}
                                            onChangeText={setInputValue2}
                                            multiline
                                            textAlignVertical="top"
                                            placeholder="e.g. Venue Name"
                                            placeholderTextColor="#999" 
                                        />
                                    </View>

                                    <View style={styles.saveButtonContainer}>
                                        <TouchableOpacity 
                                            style={styles.saveButton} 
                                            onPress={() => {
                                                if (!inputValue.trim()) {
                                                    Alert.alert("Please input a name for the event segment.");
                                                    return;
                                                }
                                                if (!startTimeSelected || !endTimeSelected) {
                                                    Alert.alert("Please select both start and end times.");
                                                    return;
                                                }
                                                if (!inputValue2.trim()) {
                                                    Alert.alert("Please include notes for the event segment.");
                                                    return;
                                                }

                                                const newSegment = {
                                                    name: inputValue,
                                                    venue: inputValue2,
                                                    startTime: startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                                                    endTime: endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                                                };

                                                addEventSegment(newSegment);
                                                resetMainModal();
                                            }}
                                        >
                                            <Text style={styles.saveButtonText}>Add Segment</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {showPicker && (
                                        <DateTimePicker
                                            value={timeType === "start" ? startTime : endTime}
                                            mode="time"
                                            is24Hour={false}
                                            display={Platform.OS === "ios" ? "spinner" : "default"}
                                            onChange={onChange}
                                        />
                                    )}
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </Modal>

                    {/* DELETE CONFIRMATION MODAL */}
                    <Modal transparent animationType="fade" visible={showDeleteModal} statusBarTranslucent>
                        <KeyboardAvoidingView 
                            style={{ flex: 1 }}
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                        >
                            <View style={styles.modalBackground}>
                                <View style={styles.deletedModalContainer}>
                                    <View style={styles.warningModalContainer}>
                                        <Text style={styles.warningModalText}>Do you want to make changes?</Text>
                                        <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                                            <Text style={styles.cancelButtonText}>&times;</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.updateDeleteModal}>
                                        <TouchableOpacity
                                            style={styles.updatemodalButton}
                                            onPress={() => {
                                                if (segmentToDelete !== null) {
                                                    openEditModal(segmentToDelete);
                                                }
                                                setShowDeleteModal(false);
                                            }}
                                        >
                                            <Text style={styles.updatemodalButtonText}>Edit</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.delmodalButton}
                                            onPress={() => {
                                                if (segmentToDelete !== null) {
                                                    deleteEventSegment(segmentToDelete);
                                                }
                                                setShowDeleteModal(false);
                                            }}
                                        >
                                            <Text style={styles.delmodalButtonText}>Delete</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </Modal>

                    {/* EDIT MODAL */}
                    <Modal transparent animationType="slide" visible={showEditModal} statusBarTranslucent>
                        <KeyboardAvoidingView 
                            style={{ flex: 1 }}
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                        >
                            <View style={styles.modalBackground}>
                                <View style={styles.editModalContainer}>
                                    <Text style={styles.editWarningModalText}>Edit Event Segment</Text>
                                    
                                    <View style={styles.modalDivider}>
                                        <View>
                                            <Text style={styles.editText}>Event Name</Text>
                                            <TextInput
                                                style={styles.editInputName}
                                                value={editName}
                                                onChangeText={setEditName}
                                            />
                                        </View>

                                        <View style={styles.editTimeRow}>
                                            <TouchableOpacity onPress={() => { setEditTimeType("start"); setShowEditPicker(true); }}>
                                                <View style={styles.editStartTimeContainer}>
                                                    <Text style={styles.timeLabel}>Start: {editStartTime || "Select"}</Text>
                                                </View>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => { setEditTimeType("end"); setShowEditPicker(true); }}>
                                                <View style={styles.editEndTimeContainer}>
                                                    <Text style={styles.timeLabel}>End: {editEndTime || "Select"}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        </View>

                                        <View>
                                            <Text style={styles.editText}>Venue</Text>
                                            <TextInput
                                                multiline
                                                style={styles.editInputNotes}
                                                value={editVenue}
                                                onChangeText={setEditVenue}
                                            />
                                        </View>
                                    </View>

                                    {showEditPicker && (
                                        <DateTimePicker
                                            value={editTempDate}
                                            mode="time"
                                            is24Hour={false}
                                            display={Platform.OS === "ios" ? "spinner" : "default"}
                                            onChange={(event, selectedDate) => {
                                                setShowEditPicker(false);
                                                if (selectedDate) {
                                                    const formatted = selectedDate.toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    });
                                                    if (editTimeType === "start") {
                                                        setEditStartTime(formatted);
                                                    } else {
                                                        setEditEndTime(formatted);
                                                    }
                                                }
                                            }}
                                        />
                                    )}

                                    <View style={styles.updateDeleteModal}>
                                        <TouchableOpacity
                                            style={styles.editModalButton}
                                            onPress={() => {
                                                if (!editName.trim() || !editVenue.trim()) {
                                                    Alert.alert("Error", "Please fill in all fields.");
                                                    return;
                                                }
                                                if (segmentToEdit !== null) {
                                                    updateEventSegment(segmentToEdit, {
                                                        name: editName,
                                                        startTime: editStartTime,
                                                        endTime: editEndTime,
                                                        venue: editVenue,
                                                    });
                                                }
                                                resetEditModal();
                                            }}
                                        >
                                            <Text style={styles.updatemodalButtonText}>Save</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.editModalButton} onPress={resetEditModal}>
                                            <Text style={styles.updatemodalButtonText}>Cancel</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </Modal>
                </LinearGradient>
                <MenuBar activeScreen="Schedule"/>
            </SafeAreaView>
        </SafeAreaProvider>
    );
};

const styles = StyleSheet.create({
titleContainer: {
    marginTop: hp("2%"),
    marginLeft: hp("3%"),
},

titleText: {
    fontSize: wp('6%'),
    color: colors.brown,
    fontFamily: "Loviena",
},

dateContainer: {
    width: wp("40%"),  
    padding: wp("2%"),
    marginTop: hp("1%"),
    borderRadius: wp("2%"),
    marginBottom: hp("3%"),
    backgroundColor: colors.button,
},

dateText: {
    textAlign: "center",    
    color: colors.white,
    fontFamily: "Poppins",
},

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
    maxHeight: hp("70%"),
    minHeight: hp("10%"),
    borderRadius: wp("2.5%"),
    backgroundColor: 'white',
},

modalTitle: {
    fontSize: wp("4.5%"),
    fontFamily: "Poppins",
},

closeButtonText: {
    fontSize: wp("7%"),
},

closeBtn: {
    margin: 0,
    padding: 0,      
},

closeButtonContainer: {
    flexDirection: "row",     
    alignItems: "center",
    marginVertical: hp("1%"),
    marginHorizontal: wp("4%"),
    justifyContent: "space-between", 
},

underline: {
    width: wp("75%"),
    alignSelf: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,  
},

inputEvent: {
    alignSelf: "center",
    marginTop: hp("1.5%"),
},

addEventText: {
    fontFamily: 'Poppins'
},

addEventTextInput: {
    fontFamily: 'Poppins',
},

inputEventText: {
    borderWidth: 1,
    borderRadius: 9,
    width: wp("76%"),
    fontFamily: 'Poppins',
    paddingHorizontal: wp("3%"),
    borderColor: colors.borderv3,
},

inputNotesContainer: {
    alignSelf: "center",
    marginTop: hp("0.5%"),
},

inputNotes: {
    borderWidth: 1,
    borderRadius: 9,
    width: wp("76%"),
    height: hp("6%"),
    textAlignVertical: "top",
    paddingHorizontal: wp("3%"),
    borderColor: colors.borderv3,
},

dateTimePickerContainer: {
    marginTop: hp("0.5%"), 
    marginHorizontal: wp("1%"), 
},

dateTimeContainer: {
    gap: 10,
    alignSelf: "center",
    alignItems: "center",
    flexDirection: "column",
    marginVertical: hp("1%"),
    marginHorizontal: wp("4%"),
    justifyContent: "space-between",
},

timePicker: {
    gap: 10,
    borderWidth: 1,
    borderRadius: 9,
    width: wp("76%"),
    height: hp("6%"),
    flexDirection: "row",
    alignItems: "center",
    borderColor: colors.borderv3,
    paddingHorizontal: wp("2.5%"),
    justifyContent: "space-between",
},

dateTimeText: {
    marginBottom: hp("1%"),
},

saveButtonContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp("2.5%"),
},

saveButton: {
    width: wp("76%"),
    padding: wp("3%"),
    marginTop: hp("2%"),
    borderRadius: wp("2.5%"),
    backgroundColor: colors.button,
},

saveButtonText: {
    textAlign: "center",
    color: colors.white,  
},

eventSegment: {
    marginHorizontal: wp("5%"),
},

eventTimeFrame: {
    gap: 10,
    flexDirection: "row",
    alignItems: "flex-start",
},

eventTimeCon: {
    borderWidth: 1,
    width: wp("24%"),  
    height: wp("24%"),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: wp("50%") / 2,
},

eventTimeText: {
    fontSize: wp("3%"),
    textAlign: "center", 
    fontFamily: 'Poppins',
},

eventNotesCon: {
    width: wp("63%"),
    borderWidth: 0.6,
    height: hp("11%"),
    marginTop: hp("1%"),
    borderRadius: wp("2.5%"),
    paddingVertical: hp("1%"),
    paddingHorizontal: wp("3.5%"),
},

eventSegmentText: {
    fontWeight: "600",
    fontSize: wp("4%"),
    color: colors.black,
    fontFamily: 'Po ppins',
    marginBottom: hp("0.5%"),
},

eventNotesText: {
    fontFamily: 'Poppins',
    color: colors.black,
},

deleteButton: {
    top: 5,
    right: 5,
    position: "absolute",
},

modalBackground: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1001,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
},

deletedModalContainer: {
    width: wp("80%"),
    padding: wp("1%"),
    overflow: 'hidden',
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: wp("2.5%"),
    marginVertical: hp("30%"),
    backgroundColor: colors.white,
},

cancelButton: {
    margin: 0,
    padding: 0,
},

cancelButtonText: {
    fontSize: wp("7%"),
    fontFamily: 'Poppins',
},

warningModalContainer: {
    gap: 18,
    alignItems: "center",
    flexDirection: "row",  
    borderBottomWidth: 1,
    borderColor: colors.border,
},

warningModalText: {
    textAlign: "center",
    fontSize: wp("3.8%"),
    fontFamily: 'Poppins',
},

/*
// Edit Event Segments Modal
*/
// Edit Modal Button
editModalButton: {
    width: wp("76%"),
    padding: wp("2.8%"),
    borderRadius: wp("2.5%"),
    marginBottom: hp("1.5%"),
    backgroundColor: colors.borderv2,
},  

updateDeleteModal: {
    alignItems: "center",
    marginTop: hp("1.8%"),
},

/*
/ Do you want to make changes modal?
*/
// edit modal button
updatemodalButton: {
    width: wp("70%"),
    padding: wp("2.6%"),
    borderRadius: wp("2.5%"),
    marginBottom: hp("1.5%"),
    backgroundColor: colors.borderv2,
},

updatemodalButtonText: {
    textAlign: "center",
    fontFamily: 'Poppins',
},

// delete modal button
delmodalButton: {
    width: wp("70%"),
    padding: wp("2.6%"),
    marginBottom: hp("2%"),
    borderRadius: wp("2.5%"),
    backgroundColor: colors.borderv2,
},

delmodalButtonText: {
    textAlign: "center",
    fontFamily: 'Poppins',
},

editModalContainer: {
    height: 'auto',
    width: wp("85%"),
    overflow: 'hidden',
    maxHeight: hp("70%"),
    borderRadius: wp("2.5%"),
    backgroundColor: colors.white,  
},

editWarningModalText: {
    fontSize: wp("4.5%"),
    alignItems: "center",
    borderBottomWidth: 1,
    fontFamily: 'Poppins',
    paddingBottom: hp("1%"),
    marginVertical: hp("2%"),
    borderColor: colors.border,
    marginHorizontal: wp("4%"),
},

editInputContainer: {
    alignItems: "center",
},

editInputName: {
    borderWidth: 1,
    borderRadius: 9,
    width: wp("76%"),
    marginTop: hp("3%"),
    alignSelf: "center",
    fontFamily: 'Poppins',
    marginBottom: hp("1.2%"),
    paddingHorizontal: wp("3%"),
    borderColor: colors.borderv3,
},

editTimeContainer: {
    borderWidth: 1,
    borderRadius: 9,
    width: wp("76%"),
    height: hp("6%"),
    marginTop: hp("3%"),
    alignSelf: "center",
    alignItems: "center",
    flexDirection: "column",
    paddingHorizontal: wp("4%"),
    borderColor: colors.borderv3,
    justifyContent: "space-between",
},

editInputNotes: {
    borderWidth: 1,
    borderRadius: 9,
    width: wp("76%"),
    height: hp("8%"),
    alignSelf: "center",
    marginTop: hp("2.5%"),
    fontFamily: 'Poppins',
    textAlignVertical: "top",
    paddingHorizontal: wp("3%"),
    borderColor: colors.borderv3,
},

editText: {
    zIndex: 1000,
    left: wp("8%"),
    top: hp("1.5%"),
    position: "absolute",
    color: colors.borderv3,
    fontFamily: 'Poppins',
    backgroundColor: colors.white,
},

modalDivider: {
    marginTop: -hp("2%"),
},

editStartTimeContainer: {
    gap: 10,
    borderWidth: 1,
    borderRadius: 9,
    width: wp("76%"),
    height: hp("6%"),
    flexDirection: "row",
    alignItems: "center",
    borderColor: colors.borderv3,
    paddingHorizontal: wp("2.5%"),
    justifyContent: "space-between",
},

editEndTimeContainer: {
    gap: 10,
    borderWidth: 1,
    borderRadius: 9,
    width: wp("76%"),
    height: hp("6%"),
    flexDirection: "row",
    alignItems: "center",
    borderColor: colors.borderv3,
    paddingHorizontal: wp("2.5%"),
    justifyContent: "space-between",
},

editTimeRow: {
    gap: 10,
    alignItems: "center",
    flexDirection: "column",
},

segmentItem: {
    flexDirection: "row",
    alignItems: "flex-start",
},

eventSegmentTouchable: {
    flex: 1,
},

timeCircleContainer: {
    width: wp("24%"),
    alignItems: "center",
    justifyContent: "flex-start",
},

connectorLine: {
    width: 1,
    height: hp("2%"),
    backgroundColor: "#000000",
},

timeLabel: {
    fontFamily: 'Poppins',
},
});

export default Schedule