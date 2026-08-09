import { router } from "expo-router";
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
  useWindowDimensions,
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

export default function OccasionsScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [occasions, setOccasions] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    description: "",
    status: "Active",
  });

  // ==================================================
  // FIREBASE
  // ==================================================

  useEffect(() => {
    const unsubscribeOccasions = onSnapshot(
      collection(db, "occasions"),
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setOccasions(data);
        setLoading(false);
      },
      (error) => {
        console.log("Occasions error:", error);
        setLoading(false);
      }
    );

    const unsubscribeContributions = onSnapshot(
      collection(db, "contributions"),
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setContributions(data);
      },
      (error) => {
        console.log("Contributions error:", error);
      }
    );

    const unsubscribeExpenses = onSnapshot(
      collection(db, "expenses"),
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setExpenses(data);
      },
      (error) => {
        console.log("Expenses error:", error);
      }
    );

    return () => {
      unsubscribeOccasions();
      unsubscribeContributions();
      unsubscribeExpenses();
    };
  }, []);

  // ==================================================
  // HELPERS
  // ==================================================

  const formatCurrency = (amount) => {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  const getIncome = (occasionId) => {
    return contributions
      .filter((item) => item.occasionId === occasionId)
      .reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );
  };

  const getExpenses = (occasionId) => {
    return expenses
      .filter((item) => item.occasionId === occasionId)
      .reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );
  };

  const getContributorCount = (occasionId) => {
    const ids = new Set();

    contributions
      .filter((item) => item.occasionId === occasionId)
      .forEach((item) => {
        ids.add(
          item.personId ||
            item.personName ||
            item.id
        );
      });

    return ids.size;
  };

  // ==================================================
  // OCCASION DATA
  // ==================================================

  const occasionData = useMemo(() => {
    return occasions.map((occasion) => {
      const income = getIncome(occasion.id);
      const expense = getExpenses(occasion.id);

      return {
        ...occasion,
        income,
        expense,
        balance: income - expense,
        contributorCount: getContributorCount(
          occasion.id
        ),
      };
    });
  }, [occasions, contributions, expenses]);

  // ==================================================
  // FILTER
  // ==================================================

  const filteredOccasions = useMemo(() => {
    return occasionData
      .filter((item) => {
        const searchText = search.trim().toLowerCase();

        if (!searchText) {
          return true;
        }

        return (
          String(item.name || "")
            .toLowerCase()
            .includes(searchText) ||
          String(item.description || "")
            .toLowerCase()
            .includes(searchText)
        );
      })
      .filter((item) => {
        if (statusFilter === "All") {
          return true;
        }

        return (
          String(item.status || "Active").toLowerCase() ===
          statusFilter.toLowerCase()
        );
      })
      .sort((a, b) => {
        const dateA =
          new Date(a.startDate || 0).getTime() || 0;

        const dateB =
          new Date(b.startDate || 0).getTime() || 0;

        return dateB - dateA;
      });
  }, [occasionData, search, statusFilter]);

  // ==================================================
  // FORM
  // ==================================================

  const resetForm = () => {
    setForm({
      name: "",
      startDate: "",
      endDate: "",
      description: "",
      status: "Active",
    });

    setEditingId(null);
  };

  const openNew = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (occasion) => {
    setEditingId(occasion.id);

    setForm({
      name: occasion.name || "",
      startDate: occasion.startDate || "",
      endDate: occasion.endDate || "",
      description: occasion.description || "",
      status: occasion.status || "Active",
    });

    setModalVisible(true);
  };

  // ==================================================
  // SAVE
  // ==================================================

  const saveOccasion = async () => {
    if (!form.name.trim()) {
      Alert.alert(
        "Required",
        "Please enter the occasion name."
      );
      return;
    }

    if (
      form.startDate &&
      !/^\d{4}-\d{2}-\d{2}$/.test(form.startDate)
    ) {
      Alert.alert(
        "Invalid Date",
        "Start date must be in YYYY-MM-DD format."
      );
      return;
    }

    if (
      form.endDate &&
      !/^\d{4}-\d{2}-\d{2}$/.test(form.endDate)
    ) {
      Alert.alert(
        "Invalid Date",
        "End date must be in YYYY-MM-DD format."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        startDate: form.startDate.trim(),
        endDate: form.endDate.trim(),
        description: form.description.trim(),
        status: form.status,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(
          doc(db, "occasions", editingId),
          payload
        );
      } else {
        await addDoc(collection(db, "occasions"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      setModalVisible(false);
      resetForm();
    } catch (error) {
      console.log("Save occasion error:", error);

      Alert.alert(
        "Error",
        "Unable to save the occasion. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==================================================
  // DELETE CONFIRMATION
  // ==================================================

  const confirmDelete = (occasion) => {
    // -----------------------------------------------
    // WEB
    // -----------------------------------------------

    if (
      typeof window !== "undefined" &&
      typeof window.confirm === "function"
    ) {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${occasion.name}"?`
      );

      if (confirmed) {
        deleteOccasion(occasion.id);
      }

      return;
    }

    // -----------------------------------------------
    // ANDROID / IOS
    // -----------------------------------------------

    Alert.alert(
      "Delete Occasion",
      `Are you sure you want to delete "${occasion.name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteOccasion(occasion.id),
        },
      ]
    );
  };

  // ==================================================
  // DELETE
  // ==================================================

  const deleteOccasion = async (id) => {
    try {
      console.log("Deleting occasion:", id);

      await deleteDoc(
        doc(db, "occasions", id)
      );

      console.log(
        "Occasion deleted successfully:",
        id
      );
    } catch (error) {
      console.log(
        "Delete occasion error:",
        error
      );

      const message =
        error?.message ||
        "Unable to delete the occasion.";

      if (
        typeof window !== "undefined" &&
        typeof window.alert === "function"
      ) {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
    }
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text style={styles.loadingText}>
          Loading occasions...
        </Text>
      </View>
    );
  }

  // ==================================================
  // SCREEN
  // ==================================================

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}
      >
        {/* HEADER */}

        <View style={[styles.header, isMobile && styles.headerMobile]}>
          <View>
            <Text style={styles.eyebrow}>
              FINANCIAL MANAGEMENT
            </Text>

            <Text style={styles.title}>
              Occasions
            </Text>

            <Text style={styles.subtitle}>
              Create and manage occasions,
              events and their finances
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isMobile && styles.primaryButtonMobile]}
            onPress={openNew}
          >
            <Text style={styles.primaryButtonIcon}>
              +
            </Text>

            <Text style={styles.primaryButtonText}>
              New Occasion
            </Text>
          </TouchableOpacity>
        </View>

        {/* SUMMARY */}

        <View style={[styles.summaryGrid, isMobile && styles.summaryGridMobile]}>
          <SummaryCard
            mobile={isMobile}
            label="TOTAL OCCASIONS"
            value={occasionData.length}
            icon="#"
            color={COLORS.primary}
          />

          <SummaryCard
            mobile={isMobile}
            label="ACTIVE"
            value={
              occasionData.filter(
                (item) =>
                  String(
                    item.status || "Active"
                  ).toLowerCase() === "active"
              ).length
            }
            icon="✓"
            color={COLORS.success}
          />

          <SummaryCard
            mobile={isMobile}
            label="TOTAL INCOME"
            value={formatCurrency(
              occasionData.reduce(
                (sum, item) =>
                  sum + item.income,
                0
              )
            )}
            icon="+"
            color={COLORS.success}
          />

          <SummaryCard
            mobile={isMobile}
            label="TOTAL EXPENSES"
            value={formatCurrency(
              occasionData.reduce(
                (sum, item) =>
                  sum + item.expense,
                0
              )
            )}
            icon="−"
            color={COLORS.danger}
          />
        </View>

        {/* SEARCH / FILTER */}

        <View style={[styles.toolbar, isMobile && styles.toolbarMobile]}>
          <View style={[styles.searchBox, isMobile && styles.searchBoxMobile]}>
            <Text style={styles.searchIcon}>
              ⌕
            </Text>

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search occasions..."
              placeholderTextColor={COLORS.textMuted}
              style={styles.searchInput}
            />
          </View>

          <View style={[styles.filters, isMobile && styles.filtersMobile]}>
            {["All", "Active", "Closed"].map(
              (status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterButton,
                    statusFilter === status &&
                      styles.filterButtonActive,
                  ]}
                  onPress={() =>
                    setStatusFilter(status)
                  }
                >
                  <Text
                    style={[
                      styles.filterText,
                      statusFilter === status &&
                        styles.filterTextActive,
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>

        {/* LIST */}

        {filteredOccasions.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>
                #
              </Text>
            </View>

            <Text style={styles.emptyTitle}>
              No occasions found
            </Text>

            <Text style={styles.emptyDescription}>
              {search
                ? "Try changing your search."
                : "Create your first occasion to start tracking finances."}
            </Text>

            {!search && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={openNew}
              >
                <Text style={styles.emptyButtonText}>
                  Create Occasion
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.list}>
            {filteredOccasions.map(
              (occasion) => (
                <OccasionCard
                  key={occasion.id}
                  occasion={occasion}
                  formatCurrency={formatCurrency}
                  isMobile={isMobile}
                  onOpen={() =>
                    router.push({
                      pathname:
                        "/occasion-details",
                      params: {
                        id: occasion.id,
                      },
                    })
                  }
                  onEdit={() =>
                    openEdit(occasion)
                  }
                  onDelete={() =>
                    confirmDelete(occasion)
                  }
                />
              )
            )}
          </View>
        )}
      </ScrollView>

      {/* NEW / EDIT MODAL */}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setModalVisible(false)
        }
      >
        <View style={[styles.modalOverlay, isMobile && styles.modalOverlayMobile]}>
          <View style={[styles.modal, isMobile && styles.modalMobile]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingId
                    ? "Edit Occasion"
                    : "New Occasion"}
                </Text>

                <Text style={styles.modalSubtitle}>
                  Enter the basic occasion details
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() =>
                  setModalVisible(false)
                }
              >
                <Text style={styles.closeText}>
                  ×
                </Text>
              </TouchableOpacity>
            </View>

            {/* NAME */}

            <Text style={styles.fieldLabel}>
              Occasion Name *
            </Text>

            <TextInput
              value={form.name}
              onChangeText={(value) =>
                setForm({
                  ...form,
                  name: value,
                })
              }
              placeholder="e.g. Vinayaka 2026"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
            />

            {/* DATES */}

            <View style={[styles.formRow, isMobile && styles.formRowMobile]}>
              <View style={styles.formHalf}>
                <Text style={styles.fieldLabel}>
                  Start Date
                </Text>

                <TextInput
                  value={form.startDate}
                  onChangeText={(value) =>
                    setForm({
                      ...form,
                      startDate: value,
                    })
                  }
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={
                    COLORS.textMuted
                  }
                  style={styles.input}
                />
              </View>

              <View style={styles.formHalf}>
                <Text style={styles.fieldLabel}>
                  End Date
                </Text>

                <TextInput
                  value={form.endDate}
                  onChangeText={(value) =>
                    setForm({
                      ...form,
                      endDate: value,
                    })
                  }
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={
                    COLORS.textMuted
                  }
                  style={styles.input}
                />
              </View>
            </View>

            {/* STATUS */}

            <Text style={styles.fieldLabel}>
              Status
            </Text>

            <View style={styles.statusSelector}>
              {["Active", "Closed"].map(
                (status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      form.status === status &&
                        styles.statusOptionActive,
                    ]}
                    onPress={() =>
                      setForm({
                        ...form,
                        status,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        form.status === status &&
                          styles.statusOptionTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            {/* DESCRIPTION */}

            <Text style={styles.fieldLabel}>
              Description
            </Text>

            <TextInput
              value={form.description}
              onChangeText={(value) =>
                setForm({
                  ...form,
                  description: value,
                })
              }
              placeholder="Optional description..."
              placeholderTextColor={
                COLORS.textMuted
              }
              multiline
              numberOfLines={3}
              style={[
                styles.input,
                styles.descriptionInput,
              ]}
            />

            {/* ACTIONS */}

            <View style={[styles.modalActions, isMobile && styles.modalActionsMobile]}>
              <TouchableOpacity
                style={[styles.cancelButton, isMobile && styles.cancelButtonMobile]}
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Text
                  style={styles.cancelButtonText}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, isMobile && styles.saveButtonMobile]}
                onPress={saveOccasion}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <Text
                    style={styles.saveButtonText}
                  >
                    {editingId
                      ? "Update Occasion"
                      : "Save Occasion"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
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
  mobile,
  label,
  value,
  icon,
  color,
}) {
  return (
    <View style={[styles.summaryCard, mobile && styles.summaryCardMobile]}>
      <View style={styles.summaryTop}>
        <Text style={styles.summaryLabel}>
          {label}
        </Text>

        <View
          style={[
            styles.summaryIcon,
            {
              backgroundColor: `${color}18`,
            },
          ]}
        >
          <Text
            style={[
              styles.summaryIconText,
              {
                color,
              },
            ]}
          >
            {icon}
          </Text>
        </View>
      </View>

      <Text style={styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

// ==================================================
// OCCASION CARD
// ==================================================

function OccasionCard({
  occasion,
  formatCurrency,
  isMobile,
  onOpen,
  onEdit,
  onDelete,
}) {
  const isActive =
    String(
      occasion.status || "Active"
    ).toLowerCase() === "active";

  return (
    <View style={[styles.occasionCard, isMobile && styles.occasionCardMobile]}>
      <View style={[styles.cardTop, isMobile && styles.cardTopMobile]}>
        <TouchableOpacity
          style={[styles.cardIdentity, isMobile && styles.cardIdentityMobile]}
          onPress={onOpen}
        >
          <View style={styles.occasionAvatar}>
            <Text style={styles.occasionAvatarText}>
              {(occasion.name || "O")
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <View style={styles.identityText}>
            <View style={styles.nameLine}>
              <Text
                style={styles.occasionName}
                numberOfLines={1}
              >
                {occasion.name ||
                  "Unnamed Occasion"}
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  isActive
                    ? styles.activeBadge
                    : styles.closedBadge,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    isActive
                      ? styles.activeDot
                      : styles.closedDot,
                  ]}
                />

                <Text
                  style={[
                    styles.statusBadgeText,
                    isActive
                      ? styles.activeText
                      : styles.closedText,
                  ]}
                >
                  {isActive
                    ? "ACTIVE"
                    : "CLOSED"}
                </Text>
              </View>
            </View>

            <Text style={styles.occasionDate}>
              {occasion.startDate ||
                "No start date"}
              {occasion.endDate
                ? `  →  ${occasion.endDate}`
                : ""}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={[styles.cardActions, isMobile && styles.cardActionsMobile]}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onEdit}
          >
            <Text style={styles.actionButtonText}>
              Edit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.deleteAction,
            ]}
            onPress={onDelete}
          >
            <Text style={styles.deleteActionText}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {occasion.description ? (
        <Text
          style={styles.description}
          numberOfLines={2}
        >
          {occasion.description}
        </Text>
      ) : null}

      <View style={[styles.financialGrid, isMobile && styles.financialGridMobile]}>
        <FinancialItem
          mobile={isMobile}
          label="Income"
          value={formatCurrency(occasion.income)}
          valueColor={COLORS.success}
        />

        <FinancialItem
          mobile={isMobile}
          label="Expenses"
          value={formatCurrency(occasion.expense)}
          valueColor={COLORS.danger}
        />

        <FinancialItem
          mobile={isMobile}
          label="Balance"
          value={formatCurrency(occasion.balance)}
          valueColor={
            occasion.balance >= 0
              ? COLORS.success
              : COLORS.danger
          }
        />

        <FinancialItem
          mobile={isMobile}
          label="Contributors"
          value={occasion.contributorCount}
          valueColor={COLORS.primary}
        />

        <TouchableOpacity
          style={[styles.detailsButton, isMobile && styles.detailsButtonMobile]}
          onPress={onOpen}
        >
          <Text style={styles.detailsButtonText}>
            View Details
          </Text>

          <Text style={styles.detailsArrow}>
            →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ==================================================
// FINANCIAL ITEM
// ==================================================

function FinancialItem({
  mobile,
  label,
  value,
  valueColor,
}) {
  return (
    <View style={[styles.financialItem, mobile && styles.financialItemMobile]}>
      <Text style={styles.financialLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.financialValue,
          {
            color: valueColor,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  // ==================================================
  // PAGE
  // ==================================================

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

  contentMobile: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // ==================================================
  // LOADING
  // ==================================================

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
  // HEADER - DASHBOARD STANDARD
  // ==================================================

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 26,
  },

  headerMobile: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: 20,
  },

  eyebrow: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    letterSpacing: 1.1,
    color: COLORS.primary,
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
    lineHeight: 23,
    color: "#FFFFFF",
    marginRight: 8,
  },

  primaryButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: "#FFFFFF",
  },

  primaryButtonMobile: {
    minHeight: 44,
    paddingHorizontal: 15,
    marginLeft: 0,
    marginTop: 14,
    alignSelf: "flex-start",
  },

  // ==================================================
  // SUMMARY CARDS
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

  summaryGridMobile: {
    gap: 10,
  },

  summaryCardMobile: {
    flexBasis: "47%",
    minWidth: 0,
    minHeight: 118,
    padding: 14,
  },

  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  summaryLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    letterSpacing: 0.75,
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
  // SEARCH / FILTER TOOLBAR
  // ==================================================

  toolbar: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 13,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  toolbarMobile: {
    flexDirection: "column",
    alignItems: "stretch",
  },

  searchBox: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    maxWidth: 620,
    backgroundColor: COLORS.surface,
  },

  searchBoxMobile: {
    width: "100%",
    maxWidth: "100%",
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

  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginLeft: 12,
    gap: 8,
  },

  filtersMobile: {
    marginLeft: 0,
    marginTop: 10,
  },

  filterButton: {
    paddingHorizontal: 15,
    minHeight: 40,
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
  // OCCASION LIST
  // ==================================================

  list: {
    gap: 14,
  },

  occasionCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 20,
  },

  occasionCardMobile: {
    padding: 15,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cardTopMobile: {
    flexDirection: "column",
    alignItems: "stretch",
  },

  cardIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  cardIdentityMobile: {
    width: "100%",
    flex: 0,
  },

  occasionAvatar: {
    width: 54,
    height: 54,
    borderRadius: 15,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  occasionAvatarText: {
    fontFamily: FONTS.bold,
    fontSize: 19,
    color: COLORS.primary,
  },

  identityText: {
    flex: 1,
    marginLeft: 14,
    minWidth: 0,
  },

  nameLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },

  occasionName: {
    fontFamily: FONTS.medium,
    fontSize: 17,
    lineHeight: 22,
    color: COLORS.text,
    maxWidth: 500,
  },

  statusBadge: {
    marginLeft: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  activeBadge: {
    backgroundColor: COLORS.successLight,
  },

  closedBadge: {
    backgroundColor: "#F1F5F9",
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 7,
    marginRight: 6,
  },

  activeDot: {
    backgroundColor: COLORS.success,
  },

  closedDot: {
    backgroundColor: COLORS.textMuted,
  },

  statusBadgeText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    letterSpacing: 0.4,
  },

  activeText: {
    color: COLORS.success,
  },

  closedText: {
    color: COLORS.textMuted,
  },

  occasionDate: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMuted,
    marginTop: 6,
  },

  cardActions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 18,
  },

  cardActionsMobile: {
    width: "100%",
    marginLeft: 0,
    marginTop: 12,
    justifyContent: "flex-end",
  },

  actionButton: {
    minHeight: 38,
    paddingHorizontal: 13,
    paddingVertical: 8,
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

  description: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    marginTop: 15,
    marginBottom: 15,
  },

  // ==================================================
  // FINANCIAL SUMMARY INSIDE OCCASION CARD
  // ==================================================

  financialGrid: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },

  financialGridMobile: {
    alignItems: "flex-start",
  },

  financialItem: {
    minWidth: 140,
    paddingRight: 24,
    marginBottom: 4,
  },

  financialItemMobile: {
    width: "50%",
    minWidth: 0,
    paddingRight: 8,
    marginBottom: 12,
  },

  financialLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 5,
  },

  financialValue: {
    fontFamily: FONTS.bold,
    fontSize: 16,
  },

  detailsButton: {
    marginLeft: "auto",
    paddingHorizontal: 14,
    minHeight: 40,
    borderRadius: 9,
    backgroundColor: COLORS.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  detailsButtonMobile: {
    width: "100%",
    marginLeft: 0,
    marginTop: 4,
  },

  detailsButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.primary,
  },

  detailsArrow: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.primary,
    marginLeft: 6,
  },

  // ==================================================
  // EMPTY STATE
  // ==================================================

  emptyCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    paddingVertical: 70,
    paddingHorizontal: 30,
    alignItems: "center",
  },

  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 17,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIconText: {
    fontFamily: FONTS.bold,
    fontSize: 25,
    color: COLORS.primary,
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
    lineHeight: 20,
    color: COLORS.textMuted,
    marginTop: 6,
    textAlign: "center",
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
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  modalOverlayMobile: {
    padding: 12,
  },

  modal: {
    width: "100%",
    maxWidth: 720,
    backgroundColor: COLORS.surface,
    borderRadius: 19,
    padding: 28,
  },

  modalMobile: {
    maxWidth: "100%",
    padding: 18,
    borderRadius: 16,
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
    color: COLORS.textMuted,
    marginTop: 5,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  closeText: {
    fontFamily: FONTS.regular,
    fontSize: 25,
    color: COLORS.textSecondary,
    lineHeight: 28,
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

  formRow: {
    flexDirection: "row",
    gap: 14,
  },

  formRowMobile: {
    flexDirection: "column",
    gap: 0,
  },

  formHalf: {
    flex: 1,
    minWidth: 0,
  },

  statusSelector: {
    flexDirection: "row",
    gap: 10,
  },

  statusOption: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  statusOptionActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },

  statusOptionText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  statusOptionTextActive: {
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },

  descriptionInput: {
    height: 90,
    paddingTop: 12,
    textAlignVertical: "top",
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 26,
  },

  modalActionsMobile: {
    flexDirection: "column-reverse",
    gap: 10,
  },

  cancelButton: {
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonMobile: {
    width: "100%",
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

  saveButtonMobile: {
    width: "100%",
    minWidth: 0,
  },

  saveButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: "#FFFFFF",
  },
});