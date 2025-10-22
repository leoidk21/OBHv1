import React, { useState } from "react";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, Image, FlatList } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import colors from "../config/colors";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faChevronRight, faUpload, faTrash } from "@fortawesome/free-solid-svg-icons";
import NavigationSlider from "./ReusableComponents/NavigationSlider";
import MenuBar from "./ReusableComponents/MenuBar";

import * as SecureStore from 'expo-secure-store';
import { useEvent } from '../../context/EventContext';

const API_BASE = "https://ela-untraceable-foresakenly.ngrok-free.dev/api";

type ExpenseStatus = "Pending" | "Uploading" | "Proof Submitted" | "Paid" | "Verified" | "Rejected";

interface Expense {
  id: string;
  category: string;
  amount: number;
  status: ExpenseStatus;
  proofUri?: string | null;
  notes?: string;
}

const Budget: React.FC = () => {
  const { eventData, updateEvent } = useEvent();
  const expenses = eventData.budget || [];

    const addExpense = (newExpense: Expense) => {
    const updatedExpenses = [newExpense, ...expenses];
    updateEvent('budget', updatedExpenses);
  };

  const updateExpense = (expenseId: string, updates: Partial<Expense>) => {
    const updatedExpenses = expenses.map((expense: Expense) =>
      expense.id === expenseId ? { ...expense, ...updates } : expense
    );
    updateEvent('budget', updatedExpenses);
  };

  const removeExpenseFromContext = (expenseId: string) => {
    const updatedExpenses = expenses.filter((expense: Expense) => expense.id !== expenseId);
    updateEvent('budget', updatedExpenses);
  };

  // UI modals
  const [addExpenseModalVisible, setAddExpenseModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [addCategoryModalVisible, setAddCategoryModalVisible] = useState(false);

  // ... LIST OF CATEGORIES
  const [categories, setCategories] = useState<string[]>([
    "Venue",
    "Photo & Video",
    "Catering",
    "Food Booths",
    "Photobooth",
    "HMUA",
    "Decoration",
  ]);

  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number | null>(null);
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [categoryInput, setCategoryInput] = useState<string>("");

  // ... ADDING EXPENSE FUNCTION
  const openAddExpense = () => {
    setExpenseAmount("");
    setSelectedCategoryIndex(null);
    setAddExpenseModalVisible(true);
  };

  const createExpense = () => {
    if (!selectedCategoryIndex && selectedCategoryIndex !== 0) {
      Alert.alert("Select category", "Please select a category for this expense.");
      return;
    }
    if (!expenseAmount || isNaN(Number(expenseAmount))) {
      Alert.alert("Invalid amount", "Enter a valid numeric amount.");
      return;
    }
    const newExpense: Expense = {
      id: Date.now().toString(),
      category: categories[selectedCategoryIndex!],
      amount: parseFloat(Number(expenseAmount).toFixed(2)),
      status: "Pending",
      proofUri: null,
    };
    addExpense(newExpense);
    setAddExpenseModalVisible(false);
  };

  // ... ADD NEW CATEGORY FUNCTION
  const addNewCategory = () => {
    const label = categoryInput.trim();
    if (!label) {
      Alert.alert("Category name required", "Please provide a category label.");
      return;
    }
    setCategories(prev => [...prev, label]);
    setCategoryInput("");
    setAddCategoryModalVisible(false);
    setCategoryModalVisible(true);
  };

  const pickProofForExpense = async (expenseId: string) => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission required", "Permission to access photos is required to upload proof.");
      return;
    }

    try {
      // Show loading state immediately
      updateExpense(expenseId, { status: "Uploading" });

      const proofUrl = await uploadProofToServer(expenseId, "");
      
      console.log("🎉 Proof compressed and saved, length:", proofUrl.length);
      
      // Update with compressed base64 data
      updateExpense(expenseId, { 
        proofUri: proofUrl,
        status: "Proof Submitted" 
      });
      
      Alert.alert("Success", "Proof saved successfully!");
      
    } catch (err) {
      console.error('Upload error:', err);
      Alert.alert("Upload failed", "Couldn't process the image. Please try again.");
      updateExpense(expenseId, { status: "Pending" });
    }
  };

  const uploadProofToServer = async (expenseId: string, uri: string) => {
    try {
      console.log("📸 Converting and compressing image...");
      
      // Use lower quality for compression - these are the valid options
      const compressedResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.3, // Lower quality = smaller file size (0.3 instead of 0.7)
        allowsEditing: true,
        base64: true, // Get base64 directly from ImagePicker
        // Remove maxWidth and maxHeight - they're not valid options
      });

      if (compressedResult.canceled || !compressedResult.assets[0]) {
        throw new Error("Image selection canceled");
      }

      const base64data = compressedResult.assets[0].base64;
      const base64WithHeader = `data:image/jpeg;base64,${base64data}`;
      
      console.log("✅ Compressed base64 length:", base64WithHeader.length);
      console.log("📊 File size:", Math.round(base64WithHeader.length * 0.75) / 1000, "KB");
      
      return base64WithHeader;
    } catch (error) {
      console.error('❌ Image processing error:', error);
      throw error;
    }
  };

  // ... Remove expense
  const removeExpense = (id: string) => {
    Alert.alert("Remove expense", "Are you sure you want to remove this expense?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeExpenseFromContext(id),
      },
    ]);
  };

  // ... Render each expense item
  const renderExpense = ({ item, index }: { item: Expense; index: number }) => {
    return (
      <View style={styles.expenseRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.expenseCategoryText}>
            {index + 1}. {item.category}
          </Text>
          <Text style={styles.expenseAmountText}>₱ {item.amount.toLocaleString()}</Text>
          <Text
            style={{
              marginTop: hp("0.3%"),
              color:
                item.status === "Pending"
                  ? "#f39c12"
                  : item.status === "Proof Submitted"
                  ? "#2980b9"
                  : item.status === "Verified"
                  ? "#27ae60"
                  : "#e74c3c",
              fontWeight: "600",
            }}
          >
            {item.status}
          </Text>
        </View>

        {/* EXPENSES ACTIONS */}
        <View style={styles.expenseActions}>
          {item.proofUri ? (
            <TouchableOpacity onPress={() => openPreview(item.proofUri ?? undefined)}>
              <Image source={{ uri: item.proofUri ?? undefined }} style={styles.proofThumbnail} />
            </TouchableOpacity>
          ) : (
            // ... UPLOAD BUTTON
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => pickProofForExpense(item.id)}
            >
              <FontAwesomeIcon icon={faUpload} size={14} color={colors.white} />
              <Text style={styles.smallButtonText}>Upload</Text>
            </TouchableOpacity>
          )}

          {/* ... DELETE BUTTON */}
          <TouchableOpacity style={[styles.smallButton, styles.deleteBtn]} onPress={() => removeExpense(item.id)}>
            <FontAwesomeIcon icon={faTrash} size={12} color={colors.white} />
            <Text style={styles.smallButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ... Preview proof image (placeholder)
  const openPreview = (uri: string | undefined) => {
    if (!uri) return;
    Alert.alert("Proof preview", "Open proof image in full view (implement preview modal).");
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient colors={["#FFFFFF", "#f2e8e2ff"]} style={{ flex: 1 }}>
          <NavigationSlider headerTitle="Budget" />

          {/* Expenses header */}
          <View style={styles.expensesHeader}>
            <Text style={styles.expensesHeaderTitle}>Expenses Breakdown</Text>
            <Text style={styles.expensesHeaderSub}>Add expenses and upload proof of payment for verification</Text>
          </View>

          {/* Expenses list */}
          <View style={styles.expensesListContainer}>
            {expenses.length === 0 ? (
              <View style={styles.noExpensesContainer}>
                <Text style={styles.noExpensesText}>No expenses yet. Tap + to add one.</Text>
              </View>
            ) : (
              <FlatList
                data={expenses}
                keyExtractor={i => i.id}
                renderItem={renderExpense}
                contentContainerStyle={{ paddingBottom: hp("12%") }}
              />
            )}
          </View>

          {/* Add expense button */}
          <View style={styles.addButtonContainer}>
            <TouchableOpacity style={styles.addButton} onPress={openAddExpense}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Add Expense Modal */}
          <Modal visible={addExpenseModalVisible} transparent animationType="fade" onRequestClose={() => setAddExpenseModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Expense</Text>
                  <TouchableOpacity onPress={() => setAddExpenseModalVisible(false)}>
                    <Text style={styles.closeIcon}>&times;</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <TouchableOpacity
                    style={styles.categorySelector}
                    onPress={() => {
                      setCategoryModalVisible(true);
                    }}
                  >
                    <Text style={{ color: selectedCategoryIndex !== null ? "#000" : "#666" }}>
                      {selectedCategoryIndex !== null ? categories[selectedCategoryIndex] : "Select category"}
                    </Text>
                    <FontAwesomeIcon icon={faChevronRight} size={12} color="#343131" />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.inputField}
                    placeholder="Amount (e.g., 15000)"
                    keyboardType="numeric"
                    value={expenseAmount}
                    onChangeText={setExpenseAmount}
                  />

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.primaryButton, { width: wp("40%") }]}
                      onPress={createExpense}
                    >
                      <Text style={styles.primaryButtonText}>Add</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.secondaryButton, { width: wp("40%") }]}
                      onPress={() => setAddExpenseModalVisible(false)}
                    >
                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </Modal>

          {/* Category Modal */}
          <Modal visible={categoryModalVisible} transparent animationType="fade" onRequestClose={() => setCategoryModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Category</Text>
                  <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
                    <Text style={styles.closeIcon}>&times;</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.categoryList}>
                    {categories.map((c, idx) => (
                      <TouchableOpacity
                        key={c + idx}
                        style={[
                          styles.categoryItem,
                          { backgroundColor: idx === selectedCategoryIndex ? "#B47D4C" : colors.white },
                        ]}
                        onPress={() => {
                          setSelectedCategoryIndex(idx);
                          setCategoryModalVisible(false);
                          setAddExpenseModalVisible(true);
                        }}
                      >
                        <Text style={{ color: idx === selectedCategoryIndex ? "#fff" : "#000" }}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, { marginTop: hp("1%") }]}
                    onPress={() => {
                      setCategoryModalVisible(false);
                      setAddCategoryModalVisible(true);
                    }}
                  >
                    <Text style={styles.primaryButtonText}>Add New Category</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Add Category Modal */}
          <Modal visible={addCategoryModalVisible} transparent animationType="fade" onRequestClose={() => setAddCategoryModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Category</Text>
                  <TouchableOpacity onPress={() => setAddCategoryModalVisible(false)}>
                    <Text style={styles.closeIcon}>&times;</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <TextInput value={categoryInput} onChangeText={setCategoryInput} style={styles.inputField} placeholder="Category name" />
                  <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.primaryButton} onPress={addNewCategory}>
                      <Text style={styles.primaryButtonText}>Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => setAddCategoryModalVisible(false)}>
                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </Modal>
        </LinearGradient>
        <MenuBar activeScreen="Budget" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
    expenseCategoryText: {},

    modalOverlay: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.4)",
    },

    modalContainer: {
        width: wp("88%"),
        borderRadius: wp("2%"),
        backgroundColor: colors.white,
        maxHeight: hp("85%"),
        overflow: "hidden",
    },

    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginHorizontal: wp("4%"),
        marginTop: hp("1%"),
    },

    modalTitle: {
        fontSize: wp("5%"),
        fontWeight: "600",
    },

    closeIcon: {
        fontSize: wp("7%"),
        color: "#666",
    },
    modalBody: {
        padding: wp("4%"),
    },

    inputField: {
        borderWidth: 1,
        borderColor: colors.borderv3,
        borderRadius: 8,
        padding: wp("3%"),
        fontSize: wp("4%"),
        marginTop: hp("1%"),
    },

    primaryButton: {
        backgroundColor: colors.button,
        padding: hp("1.2%"),
        borderRadius: wp("2%"),
        alignItems: "center",
    },
    
    primaryButtonText: {
        color: colors.white,
        fontWeight: "600",
    },

    secondaryButton: {
        borderWidth: 1,
        borderColor: colors.border,
        padding: hp("1.2%"),
        borderRadius: wp("2%"),
        alignItems: "center",
    },

    secondaryButtonText: {
        color: "#333",
        fontWeight: "600",
    },

    expensesHeader: {
        marginTop: hp("2%"),
        marginHorizontal: wp("6%"),
    },

    expensesHeaderTitle: {
        fontSize: wp("5%"),
        fontWeight: "700",
    },

    expensesHeaderSub: {
        fontSize: wp("3.5%"),
        color: "#666",
        marginTop: hp("0.4%"),
    },

    expensesListContainer: {
        marginHorizontal: wp("6%"),
        marginTop: hp("1%"),
        flex: 1,
    },

    noExpensesContainer: {
        alignItems: "center",
        padding: hp("4%"),
    },

    noExpensesText: {
        color: "#666",
    },

    expenseRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.white,
        padding: wp("3%"),
        marginBottom: hp("1%"),
        borderRadius: wp("2%"),
        elevation: 1,
        fontWeight: "600",
        fontSize: wp("4%"),
        borderWidth: 1,
        borderColor: colors.borderv2,
    },

    expenseAmountText: {
        color: "#2E7D32",
        fontWeight: "700",
        marginTop: hp("0.3%"),
    },

    expenseActions: {
        alignItems: "center",
        justifyContent: "center",
        marginLeft: wp("3%"),
    },

    smallButton: {
        backgroundColor: colors.button,
        paddingHorizontal: wp("2%"),
        paddingVertical: hp("0.6%"),
        borderRadius: wp("2%"),
        marginVertical: hp("0.3%"),
        flexDirection: "row",
        alignItems: "center",
    },

    smallButtonText: {
        color: "#fff",
        marginLeft: wp("1%"),
        fontWeight: "600",
    },

    deleteBtn: {
        backgroundColor: "#E74C3C",
    },

    proofThumbnail: {
        width: wp("16%"),
        height: wp("10%"),
        borderRadius: 6,
        resizeMode: "cover",
        marginBottom: hp("0.6%"),
    },

    addButtonContainer: {
        position: "absolute",
        right: wp("5%"),
        bottom: hp("12%"),
    },

    addButton: {
        width: wp("14%"),
        height: wp("14%"),
        borderRadius: wp("100%"),
        backgroundColor: colors.button,
        alignItems: "center",
        justifyContent: "center",
        elevation: 5,
    },

    addButtonText: {
        color: "#fff",
        fontSize: wp("8%"),
    },

    categorySelector: {
        borderWidth: 1,
        borderColor: colors.borderv3,
        borderRadius: 8,
        padding: wp("3%"),
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    categoryList: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: hp("1%"),
    },

    categoryItem: {
        borderWidth: 1,
        borderColor: colors.border,
        padding: wp("3%"),
        borderRadius: 8,
        marginRight: wp("2%"),
        marginBottom: hp("1%"),
    },

    modalActions: {
        marginTop: hp("2%"),
        flexDirection: "row",
        justifyContent: "space-between",
    },
});

export default Budget;