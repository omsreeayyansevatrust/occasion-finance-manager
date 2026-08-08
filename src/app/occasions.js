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
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}

        <View style={styles.header}>
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
            style={styles.primaryButton}
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

        <View style={styles.summaryGrid}>
          <SummaryCard
            label="TOTAL OCCASIONS"
            value={occasionData.length}
            icon="#"
            color={COLORS.primary}
          />

          <SummaryCard
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

        <View style={styles.toolbar}>
          <View style={styles.searchBox}>
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

          <View style={styles.filters}>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
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

            <View style={styles.formRow}>
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

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
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
                style={styles.saveButton}
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
  label,
  value,
  icon,
  color,
}) {
  return (
    <View style={styles.summaryCard}>
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
  onOpen,
  onEdit,
  onDelete,
}) {
  const isActive =
    String(
      occasion.status || "Active"
    ).toLowerCase() === "active";

  return (
    <View style={styles.occasionCard}>
      <View style={styles.cardTop}>
        <TouchableOpacity
          style={styles.cardIdentity}
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

        <View style={styles.cardActions}>
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

      <View style={styles.financialGrid}>
        <FinancialItem
          label="Income"
          value={formatCurrency(occasion.income)}
          valueColor={COLORS.success}
        />

        <FinancialItem
          label="Expenses"
          value={formatCurrency(occasion.expense)}
          valueColor={COLORS.danger}
        />

        <FinancialItem
          label="Balance"
          value={formatCurrency(occasion.balance)}
          valueColor={
            occasion.balance >= 0
              ? COLORS.success
              : COLORS.danger
          }
        />

        <FinancialItem
          label="Contributors"
          value={occasion.contributorCount}
          valueColor={COLORS.primary}
        />

        <TouchableOpacity
          style={styles.detailsButton}
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
  label,
  value,
  valueColor,
}) {
  return (
    <View style={styles.financialItem}>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 50,
  },

  // LOADING

  loading: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 10,
  },

  // HEADER

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 24,
  },

  eyebrow: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: COLORS.primary,
  },

  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 30,
    color: COLORS.text,
    marginTop: 4,
  },

  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  primaryButton: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonIcon: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: "#FFFFFF",
    marginRight: 7,
  },

  primaryButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: "#FFFFFF",
  },

  // SUMMARY

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 18,
  },

  summaryCard: {
    flex: 1,
    minWidth: 190,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 17,
  },

  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  summaryLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    letterSpacing: 0.7,
    color: COLORS.textMuted,
  },

  summaryIcon: {
    width: 31,
    height: 31,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryIconText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
  },

  summaryValue: {
    fontFamily: FONTS.extraBold,
    fontSize: 22,
    color: COLORS.text,
    marginTop: 12,
  },

  // TOOLBAR

  toolbar: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 12,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  searchBox: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    maxWidth: 500,
  },

  searchIcon: {
    fontSize: 18,
    color: COLORS.textMuted,
    marginRight: 7,
  },

  searchInput: {
    flex: 1,
    height: 38,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.text,
    outlineStyle: "none",
  },

  filters: {
    flexDirection: "row",
    marginLeft: 12,
    gap: 6,
  },

  filterButton: {
    paddingHorizontal: 13,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },

  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },

  filterText: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  filterTextActive: {
    color: "#FFFFFF",
    fontFamily: FONTS.semiBold,
  },

  // LIST

  list: {
    gap: 14,
  },

  occasionCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 20,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cardIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  occasionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },

  occasionAvatarText: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.primary,
  },

  identityText: {
    flex: 1,
    marginLeft: 12,
  },

  nameLine: {
    flexDirection: "row",
    alignItems: "center",
  },

  occasionName: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
    maxWidth: 350,
  },

  statusBadge: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  activeBadge: {
    backgroundColor: "#DCFCE7",
  },

  closedBadge: {
    backgroundColor: "#F1F5F9",
  },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 5,
    marginRight: 5,
  },

  activeDot: {
    backgroundColor: COLORS.success,
  },

  closedDot: {
    backgroundColor: COLORS.textMuted,
  },

  statusBadgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 8,
    letterSpacing: 0.5,
  },

  activeText: {
    color: COLORS.success,
  },

  closedText: {
    color: COLORS.textMuted,
  },

  occasionDate: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 5,
  },

  cardActions: {
    flexDirection: "row",
    gap: 6,
    marginLeft: 15,
  },

  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: "#F1F5F9",
  },

  actionButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: COLORS.textSecondary,
  },

  deleteAction: {
    backgroundColor: "#FEF2F2",
  },

  deleteActionText: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    color: COLORS.danger,
  },

  description: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginTop: 14,
    marginBottom: 14,
  },

  // FINANCIAL GRID

  financialGrid: {
    marginTop: 16,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
  },

  financialItem: {
    minWidth: 130,
    paddingRight: 20,
  },

  financialLabel: {
    fontFamily: FONTS.regular,
    fontSize: 9,
    color: COLORS.textMuted,
    marginBottom: 4,
  },

  financialValue: {
    fontFamily: FONTS.bold,
    fontSize: 13,
  },

  detailsButton: {
    marginLeft: "auto",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    flexDirection: "row",
    alignItems: "center",
  },

  detailsButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: COLORS.primary,
  },

  detailsArrow: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.primary,
    marginLeft: 5,
  },

  // EMPTY

  emptyCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 60,
    alignItems: "center",
  },

  emptyIcon: {
    width: 55,
    height: 55,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIconText: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.primary,
  },

  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
    marginTop: 14,
  },

  emptyDescription: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 5,
    textAlign: "center",
  },

  emptyButton: {
    marginTop: 16,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
  },

  emptyButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: "#FFFFFF",
  },

  // MODAL

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  modal: {
    width: "100%",
    maxWidth: 620,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 24,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },

  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.text,
  },

  modalSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  closeText: {
    fontSize: 20,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },

  fieldLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 11,
  },

  input: {
    height: 42,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.text,
    backgroundColor: "#FFFFFF",
    outlineStyle: "none",
  },

  formRow: {
    flexDirection: "row",
    gap: 10,
  },

  formHalf: {
    flex: 1,
  },

  statusSelector: {
    flexDirection: "row",
    gap: 8,
  },

  statusOption: {
    flex: 1,
    height: 40,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  statusOptionActive: {
    backgroundColor: "#EEF2FF",
    borderColor: COLORS.primary,
  },

  statusOptionText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  statusOptionTextActive: {
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
  },

  descriptionInput: {
    height: 75,
    paddingTop: 11,
    textAlignVertical: "top",
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 9,
    marginTop: 22,
  },

  cancelButton: {
    height: 40,
    paddingHorizontal: 17,
    borderRadius: 9,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  saveButton: {
    height: 40,
    minWidth: 125,
    paddingHorizontal: 17,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: "#FFFFFF",
  },
});