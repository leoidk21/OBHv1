import React, { useState, useEffect } from "react";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Modal, Pressable } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp} from "react-native-responsive-screen";
import colors from "../config/colors";
import Svg, { Path } from "react-native-svg";
import CheckBox from 'react-native-check-box';
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";

import NavigationSlider from './ReusableComponents/NavigationSlider';
import MenuBar from "./ReusableComponents/MenuBar";

const ProgressBar = ({ progress }: { progress: number }) => {
  return (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBar, { width: `${progress}%` }]} />
    </View>
  );
 };

const Checklist  = () => {

  const [inputValue, setInputValue] = useState('');
  const [modalVisible, setModalVisible] = React.useState(false);
  
  const handleSaveAndClose = () => {
    handleSave();
    setModalVisible(false);
  };

  type ChecklistItem = {
    id: string;
    name: string;
    checked: boolean;
  }

  const generateUniqueId = () => {
    return `checklist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };
  
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([
    { id: "checklist1", name: "Set a budget", checked: false },
    { id: "checklist2", name: "Add event time frame", checked: false },
    { id: "checklist3", name: "Set a venue for the event", checked: false },
    { id: "checklist4", name: "Invite guests", checked: false },
    { id: "checklist5", name: "Set a wedding date", checked: false },
    { id: "checklist6", name: "Set a wedding time", checked: false },
  ]);

  const toggleCheckbox = (id: string) => {
    setChecklistItems(prev => 
      prev.map(item => 
        item.id === id ? {...item, checked: !item.checked} : item
      )
    );
  };

  const handleSave = () => {
    if (inputValue.trim()) {
      const newItem = {
        id: generateUniqueId(),
        name: inputValue,
        checked: false
      };
      
      setChecklistItems(prev => [...prev, newItem]);
      setInputValue('');
    }
  };

  // const [progress, setProgress] = useState(0);
  
  // useEffect(() => {
  //   const checkedCount = Object.values(checkboxes).filter(checked => checked).length;
  //   const total = Object.keys(checkboxes).length;
  //   setProgress((checkedCount / total) * 100);
  // }, [checkboxes]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient colors={["#FFFFFF", "#f2e8e2ff"]} style={{ flex: 1 }}>
          {/* HEADER */}
          <View>
              <NavigationSlider headerTitle="Checklist" />
          </View>
          {/* HEADER */}

          {/* ===== CONTENT ===== */}
          <View style={styles.checkListHeader}>
            <Text style={styles.checkListHeaderText}>My task</Text>
          </View>

          {/* CHECKLIST */}
          <View style={styles.checkList}>
              <View style={styles.checkListItemContainer}>
                {checklistItems.map((item) => (
                  <CheckBox
                    key={item.id}
                    style={styles.checkListItem}
                    onClick={() => toggleCheckbox(item.id)}
                    rightText={item.name}
                    isChecked={item.checked}
                    checkedImage={
                      <View style={styles.radioChecked}>
                        <View style={styles.innerCheckedRadio}>
                          <FontAwesomeIcon 
                            icon={faCheck} 
                            size={12} 
                            color="#102E50" 
                          />
                        </View>
                      </View>
                    }
                    unCheckedImage={<View style={styles.radioUnchecked} />}
                  />
                ))}
              </View>
          </View>
          {/* CHECKLIST */}
          {/* ===== CONTENT ===== */}

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => 
                setModalVisible(true)
              }
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* ===== MODAL ===== */}
          <Modal
              visible={modalVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setModalVisible(false)}
              statusBarTranslucent={true}
          >
              <View style={styles.modalOverlay}>
                  <View style={styles.modalContainer}>
                      <View style={styles.closeButtonContainer}>
                          <Text style={styles.modalTitle}>Create New Task </Text>
                          <TouchableOpacity
                              style={styles.closeBtn}  
                              onPress={() => setModalVisible(false)}
                          >
                              <Text style={styles.closeButtonText}>&times;</Text>
                          </TouchableOpacity>
                      </View>
                      <View style={styles.underline}></View>

                      <View style={styles.inputEvent}>
                          <Text>Task Title</Text>
                          <TextInput
                              style={styles.inputEventText}
                              value={inputValue}
                              onChangeText={setInputValue}
                              placeholder="e.g., Invite the guests"
                          />
                      </View>
                      <View style={styles.saveButtonContainer}>
                          <TouchableOpacity 
                              style={styles.saveButton} 
                              onPress={handleSaveAndClose}
                          >
                              <Text style={styles.saveButtonText}>Create a new task</Text>
                          </TouchableOpacity>
                      </View>
                  </View>
              </View>
          </Modal>
          {/* ===== MODAL ===== */}
        </LinearGradient>
        <MenuBar activeScreen={"Checklist"} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
    radioUnchecked: {
      borderWidth: 2,
      width: 24,                      
      height: 24,
      borderRadius: 12,               
      borderColor: colors.button,
      alignItems: "center",
      justifyContent: "center",
   },

   radioChecked: {
      width: 24,
      height: 24,
      borderWidth: 2,
      borderRadius: 12,               
      borderColor: colors.button,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
   },

   innerCheckedRadio: {
      alignSelf: "center",
   },

   progressBarContainer: {
      width: wp("80%"),
      height: hp("1.5%"),
      alignSelf: "center",
      marginTop: hp("0.8%"),  
      borderRadius: wp("5%"),
      backgroundColor: colors.border,
   },

   progressBar: {
      height: hp("1.5%"),
      borderRadius: wp("5%"),
      backgroundColor: '#4CAF50',
   },

   progressText: {
      color: colors.black,
      marginTop: hp("0.8%"),
      paddingHorizontal: wp("1.5%"),
   },
  
   checkListItemContainer: {
      paddingHorizontal: wp("1%"),
   },

   checkList: {
      padding: wp("1.5%"),
      marginTop: hp("1%"),
      borderRadius: wp("2.5%"),
      paddingBottom: hp("1.5%"),
      marginHorizontal: wp("6%"),
   },

   checkListContainer: {
      padding: wp("2%"),
      flexDirection: "row",
      justifyContent: "space-between",
   },

   checkListItem: {
      borderWidth: 1,
      width: wp("88%"),
      padding: wp("4%"),
      alignSelf: "center",
      borderRadius: wp("2.5%"),
      borderColor: colors.border,
      marginVertical: hp("0.6%"),
      backgroundColor: colors.white,
   },

   checkListText: {
      fontWeight: "600",
      fontSize: wp("4.2%"), 
   },

   checkListHeader: {
      marginTop: hp("2%"),
      marginHorizontal: wp("6%"),
   },

    checkListHeaderText: {
      fontSize: wp("6%"),
      color: colors.black,
      fontFamily: "Loviena",
    },

    buttonContainer: {
      marginRight: hp("2.2%"),
      alignSelf: "flex-end",
      marginTop: hp("3.5%"),
      position: "absolute",
      zIndex: 1000,
      bottom: hp("10%"),
      justifyContent: "flex-start",
    },
    
    button: {
      width: wp("12%"),  
      height: wp("12%"),
      alignItems: "center",
      justifyContent: "center",
      borderRadius: wp("20%") / 2,
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
});

export default Checklist;