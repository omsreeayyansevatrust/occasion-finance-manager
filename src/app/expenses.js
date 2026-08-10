import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { COLORS, FONTS } from "../constants/theme";
import { db } from "../services/firebase";

import * as ImagePicker from "expo-image-picker";

const CLOUDINARY_CLOUD_NAME = "etejpids";
const CLOUDINARY_UPLOAD_PRESET = "Occasionfinancemanager";

const EXPENSE_CATEGORIES = [
  "Food",
  "Decoration",
  "Transport",
  "Purchase",
  "Venue",
  "Printing",
  "Salary",
  "Utilities",
  "Administration",
  "Other",
];

const PAYMENT_MODES = [
  "Cash",
  "UPI",
  "Bank Transfer",
  "Cheque",
  "Other",
];

function getToday() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    today.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  );
}

export default function ExpensesScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [expenses, setExpenses] = useState([]);
  const [occasions, setOccasions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [occasionFilter, setOccasionFilter] =
    useState("All");
  const [categoryFilter, setCategoryFilter] =
    useState("All");
  const [paymentFilter, setPaymentFilter] =
    useState("All");

  const [modalVisible, setModalVisible] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  const [occasionSearch, setOccasionSearch] =
    useState("");

  const [showOccasions, setShowOccasions] =
    useState(false);

  const [proofViewerVisible, setProofViewerVisible] =
    useState(false);

  const [proofViewerUrl, setProofViewerUrl] =
    useState("");

  const [form, setForm] = useState({
    occasionId: "",
    occasionName: "",
    date: getToday(),
    category: "Other",
    description: "",
    amount: "",
    paymentMode: "UPI",
    notes: "",
    proofImageUrl: "",
  });

  // ==================================================
  // FIREBASE
  // ==================================================

  useEffect(() => {
    let loaded = 0;

    const finishLoading = () => {
      loaded += 1;

      if (loaded >= 2) {
        setLoading(false);
      }
    };

    const unsubscribeExpenses =
      onSnapshot(
        collection(db, "expenses"),
        (snapshot) => {
          const data = snapshot.docs.map(
            (item) => ({
              id: item.id,
              ...item.data(),
            })
          );

          setExpenses(data);
          finishLoading();
        },
        (error) => {
          console.log(
            "Expenses error:",
            error
          );

          finishLoading();
        }
      );

    const unsubscribeOccasions =
      onSnapshot(
        collection(db, "occasions"),
        (snapshot) => {
          const data =
            snapshot.docs
              .map((item) => ({
                id: item.id,
                ...item.data(),
              }))
              .filter((occasion) => {
                const status =
                  String(
                    occasion.status ||
                      "Active"
                  ).toLowerCase();

                return (
                  status === "active" ||
                  status === "open"
                );
              })
              .sort((a, b) =>
                String(
                  a.name ||
                    a.title ||
                    ""
                ).localeCompare(
                  String(
                    b.name ||
                      b.title ||
                      ""
                  )
                )
              );

          setOccasions(data);
          finishLoading();
        },
        (error) => {
          console.log(
            "Occasions error:",
            error
          );

          finishLoading();
        }
      );

    return () => {
      unsubscribeExpenses();
      unsubscribeOccasions();
    };
  }, []);

  // ==================================================
  // FORM
  // ==================================================

  const resetForm = () => {
    setForm({
      occasionId: "",
      occasionName: "",
      date: getToday(),
      category: "Other",
      description: "",
      amount: "",
      paymentMode: "UPI",
      notes: "",
    });

    setEditingId(null);
    setOccasionSearch("");
    setShowOccasions(false);
  };

  const openNew = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (expense) => {
    setEditingId(expense.id);

    setForm({
      occasionId:
        expense.occasionId || "",
      occasionName:
        expense.occasionName || "",
      date:
        expense.date || getToday(),
      category:
        expense.category || "Other",
      description:
        expense.description || "",
      amount:
        expense.amount !== undefined
          ? String(expense.amount)
          : "",
      paymentMode:
        expense.paymentMode || "UPI",
      notes:
        expense.notes || "",
      proofImageUrl:
        expense.proofImageUrl || "",
    });

    setModalVisible(true);
  };

  // ==================================================
  // CLOUDINARY PROOF IMAGE
  // ==================================================

  const pickProofImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow photo access to upload an expense proof image."
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      setSaving(true);

      const formData = new FormData();
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      if (Platform.OS === "web") {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        formData.append("file", blob, asset.fileName || "expense-proof.jpg");
      } else {
        formData.append("file", {
          uri: asset.uri,
          type: asset.mimeType || "image/jpeg",
          name: asset.fileName || `expense-proof-${Date.now()}.jpg`,
        });
      }

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadResult.secure_url) {
        console.log("Cloudinary upload error:", uploadResult);
        throw new Error(
          uploadResult?.error?.message ||
            "Unable to upload the proof image."
        );
      }

      setForm((current) => ({
        ...current,
        proofImageUrl: uploadResult.secure_url,
      }));
    } catch (error) {
      console.log("Proof image upload error:", error);
      Alert.alert(
        "Upload Failed",
        error?.message ||
          "Unable to upload the proof image. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const removeProofImage = () => {
    setForm((current) => ({
      ...current,
      proofImageUrl: "",
    }));
  };

  const openProofViewer = (url) => {
    if (!url) return;
    setProofViewerUrl(url);
    setProofViewerVisible(true);
  };

  // ==================================================
  // OCCASION SEARCH
  // ==================================================

  const filteredOccasions =
    useMemo(() => {
      const value =
        occasionSearch
          .trim()
          .toLowerCase();

      if (!value) {
        return occasions;
      }

      return occasions.filter(
        (occasion) =>
          String(
            occasion.name ||
              occasion.title ||
              ""
          )
            .toLowerCase()
            .includes(value)
      );
    }, [
      occasions,
      occasionSearch,
    ]);

  // ==================================================
  // FILTER EXPENSES
  // ==================================================

  const filteredExpenses =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      return expenses
        .filter((expense) => {
          if (!value) {
            return true;
          }

          return (
            String(
              expense.description ||
                ""
            )
              .toLowerCase()
              .includes(value) ||
            String(
              expense.occasionName ||
                ""
            )
              .toLowerCase()
              .includes(value) ||
            String(
              expense.category ||
                ""
            )
              .toLowerCase()
              .includes(value) ||
            String(
              expense.paymentMode ||
                ""
            )
              .toLowerCase()
              .includes(value) ||
            String(
              expense.notes || ""
            )
              .toLowerCase()
              .includes(value)
          );
        })
        .filter((expense) => {
          if (
            occasionFilter ===
            "All"
          ) {
            return true;
          }

          if (
            occasionFilter ===
            "General"
          ) {
            return !expense.occasionId;
          }

          return (
            expense.occasionId ===
            occasionFilter
          );
        })
        .filter((expense) => {
          if (
            categoryFilter ===
            "All"
          ) {
            return true;
          }

          return (
            String(
              expense.category ||
                ""
            ).toLowerCase() ===
            categoryFilter.toLowerCase()
          );
        })
        .filter((expense) => {
          if (
            paymentFilter ===
            "All"
          ) {
            return true;
          }

          return (
            String(
              expense.paymentMode ||
                ""
            ).toLowerCase() ===
            paymentFilter.toLowerCase()
          );
        })
        .sort((a, b) =>
          String(
            b.date || ""
          ).localeCompare(
            String(
              a.date || ""
            )
          )
        );
    }, [
      expenses,
      search,
      occasionFilter,
      categoryFilter,
      paymentFilter,
    ]);

  // ==================================================
  // TOTALS
  // ==================================================

  const filteredTotal =
    filteredExpenses.reduce(
      (total, expense) =>
        total +
        Number(
          expense.amount || 0
        ),
      0
    );

  const allExpensesTotal =
    expenses.reduce(
      (total, expense) =>
        total +
        Number(
          expense.amount || 0
        ),
      0
    );

  const occasionExpenseTotal =
    expenses
      .filter(
        (expense) =>
          expense.occasionId
      )
      .reduce(
        (total, expense) =>
          total +
          Number(
            expense.amount || 0
          ),
        0
      );

  const generalExpenseTotal =
    expenses
      .filter(
        (expense) =>
          !expense.occasionId
      )
      .reduce(
        (total, expense) =>
          total +
          Number(
            expense.amount || 0
          ),
        0
      );

  // ==================================================
  // SAVE
  // ==================================================

  const saveExpense = async () => {
    const description =
      form.description.trim();

    if (!description) {
      Alert.alert(
        "Required",
        "Please enter an expense description."
      );
      return;
    }

    const amount = Number(
      String(form.amount)
        .replace(/,/g, "")
    );

    if (
      !form.amount ||
      Number.isNaN(amount) ||
      amount <= 0
    ) {
      Alert.alert(
        "Invalid Amount",
        "Please enter a valid expense amount greater than zero."
      );
      return;
    }

    if (!form.date.trim()) {
      Alert.alert(
        "Required",
        "Please enter the expense date."
      );
      return;
    }

    if (!form.category) {
      Alert.alert(
        "Required",
        "Please select an expense category."
      );
      return;
    }

    if (!form.paymentMode) {
      Alert.alert(
        "Required",
        "Please select a payment mode."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        occasionId:
          form.occasionId || "",
        occasionName:
          form.occasionName || "",
        date:
          form.date.trim(),
        category:
          form.category,
        description,
        amount,
        paymentMode:
          form.paymentMode,
        notes:
          form.notes.trim(),
        proofImageUrl:
          form.proofImageUrl || "",
        updatedAt:
          serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(
          doc(
            db,
            "expenses",
            editingId
          ),
          payload
        );
      } else {
        await addDoc(
          collection(
            db,
            "expenses"
          ),
          {
            ...payload,
            createdAt:
              serverTimestamp(),
          }
        );
      }

      setModalVisible(false);
      resetForm();
    } catch (error) {
      console.log(
        "Save expense error:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to save the expense. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==================================================
  // DELETE
  // ==================================================

  const confirmDelete = (
    expense
  ) => {
    const message =
      `Are you sure you want to delete "${expense.description}" of ₹${formatAmount(
        expense.amount
      )}?`;

    if (
      typeof window !==
        "undefined" &&
      typeof window.confirm ===
        "function"
    ) {
      const confirmed =
        window.confirm(
          message
        );

      if (confirmed) {
        deleteExpense(
          expense.id
        );
      }

      return;
    }

    Alert.alert(
      "Delete Expense",
      message,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deleteExpense(
              expense.id
            ),
        },
      ]
    );
  };

  const deleteExpense =
    async (id) => {
      try {
        await deleteDoc(
          doc(
            db,
            "expenses",
            id
          )
        );
      } catch (error) {
        console.log(
          "Delete expense error:",
          error
        );

        const message =
          error?.message ||
          "Unable to delete the expense.";

        if (
          typeof window !==
            "undefined" &&
          typeof window.alert ===
            "function"
        ) {
          window.alert(
            message
          );
        } else {
          Alert.alert(
            "Error",
            message
          );
        }
      }
    };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <View
        style={styles.loading}
      >
        <ActivityIndicator
          size="large"
          color={
            COLORS.primary
          }
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading expenses...
        </Text>
      </View>
    );
  }

  // ==================================================
  // SCREEN
  // ==================================================

  return (
    <View
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={[
          styles.content,
          isMobile && styles.contentMobile,
        ]}
      >
        {/* HEADER */}

        <View
          style={[styles.header, isMobile && styles.headerMobile]}
        >
          <View
            style={[
              styles.headerLeft,
              isMobile && styles.headerLeftMobile,
            ]}
          >
            <Text
              style={
                styles.eyebrow
              }
            >
              EXPENSE MANAGEMENT
            </Text>

            <Text
              style={[
                styles.title,
                isMobile && styles.titleMobile,
              ]}
            >
              Expenses
            </Text>

            <Text
              style={[
                styles.subtitle,
                isMobile && styles.subtitleMobile,
              ]}
            >
              Track occasion and
              general expenses
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              isMobile && styles.primaryButtonMobile,
            ]}
            onPress={openNew}
          >
            <Text
              style={
                styles.primaryButtonIcon
              }
            >
              +
            </Text>

            <Text
              style={
                styles.primaryButtonText
              }
            >
              Add Expense
            </Text>
          </TouchableOpacity>
        </View>

        {/* SUMMARY */}

        <View
          style={[
            styles.summaryGrid,
            isMobile && styles.summaryGridMobile,
          ]}
        >
          <SummaryCard
            label="FILTERED TOTAL"
            value={`₹${formatAmount(
              filteredTotal
            )}`}
            icon="₹"
            color={
              COLORS.danger
            }
            isMobile={isMobile}
          />

          <SummaryCard
            label="ALL EXPENSES"
            value={`₹${formatAmount(
              allExpensesTotal
            )}`}
            icon="Σ"
            color={
              COLORS.primary
            }
            isMobile={isMobile}
          />

          <SummaryCard
            label="OCCASION EXPENSES"
            value={`₹${formatAmount(
              occasionExpenseTotal
            )}`}
            icon="O"
            color="#8B5CF6"
            isMobile={isMobile}
          />

          <SummaryCard
            label="GENERAL EXPENSES"
            value={`₹${formatAmount(
              generalExpenseTotal
            )}`}
            icon="G"
            color={
              COLORS.success
            }
            isMobile={isMobile}
          />
        </View>

        {/* SEARCH */}

        <View
          style={styles.toolbar}
        >
          <View
            style={
              styles.searchBox
            }
          >
            <Text
              style={
                styles.searchIcon
              }
            >
              ⌕
            </Text>

            <TextInput
              value={search}
              onChangeText={
                setSearch
              }
              placeholder="Search description, occasion, category..."
              placeholderTextColor={
                COLORS.textMuted
              }
              style={
                styles.searchInput
              }
            />
          </View>
        </View>

        {/* OCCASION FILTER */}

        <View
          style={
            styles.filterSection
          }
        >
          <Text
            style={
              styles.filterLabel
            }
          >
            OCCASION
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.horizontalFilter
            }
          >
            <FilterButton
              label="All"
              active={
                occasionFilter ===
                "All"
              }
              onPress={() =>
                setOccasionFilter(
                  "All"
                )
              }
            />

            <FilterButton
              label="General"
              active={
                occasionFilter ===
                "General"
              }
              onPress={() =>
                setOccasionFilter(
                  "General"
                )
              }
            />

            {occasions.map(
              (occasion) => (
                <FilterButton
                  key={
                    occasion.id
                  }
                  label={
                    occasion.name ||
                    occasion.title ||
                    "Unnamed"
                  }
                  active={
                    occasionFilter ===
                    occasion.id
                  }
                  onPress={() =>
                    setOccasionFilter(
                      occasion.id
                    )
                  }
                />
              )
            )}
          </ScrollView>
        </View>

        {/* CATEGORY */}

        <View
          style={
            styles.filterSection
          }
        >
          <Text
            style={
              styles.filterLabel
            }
          >
            CATEGORY
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.horizontalFilter
            }
          >
            <FilterButton
              label="All"
              active={
                categoryFilter ===
                "All"
              }
              onPress={() =>
                setCategoryFilter(
                  "All"
                )
              }
            />

            {EXPENSE_CATEGORIES.map(
              (category) => (
                <FilterButton
                  key={category}
                  label={
                    category
                  }
                  active={
                    categoryFilter ===
                    category
                  }
                  onPress={() =>
                    setCategoryFilter(
                      category
                    )
                  }
                />
              )
            )}
          </ScrollView>
        </View>

        {/* PAYMENT MODE */}

        <View
          style={
            styles.filterSection
          }
        >
          <Text
            style={
              styles.filterLabel
            }
          >
            PAYMENT MODE
          </Text>

          <View
            style={
              styles.filterRow
            }
          >
            <FilterButton
              label="All"
              active={
                paymentFilter ===
                "All"
              }
              onPress={() =>
                setPaymentFilter(
                  "All"
                )
              }
            />

            {PAYMENT_MODES.map(
              (mode) => (
                <FilterButton
                  key={mode}
                  label={mode}
                  active={
                    paymentFilter ===
                    mode
                  }
                  onPress={() =>
                    setPaymentFilter(
                      mode
                    )
                  }
                />
              )
            )}
          </View>
        </View>

        {/* RESULTS */}

        <View
          style={
            styles.resultHeader
          }
        >
          <Text
            style={
              styles.resultCount
            }
          >
            {filteredExpenses.length}{" "}
            {filteredExpenses.length ===
            1
              ? "expense"
              : "expenses"}
          </Text>

          {(search ||
            occasionFilter !==
              "All" ||
            categoryFilter !==
              "All" ||
            paymentFilter !==
              "All") && (
            <TouchableOpacity
              onPress={() => {
                setSearch("");
                setOccasionFilter(
                  "All"
                );
                setCategoryFilter(
                  "All"
                );
                setPaymentFilter(
                  "All"
                );
              }}
            >
              <Text
                style={
                  styles.clearText
                }
              >
                Clear filters
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* LIST */}

        {filteredExpenses.length ===
        0 ? (
          <View
            style={
              styles.emptyCard
            }
          >
            <View
              style={
                styles.emptyIcon
              }
            >
              <Text
                style={
                  styles.emptyIconText
                }
              >
                ₹
              </Text>
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              No expenses found
            </Text>

            <Text
              style={
                styles.emptyDescription
              }
            >
              Start recording your
              expenses to track where
              the money is being spent.
            </Text>

            <TouchableOpacity
              style={
                styles.emptyButton
              }
              onPress={openNew}
            >
              <Text
                style={
                  styles.emptyButtonText
                }
              >
                Add Expense
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={styles.list}
          >
            {filteredExpenses.map(
              (expense) => (
                <ExpenseCard
                  key={
                    expense.id
                  }
                  expense={
                    expense
                  }
                  onEdit={() =>
                    openEdit(
                      expense
                    )
                  }
                  onDelete={() =>
                    confirmDelete(
                      expense
                    )
                  }
                  onViewProof={() =>
                    openProofViewer(
                      expense.proofImageUrl
                    )
                  }
                  isMobile={isMobile}
                />
              )
            )}
          </View>
        )}
      </ScrollView>

      {/* ==================================================
          ADD / EDIT MODAL
          ================================================== */}

      <Modal
        visible={
          modalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setModalVisible(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <ScrollView
            contentContainerStyle={[
              styles.modalScroll,
              isMobile && styles.modalScrollMobile,
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[
                styles.modal,
                isMobile && styles.modalMobile,
              ]}
            >
              {/* HEADER */}

              <View
                style={
                  styles.modalHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    {editingId
                      ? "Edit Expense"
                      : "Add Expense"}
                  </Text>

                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    Record an occasion or
                    general expense
                  </Text>
                </View>

                <TouchableOpacity
                  style={
                    styles.closeButton
                  }
                  onPress={() => {
                    setModalVisible(
                      false
                    );
                    resetForm();
                  }}
                >
                  <Text
                    style={
                      styles.closeText
                    }
                  >
                    ×
                  </Text>
                </TouchableOpacity>
              </View>

              {/* OCCASION */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Occasion
              </Text>

              {form.occasionId ? (
                <View
                  style={
                    styles.selectedBox
                  }
                >
                  <View
                    style={
                      styles.occasionIcon
                    }
                  >
                    <Text
                      style={
                        styles.occasionIconText
                      }
                    >
                      O
                    </Text>
                  </View>

                  <View
                    style={
                      styles.selectedInfo
                    }
                  >
                    <Text
                      style={
                        styles.selectedName
                      }
                    >
                      {
                        form.occasionName
                      }
                    </Text>

                    <Text
                      style={
                        styles.selectedSubtext
                      }
                    >
                      Occasion expense
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setForm({
                        ...form,
                        occasionId:
                          "",
                        occasionName:
                          "",
                      });

                      setShowOccasions(
                        true
                      );
                    }}
                  >
                    <Text
                      style={
                        styles.changeText
                      }
                    >
                      Change
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TextInput
                    value={
                      occasionSearch
                    }
                    onChangeText={(
                      value
                    ) => {
                      setOccasionSearch(
                        value
                      );
                      setShowOccasions(
                        true
                      );
                    }}
                    onFocus={() =>
                      setShowOccasions(
                        true
                      )
                    }
                    placeholder="Search occasion or leave blank for general expense..."
                    placeholderTextColor={
                      COLORS.textMuted
                    }
                    style={
                      styles.input
                    }
                  />

                  {showOccasions && (
                    <View
                      style={
                        styles.dropdown
                      }
                    >
                      <TouchableOpacity
                        style={
                          styles.generalOption
                        }
                        onPress={() => {
                          setForm({
                            ...form,
                            occasionId:
                              "",
                            occasionName:
                              "",
                          });

                          setOccasionSearch(
                            ""
                          );

                          setShowOccasions(
                            false
                          );
                        }}
                      >
                        <View
                          style={
                            styles.generalIcon
                          }
                        >
                          <Text
                            style={
                              styles.generalIconText
                            }
                          >
                            G
                          </Text>
                        </View>

                        <View
                          style={
                            styles.dropdownInfo
                          }
                        >
                          <Text
                            style={
                              styles.dropdownName
                            }
                          >
                            General Expense
                          </Text>

                          <Text
                            style={
                              styles.dropdownMeta
                            }
                          >
                            Not linked to
                            an occasion
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {filteredOccasions
                        .slice(
                          0,
                          8
                        )
                        .map(
                          (
                            occasion
                          ) => {
                            const name =
                              occasion.name ||
                              occasion.title ||
                              "Unnamed Occasion";

                            return (
                              <TouchableOpacity
                                key={
                                  occasion.id
                                }
                                style={
                                  styles.dropdownItem
                                }
                                onPress={() => {
                                  setForm({
                                    ...form,
                                    occasionId:
                                      occasion.id,
                                    occasionName:
                                      name,
                                  });

                                  setOccasionSearch(
                                    ""
                                  );

                                  setShowOccasions(
                                    false
                                  );
                                }}
                              >
                                <View
                                  style={
                                    styles.dropdownAvatar
                                  }
                                >
                                  <Text
                                    style={
                                      styles.dropdownAvatarText
                                    }
                                  >
                                    O
                                  </Text>
                                </View>

                                <View
                                  style={
                                    styles.dropdownInfo
                                  }
                                >
                                  <Text
                                    style={
                                      styles.dropdownName
                                    }
                                  >
                                    {
                                      name
                                    }
                                  </Text>

                                  <Text
                                    style={
                                      styles.dropdownMeta
                                    }
                                  >
                                    Occasion
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          }
                        )}
                    </View>
                  )}
                </>
              )}

              {/* DATE */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Expense Date *
              </Text>

              <TextInput
                value={
                  form.date
                }
                onChangeText={(
                  value
                ) =>
                  setForm({
                    ...form,
                    date: value,
                  })
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor={
                  COLORS.textMuted
                }
                maxLength={10}
                style={
                  styles.input
                }
              />

              {/* CATEGORY */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Category *
              </Text>

              <View
                style={
                  styles.categoryGrid
                }
              >
                {EXPENSE_CATEGORIES.map(
                  (category) => (
                    <TouchableOpacity
                      key={
                        category
                      }
                      style={[
                        styles.categoryOption,
                        form.category ===
                          category &&
                          styles.categoryOptionActive,
                      ]}
                      onPress={() =>
                        setForm({
                          ...form,
                          category,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          form.category ===
                            category &&
                            styles.categoryOptionTextActive,
                        ]}
                      >
                        {
                          category
                        }
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              {/* DESCRIPTION */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Description *
              </Text>

              <TextInput
                value={
                  form.description
                }
                onChangeText={(
                  value
                ) =>
                  setForm({
                    ...form,
                    description:
                      value,
                  })
                }
                placeholder="What was this expense for?"
                placeholderTextColor={
                  COLORS.textMuted
                }
                style={
                  styles.input
                }
              />

              {/* AMOUNT */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Amount *
              </Text>

              <View
                style={
                  styles.amountBox
                }
              >
                <Text
                  style={
                    styles.currencySymbol
                  }
                >
                  ₹
                </Text>

                <TextInput
                  value={
                    form.amount
                  }
                  onChangeText={(
                    value
                  ) => {
                    const cleaned =
                      value.replace(
                        /[^0-9.]/g,
                        ""
                      );

                    setForm({
                      ...form,
                      amount:
                        cleaned,
                    });
                  }}
                  placeholder="0.00"
                  placeholderTextColor={
                    COLORS.textMuted
                  }
                  keyboardType="decimal-pad"
                  style={
                    styles.amountInput
                  }
                />
              </View>

              {/* PAYMENT MODE */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Payment Mode *
              </Text>

              <View
                style={
                  styles.paymentGrid
                }
              >
                {PAYMENT_MODES.map(
                  (mode) => (
                    <TouchableOpacity
                      key={
                        mode
                      }
                      style={[
                        styles.paymentOption,
                        form.paymentMode ===
                          mode &&
                          styles.paymentOptionActive,
                      ]}
                      onPress={() =>
                        setForm({
                          ...form,
                          paymentMode:
                            mode,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.paymentOptionText,
                          form.paymentMode ===
                            mode &&
                            styles.paymentOptionTextActive,
                        ]}
                      >
                        {
                          mode
                        }
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              {/* NOTES */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Notes
              </Text>

              <TextInput
                value={
                  form.notes
                }
                onChangeText={(
                  value
                ) =>
                  setForm({
                    ...form,
                    notes: value,
                  })
                }
                placeholder="Optional notes..."
                placeholderTextColor={
                  COLORS.textMuted
                }
                multiline
                numberOfLines={3}
                style={[
                  styles.input,
                  styles.notesInput,
                ]}
              />

              {/* EXPENSE PROOF IMAGE */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Expense Proof
              </Text>

              {form.proofImageUrl ? (
                <View style={styles.proofPreviewBox}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() =>
                      openProofViewer(form.proofImageUrl)
                    }
                  >
                    <Image
                      source={{ uri: form.proofImageUrl }}
                      style={styles.proofPreviewImage}
                      resizeMode="contain"
                    />
                    <View style={styles.proofTapHint}>
                      <Text style={styles.proofTapHintText}>
                        Tap image to view
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.proofPreviewActions}>
                    <TouchableOpacity
                      style={styles.proofViewButton}
                      onPress={() =>
                        openProofViewer(form.proofImageUrl)
                      }
                    >
                      <Text style={styles.proofViewButtonText}>
                        View Proof
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.proofSecondaryButton}
                      onPress={pickProofImage}
                      disabled={saving}
                    >
                      <Text style={styles.proofSecondaryButtonText}>
                        Replace
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.proofRemoveButton}
                      onPress={removeProofImage}
                      disabled={saving}
                    >
                      <Text style={styles.proofRemoveButtonText}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.proofUploadBox}
                  onPress={pickProofImage}
                  disabled={saving}
                >
                  <View style={styles.proofUploadIcon}>
                    <Text style={styles.proofUploadIconText}>📷</Text>
                  </View>
                  <Text style={styles.proofUploadTitle}>
                    Add expense proof
                  </Text>
                  <Text style={styles.proofUploadSubtitle}>
                    Upload receipt, bill or payment proof
                  </Text>
                </TouchableOpacity>
              )}

              {/* ACTIONS */}

              <View
                style={[
                  styles.modalActions,
                  isMobile && styles.modalActionsMobile,
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.cancelButton,
                    isMobile && styles.mobileFullButton,
                  ]}
                  onPress={() => {
                    setModalVisible(
                      false
                    );
                    resetForm();
                  }}
                >
                  <Text
                    style={
                      styles.cancelButtonText
                    }
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    isMobile && styles.mobileFullButton,
                  ]}
                  onPress={
                    saveExpense
                  }
                  disabled={
                    saving
                  }
                >
                  {saving ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <Text
                      style={
                        styles.saveButtonText
                      }
                    >
                      {editingId
                        ? "Update Expense"
                        : "Save Expense"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ==================================================
          EXPENSE PROOF VIEWER
          ================================================== */}

      <Modal
        visible={proofViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setProofViewerVisible(false);
          setProofViewerUrl("");
        }}
      >
        <View style={styles.proofViewerOverlay}>
          <View
            style={[
              styles.proofViewerCard,
              isMobile && styles.proofViewerCardMobile,
            ]}
          >
            <View style={styles.proofViewerHeader}>
              <Text style={styles.proofViewerTitle}>
                Expense Proof
              </Text>

              <TouchableOpacity
                style={styles.proofViewerClose}
                onPress={() => {
                  setProofViewerVisible(false);
                  setProofViewerUrl("");
                }}
              >
                <Text style={styles.proofViewerCloseText}>
                  ×
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.proofViewerImageContainer,
                isMobile && styles.proofViewerImageContainerMobile,
              ]}
            >
              {proofViewerUrl ? (
                <Image
                  source={{ uri: proofViewerUrl }}
                  style={styles.proofViewerImage}
                  resizeMode="contain"
                />
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.proofViewerDoneButton}
              onPress={() => {
                setProofViewerVisible(false);
                setProofViewerUrl("");
              }}
            >
              <Text style={styles.proofViewerDoneText}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==================================================
// SUMMARY CARD
// ==================================================

function SummaryCard({
  label,
  value,
  icon,
  color,
  isMobile = false,
}) {
  return (
    <View
      style={[
        styles.summaryCard,
        isMobile && styles.summaryCardMobile,
      ]}
    >
      <View
        style={
          styles.summaryTop
        }
      >
        <Text
          style={
            styles.summaryLabel
          }
        >
          {label}
        </Text>

        <View
          style={[
            styles.summaryIcon,
            {
              backgroundColor:
                `${color}18`,
            },
          ]}
        >
          <Text
            style={[
              styles.summaryIconText,
              { color },
            ]}
          >
            {icon}
          </Text>
        </View>
      </View>

      <Text
        style={
          styles.summaryValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

// ==================================================
// FILTER BUTTON
// ==================================================

function FilterButton({
  label,
  active,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.filterButton,
        active &&
          styles.filterButtonActive,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterText,
          active &&
            styles.filterTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ==================================================
// EXPENSE CARD
// ==================================================

function ExpenseCard({
  expense,
  onEdit,
  onDelete,
  onViewProof,
  isMobile = false,
}) {
  const categoryColors = {
    Food: "#EA580C",
    Decoration: "#DB2777",
    Transport: "#2563EB",
    Purchase: "#7C3AED",
    Venue: "#0891B2",
    Printing: "#64748B",
    Salary: "#16A34A",
    Utilities: "#CA8A04",
    Administration: "#475569",
    Other: "#64748B",
  };

  const color =
    categoryColors[
      expense.category
    ] || "#64748B";

  return (
    <View
      style={[
        styles.expenseCard,
        isMobile && styles.expenseCardMobile,
      ]}
    >
      <View
        style={[
          styles.expenseMain,
          isMobile && styles.expenseMainMobile,
        ]}
      >
        <View
          style={[
            styles.expenseIcon,
            {
              backgroundColor:
                `${color}18`,
            },
          ]}
        >
          <Text
            style={[
              styles.expenseIconText,
              { color },
            ]}
          >
            ₹
          </Text>
        </View>

        <View
          style={[
            styles.expenseInfo,
            isMobile && styles.expenseInfoMobile,
          ]}
        >
          <View
            style={
              styles.expenseTitleRow
            }
          >
            <Text
              style={[
                styles.expenseDescription,
                isMobile && styles.expenseDescriptionMobile,
              ]}
              numberOfLines={isMobile ? 2 : 1}
            >
              {expense.description ||
                "Unnamed Expense"}
            </Text>

            <View
              style={[
                styles.categoryBadge,
                {
                  backgroundColor:
                    `${color}18`,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryBadgeText,
                  { color },
                ]}
              >
                {expense.category ||
                  "Other"}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.occasionName,
              isMobile && styles.occasionNameMobile,
            ]}
            numberOfLines={isMobile ? 2 : undefined}
          >
            {expense.occasionName
              ? expense.occasionName
              : "General Expense"}
          </Text>

          <View
            style={[
              styles.metaRow,
              isMobile && styles.metaRowMobile,
            ]}
          >
            <Text
              style={
                styles.metaText
              }
            >
              {expense.date ||
                "-"}
            </Text>

            <View
              style={[
                styles.paymentBadge,
                {
                  backgroundColor:
                    `${color}18`,
                },
              ]}
            >
              <Text
                style={[
                  styles.paymentBadgeText,
                  { color },
                ]}
              >
                {expense.paymentMode ||
                  "Other"}
              </Text>
            </View>
          </View>

          {expense.proofImageUrl ? (
            <TouchableOpacity
              style={styles.proofBadge}
              activeOpacity={0.8}
              onPress={onViewProof}
            >
              <Text style={styles.proofBadgeIcon}>📎</Text>
              <Text style={styles.proofBadgeText}>
                View proof
              </Text>
            </TouchableOpacity>
          ) : null}

          {expense.notes ? (
            <Text
              style={[
                styles.notesText,
                isMobile && styles.notesTextMobile,
              ]}
              numberOfLines={isMobile ? 2 : 1}
            >
              {expense.notes}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.amountSection,
          isMobile && styles.amountSectionMobile,
        ]}
      >
        <Text
          style={[
            styles.amountValue,
            isMobile && styles.amountValueMobile,
          ]}
        >
          ₹{formatAmount(
            expense.amount
          )}
        </Text>

        <View
          style={[
            styles.cardActions,
            isMobile && styles.cardActionsMobile,
          ]}
        >
          <TouchableOpacity
            style={[
              styles.actionButton,
              isMobile && styles.actionButtonMobile,
            ]}
            onPress={
              onEdit
            }
          >
            <Text
              style={
                styles.actionButtonText
              }
            >
              Edit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.deleteAction,
              isMobile && styles.actionButtonMobile,
            ]}
            onPress={
              onDelete
            }
          >
            <Text
              style={
                styles.deleteActionText
              }
            >
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    width: "100%",
    maxWidth: 1600,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 60,
  },

  loading: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 10,
  },

  // ==================================================
  // HEADER
  // ==================================================

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 26,
  },

  headerLeft: {
    flex: 1,
  },

  eyebrow: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    letterSpacing: 1.1,
    color: COLORS.danger,
  },

  title: {
    fontFamily: FONTS.bold,
    fontSize: 36,
    lineHeight: 43,
    color: COLORS.text,
    marginTop: 4,
  },

  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.textSecondary,
    marginTop: 5,
  },

  primaryButton: {
    minHeight: 48,
    paddingHorizontal: 19,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 20,
  },

  primaryButtonIcon: {
    fontFamily: FONTS.bold,
    fontSize: 21,
    color: "#FFFFFF",
    marginRight: 8,
  },

  primaryButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: "#FFFFFF",
  },

  // ==================================================
  // SUMMARY
  // ==================================================

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 20,
  },

  summaryCard: {
    flex: 1,
    minWidth: 190,
    minHeight: 142,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 20,
  },

  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  summaryLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    letterSpacing: 0.7,
    color: COLORS.textMuted,
  },

  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryIconText: {
    fontFamily: FONTS.bold,
    fontSize: 17,
  },

  summaryValue: {
    fontFamily: FONTS.bold,
    fontSize: 30,
    lineHeight: 37,
    color: COLORS.text,
    marginTop: 16,
  },

  // ==================================================
  // SEARCH / FILTERS
  // ==================================================

  toolbar: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 13,
    marginBottom: 16,
  },

  searchBox: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    backgroundColor: COLORS.surface,
  },

  searchIcon: {
    fontFamily: FONTS.medium,
    fontSize: 20,
    color: COLORS.textMuted,
    marginRight: 9,
  },

  searchInput: {
    flex: 1,
    height: 46,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.text,
    outlineStyle: "none",
  },

  filterSection: {
    marginBottom: 16,
  },

  filterLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    letterSpacing: 0.75,
    color: COLORS.textMuted,
    marginBottom: 8,
  },

  horizontalFilter: {
    gap: 8,
    paddingRight: 15,
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  filterButton: {
    minHeight: 40,
    paddingHorizontal: 15,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E7EDF5",
  },

  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  filterText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  filterTextActive: {
    fontFamily: FONTS.bold,
    color: "#FFFFFF",
  },

  // ==================================================
  // RESULTS
  // ==================================================

  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 12,
  },

  resultCount: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  clearText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.primary,
  },

  list: {
    gap: 14,
  },

  // ==================================================
  // EXPENSE CARD
  // ==================================================

  expenseCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  expenseMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  expenseIcon: {
    width: 54,
    height: 54,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  expenseIconText: {
    fontFamily: FONTS.bold,
    fontSize: 19,
  },

  expenseInfo: {
    flex: 1,
    marginLeft: 14,
    minWidth: 0,
  },

  expenseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },

  expenseDescription: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    lineHeight: 21,
    color: COLORS.text,
    maxWidth: 500,
  },

  categoryBadge: {
    marginLeft: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  categoryBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
  },

  occasionName: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 19,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },

  metaText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
  },

  paymentBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },

  paymentBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
  },

  notesText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textMuted,
    marginTop: 6,
  },

  amountSection: {
    alignItems: "flex-end",
    marginLeft: 20,
    minWidth: 150,
  },

  amountValue: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    lineHeight: 28,
    color: COLORS.danger,
    marginBottom: 10,
  },

  cardActions: {
    flexDirection: "row",
    gap: 8,
  },

  actionButton: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  actionButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  deleteAction: {
    backgroundColor: COLORS.dangerLight,
  },

  deleteActionText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.danger,
  },

  // ==================================================
  // EMPTY
  // ==================================================

  emptyCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    paddingVertical: 70,
    alignItems: "center",
  },

  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 17,
    backgroundColor: COLORS.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIconText: {
    fontFamily: FONTS.bold,
    fontSize: 25,
    color: COLORS.danger,
  },

  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
    marginTop: 16,
  },

  emptyDescription: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textMuted,
    marginTop: 6,
    textAlign: "center",
    maxWidth: 450,
  },

  emptyButton: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
  },

  emptyButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: "#FFFFFF",
  },

  // ==================================================
  // MODAL
  // ==================================================

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.48)",
  },

  modalScroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  modal: {
    width: "100%",
    maxWidth: 720,
    backgroundColor: COLORS.surface,
    borderRadius: 19,
    padding: 28,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },

  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    lineHeight: 29,
    color: COLORS.text,
  },

  modalSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMuted,
    marginTop: 5,
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  closeText: {
    fontFamily: FONTS.regular,
    fontSize: 27,
    color: COLORS.textSecondary,
    lineHeight: 30,
  },

  fieldLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 7,
    marginTop: 14,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    outlineStyle: "none",
  },

  selectedBox: {
    minHeight: 62,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
  },

  occasionIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  occasionIconText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.primary,
  },

  selectedInfo: {
    flex: 1,
    marginLeft: 11,
    minWidth: 0,
  },

  selectedName: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.text,
  },

  selectedSubtext: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  changeText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.primary,
    paddingHorizontal: 8,
  },

  dropdown: {
    marginTop: 6,
    maxHeight: 250,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },

  dropdownItem: {
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },

  generalOption: {
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
  },

  generalIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  generalIconText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.success,
  },

  dropdownAvatar: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  dropdownAvatarText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.primary,
  },

  dropdownInfo: {
    flex: 1,
    marginLeft: 11,
    minWidth: 0,
  },

  dropdownName: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },

  dropdownMeta: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  categoryOption: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  categoryOptionActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },

  categoryOptionText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  categoryOptionTextActive: {
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },

  amountBox: {
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: COLORS.surface,
  },

  currencySymbol: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.danger,
    marginRight: 9,
  },

  amountInput: {
    flex: 1,
    height: 48,
    fontFamily: FONTS.bold,
    fontSize: 19,
    color: COLORS.text,
    outlineStyle: "none",
  },

  paymentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  paymentOption: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  paymentOptionActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },

  paymentOptionText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  paymentOptionTextActive: {
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },

  notesInput: {
    height: 90,
    paddingTop: 12,
    textAlignVertical: "top",
  },

  proofUploadBox: {
    minHeight: 120,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.primary,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },

  proofUploadIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  proofUploadIconText: {
    fontSize: 20,
  },

  proofUploadTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.primary,
  },

  proofUploadSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
    textAlign: "center",
  },

  proofPreviewBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },

  proofPreviewImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#F1F5F9",
  },

  proofTapHint: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    alignItems: "center",
  },

  proofTapHintText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: "#FFFFFF",
    backgroundColor: "rgba(15, 23, 42, 0.68)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  proofPreviewActions: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
  },

  proofViewButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  proofViewButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: "#FFFFFF",
  },

  proofSecondaryButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  proofSecondaryButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.primary,
  },

  proofRemoveButton: {
    minWidth: 90,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },

  proofRemoveButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.danger,
  },

  proofBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: COLORS.primaryLight,
    marginTop: 7,
  },

  proofBadgeIcon: {
    fontSize: 12,
    marginRight: 5,
  },

  proofBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.primary,
  },

  proofViewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.78)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },

  proofViewerCard: {
    width: "100%",
    maxWidth: 900,
    maxHeight: "94%",
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    overflow: "hidden",
  },

  proofViewerCardMobile: {
    width: "100%",
    maxWidth: "100%",
    borderRadius: 15,
    padding: 10,
  },

  proofViewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 10,
  },

  proofViewerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
  },

  proofViewerClose: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  proofViewerCloseText: {
    fontFamily: FONTS.regular,
    fontSize: 25,
    lineHeight: 28,
    color: COLORS.textSecondary,
  },

  proofViewerImageContainer: {
    width: "100%",
    height: 560,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  proofViewerImage: {
    width: "100%",
    height: "100%",
  },

  proofViewerDoneButton: {
    height: 44,
    marginTop: 10,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  proofViewerDoneText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: "#FFFFFF",
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 26,
  },

  cancelButton: {
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  saveButton: {
    height: 46,
    minWidth: 140,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: "#FFFFFF",
  },

  // ==================================================
  // MOBILE RESPONSIVE
  // ==================================================

  contentMobile: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 40,
    width: "100%",
    maxWidth: "100%",
  },

  headerMobile: {
    flexDirection: "column",
    alignItems: "stretch",
    marginBottom: 18,
  },

  headerLeftMobile: {
    width: "100%",
  },

  titleMobile: {
    fontSize: 30,
    lineHeight: 36,
  },

  subtitleMobile: {
    fontSize: 14,
    lineHeight: 20,
  },

  primaryButtonMobile: {
    width: "100%",
    minHeight: 46,
    marginLeft: 0,
    marginTop: 14,
    paddingHorizontal: 14,
  },

  summaryGridMobile: {
    flexDirection: "column",
    flexWrap: "nowrap",
    gap: 12,
    width: "100%",
    marginBottom: 16,
  },

  summaryCardMobile: {
    width: "100%",
    minWidth: 0,
    flex: 0,
  },

  expenseCardMobile: {
    width: "100%",
    flexDirection: "column",
    alignItems: "stretch",
    padding: 16,
    overflow: "hidden",
  },

  expenseMainMobile: {
    width: "100%",
    flex: 0,
  },

  expenseInfoMobile: {
    flex: 1,
    minWidth: 0,
  },

  expenseDescriptionMobile: {
    flexShrink: 1,
    maxWidth: "100%",
  },

  occasionNameMobile: {
    flexShrink: 1,
  },

  metaRowMobile: {
    width: "100%",
  },

  notesTextMobile: {
    maxWidth: "100%",
  },

  amountSectionMobile: {
    width: "100%",
    minWidth: 0,
    marginLeft: 0,
    marginTop: 14,
    alignItems: "stretch",
  },

  amountValueMobile: {
    fontSize: 21,
    lineHeight: 27,
    marginBottom: 10,
    alignSelf: "flex-start",
  },

  cardActionsMobile: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
  },

  actionButtonMobile: {
    flex: 1,
    minWidth: 0,
    minHeight: 42,
    paddingHorizontal: 10,
  },

  modalScrollMobile: {
    padding: 12,
    justifyContent: "flex-start",
  },

  modalMobile: {
    maxWidth: "100%",
    borderRadius: 16,
    padding: 18,
  },

  modalActionsMobile: {
    flexDirection: "column-reverse",
    gap: 10,
  },

  mobileFullButton: {
    width: "100%",
    minWidth: 0,
  },

  proofViewerImageContainerMobile: {
    height: 420,
  },
});
