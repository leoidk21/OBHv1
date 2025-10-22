import React, { useRef, useState, useMemo } from "react";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, Modal, TextInput, Platform, Button } from "react-native";
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
    const [editNotes, setEditNotes] = useState('');
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
        setEditNotes(seg.notes);
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
        setEditNotes("");
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

                    {/* EVENT SEGMENTS */}
                    <View style={styles.segmentsContainer}>
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

                    {/* ADD SEGMENT BUTTON */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
                            <Text style={styles.buttonText}>+</Text>
                        </TouchableOpacity>
                    </View>

                    {/* MAIN MODAL - ADD SEGMENT */}
                    <Modal visible={modalVisible} transparent animationType="fade" statusBarTranslucent>
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
                                    <Text>Name</Text>
                                    <TextInput
                                        style={styles.inputEventText}
                                        value={inputValue}
                                        onChangeText={setInputValue}
                                        placeholder="Enter Event Segment"
                                    />
                                </View>

                                <View style={styles.dateTimeContainer}>
                                    <TouchableOpacity onPress={() => showMode("time", "start")}>
                                        <Text style={styles.dateTimeText}>Start Time</Text>
                                        <View style={styles.timePicker}> 
                                            <Text>
                                                {startTimeSelected ? startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Select start time"}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity onPress={() => showMode("time", "end")}>
                                        <Text style={styles.dateTimeText}>End Time</Text>
                                        <View style={styles.timePicker}> 
                                            <Text>
                                                {endTimeSelected ? endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Select end time"}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.inputNotesContainer}>
                                    <Text>Venue</Text>
                                    <TextInput
                                        style={styles.inputNotes}
                                        value={inputValue2}
                                        onChangeText={setInputValue2}
                                        multiline
                                        textAlignVertical="top"
                                        placeholder="e.g. Venue Name"
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
                    </Modal>

                    {/* DELETE CONFIRMATION MODAL */}
                    <Modal transparent animationType="fade" visible={showDeleteModal} statusBarTranslucent>
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
                    </Modal>

                    {/* EDIT MODAL */}
                    <Modal transparent animationType="slide" visible={showEditModal} statusBarTranslucent>
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

                                    <View>
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
                                    </View>

                                    <View>
                                        <Text style={styles.editText}>Notes</Text>
                                        <TextInput
                                            multiline
                                            style={styles.editInputNotes}
                                            value={editNotes}
                                            onChangeText={setEditNotes}
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
                                        style={styles.updatemodalButton}
                                        onPress={() => {
                                            if (!editName.trim() || !editNotes.trim()) {
                                                Alert.alert("Error", "Please fill in all fields.");
                                                return;
                                            }
                                            if (segmentToEdit !== null) {
                                                updateEventSegment(segmentToEdit, {
                                                    name: editName,
                                                    startTime: editStartTime,
                                                    endTime: editEndTime,
                                                    venue: editNotes,
                                                });
                                            }
                                            resetEditModal();
                                        }}
                                    >
                                        <Text style={styles.updatemodalButtonText}>Save</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.delmodalButton} onPress={resetEditModal}>
                                        <Text style={styles.delmodalButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                </LinearGradient>
                <MenuBar activeScreen="Schedule"/>
            </SafeAreaView>
        </SafeAreaProvider>
    );
};

const styles = StyleSheet.create({
    titleContainer: {
        marginLeft: hp("3%"),
        marginTop: hp("2%"),
    },

    titleText: {
        fontSize: wp('6%'),
        color: colors.brown,
        fontFamily: "Loviena",
    },

    dateContainer: {
        marginTop: hp("1%"),
        marginBottom: hp("3%"),
        backgroundColor: colors.button,
        borderRadius: wp("2%"),
        padding: wp("2%"),
        width: wp("40%"),  
    },

    dateText: {
        textAlign: "center",    
        color: colors.white,
        fontFamily: "Poppins",
    },

buttonContainer: {
      position: "absolute",
        right: wp("5%"),
        bottom: hp("12%"),
  },

  button: {
    width: wp("14%"),
    height: wp("14%"),
    borderRadius: wp("100%"),
    backgroundColor: colors.button,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
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
        width: wp("85%"),
        minHeight: hp("10%"),
        maxHeight: hp("70%"),
        height: 'auto',
        borderRadius: wp("2.5%"),
        backgroundColor: 'white',
        overflow: 'hidden',
    },

    modalTitle: {
        fontSize: wp("4.5%"),
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

    inputEventText: {
        borderWidth: 1,
        borderRadius: 9,
        width: wp("76%"),
        marginTop: hp("1%"),
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
        marginTop: hp("1%"),
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
        flexDirection: "column",     
        alignItems: "center",
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
        alignItems: "flex-start",
        flexDirection: "row",
    },

    eventTimeCon: {
        borderWidth: 2,
        width: wp("24%"),  
        height: wp("24%"),
        alignItems: "center",
        justifyContent: "center",
        borderColor: "#CBD5E1",
        borderRadius: wp("50%") / 2,
    },

    eventTimeText: {
        textAlign: "center", 
    },

    eventNotesCon: {
        width: wp("63%"),
        height: hp("11%"),
        borderRadius: wp("2.5%"),
        paddingVertical: hp("1%"),
        backgroundColor: "#E0F2FE",
        paddingHorizontal: wp("3.5%"),
        marginTop: hp("1.2%"),
    },

    eventSegmentText: {
        fontWeight: "600",
        color: colors.black,
        fontSize: wp("4.5%"),
        marginBottom: hp("0.5%"),
    },

    eventNotesText: {
        color: colors.black,
    },

    deleteButton: {
        position: "absolute",
        right: 5,
        top: 5,
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
        overflow: 'hidden',
        alignSelf: "center",
        alignItems: "center",
        padding: wp("1%"),
        justifyContent: "center",
        borderRadius: wp("2.5%"),
        marginVertical: hp("30%"),
        backgroundColor: colors.white,
    },
    
    cancelButton: {
        padding: 0,
        margin: 0,
    },
    
    cancelButtonText: {
        fontSize: wp("7%"),
    },

    warningModalContainer: {
        gap: 18,
        alignItems: "center",
        flexDirection: "row",  
        borderBottomWidth: 1,
        paddingBottom: hp("1%"),
        borderColor: colors.border,
    },
    
    warningModalText: {
        textAlign: "center",
        fontSize: wp("4.5%"),
    },

    updateDeleteModal: {
        alignItems: "center",
        marginTop: hp("2.2%"),
    },
    
    updatemodalButton: {
        width: wp("70%"),
        padding: wp("2.5%"),
        borderRadius: wp("2.5%"),
        marginBottom: hp("1.5%"),
        backgroundColor: colors.borderv2,
    },

    updatemodalButtonText: {
        textAlign: "center",
    },

    delmodalButton: {
        width: wp("70%"),
        padding: wp("2.5%"),
        marginBottom: hp("2%"),
        borderRadius: wp("2.5%"),
        backgroundColor: colors.borderv2,
    },

    delmodalButtonText: {
        textAlign: "center",
    },

    editModalContainer: {
        height: 'auto',
        width: wp("85%"),
        overflow: 'hidden',
        maxHeight: hp("70%"),
        borderRadius: wp("2.5%"),
        backgroundColor: colors.white,  
    },

    editWarningModalText : {
        alignItems: "center",
        borderBottomWidth: 1,
        paddingBottom: hp("2%"),
        marginVertical: hp("2%"),
        borderColor: colors.border,
        marginHorizontal: wp("4%"),
        fontSize: wp("4.5%"),
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
        paddingHorizontal: wp("3%"),
        borderColor: colors.borderv3,
    },

    editTimeContainer: {
        flexDirection: "column",
        alignItems: "center",
        alignSelf: "center",
        borderWidth: 1,
        width: wp("76%"),
        marginTop: hp("3%"),
        borderRadius: 9,
        height: hp("6%"),
        justifyContent: "space-between",
        paddingHorizontal: wp("4%"),
        borderColor: colors.borderv3,
    },

    editInputNotes: {
        borderWidth: 1,
        borderRadius: 9,
        width: wp("76%"),
        height: hp("8%"),
        alignSelf: "center",
        marginTop: hp("2.5%"),
        textAlignVertical: "top",
        paddingHorizontal: wp("3%"),
        borderColor: colors.borderv3,
    },

    editText: {
        position: "absolute",
        zIndex: 1000,
        left: wp("8%"),
        top: hp("1.5%"),
        color: colors.borderv3,
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
        flexDirection: "column",
        alignItems: "center",
    },

    timeLabel: {},

    segmentsContainer: {
    },

    segmentItem: {
        flexDirection: "row",
        alignItems: "flex-start",
    },

    eventSegmentTouchable: {
        flex: 1,
    },

    timeCircleContainer: {
        alignItems: "center",
        justifyContent: "flex-start",
        width: wp("24%"), // Same width as eventTimeCon
    },

    connectorLine: {
        width: 2,
        height: hp("3%"), // Height of the connecting line
        backgroundColor: "#CBD5E1", // Same color as your circle border
    },
});

export default Schedule