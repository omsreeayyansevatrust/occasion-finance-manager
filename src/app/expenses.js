import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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

  const [form, setForm] = useState({
    occasionId: "",
    occasionName: "",
    date: getToday(),
    category: "Other",
    description: "",
    amount: "",
    paymentMode: "UPI",
    notes: "",
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
    });

    setModalVisible(true);
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
        contentContainerStyle={
          styles.content
        }
      >
        {/* HEADER */}

        <View
          style={styles.header}
        >
          <View
            style={
              styles.headerLeft
            }
          >
            <Text
              style={
                styles.eyebrow
              }
            >
              EXPENSE MANAGEMENT
            </Text>

            <Text
              style={styles.title}
            >
              Expenses
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Track occasion and
              general expenses
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.primaryButton
            }
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
          style={
            styles.summaryGrid
          }
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
          />

          <SummaryCard
            label="OCCASION EXPENSES"
            value={`₹${formatAmount(
              occasionExpenseTotal
            )}`}
            icon="O"
            color="#8B5CF6"
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
            contentContainerStyle={
              styles.modalScroll
            }
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={styles.modal}
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

              {/* ACTIONS */}

              <View
                style={
                  styles.modalActions
                }
              >
                <TouchableOpacity
                  style={
                    styles.cancelButton
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
                      styles.cancelButtonText
                    }
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.saveButton
                  }
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
}) {
  return (
    <View
      style={
        styles.summaryCard
      }
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
      style={
        styles.expenseCard
      }
    >
      <View
        style={
          styles.expenseMain
        }
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
          style={
            styles.expenseInfo
          }
        >
          <View
            style={
              styles.expenseTitleRow
            }
          >
            <Text
              style={
                styles.expenseDescription
              }
              numberOfLines={
                1
              }
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
            style={
              styles.occasionName
            }
          >
            {expense.occasionName
              ? expense.occasionName
              : "General Expense"}
          </Text>

          <View
            style={
              styles.metaRow
            }
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

          {expense.notes ? (
            <Text
              style={
                styles.notesText
              }
              numberOfLines={1}
            >
              {expense.notes}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={
          styles.amountSection
        }
      >
        <Text
          style={
            styles.amountValue
          }
        >
          ₹{formatAmount(
            expense.amount
          )}
        </Text>

        <View
          style={
            styles.cardActions
          }
        >
          <TouchableOpacity
            style={
              styles.actionButton
            }
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
    backgroundColor:
      COLORS.background,
  },

  content: {
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 50,
  },

  loading: {
    flex: 1,
    backgroundColor:
      COLORS.background,
    justifyContent:
      "center",
    alignItems: "center",
  },

  loadingText: {
    fontFamily:
      FONTS.regular,
    fontSize: 13,
    color:
      COLORS.textSecondary,
    marginTop: 10,
  },

  // HEADER

  header: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "flex-end",
    marginBottom: 24,
  },

  headerLeft: {
    flex: 1,
  },

  eyebrow: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 10,
    letterSpacing: 1.1,
    color:
      COLORS.danger,
  },

  title: {
    fontFamily:
      FONTS.extraBold,
    fontSize: 30,
    color:
      COLORS.text,
    marginTop: 4,
  },

  subtitle: {
    fontFamily:
      FONTS.regular,
    fontSize: 13,
    color:
      COLORS.textSecondary,
    marginTop: 4,
  },

  primaryButton: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor:
      COLORS.primary,
    flexDirection:
      "row",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  primaryButtonIcon: {
    fontFamily:
      FONTS.bold,
    fontSize: 18,
    color: "#FFFFFF",
    marginRight: 7,
  },

  primaryButtonText: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 12,
    color: "#FFFFFF",
  },

  // SUMMARY

  summaryGrid: {
    flexDirection:
      "row",
    flexWrap:
      "wrap",
    gap: 14,
    marginBottom: 18,
  },

  summaryCard: {
    flex: 1,
    minWidth: 190,
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 15,
    padding: 17,
  },

  summaryTop: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "center",
  },

  summaryLabel: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 9,
    letterSpacing: 0.7,
    color:
      COLORS.textMuted,
  },

  summaryIcon: {
    width: 31,
    height: 31,
    borderRadius: 9,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  summaryIconText: {
    fontFamily:
      FONTS.bold,
    fontSize: 13,
  },

  summaryValue: {
    fontFamily:
      FONTS.extraBold,
    fontSize: 21,
    color:
      COLORS.text,
    marginTop: 12,
  },

  // SEARCH

  toolbar: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 15,
    padding: 12,
    marginBottom: 14,
  },

  searchBox: {
    height: 40,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 9,
    flexDirection:
      "row",
    alignItems:
      "center",
    paddingHorizontal: 10,
  },

  searchIcon: {
    fontSize: 18,
    color:
      COLORS.textMuted,
    marginRight: 7,
  },

  searchInput: {
    flex: 1,
    height: 38,
    fontFamily:
      FONTS.regular,
    fontSize: 12,
    color:
      COLORS.text,
    outlineStyle:
      "none",
  },

  // FILTERS

  filterSection: {
    marginBottom: 12,
  },

  filterLabel: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 9,
    letterSpacing: 0.7,
    color:
      COLORS.textMuted,
    marginBottom: 7,
  },

  horizontalFilter: {
    gap: 7,
    paddingRight: 15,
  },

  filterRow: {
    flexDirection:
      "row",
    flexWrap:
      "wrap",
    gap: 7,
  },

  filterButton: {
    paddingHorizontal: 13,
    height: 34,
    borderRadius: 8,
    alignItems:
      "center",
    justifyContent:
      "center",
    backgroundColor:
      "#F1F5F9",
  },

  filterButtonActive: {
    backgroundColor:
      COLORS.primary,
  },

  filterText: {
    fontFamily:
      FONTS.medium,
    fontSize: 10,
    color:
      COLORS.textSecondary,
  },

  filterTextActive: {
    fontFamily:
      FONTS.semiBold,
    color: "#FFFFFF",
  },

  // RESULTS

  resultHeader: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    marginTop: 5,
    marginBottom: 10,
  },

  resultCount: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 11,
    color:
      COLORS.textSecondary,
  },

  clearText: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 10,
    color:
      COLORS.primary,
  },

  list: {
    gap: 12,
  },

  // EXPENSE CARD

  expenseCard: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 15,
    padding: 17,
    flexDirection:
      "row",
    alignItems:
      "center",
  },

  expenseMain: {
    flex: 1,
    flexDirection:
      "row",
    alignItems:
      "center",
    minWidth: 0,
  },

  expenseIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  expenseIconText: {
    fontFamily:
      FONTS.bold,
    fontSize: 17,
  },

  expenseInfo: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },

  expenseTitleRow: {
    flexDirection:
      "row",
    alignItems:
      "center",
  },

  expenseDescription: {
    fontFamily:
      FONTS.bold,
    fontSize: 14,
    color:
      COLORS.text,
    maxWidth: 300,
  },

  categoryBadge: {
    marginLeft: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },

  categoryBadgeText: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 8,
  },

  occasionName: {
    fontFamily:
      FONTS.medium,
    fontSize: 11,
    color:
      COLORS.textSecondary,
    marginTop: 3,
  },

  metaRow: {
    flexDirection:
      "row",
    alignItems:
      "center",
    flexWrap:
      "wrap",
    gap: 9,
    marginTop: 6,
  },

  metaText: {
    fontFamily:
      FONTS.regular,
    fontSize: 9,
    color:
      COLORS.textMuted,
  },

  paymentBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },

  paymentBadgeText: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 8,
  },

  notesText: {
    fontFamily:
      FONTS.regular,
    fontSize: 9,
    color:
      COLORS.textMuted,
    marginTop: 5,
  },

  amountSection: {
    alignItems:
      "flex-end",
    marginLeft: 15,
  },

  amountValue: {
    fontFamily:
      FONTS.extraBold,
    fontSize: 18,
    color:
      COLORS.danger,
    marginBottom: 8,
  },

  cardActions: {
    flexDirection:
      "row",
    gap: 6,
  },

  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor:
      "#F1F5F9",
  },

  actionButtonText: {
    fontFamily:
      FONTS.medium,
    fontSize: 10,
    color:
      COLORS.textSecondary,
  },

  deleteAction: {
    backgroundColor:
      "#FEF2F2",
  },

  deleteActionText: {
    fontFamily:
      FONTS.medium,
    fontSize: 10,
    color:
      COLORS.danger,
  },

  // EMPTY

  emptyCard: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 16,
    paddingVertical: 60,
    alignItems:
      "center",
  },

  emptyIcon: {
    width: 55,
    height: 55,
    borderRadius: 16,
    backgroundColor:
      "#FEF2F2",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  emptyIconText: {
    fontFamily:
      FONTS.bold,
    fontSize: 22,
    color:
      COLORS.danger,
  },

  emptyTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 16,
    color:
      COLORS.text,
    marginTop: 14,
  },

  emptyDescription: {
    fontFamily:
      FONTS.regular,
    fontSize: 11,
    color:
      COLORS.textMuted,
    marginTop: 5,
    textAlign:
      "center",
    maxWidth: 400,
  },

  emptyButton: {
    marginTop: 16,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor:
      COLORS.primary,
  },

  emptyButtonText: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 11,
    color: "#FFFFFF",
  },

  // MODAL

  modalOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(15, 23, 42, 0.45)",
  },

  modalScroll: {
    flexGrow: 1,
    alignItems:
      "center",
    justifyContent:
      "center",
    padding: 20,
  },

  modal: {
    width: "100%",
    maxWidth: 680,
    backgroundColor:
      COLORS.surface,
    borderRadius: 18,
    padding: 24,
  },

  modalHeader: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "flex-start",
    marginBottom: 18,
  },

  modalTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 20,
    color:
      COLORS.text,
  },

  modalSubtitle: {
    fontFamily:
      FONTS.regular,
    fontSize: 11,
    color:
      COLORS.textMuted,
    marginTop: 4,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor:
      "#F1F5F9",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  closeText: {
    fontSize: 20,
    color:
      COLORS.textSecondary,
    lineHeight: 22,
  },

  // FORM

  fieldLabel: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 10,
    color:
      COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 11,
  },

  input: {
    height: 42,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    fontFamily:
      FONTS.regular,
    fontSize: 12,
    color:
      COLORS.text,
    backgroundColor:
      "#FFFFFF",
    outlineStyle:
      "none",
  },

  // OCCASION SELECTED

  selectedBox: {
    minHeight: 58,
    borderWidth: 1,
    borderColor:
      COLORS.primary,
    borderRadius: 10,
    padding: 9,
    flexDirection:
      "row",
    alignItems:
      "center",
    backgroundColor:
      "#F8FAFF",
  },

  occasionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor:
      "#ECFDF5",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  occasionIconText: {
    fontFamily:
      FONTS.bold,
    fontSize: 14,
    color:
      COLORS.success,
  },

  selectedInfo: {
    flex: 1,
    marginLeft: 10,
  },

  selectedName: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 12,
    color:
      COLORS.text,
  },

  selectedSubtext: {
    fontFamily:
      FONTS.regular,
    fontSize: 9,
    color:
      COLORS.textMuted,
    marginTop: 2,
  },

  changeText: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 10,
    color:
      COLORS.primary,
    paddingHorizontal: 5,
  },

  // DROPDOWN

  dropdown: {
    maxHeight: 260,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 10,
    backgroundColor:
      COLORS.surface,
    marginTop: 5,
    overflow: "hidden",
  },

  dropdownItem: {
    minHeight: 52,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection:
      "row",
    alignItems:
      "center",
    borderBottomWidth: 1,
    borderBottomColor:
      "#F1F5F9",
  },

  generalOption: {
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection:
      "row",
    alignItems:
      "center",
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.border,
    backgroundColor:
      "#F8FAFC",
  },

  generalIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor:
      "#F1F5F9",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  generalIconText: {
    fontFamily:
      FONTS.bold,
    fontSize: 12,
    color:
      COLORS.textSecondary,
  },

  dropdownAvatar: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor:
      "#EEF2FF",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  dropdownAvatarText: {
    fontFamily:
      FONTS.bold,
    fontSize: 12,
    color:
      COLORS.primary,
  },

  dropdownInfo: {
    flex: 1,
    marginLeft: 9,
  },

  dropdownName: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 11,
    color:
      COLORS.text,
  },

  dropdownMeta: {
    fontFamily:
      FONTS.regular,
    fontSize: 9,
    color:
      COLORS.textMuted,
    marginTop: 2,
  },

  // CATEGORY

  categoryGrid: {
    flexDirection:
      "row",
    flexWrap:
      "wrap",
    gap: 7,
  },

  categoryOption: {
    paddingHorizontal: 11,
    height: 35,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 8,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  categoryOptionActive: {
    backgroundColor:
      "#EEF2FF",
    borderColor:
      COLORS.primary,
  },

  categoryOptionText: {
    fontFamily:
      FONTS.medium,
    fontSize: 10,
    color:
      COLORS.textSecondary,
  },

  categoryOptionTextActive: {
    fontFamily:
      FONTS.semiBold,
    color:
      COLORS.primary,
  },

  // AMOUNT

  amountBox: {
    height: 48,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 9,
    flexDirection:
      "row",
    alignItems:
      "center",
    backgroundColor:
      "#FFFFFF",
  },

  currencySymbol: {
    fontFamily:
      FONTS.bold,
    fontSize: 18,
    color:
      COLORS.danger,
    paddingLeft: 13,
    paddingRight: 7,
  },

  amountInput: {
    flex: 1,
    height: 46,
    fontFamily:
      FONTS.bold,
    fontSize: 18,
    color:
      COLORS.text,
    outlineStyle:
      "none",
  },

  // PAYMENT

  paymentGrid: {
    flexDirection:
      "row",
    flexWrap:
      "wrap",
    gap: 7,
  },

  paymentOption: {
    paddingHorizontal: 13,
    height: 38,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 9,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  paymentOptionActive: {
    backgroundColor:
      "#EEF2FF",
    borderColor:
      COLORS.primary,
  },

  paymentOptionText: {
    fontFamily:
      FONTS.medium,
    fontSize: 10,
    color:
      COLORS.textSecondary,
  },

  paymentOptionTextActive: {
    fontFamily:
      FONTS.semiBold,
    color:
      COLORS.primary,
  },

  notesInput: {
    height: 70,
    paddingTop: 10,
    textAlignVertical:
      "top",
  },

  // ACTIONS

  modalActions: {
    flexDirection:
      "row",
    justifyContent:
      "flex-end",
    gap: 9,
    marginTop: 22,
  },

  cancelButton: {
    height: 40,
    paddingHorizontal: 17,
    borderRadius: 9,
    backgroundColor:
      "#F1F5F9",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  cancelButtonText: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 11,
    color:
      COLORS.textSecondary,
  },

  saveButton: {
    height: 40,
    minWidth: 120,
    paddingHorizontal: 17,
    borderRadius: 9,
    backgroundColor:
      COLORS.primary,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  saveButtonText: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 11,
    color: "#FFFFFF",
  },
});