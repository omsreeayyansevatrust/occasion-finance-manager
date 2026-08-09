import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { Ionicons } from "@expo/vector-icons";

import {
  COLORS,
  FONTS,
  RADIUS,
  SHADOWS
} from "../constants/theme";

import { db } from "../services/firebase";

/* =========================================================
   HELPERS
========================================================= */

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return `₹${amount.toLocaleString("en-IN")}`;
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  try {
    if (
      typeof value === "object" &&
      typeof value.toDate === "function"
    ) {
      const date = value.toDate();

      return `${String(date.getDate()).padStart(
        2,
        "0"
      )}/${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}/${date.getFullYear()}`;
    }

    if (typeof value === "string") {
      // YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] =
          value.split("-");

        return `${day}/${month}/${year}`;
      }

      const date = new Date(value);

      if (!Number.isNaN(date.getTime())) {
        return `${String(date.getDate()).padStart(
          2,
          "0"
        )}/${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}/${date.getFullYear()}`;
      }
    }

    return String(value);
  } catch (error) {
    return String(value);
  }
};

const getInitial = (name) => {
  if (!name) {
    return "O";
  }

  return String(name)
    .trim()
    .charAt(0)
    .toUpperCase();
};

/* =========================================================
   SCREEN
========================================================= */

export default function OccasionDetailsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const params = useLocalSearchParams();

  const occasionId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [occasion, setOccasion] =
    useState(null);

  const [contributions, setContributions] =
    useState([]);

  const [expenses, setExpenses] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* =======================================================
     FIREBASE LISTENERS
  ======================================================= */

  useEffect(() => {
    if (!occasionId) {
      setError(
        "Occasion information was not provided."
      );
      setLoading(false);
      return;
    }

    let occasionReady = false;
    let contributionsReady = false;
    let expensesReady = false;

    const finishLoading = () => {
      if (
        occasionReady &&
        contributionsReady &&
        expensesReady
      ) {
        setLoading(false);
      }
    };

    /* -------------------------------------------------------
       OCCASION
    ------------------------------------------------------- */

    const unsubscribeOccasion = onSnapshot(
      doc(db, "occasions", occasionId),
      (snapshot) => {
        if (snapshot.exists()) {
          setOccasion({
            id: snapshot.id,
            ...snapshot.data(),
          });

          setError("");
        } else {
          setOccasion(null);
          setError(
            "This occasion could not be found."
          );
        }

        occasionReady = true;
        finishLoading();
      },
      (firebaseError) => {
        console.log(
          "Occasion details error:",
          firebaseError
        );

        setError(
          "Unable to load the occasion."
        );

        occasionReady = true;
        finishLoading();
      }
    );

    /* -------------------------------------------------------
       CONTRIBUTIONS
    ------------------------------------------------------- */

    const contributionQuery = query(
      collection(db, "contributions"),
      where(
        "occasionId",
        "==",
        occasionId
      )
    );

    const unsubscribeContributions =
      onSnapshot(
        contributionQuery,
        (snapshot) => {
          const data = snapshot.docs
            .map((item) => ({
              id: item.id,
              ...item.data(),
            }))
            .sort((a, b) =>
              String(b.date || "").localeCompare(
                String(a.date || "")
              )
            );

          setContributions(data);

          contributionsReady = true;
          finishLoading();
        },
        (firebaseError) => {
          console.log(
            "Occasion contributions error:",
            firebaseError
          );

          setContributions([]);

          contributionsReady = true;
          finishLoading();
        }
      );

    /* -------------------------------------------------------
       EXPENSES
    ------------------------------------------------------- */

    const expenseQuery = query(
      collection(db, "expenses"),
      where(
        "occasionId",
        "==",
        occasionId
      )
    );

    const unsubscribeExpenses =
      onSnapshot(
        expenseQuery,
        (snapshot) => {
          const data = snapshot.docs
            .map((item) => ({
              id: item.id,
              ...item.data(),
            }))
            .sort((a, b) =>
              String(b.date || "").localeCompare(
                String(a.date || "")
              )
            );

          setExpenses(data);

          expensesReady = true;
          finishLoading();
        },
        (firebaseError) => {
          console.log(
            "Occasion expenses error:",
            firebaseError
          );

          setExpenses([]);

          expensesReady = true;
          finishLoading();
        }
      );

    return () => {
      unsubscribeOccasion();
      unsubscribeContributions();
      unsubscribeExpenses();
    };
  }, [occasionId]);

  /* =======================================================
     CALCULATIONS
  ======================================================= */

  const totalIncome = useMemo(() => {
    return contributions.reduce(
      (total, item) =>
        total +
        Number(item.amount || 0),
      0
    );
  }, [contributions]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce(
      (total, item) =>
        total +
        Number(item.amount || 0),
      0
    );
  }, [expenses]);

  const balance =
    totalIncome - totalExpenses;

  const contributorCount = useMemo(() => {
    const people = new Set();

    contributions.forEach((item) => {
      people.add(
        item.personId ||
          item.personName ||
          item.id
      );
    });

    return people.size;
  }, [contributions]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text style={styles.loadingText}>
          Loading occasion details...
        </Text>
      </View>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (!occasion) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIcon}>
          <Ionicons
            name="calendar-outline"
            size={30}
            color={COLORS.primary}
          />
        </View>

        <Text style={styles.errorTitle}>
          Occasion not found
        </Text>

        <Text style={styles.errorText}>
          {error ||
            "The requested occasion could not be loaded."}
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            router.replace("/occasions")
          }
        >
          <Ionicons
            name="arrow-back"
            size={18}
            color="#FFFFFF"
          />

          <Text style={styles.backButtonText}>
            Back to Occasions
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          isMobile && styles.contentMobile,
        ]}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <View
          style={[
            styles.header,
            isMobile && styles.headerMobile,
          ]}
        >
          <View
            style={[
              styles.headerLeft,
              isMobile && styles.headerLeftMobile,
            ]}
          >
            <TouchableOpacity
              style={styles.backIconButton}
              onPress={() =>
                router.replace("/occasions")
              }
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={COLORS.text}
              />
            </TouchableOpacity>

            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>
                OCCASION DETAILS
              </Text>

              <Text
                style={styles.title}
                numberOfLines={2}
              >
                {occasion.name ||
                  occasion.title ||
                  "Unnamed Occasion"}
              </Text>

              <Text style={styles.subtitle}>
                Complete financial overview for
                this occasion
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusBadge,
              isMobile && styles.statusBadgeMobile,
              String(
                occasion.status || "Active"
              ).toLowerCase() ===
                "active" &&
                styles.statusBadgeActive,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                String(
                  occasion.status || "Active"
                ).toLowerCase() ===
                  "active" &&
                  styles.statusDotActive,
              ]}
            />

            <Text
              style={[
                styles.statusText,
                String(
                  occasion.status || "Active"
                ).toLowerCase() ===
                  "active" &&
                  styles.statusTextActive,
              ]}
            >
              {occasion.status ||
                "Active"}
            </Text>
          </View>
        </View>

        {/* =================================================
            OCCASION INFORMATION
        ================================================= */}

        <View
          style={[
            styles.infoCard,
            isMobile && styles.infoCardMobile,
          ]}
        >
          <View
            style={[
              styles.infoHeader,
              isMobile && styles.infoHeaderMobile,
            ]}
          >
            <View style={styles.occasionAvatar}>
              <Text
                style={styles.occasionAvatarText}
              >
                {getInitial(
                  occasion.name ||
                    occasion.title
                )}
              </Text>
            </View>

            <View
              style={styles.infoHeaderText}
            >
              <Text style={styles.infoTitle}>
                {occasion.name ||
                  occasion.title ||
                  "Unnamed Occasion"}
              </Text>

              <Text style={styles.infoSubtext}>
                Occasion information
              </Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View
            style={[
              styles.infoGrid,
              isMobile && styles.infoGridMobile,
            ]}
          >
            <View
              style={[
                styles.infoItem,
                isMobile && styles.infoItemMobile,
              ]}
            >
              <Text style={styles.infoLabel}>
                START DATE
              </Text>

              <Text style={styles.infoValue}>
                {formatDate(
                  occasion.startDate
                )}
              </Text>
            </View>

            <View
              style={[
                styles.infoItem,
                isMobile && styles.infoItemMobile,
              ]}
            >
              <Text style={styles.infoLabel}>
                END DATE
              </Text>

              <Text style={styles.infoValue}>
                {formatDate(
                  occasion.endDate
                )}
              </Text>
            </View>

            <View
              style={[
                styles.infoItem,
                isMobile && styles.infoItemMobile,
              ]}
            >
              <Text style={styles.infoLabel}>
                CONTRIBUTORS
              </Text>

              <Text style={styles.infoValue}>
                {contributorCount}
              </Text>
            </View>
          </View>

          {occasion.description ? (
            <>
              <View
                style={styles.infoDivider}
              />

              <Text style={styles.infoLabel}>
                DESCRIPTION
              </Text>

              <Text
                style={styles.description}
              >
                {occasion.description}
              </Text>
            </>
          ) : null}
        </View>

        {/* =================================================
            FINANCIAL SUMMARY
        ================================================= */}

        <Text style={styles.sectionTitle}>
          Financial Summary
        </Text>

        <Text style={styles.sectionSubtitle}>
          Financial performance for this occasion
        </Text>

        <View
          style={[
            styles.summaryGrid,
            isMobile && styles.summaryGridMobile,
          ]}
        >
          {/* INCOME */}

          <View
            style={[
              styles.summaryCard,
              isMobile && styles.summaryCardMobile,
            ]}
          >
            <View
              style={[
                styles.summaryIcon,
                styles.incomeIcon,
              ]}
            >
              <Ionicons
                name="arrow-up"
                size={19}
                color={COLORS.success}
              />
            </View>

            <Text style={styles.summaryLabel}>
              TOTAL INCOME
            </Text>

            <Text
              style={[
                styles.summaryAmount,
                styles.incomeAmount,
              ]}
            >
              {formatCurrency(
                totalIncome
              )}
            </Text>

            <Text style={styles.summaryMeta}>
              {contributions.length} contribution
              {contributions.length === 1
                ? ""
                : "s"}
            </Text>
          </View>

          {/* EXPENSE */}

          <View
            style={[
              styles.summaryCard,
              isMobile && styles.summaryCardMobile,
            ]}
          >
            <View
              style={[
                styles.summaryIcon,
                styles.expenseIcon,
              ]}
            >
              <Ionicons
                name="arrow-down"
                size={19}
                color={COLORS.danger}
              />
            </View>

            <Text style={styles.summaryLabel}>
              TOTAL EXPENSES
            </Text>

            <Text
              style={[
                styles.summaryAmount,
                styles.expenseAmount,
              ]}
            >
              {formatCurrency(
                totalExpenses
              )}
            </Text>

            <Text style={styles.summaryMeta}>
              {expenses.length} expense
              {expenses.length === 1
                ? ""
                : "s"}
            </Text>
          </View>

          {/* BALANCE */}

          <View
            style={[
              styles.summaryCard,
              isMobile && styles.summaryCardMobile,
            ]}
          >
            <View
              style={[
                styles.summaryIcon,
                styles.balanceIcon,
              ]}
            >
              <Ionicons
                name={
                  balance >= 0
                    ? "checkmark"
                    : "alert-outline"
                }
                size={20}
                color={
                  balance >= 0
                    ? COLORS.primary
                    : COLORS.danger
                }
              />
            </View>

            <Text style={styles.summaryLabel}>
              BALANCE
            </Text>

            <Text
              style={[
                styles.summaryAmount,
                balance >= 0
                  ? styles.incomeAmount
                  : styles.expenseAmount,
              ]}
            >
              {formatCurrency(balance)}
            </Text>

            <Text style={styles.summaryMeta}>
              {balance >= 0
                ? "Positive balance"
                : "Negative balance"}
            </Text>
          </View>

          {/* CONTRIBUTORS */}

          <View
            style={[
              styles.summaryCard,
              isMobile && styles.summaryCardMobile,
            ]}
          >
            <View
              style={[
                styles.summaryIcon,
                styles.peopleIcon,
              ]}
            >
              <Ionicons
                name="people-outline"
                size={19}
                color={COLORS.accent}
              />
            </View>

            <Text style={styles.summaryLabel}>
              CONTRIBUTORS
            </Text>

            <Text
              style={styles.summaryAmount}
            >
              {contributorCount}
            </Text>

            <Text style={styles.summaryMeta}>
              Unique contributors
            </Text>
          </View>
        </View>

        {/* =================================================
            CONTRIBUTIONS
        ================================================= */}

        <View
          style={[
            styles.sectionHeader,
            isMobile && styles.sectionHeaderMobile,
          ]}
        >
          <View>
            <Text style={styles.sectionTitle}>
              Contributions
            </Text>

            <Text
              style={styles.sectionSubtitle}
            >
              Income received for this occasion
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {contributions.length}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.transactionCard,
            isMobile && styles.transactionCardMobile,
          ]}
        >
          {contributions.length === 0 ? (
            <EmptyState
              icon="arrow-up-circle-outline"
              title="No contributions yet"
              description="No contributions have been recorded for this occasion."
            />
          ) : (
            contributions.map(
              (item, index) => (
                <ContributionRow
                  key={item.id}
                  item={item}
                  isMobile={isMobile}
                  isLast={
                    index ===
                    contributions.length - 1
                  }
                />
              )
            )
          )}
        </View>

        {/* =================================================
            EXPENSES
        ================================================= */}

        <View
          style={[
            styles.sectionHeader,
            styles.expenseSectionHeader,
            isMobile && styles.sectionHeaderMobile,
          ]}
        >
          <View>
            <Text style={styles.sectionTitle}>
              Expenses
            </Text>

            <Text
              style={styles.sectionSubtitle}
            >
              Spending recorded for this occasion
            </Text>
          </View>

          <View
            style={[
              styles.countBadge,
              styles.expenseCountBadge,
            ]}
          >
            <Text
              style={[
                styles.countBadgeText,
                styles.expenseCountBadgeText,
              ]}
            >
              {expenses.length}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.transactionCard,
            isMobile && styles.transactionCardMobile,
          ]}
        >
          {expenses.length === 0 ? (
            <EmptyState
              icon="arrow-down-circle-outline"
              title="No expenses yet"
              description="No expenses have been recorded for this occasion."
            />
          ) : (
            expenses.map(
              (item, index) => (
                <ExpenseRow
                  key={item.id}
                  item={item}
                  isMobile={isMobile}
                  isLast={
                    index ===
                    expenses.length - 1
                  }
                />
              )
            )
          )}
        </View>

        {/* =================================================
            BOTTOM SUMMARY
        ================================================= */}

        <View
          style={[
            styles.bottomBalanceCard,
            isMobile && styles.bottomBalanceCardMobile,
          ]}
        >
          <View>
            <Text
              style={styles.bottomBalanceLabel}
            >
              OCCASION BALANCE
            </Text>

            <Text
              style={styles.bottomBalanceText}
            >
              {formatCurrency(balance)}
            </Text>
          </View>

          <View
            style={[
              styles.bottomBalanceStatus,
              balance >= 0
                ? styles.bottomBalancePositive
                : styles.bottomBalanceNegative,
            ]}
          >
            <Ionicons
              name={
                balance >= 0
                  ? "checkmark-circle"
                  : "alert-circle"
              }
              size={17}
              color={
                balance >= 0
                  ? COLORS.success
                  : COLORS.danger
              }
            />

            <Text
              style={[
                styles.bottomBalanceStatusText,
                balance >= 0
                  ? styles.bottomBalancePositiveText
                  : styles.bottomBalanceNegativeText,
              ]}
            >
              {balance >= 0
                ? "Positive balance"
                : "Negative balance"}
            </Text>
          </View>
        </View>

        {/* BOTTOM SPACE */}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

/* =========================================================
   CONTRIBUTION ROW
========================================================= */

function ContributionRow({
  item,
  isMobile,
  isLast,
}) {
  return (
    <View
      style={[
        styles.transactionRow,
        isMobile && styles.transactionRowMobile,
        !isLast &&
          styles.transactionRowBorder,
      ]}
    >
      <View
        style={[
          styles.transactionIcon,
          styles.contributionTransactionIcon,
        ]}
      >
        <Ionicons
          name="arrow-up"
          size={18}
          color={COLORS.success}
        />
      </View>

      <View
        style={styles.transactionMain}
      >
        <Text
          style={styles.transactionTitle}
          numberOfLines={1}
        >
          {item.personName ||
            "Unknown contributor"}
        </Text>

        <View
          style={styles.transactionMetaRow}
        >
          <Text
            style={styles.transactionMeta}
          >
            {formatDate(item.date)}
          </Text>

          {item.paymentMode ? (
            <>
              <View
                style={
                  styles.metaDot
                }
              />

              <Text
                style={
                  styles.transactionMeta
                }
              >
                {item.paymentMode}
              </Text>
            </>
          ) : null}
        </View>

        {item.notes ? (
          <Text
            style={styles.transactionNotes}
            numberOfLines={1}
          >
            {item.notes}
          </Text>
        ) : null}
      </View>

      <Text
        style={[
          styles.transactionAmount,
          styles.contributionAmount,
        ]}
      >
        +{formatCurrency(item.amount)}
      </Text>
    </View>
  );
}

/* =========================================================
   EXPENSE ROW
========================================================= */

function ExpenseRow({
  item,
  isMobile,
  isLast,
}) {
  return (
    <View
      style={[
        styles.transactionRow,
        isMobile && styles.transactionRowMobile,
        !isLast &&
          styles.transactionRowBorder,
      ]}
    >
      <View
        style={[
          styles.transactionIcon,
          styles.expenseTransactionIcon,
        ]}
      >
        <Ionicons
          name="arrow-down"
          size={18}
          color={COLORS.danger}
        />
      </View>

      <View
        style={styles.transactionMain}
      >
        <Text
          style={styles.transactionTitle}
          numberOfLines={1}
        >
          {item.description ||
            "Expense"}
        </Text>

        <View
          style={styles.transactionMetaRow}
        >
          <Text
            style={styles.transactionMeta}
          >
            {formatDate(item.date)}
          </Text>

          {item.category ? (
            <>
              <View
                style={styles.metaDot}
              />

              <Text
                style={styles.transactionMeta}
              >
                {item.category}
              </Text>
            </>
          ) : null}

          {item.paymentMode ? (
            <>
              <View
                style={styles.metaDot}
              />

              <Text
                style={styles.transactionMeta}
              >
                {item.paymentMode}
              </Text>
            </>
          ) : null}
        </View>

        {item.notes ? (
          <Text
            style={styles.transactionNotes}
            numberOfLines={1}
          >
            {item.notes}
          </Text>
        ) : null}
      </View>

      <Text
        style={[
          styles.transactionAmount,
          styles.expenseAmount,
        ]}
      >
        -{formatCurrency(item.amount)}
      </Text>
    </View>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  icon,
  title,
  description,
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name={icon}
          size={25}
          color={COLORS.textMuted}
        />
      </View>

      <Text style={styles.emptyTitle}>
        {title}
      </Text>

      <Text style={styles.emptyDescription}>
        {description}
      </Text>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: 28,
    paddingTop: 26,
    paddingBottom: 20,
    maxWidth: 1600,
    width: "100%",
    alignSelf: "center",
  },

  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    minWidth: 0,
  },

  backIconButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  eyebrow: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.2,
    color: COLORS.primary,
    marginBottom: 4,
  },

  title: {
    fontFamily: FONTS.bold,
    fontSize: 30,
    lineHeight: 38,
    color: COLORS.text,
  },

  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 21,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginLeft: 20,
  },

  statusBadgeActive: {
    backgroundColor: COLORS.successLight,
    borderColor: COLORS.successLight,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.textMuted,
    marginRight: 7,
  },

  statusDotActive: {
    backgroundColor: COLORS.success,
  },

  statusText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  statusTextActive: {
    color: COLORS.success,
  },

  /* =======================================================
     INFO CARD
  ======================================================= */

  infoCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.card,
    padding: 20,
    marginBottom: 26,
    ...SHADOWS.card,
  },

  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  occasionAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  occasionAvatarText: {
    fontFamily: FONTS.bold,
    fontSize: 21,
    color: COLORS.primary,
  },

  infoHeaderText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 13,
  },

  infoTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    lineHeight: 23,
    color: COLORS.text,
  },

  infoSubtext: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  infoDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 18,
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  infoItem: {
    width: "33.33%",
    paddingRight: 20,
  },

  infoLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.7,
    color: COLORS.textMuted,
  },

  infoValue: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
    marginTop: 5,
  },

  description: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    marginTop: 6,
  },

  /* =======================================================
     SECTIONS
  ======================================================= */

  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    lineHeight: 27,
    color: COLORS.text,
  },

  sectionSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: 14,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  expenseSectionHeader: {
    marginTop: 30,
  },

  countBadge: {
    minWidth: 32,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 9,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  countBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.primary,
  },

  expenseCountBadge: {
    backgroundColor: COLORS.dangerLight,
  },

  expenseCountBadgeText: {
    color: COLORS.danger,
  },

  /* =======================================================
     SUMMARY
  ======================================================= */

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 28,
  },

  summaryCard: {
    flex: 1,
    minWidth: 210,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.card,
    padding: 18,
    minHeight: 145,
    ...SHADOWS.card,
  },

  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  incomeIcon: {
    backgroundColor: COLORS.successLight,
  },

  expenseIcon: {
    backgroundColor: COLORS.dangerLight,
  },

  balanceIcon: {
    backgroundColor: COLORS.primaryLight,
  },

  peopleIcon: {
    backgroundColor: COLORS.accentLight,
  },

  summaryLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.7,
    color: COLORS.textMuted,
  },

  summaryAmount: {
    fontFamily: FONTS.bold,
    fontSize: 25,
    lineHeight: 32,
    color: COLORS.text,
    marginTop: 6,
  },

  incomeAmount: {
    color: COLORS.success,
  },

  expenseAmount: {
    color: COLORS.danger,
  },

  summaryMeta: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  /* =======================================================
     TRANSACTIONS
  ======================================================= */

  transactionCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.card,
    overflow: "hidden",
    ...SHADOWS.card,
  },

  transactionRow: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },

  transactionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },

  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  contributionTransactionIcon: {
    backgroundColor: COLORS.successLight,
  },

  expenseTransactionIcon: {
    backgroundColor: COLORS.dangerLight,
  },

  transactionMain: {
    flex: 1,
    minWidth: 0,
  },

  transactionTitle: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 19,
    color: COLORS.text,
  },

  transactionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 4,
  },

  transactionMeta: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textMuted,
  },

  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.textMuted,
    marginHorizontal: 7,
  },

  transactionNotes: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  transactionAmount: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    lineHeight: 21,
    marginLeft: 15,
  },

  contributionAmount: {
    color: COLORS.success,
  },

  /* =======================================================
     EMPTY
  ======================================================= */

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
    paddingVertical: 42,
  },

  emptyIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },

  emptyTitle: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
  },

  emptyDescription: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textMuted,
    textAlign: "center",
    maxWidth: 420,
    marginTop: 4,
  },

  /* =======================================================
     BOTTOM BALANCE
  ======================================================= */

  bottomBalanceCard: {
    marginTop: 26,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.card,
    paddingHorizontal: 22,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  bottomBalanceLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.8,
    color: "rgba(255,255,255,0.72)",
  },

  bottomBalanceText: {
    fontFamily: FONTS.bold,
    fontSize: 25,
    lineHeight: 32,
    color: COLORS.white,
    marginTop: 2,
  },

  bottomBalanceStatus: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 17,
  },

  bottomBalancePositive: {
    backgroundColor: COLORS.successLight,
  },

  bottomBalanceNegative: {
    backgroundColor: COLORS.dangerLight,
  },

  bottomBalanceStatusText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    marginLeft: 6,
  },

  bottomBalancePositiveText: {
    color: COLORS.success,
  },

  bottomBalanceNegativeText: {
    color: COLORS.danger,
  },

  /* =======================================================
     MOBILE RESPONSIVE
  ======================================================= */

  contentMobile: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
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

  statusBadgeMobile: {
    alignSelf: "flex-start",
    marginLeft: 56,
    marginTop: 10,
  },

  infoCardMobile: {
    padding: 16,
    marginBottom: 20,
  },

  infoHeaderMobile: {
    alignItems: "flex-start",
  },

  infoGridMobile: {
    flexDirection: "column",
  },

  infoItemMobile: {
    width: "100%",
    paddingRight: 0,
    marginBottom: 14,
  },

  summaryGridMobile: {
    flexDirection: "column",
    gap: 10,
    marginBottom: 22,
  },

  summaryCardMobile: {
    flex: 0,
    width: "100%",
    minWidth: 0,
    minHeight: 120,
    padding: 16,
  },

  sectionHeaderMobile: {
    marginBottom: 4,
  },

  transactionCardMobile: {
    width: "100%",
  },

  transactionRowMobile: {
    minHeight: 0,
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  bottomBalanceCardMobile: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  /* =======================================================
     LOADING
  ======================================================= */

  loading: {
    flex: 1,
    minHeight: "100%",
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 12,
  },

  /* =======================================================
     ERROR
  ======================================================= */

  errorContainer: {
    flex: 1,
    minHeight: "100%",
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  errorTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    lineHeight: 29,
    color: COLORS.text,
  },

  errorText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: "center",
    maxWidth: 450,
    marginTop: 6,
  },

  backButton: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },

  backButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white,
    marginLeft: 8,
  },

  /* =======================================================
     MOBILE RESPONSIVE
  ======================================================= */

  contentMobile: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
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

  statusBadgeMobile: {
    alignSelf: "flex-start",
    marginLeft: 56,
    marginTop: 10,
  },

  infoCardMobile: {
    padding: 16,
    marginBottom: 20,
  },

  infoHeaderMobile: {
    alignItems: "flex-start",
  },

  infoGridMobile: {
    flexDirection: "column",
  },

  infoItemMobile: {
    width: "100%",
    paddingRight: 0,
    marginBottom: 14,
  },

  summaryGridMobile: {
    flexDirection: "column",
    gap: 10,
    marginBottom: 22,
  },

  summaryCardMobile: {
    flex: 0,
    width: "100%",
    minWidth: 0,
    minHeight: 120,
    padding: 16,
  },

  sectionHeaderMobile: {
    marginBottom: 4,
  },

  transactionCardMobile: {
    width: "100%",
  },

  transactionRowMobile: {
    minHeight: 0,
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  bottomBalanceCardMobile: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
});