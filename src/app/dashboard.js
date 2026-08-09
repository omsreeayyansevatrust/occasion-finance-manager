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

import { useRouter } from "expo-router";

import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import { COLORS, FONTS } from "../constants/theme";
import { db } from "../services/firebase";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatAmount(value) {
  return Number(value || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  );
}

function getCurrentMonth() {
  return new Date().getMonth();
}

function getCurrentYear() {
  return new Date().getFullYear();
}

/*
 * CENTRAL DATE HANDLER
 *
 * The app accepts:
 * - Firestore Timestamp
 * - JavaScript Date
 * - YYYY-MM-DD
 * - DD/MM/YYYY
 * - DD-MM-YYYY
 *
 * Date-only values are always created locally so the browser timezone
 * cannot move an August date into September.
 */
function getDateObject(dateValue) {
  if (!dateValue) return null;

  if (
    typeof dateValue === "object" &&
    typeof dateValue.toDate === "function"
  ) {
    const date = dateValue.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (dateValue instanceof Date) {
    return Number.isNaN(dateValue.getTime())
      ? null
      : dateValue;
  }

  const value = String(dateValue).trim();

  let match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );
  }

  match = value.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  );

  if (match) {
    return new Date(
      Number(match[3]),
      Number(match[2]) - 1,
      Number(match[1])
    );
  }

  match = value.match(
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/
  );

  if (match) {
    return new Date(
      Number(match[3]),
      Number(match[2]) - 1,
      Number(match[1])
    );
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function isSameMonth(
  dateValue,
  month,
  year
) {
  const date = getDateObject(dateValue);

  if (!date) {
    return false;
  }

  return (
    date.getMonth() === Number(month) &&
    date.getFullYear() === Number(year)
  );
}

function formatTransactionDate(value) {
  const date = getDateObject(value);

  if (!date) {
    return "-";
  }

  return `${String(
    date.getDate()
  ).padStart(2, "0")} ${MONTH_SHORT[
    date.getMonth()
  ]} ${date.getFullYear()}`;
}

function getInitials(name) {
  const value = String(
    name || "?"
  ).trim();

  if (!value) {
    return "?";
  }

  const parts = value.split(/\s+/);

  if (parts.length === 1) {
    return parts[0]
      .charAt(0)
      .toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

export default function DashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [people, setPeople] = useState([]);
  const [occasions, setOccasions] =
    useState([]);
  const [contributions, setContributions] =
    useState([]);
  const [expenses, setExpenses] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth());

  const [selectedYear, setSelectedYear] =
    useState(getCurrentYear());

  const [showMonthSelector, setShowMonthSelector] =
    useState(false);

  const [occasionFilter, setOccasionFilter] =
    useState("All");

  // ==================================================
  // FIREBASE LISTENERS
  // ==================================================

  useEffect(() => {
    let completed = 0;

    const finish = () => {
      completed += 1;

      if (completed === 4) {
        setLoading(false);
      }
    };

    const unsubPeople = onSnapshot(
      collection(db, "people"),
      (snapshot) => {
        setPeople(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );

        finish();
      },
      (error) => {
        console.log(
          "Dashboard people error:",
          error
        );

        finish();
      }
    );

    const unsubOccasions = onSnapshot(
      collection(db, "occasions"),
      (snapshot) => {
        setOccasions(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );

        finish();
      },
      (error) => {
        console.log(
          "Dashboard occasions error:",
          error
        );

        finish();
      }
    );

    const unsubContributions =
      onSnapshot(
        collection(db, "contributions"),
        (snapshot) => {
          setContributions(
            snapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            )
          );

          finish();
        },
        (error) => {
          console.log(
            "Dashboard contributions error:",
            error
          );

          finish();
        }
      );

    const unsubExpenses = onSnapshot(
      collection(db, "expenses"),
      (snapshot) => {
        setExpenses(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );

        finish();
      },
      (error) => {
        console.log(
          "Dashboard expenses error:",
          error
        );

        finish();
      }
    );

    return () => {
      unsubPeople();
      unsubOccasions();
      unsubContributions();
      unsubExpenses();
    };
  }, []);

  // ==================================================
  // CURRENT MONTH DATA
  // ==================================================

  const monthContributions =
    useMemo(() => {
      return contributions.filter(
        (item) =>
          isSameMonth(
            item.dateKey || item.date,
            selectedMonth,
            selectedYear
          )
      );
    }, [
      contributions,
      selectedMonth,
      selectedYear,
    ]);

  const monthExpenses = useMemo(() => {
    return expenses.filter(
      (item) =>
        isSameMonth(
          item.date,
          selectedMonth,
          selectedYear
        )
    );
  }, [
    expenses,
    selectedMonth,
    selectedYear,
  ]);

  // ==================================================
  // OCCASION FILTER
  // ==================================================

  const filteredContributions =
    useMemo(() => {
      if (occasionFilter === "All") {
        return monthContributions;
      }

      if (
        occasionFilter === "General"
      ) {
        return monthContributions.filter(
          (item) =>
            !item.occasionId
        );
      }

      return monthContributions.filter(
        (item) =>
          item.occasionId ===
          occasionFilter
      );
    }, [
      monthContributions,
      occasionFilter,
    ]);

  const filteredExpenses =
    useMemo(() => {
      if (occasionFilter === "All") {
        return monthExpenses;
      }

      if (
        occasionFilter === "General"
      ) {
        return monthExpenses.filter(
          (item) =>
            !item.occasionId
        );
      }

      return monthExpenses.filter(
        (item) =>
          item.occasionId ===
          occasionFilter
      );
    }, [
      monthExpenses,
      occasionFilter,
    ]);

  // ==================================================
  // FINANCIAL TOTALS
  // ==================================================

  const totalIncome =
    filteredContributions.reduce(
      (sum, item) =>
        sum +
        Number(
          item.amount || 0
        ),
      0
    );

  const totalExpense =
    filteredExpenses.reduce(
      (sum, item) =>
        sum +
        Number(
          item.amount || 0
        ),
      0
    );

  const netBalance =
    totalIncome - totalExpense;

  // ==================================================
  // ALL TIME
  // ==================================================

  const allTimeIncome =
    contributions.reduce(
      (sum, item) =>
        sum +
        Number(
          item.amount || 0
        ),
      0
    );

  const allTimeExpense =
    expenses.reduce(
      (sum, item) =>
        sum +
        Number(
          item.amount || 0
        ),
      0
    );

  const allTimeBalance =
    allTimeIncome -
    allTimeExpense;

  // ==================================================
  // CONTRIBUTORS
  // ==================================================

  const contributorIds =
    new Set(
      filteredContributions
        .map(
          (item) =>
            item.personId
        )
        .filter(Boolean)
    );

  // ==================================================
  // OCCASION SUMMARY
  // ==================================================

  const occasionSummary =
    useMemo(() => {
      const map = {};

      occasions.forEach(
        (occasion) => {
          const name =
            occasion.name ||
            occasion.title ||
            "Unnamed Occasion";

          map[occasion.id] = {
            id: occasion.id,
            name,
            income: 0,
            expense: 0,
            contributors:
              new Set(),
          };
        }
      );

      monthContributions.forEach(
        (item) => {
          if (!item.occasionId) {
            return;
          }

          if (!map[item.occasionId]) {
            map[item.occasionId] = {
              id: item.occasionId,
              name:
                item.occasionName ||
                "Unknown Occasion",
              income: 0,
              expense: 0,
              contributors:
                new Set(),
            };
          }

          map[
            item.occasionId
          ].income += Number(
            item.amount || 0
          );

          if (item.personId) {
            map[
              item.occasionId
            ].contributors.add(
              item.personId
            );
          }
        }
      );

      monthExpenses.forEach(
        (item) => {
          if (!item.occasionId) {
            return;
          }

          if (!map[item.occasionId]) {
            map[item.occasionId] = {
              id: item.occasionId,
              name:
                item.occasionName ||
                "Unknown Occasion",
              income: 0,
              expense: 0,
              contributors:
                new Set(),
            };
          }

          map[
            item.occasionId
          ].expense += Number(
            item.amount || 0
          );
        }
      );

      return Object.values(
        map
      )
        .map((item) => ({
          ...item,
          balance:
            item.income -
            item.expense,
          contributorCount:
            item.contributors
              .size,
        }))
        .filter(
          (item) =>
            item.income > 0 ||
            item.expense > 0
        )
        .sort(
          (a, b) =>
            b.income +
            b.expense -
            (a.income +
              a.expense)
        );
    }, [
      occasions,
      monthContributions,
      monthExpenses,
    ]);

  // ==================================================
  // TOP CONTRIBUTORS
  // ==================================================

  const topContributors =
    useMemo(() => {
      const map = {};

      filteredContributions.forEach(
        (item) => {
          const id =
            item.personId ||
            item.personName ||
            "unknown";

          if (!map[id]) {
            map[id] = {
              id,
              name:
                item.personName ||
                "Unknown Person",
              amount: 0,
              transactions: 0,
            };
          }

          map[id].amount +=
            Number(
              item.amount || 0
            );

          map[id].transactions +=
            1;
        }
      );

      return Object.values(
        map
      )
        .sort(
          (a, b) =>
            b.amount -
            a.amount
        )
        .slice(0, 5);
    }, [
      filteredContributions,
    ]);

  // ==================================================
  // RECENT TRANSACTIONS
  // ==================================================

  const recentTransactions =
    useMemo(() => {
      const income =
        filteredContributions.map(
          (item) => ({
            id:
              `income-${item.id}`,
            type: "income",
            date:
              item.date || "",
            title:
              item.personName ||
              "Contribution",
            subtitle:
              item.occasionName ||
              "General Contribution",
            amount:
              Number(
                item.amount || 0
              ),
            paymentMode:
              item.paymentMode ||
              "",
          })
        );

      const expense =
        filteredExpenses.map(
          (item) => ({
            id:
              `expense-${item.id}`,
            type: "expense",
            date:
              item.date || "",
            title:
              item.description ||
              "Expense",
            subtitle:
              item.occasionName ||
              "General Expense",
            amount:
              Number(
                item.amount || 0
              ),
            paymentMode:
              item.paymentMode ||
              "",
          })
        );

      return [
        ...income,
        ...expense,
      ]
        .sort((a, b) =>
          String(
            b.date
          ).localeCompare(
            String(a.date)
          )
        )
        .slice(0, 8);
    }, [
      filteredContributions,
      filteredExpenses,
    ]);

  // ==================================================
  // MONTHLY CHART
  // ==================================================

  const monthlyData = useMemo(() => {
    return MONTH_SHORT.map(
      (label, index) => {
        const income =
          contributions
            .filter(
              (item) =>
                isSameMonth(
                  item.date,
                  index,
                  selectedYear
                )
            )
            .reduce(
              (sum, item) =>
                sum +
                Number(
                  item.amount || 0
                ),
              0
            );

        const expense =
          expenses
            .filter(
              (item) =>
                isSameMonth(
                  item.date,
                  index,
                  selectedYear
                )
            )
            .reduce(
              (sum, item) =>
                sum +
                Number(
                  item.amount || 0
                ),
              0
            );

        return {
          label,
          income,
          expense,
        };
      }
    );
  }, [
    contributions,
    expenses,
    selectedYear,
  ]);

  const chartMax = Math.max(
    1,
    ...monthlyData.map(
      (item) =>
        Math.max(
          item.income,
          item.expense
        )
    )
  );

  // ==================================================
  // NAVIGATION
  // ==================================================

  const navigateTo = (route) => {
    router.push(route);
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
          Loading dashboard...
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
        {/* ==================================================
            HEADER
            ================================================== */}

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
            <Text
              style={
                styles.eyebrow
              }
            >
              FINANCIAL OVERVIEW
            </Text>

            <Text
              style={[
                styles.title,
                isMobile && styles.titleMobile,
              ]}
            >
              Dashboard
            </Text>

            <Text
              style={[
                styles.subtitle,
                isMobile && styles.subtitleMobile,
              ]}
            >
              Monitor income, expenses
              and occasion finances
            </Text>
          </View>

          <View
            style={[
              styles.headerRight,
              isMobile && styles.headerRightMobile,
            ]}
          >
            <TouchableOpacity
              style={[
                styles.monthButton,
                isMobile && styles.monthButtonMobile,
              ]}
              onPress={() =>
                setShowMonthSelector(
                  !showMonthSelector
                )
              }
            >
              <Text
                style={
                  styles.monthIcon
                }
              >
                ◷
              </Text>

              <View>
                <Text
                  style={
                    styles.monthButtonLabel
                  }
                >
                  REPORTING PERIOD
                </Text>

                <Text
                  style={
                    styles.monthButtonValue
                  }
                >
                  {
                    MONTHS[
                      selectedMonth
                    ]
                  }{" "}
                  {
                    selectedYear
                  }
                </Text>
              </View>

              <Text
                style={
                  styles.chevron
                }
              >
                {showMonthSelector
                  ? "▲"
                  : "▼"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ==================================================
            MONTH SELECTOR
            ================================================== */}

        {showMonthSelector && (
          <View
            style={[
              styles.monthSelector,
              isMobile && styles.monthSelectorMobile,
            ]}
          >
            <View
              style={
                styles.yearRow
              }
            >
              <TouchableOpacity
                style={
                  styles.yearButton
                }
                onPress={() =>
                  setSelectedYear(
                    selectedYear -
                      1
                  )
                }
              >
                <Text
                  style={
                    styles.yearArrow
                  }
                >
                  ‹
                </Text>
              </TouchableOpacity>

              <Text
                style={
                  styles.yearText
                }
              >
                {selectedYear}
              </Text>

              <TouchableOpacity
                style={
                  styles.yearButton
                }
                onPress={() =>
                  setSelectedYear(
                    selectedYear +
                      1
                  )
                }
              >
                <Text
                  style={
                    styles.yearArrow
                  }
                >
                  ›
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.monthGrid,
                isMobile && styles.monthGridMobile,
              ]}
            >
              {MONTHS.map(
                (
                  month,
                  index
                ) => (
                  <TouchableOpacity
                    key={
                      month
                    }
                    style={[
                      styles.monthOption,
                      isMobile && styles.monthOptionMobile,
                      selectedMonth ===
                        index &&
                        styles.monthOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedMonth(
                        index
                      );

                      setShowMonthSelector(
                        false
                      );
                    }}
                  >
                    <Text
                      style={[
                        styles.monthOptionText,
                        selectedMonth ===
                          index &&
                          styles.monthOptionTextActive,
                      ]}
                    >
                      {
                        month
                      }
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        )}

        {/* ==================================================
            KPI CARDS
            ================================================== */}

        <View
          style={[
            styles.kpiGrid,
            isMobile && styles.kpiGridMobile,
          ]}
        >
          <KpiCard
            label="TOTAL INCOME"
            value={`₹${formatAmount(
              totalIncome
            )}`}
            description={`${filteredContributions.length} contribution${
              filteredContributions.length ===
              1
                ? ""
                : "s"
            }`}
            icon="↑"
            type="income"
            mobile={isMobile}
          />

          <KpiCard
            label="TOTAL EXPENSES"
            value={`₹${formatAmount(
              totalExpense
            )}`}
            description={`${filteredExpenses.length} expense${
              filteredExpenses.length ===
              1
                ? ""
                : "s"
            }`}
            icon="↓"
            type="expense"
            mobile={isMobile}
          />

          <KpiCard
            label="NET BALANCE"
            value={`₹${formatAmount(
              netBalance
            )}`}
            description={
              netBalance >= 0
                ? "Positive balance"
                : "Expense exceeds income"
            }
            icon={
              netBalance >= 0
                ? "✓"
                : "!"
            }
            type={
              netBalance >= 0
                ? "balance"
                : "negative"
            }
            mobile={isMobile}
          />

          <KpiCard
            label="CONTRIBUTORS"
            value={
              contributorIds.size
            }
            description="Unique contributors"
            icon="P"
            type="people"
            mobile={isMobile}
          />
        </View>

        {/* ==================================================
            QUICK ACTIONS
            ================================================== */}

        <View
          style={[
            styles.quickActions,
            isMobile && styles.quickActionsMobile,
          ]}
        >
          <QuickAction
            icon="+"
            title="Contribution"
            subtitle="Record income"
            onPress={() =>
              navigateTo(
                "/contributions"
              )
            }
            type="income"
            mobile={isMobile}
          />

          <QuickAction
            icon="+"
            title="Expense"
            subtitle="Record spending"
            onPress={() =>
              navigateTo(
                "/expenses"
              )
            }
            type="expense"
            mobile={isMobile}
          />

          <QuickAction
            icon="+"
            title="Person"
            subtitle="Add volunteer / donor"
            onPress={() =>
              navigateTo(
                "/people"
              )
            }
            type="people"
            mobile={isMobile}
          />

          <QuickAction
            icon="+"
            title="Occasion"
            subtitle="Create an occasion"
            onPress={() =>
              navigateTo(
                "/occasions"
              )
            }
            type="occasion"
            mobile={isMobile}
          />
        </View>

        {/* ==================================================
            OCCASION FILTER
            ================================================== */}

        <View
          style={
            styles.section
          }
        >
          <View
            style={[
              styles.sectionHeader,
              isMobile && styles.sectionHeaderMobile,
            ]}
          >
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Occasion Overview
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Financial performance
                for{" "}
                {
                  MONTHS[
                    selectedMonth
                  ]
                }
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.filterScroll
            }
          >
            <FilterChip
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

            <FilterChip
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
                <FilterChip
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

        {/* ==================================================
            OCCASION CARDS
            ================================================== */}

        {occasionFilter ===
        "All" ? (
          <View
            style={[
              styles.occasionGrid,
              isMobile && styles.occasionGridMobile,
            ]}
          >
            {occasionSummary.length ===
            0 ? (
              <EmptyState
                title="No occasion transactions"
                description="Contributions and expenses linked to occasions will appear here."
              />
            ) : (
              occasionSummary
                .slice(0, 6)
                .map(
                  (item) => (
                    <OccasionCard
                      key={
                        item.id
                      }
                      item={
                        item
                      }
                      mobile={isMobile}
                    />
                  )
                )
            )}
          </View>
        ) : (
          <View
            style={[
              styles.filteredSummaryCard,
              isMobile && styles.filteredSummaryCardMobile,
            ]}
          >
            <Text
              style={
                styles.filteredSummaryTitle
              }
            >
              {occasionFilter ===
              "General"
                ? "General Transactions"
                : occasionSummary.find(
                    (item) =>
                      item.id ===
                      occasionFilter
                  )?.name ||
                  "Selected Occasion"}
            </Text>

            <View
              style={
                styles.filteredSummaryValues
              }
            >
              <SummaryValue
                label="Income"
                value={`₹${formatAmount(
                  totalIncome
                )}`}
                type="income"
              />

              <SummaryValue
                label="Expenses"
                value={`₹${formatAmount(
                  totalExpense
                )}`}
                type="expense"
              />

              <SummaryValue
                label="Balance"
                value={`₹${formatAmount(
                  netBalance
                )}`}
                type={
                  netBalance >=
                  0
                    ? "balance"
                    : "expense"
                }
              />
            </View>
          </View>
        )}

        {/* ==================================================
            MONTHLY CHART
            ================================================== */}

        <View
          style={[
            styles.chartCard,
            isMobile && styles.chartCardMobile,
          ]}
        >
          <View
            style={[
              styles.sectionHeader,
              isMobile && styles.sectionHeaderMobile,
            ]}
          >
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Income vs Expenses
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Monthly financial trend
                for {selectedYear}
              </Text>
            </View>

            <View
              style={
                styles.legend
              }
            >
              <Legend
                label="Income"
                type="income"
              />

              <Legend
                label="Expense"
                type="expense"
              />
            </View>
          </View>

          <View
            style={[
              styles.chart,
              isMobile && styles.chartMobile,
            ]}
          >
            {monthlyData.map(
              (
                item,
                index
              ) => {
                const incomeHeight =
                  item.income === 0
                    ? 4
                    : Math.max(
                        8,
                        (item.income /
                          chartMax) *
                          150
                      );

                const expenseHeight =
                  item.expense === 0
                    ? 4
                    : Math.max(
                        8,
                        (item.expense /
                          chartMax) *
                          150
                      );

                const selected =
                  index ===
                  selectedMonth;

                return (
                  <View
                    key={
                      item.label
                    }
                    style={[
                      styles.chartColumn,
                      selected &&
                        styles.chartColumnSelected,
                    ]}
                  >
                    <View
                      style={
                        styles.bars
                      }
                    >
                      <View
                        style={[
                          styles.bar,
                          styles.incomeBar,
                          {
                            height:
                              incomeHeight,
                          },
                        ]}
                      />

                      <View
                        style={[
                          styles.bar,
                          styles.expenseBar,
                          {
                            height:
                              expenseHeight,
                          },
                        ]}
                      />
                    </View>

                    <Text
                      style={[
                        styles.chartLabel,
                        selected &&
                          styles.chartLabelSelected,
                      ]}
                    >
                      {
                        item.label
                      }
                    </Text>
                  </View>
                );
              }
            )}
          </View>
        </View>

        {/* ==================================================
            TWO COLUMN SECTION
            ================================================== */}

        <View
          style={[
            styles.twoColumn,
            isMobile && styles.twoColumnMobile,
          ]}
        >
          {/* TOP CONTRIBUTORS */}

          <View
            style={[
              styles.panel,
              isMobile && styles.panelMobile,
            ]}
          >
            <View
              style={
                styles.panelHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Top Contributors
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Highest contributions
                  this month
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  navigateTo(
                    "/contributions"
                  )
                }
              >
                <Text
                  style={
                    styles.viewAll
                  }
                >
                  View all
                </Text>
              </TouchableOpacity>
            </View>

            {topContributors.length ===
            0 ? (
              <EmptyMini
                text="No contributions this month"
              />
            ) : (
              <View
                style={
                  styles.contributorList
                }
              >
                {topContributors.map(
                  (
                    person,
                    index
                  ) => (
                    <View
                      key={
                        person.id
                      }
                      style={
                        styles.contributorRow
                      }
                    >
                      <Text
                        style={
                          styles.rank
                        }
                      >
                        {index +
                          1}
                      </Text>

                      <View
                        style={
                          styles.contributorAvatar
                        }
                      >
                        <Text
                          style={
                            styles.contributorAvatarText
                          }
                        >
                          {getInitials(
                            person.name
                          )}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.contributorInfo
                        }
                      >
                        <Text
                          style={
                            styles.contributorName
                          }
                        >
                          {
                            person.name
                          }
                        </Text>

                        <Text
                          style={
                            styles.contributorMeta
                          }
                        >
                          {
                            person.transactions
                          }{" "}
                          transaction
                          {person.transactions ===
                          1
                            ? ""
                            : "s"}
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.contributorAmount
                        }
                      >
                        ₹
                        {formatAmount(
                          person.amount
                        )}
                      </Text>
                    </View>
                  )
                )}
              </View>
            )}
          </View>

          {/* ALL TIME SNAPSHOT */}

          <View
            style={[
              styles.panel,
              isMobile && styles.panelMobile,
            ]}
          >
            <View
              style={
                styles.panelHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Overall Snapshot
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Since the system
                  started
                </Text>
              </View>
            </View>

            <View
              style={
                styles.snapshotList
              }
            >
              <SnapshotRow
                label="Total Income"
                value={`₹${formatAmount(
                  allTimeIncome
                )}`}
                type="income"
              />

              <SnapshotRow
                label="Total Expenses"
                value={`₹${formatAmount(
                  allTimeExpense
                )}`}
                type="expense"
              />

              <SnapshotRow
                label="Current Balance"
                value={`₹${formatAmount(
                  allTimeBalance
                )}`}
                type={
                  allTimeBalance >=
                  0
                    ? "balance"
                    : "expense"
                }
                last
              />
            </View>

            <View
              style={
                styles.snapshotFooter
              }
            >
              <Text
                style={
                  styles.snapshotFooterText
                }
              >
                {people.length} people
                {"  •  "}
                {occasions.length} occasions
              </Text>
            </View>
          </View>
        </View>

        {/* ==================================================
            RECENT TRANSACTIONS
            ================================================== */}

        <View
          style={
            styles.panel
          }
        >
          <View
            style={
              styles.panelHeader
            }
          >
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Recent Transactions
              </Text>

              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Latest income and expense
                entries
              </Text>
            </View>

            <View
              style={
                styles.transactionLinks
              }
            >
              <TouchableOpacity
                onPress={() =>
                  navigateTo(
                    "/contributions"
                  )
                }
              >
                <Text
                  style={
                    styles.viewAll
                  }
                >
                  Income
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  navigateTo(
                    "/expenses"
                  )
                }
              >
                <Text
                  style={
                    styles.viewAll
                  }
                >
                  Expenses
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {recentTransactions.length ===
          0 ? (
            <EmptyMini
              text="No transactions for this period"
            />
          ) : (
            <View
              style={
                styles.transactionList
              }
            >
              {recentTransactions.map(
                (
                  transaction
                ) => (
                  <TransactionRow
                    key={
                      transaction.id
                    }
                    transaction={
                      transaction
                    }
                    mobile={isMobile}
                  />
                )
              )}
            </View>
          )}
        </View>

        {/* ==================================================
            QUICK SUMMARY FOOTER
            ================================================== */}

        <View
          style={[
            styles.footerSummary,
            isMobile && styles.footerSummaryMobile,
          ]}
        >
          <View>
            <Text
              style={
                styles.footerEyebrow
              }
            >
              {MONTHS[
                selectedMonth
              ].toUpperCase()}{" "}
              SUMMARY
            </Text>

            <Text
              style={
                styles.footerTitle
              }
            >
              {netBalance >=
              0
                ? "Your finances are in a positive position."
                : "Expenses are currently higher than income."}
            </Text>
          </View>

          <Text
            style={[
              styles.footerBalance,
              {
                color:
                  netBalance >=
                  0
                    ? COLORS.success
                    : COLORS.danger,
              },
            ]}
          >
            ₹
            {formatAmount(
              netBalance
            )}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ==================================================
// KPI CARD
// ==================================================

function KpiCard({
  label,
  value,
  description,
  icon,
  type,
  mobile = false,
}) {
  const config = {
    income: {
      color: COLORS.success,
      background: "#ECFDF5",
    },
    expense: {
      color: COLORS.danger,
      background: "#FEF2F2",
    },
    balance: {
      color: COLORS.primary,
      background: "#EEF2FF",
    },
    negative: {
      color: COLORS.danger,
      background: "#FEF2F2",
    },
    people: {
      color: "#8B5CF6",
      background: "#F5F3FF",
    },
  };

  const current =
    config[type] ||
    config.balance;

  return (
    <View
      style={[
        styles.kpiCard,
        mobile && styles.kpiCardMobile,
      ]}
    >
      <View
        style={
          styles.kpiTop
        }
      >
        <Text
          style={
            styles.kpiLabel
          }
        >
          {label}
        </Text>

        <View
          style={[
            styles.kpiIcon,
            {
              backgroundColor:
                current.background,
            },
          ]}
        >
          <Text
            style={[
              styles.kpiIconText,
              {
                color:
                  current.color,
              },
            ]}
          >
            {icon}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.kpiValue,
          mobile && styles.kpiValueMobile,
        ]}
      >
        {value}
      </Text>

      <Text
        style={
          styles.kpiDescription
        }
      >
        {description}
      </Text>
    </View>
  );
}

// ==================================================
// QUICK ACTION
// ==================================================

function QuickAction({
  icon,
  title,
  subtitle,
  onPress,
  type,
  mobile = false,
}) {
  const colors = {
    income: COLORS.success,
    expense: COLORS.danger,
    people: "#8B5CF6",
    occasion: COLORS.primary,
  };

  const color =
    colors[type] ||
    COLORS.primary;

  return (
    <TouchableOpacity
      style={[
        styles.quickAction,
        mobile && styles.quickActionMobile,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.quickActionIcon,
          {
            backgroundColor:
              `${color}15`,
          },
        ]}
      >
        <Text
          style={[
            styles.quickActionIconText,
            { color },
          ]}
        >
          {icon}
        </Text>
      </View>

      <View
        style={
          styles.quickActionInfo
        }
      >
        <Text
          style={
            styles.quickActionTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.quickActionSubtitle
          }
        >
          {subtitle}
        </Text>
      </View>

      <Text
        style={
          styles.quickActionArrow
        }
      >
        ›
      </Text>
    </TouchableOpacity>
  );
}

// ==================================================
// FILTER CHIP
// ==================================================

function FilterChip({
  label,
  active,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        active &&
          styles.filterChipActive,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterChipText,
          active &&
            styles.filterChipTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ==================================================
// OCCASION CARD
// ==================================================

function OccasionCard({
  item,
  mobile = false,
}) {
  const balancePositive =
    item.balance >= 0;

  return (
    <View
      style={[
        styles.occasionCard,
        mobile && styles.occasionCardMobile,
      ]}
    >
      <View
        style={
          styles.occasionCardHeader
        }
      >
        <View
          style={
            styles.occasionBadge
          }
        >
          <Text
            style={
              styles.occasionBadgeText
            }
          >
            O
          </Text>
        </View>

        <View
          style={
            styles.occasionCardTitleArea
          }
        >
          <Text
            style={
              styles.occasionCardTitle
            }
            numberOfLines={1}
          >
            {item.name}
          </Text>

          <Text
            style={
              styles.occasionCardMeta
            }
          >
            {item.contributorCount}{" "}
            contributor
            {item.contributorCount ===
            1
              ? ""
              : "s"}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.occasionNumbers
        }
      >
        <View>
          <Text
            style={
              styles.occasionNumberLabel
            }
          >
            INCOME
          </Text>

          <Text
            style={
              styles.occasionIncome
            }
          >
            ₹
            {formatAmount(
              item.income
            )}
          </Text>
        </View>

        <View>
          <Text
            style={
              styles.occasionNumberLabel
            }
          >
            EXPENSE
          </Text>

          <Text
            style={
              styles.occasionExpense
            }
          >
            ₹
            {formatAmount(
              item.expense
            )}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.occasionBalanceRow
        }
      >
        <Text
          style={
            styles.occasionBalanceLabel
          }
        >
          BALANCE
        </Text>

        <Text
          style={[
            styles.occasionBalance,
            {
              color:
                balancePositive
                  ? COLORS.success
                  : COLORS.danger,
            },
          ]}
        >
          ₹
          {formatAmount(
            item.balance
          )}
        </Text>
      </View>
    </View>
  );
}

// ==================================================
// SUMMARY VALUE
// ==================================================

function SummaryValue({
  label,
  value,
  type,
}) {
  const color =
    type === "income"
      ? COLORS.success
      : type === "expense"
      ? COLORS.danger
      : COLORS.primary;

  return (
    <View
      style={
        styles.summaryValueBox
      }
    >
      <Text
        style={
          styles.summaryValueLabel
        }
      >
        {label}
      </Text>

      <Text
        style={[
          styles.summaryValueAmount,
          { color },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ==================================================
// LEGEND
// ==================================================

function Legend({
  label,
  type,
}) {
  const color =
    type === "income"
      ? COLORS.success
      : COLORS.danger;

  return (
    <View
      style={
        styles.legendItem
      }
    >
      <View
        style={[
          styles.legendDot,
          {
            backgroundColor:
              color,
          },
        ]}
      />

      <Text
        style={
          styles.legendText
        }
      >
        {label}
      </Text>
    </View>
  );
}

// ==================================================
// SNAPSHOT ROW
// ==================================================

function SnapshotRow({
  label,
  value,
  type,
  last,
}) {
  const color =
    type === "income"
      ? COLORS.success
      : type === "expense"
      ? COLORS.danger
      : COLORS.primary;

  return (
    <View
      style={[
        styles.snapshotRow,
        !last &&
          styles.snapshotBorder,
      ]}
    >
      <Text
        style={
          styles.snapshotLabel
        }
      >
        {label}
      </Text>

      <Text
        style={[
          styles.snapshotValue,
          { color },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ==================================================
// TRANSACTION ROW
// ==================================================

function TransactionRow({
  transaction,
  mobile = false,
}) {
  const income =
    transaction.type ===
    "income";

  return (
    <View
      style={[
        styles.transactionRow,
        mobile && styles.transactionRowMobile,
      ]}
    >
      <View
        style={[
          styles.transactionIcon,
          {
            backgroundColor:
              income
                ? "#ECFDF5"
                : "#FEF2F2",
          },
        ]}
      >
        <Text
          style={[
            styles.transactionIconText,
            {
              color:
                income
                  ? COLORS.success
                  : COLORS.danger,
            },
          ]}
        >
          {income
            ? "↑"
            : "↓"}
        </Text>
      </View>

      <View
        style={
          styles.transactionInfo
        }
      >
        <Text
          style={
            styles.transactionTitle
          }
          numberOfLines={1}
        >
          {transaction.title}
        </Text>

        <Text
          style={
            styles.transactionSubtitle
          }
          numberOfLines={1}
        >
          {transaction.subtitle}
        </Text>
      </View>

      <View
        style={[
          styles.transactionDate,
          mobile && styles.transactionDateMobile,
        ]}
      >
        <Text
          style={
            styles.transactionDateText
          }
        >
          {formatTransactionDate(transaction.dateKey || transaction.date)}
        </Text>

        <Text
          style={
            styles.transactionPayment
          }
        >
          {transaction.paymentMode}
        </Text>
      </View>

      <Text
        style={[
          styles.transactionAmount,
          mobile && styles.transactionAmountMobile,
          {
            color:
              income
                ? COLORS.success
                : COLORS.danger,
          },
        ]}
      >
        {income
          ? "+"
          : "-"}
        ₹
        {formatAmount(
          transaction.amount
        )}
      </Text>
    </View>
  );
}

// ==================================================
// EMPTY STATES
// ==================================================

function EmptyState({
  title,
  description,
}) {
  return (
    <View
      style={
        styles.emptyState
      }
    >
      <Text
        style={
          styles.emptyStateIcon
        }
      >
        ◌
      </Text>

      <Text
        style={
          styles.emptyStateTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.emptyStateDescription
        }
      >
        {description}
      </Text>
    </View>
  );
}

function EmptyMini({
  text,
}) {
  return (
    <View
      style={
        styles.emptyMini
      }
    >
      <Text
        style={
          styles.emptyMiniText
        }
      >
        {text}
      </Text>
    </View>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 32, paddingTop: 30, paddingBottom: 64, maxWidth: 1600, width: "100%", alignSelf: "center" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
  loadingText: { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.textSecondary, marginTop: 12 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 },
  headerLeft: { flex: 1 },
  eyebrow: { fontFamily: FONTS.medium, fontSize: 12, letterSpacing: 1.2, color: COLORS.primary },
  title: { fontFamily: FONTS.bold, fontSize: 36, lineHeight: 43, color: COLORS.text, marginTop: 5 },
  subtitle: { fontFamily: FONTS.regular, fontSize: 16, lineHeight: 23, color: COLORS.textSecondary, marginTop: 6 },
  headerRight: { marginLeft: 24 },
  monthButton: { minWidth: 225, minHeight: 62, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, flexDirection: "row", alignItems: "center" },
  monthIcon: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.primary, marginRight: 11 },
  monthButtonLabel: { fontFamily: FONTS.medium, fontSize: 11, letterSpacing: 0.8, color: COLORS.textMuted },
  monthButtonValue: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text, marginTop: 3 },
  chevron: { marginLeft: "auto", fontFamily: FONTS.bold, fontSize: 12, color: COLORS.textMuted },

  monthSelector: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 18, marginBottom: 22 },
  yearRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  yearButton: { width: 38, height: 36, borderRadius: 9, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  yearArrow: { fontFamily: FONTS.bold, fontSize: 23, color: COLORS.textSecondary },
  yearText: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.text, marginHorizontal: 24 },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  monthOption: { width: "15.4%", minWidth: 95, height: 42, borderRadius: 9, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" },
  monthOptionActive: { backgroundColor: COLORS.primary },
  monthOptionText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary },
  monthOptionTextActive: { fontFamily: FONTS.medium, color: "#FFFFFF" },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 18 },
  kpiCard: { flex: 1, minWidth: 230, minHeight: 145, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 20 },
  kpiTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kpiLabel: { fontFamily: FONTS.medium, fontSize: 12, letterSpacing: 0.8, color: COLORS.textMuted },
  kpiIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  kpiIconText: { fontFamily: FONTS.bold, fontSize: 17 },
  kpiValue: { fontFamily: FONTS.bold, fontSize: 30, lineHeight: 38, color: COLORS.text, marginTop: 17 },
  kpiValueMobile: { fontSize: 22, lineHeight: 28, marginTop: 12 },
  kpiDescription: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 6 },

  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 32 },
  quickAction: { flex: 1, minWidth: 220, minHeight: 76, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 13, paddingHorizontal: 15, paddingVertical: 13, flexDirection: "row", alignItems: "center" },
  quickActionIcon: { width: 44, height: 44, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  quickActionIconText: { fontFamily: FONTS.bold, fontSize: 23 },
  quickActionInfo: { flex: 1, marginLeft: 12 },
  quickActionTitle: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.text },
  quickActionSubtitle: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted, marginTop: 3 },
  quickActionArrow: { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.textMuted },

  section: { marginBottom: 18 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 20, lineHeight: 25, color: COLORS.text },
  sectionSubtitle: { fontFamily: FONTS.regular, fontSize: 14, lineHeight: 20, color: COLORS.textMuted, marginTop: 4 },
  filterScroll: { gap: 8, paddingBottom: 3 },
  filterChip: { height: 40, paddingHorizontal: 16, borderRadius: 9, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterChipText: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.textSecondary },
  filterChipTextActive: { fontFamily: FONTS.medium, color: "#FFFFFF" },

  occasionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 28 },
  occasionCard: { flex: 1, minWidth: 300, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 20 },
  occasionCardHeader: { flexDirection: "row", alignItems: "center" },
  occasionBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" },
  occasionBadgeText: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.primary },
  occasionCardTitleArea: { flex: 1, marginLeft: 12 },
  occasionCardTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.text },
  occasionCardMeta: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  occasionNumbers: { flexDirection: "row", justifyContent: "space-between", marginTop: 22 },
  occasionNumberLabel: { fontFamily: FONTS.medium, fontSize: 11, letterSpacing: 0.7, color: COLORS.textMuted },
  occasionIncome: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.success, marginTop: 4 },
  occasionExpense: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.danger, marginTop: 4 },
  occasionBalanceRow: { marginTop: 18, paddingTop: 13, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  occasionBalanceLabel: { fontFamily: FONTS.medium, fontSize: 11, letterSpacing: 0.7, color: COLORS.textMuted },
  occasionBalance: { fontFamily: FONTS.bold, fontSize: 19 },

  filteredSummaryCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 20, marginBottom: 28 },
  filteredSummaryTitle: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.text, marginBottom: 17 },
  filteredSummaryValues: { flexDirection: "row", gap: 12 },
  summaryValueBox: { flex: 1, padding: 15, borderRadius: 11, backgroundColor: "#F8FAFC" },
  summaryValueLabel: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.textMuted },
  summaryValueAmount: { fontFamily: FONTS.bold, fontSize: 20, marginTop: 6 },

  chartCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 20, marginBottom: 28 },
  legend: { flexDirection: "row", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 9, height: 9, borderRadius: 5, marginRight: 6 },
  legendText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textSecondary },
  chart: { height: 220, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingTop: 18 },
  chartColumn: { flex: 1, height: 205, alignItems: "center", justifyContent: "flex-end", borderRadius: 8, paddingHorizontal: 4 },
  chartColumnSelected: { backgroundColor: "#F8FAFC" },
  bars: { height: 175, flexDirection: "row", alignItems: "flex-end", gap: 4 },
  bar: { width: 10, borderRadius: 5, minHeight: 4 },
  incomeBar: { backgroundColor: COLORS.success },
  expenseBar: { backgroundColor: COLORS.danger },
  chartLabel: { fontFamily: FONTS.medium, fontSize: 11, color: COLORS.textMuted, marginTop: 8 },
  chartLabelSelected: { fontFamily: FONTS.bold, color: COLORS.primary },

  twoColumn: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 16 },
  panel: { flex: 1, minWidth: 380, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 20, marginBottom: 16 },
  panelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  viewAll: { fontFamily: FONTS.medium, fontSize: 13, color: COLORS.primary },

  contributorList: { gap: 3 },
  contributorRow: { flexDirection: "row", alignItems: "center", minHeight: 62 },
  rank: { width: 24, fontFamily: FONTS.bold, fontSize: 12, color: COLORS.textMuted },
  contributorAvatar: { width: 40, height: 40, borderRadius: 11, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" },
  contributorAvatarText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.primary },
  contributorInfo: { flex: 1, marginLeft: 11 },
  contributorName: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text },
  contributorMeta: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  contributorAmount: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.success },

  snapshotList: { marginTop: 3 },
  snapshotRow: { minHeight: 56, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  snapshotBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  snapshotLabel: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textSecondary },
  snapshotValue: { fontFamily: FONTS.bold, fontSize: 15 },
  snapshotFooter: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  snapshotFooterText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted },

  transactionLinks: { flexDirection: "row", gap: 16 },
  transactionList: { gap: 1 },
  transactionRow: { minHeight: 68, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  transactionIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  transactionIconText: { fontFamily: FONTS.bold, fontSize: 17 },
  transactionInfo: { flex: 1, marginLeft: 12, minWidth: 0 },
  transactionTitle: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.text },
  transactionSubtitle: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  transactionDate: { width: 110, alignItems: "flex-end", marginRight: 18 },
  transactionDateText: { fontFamily: FONTS.medium, fontSize: 12, color: COLORS.textSecondary },
  transactionPayment: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 3 },
  transactionAmount: { width: 120, textAlign: "right", fontFamily: FONTS.bold, fontSize: 15 },

  emptyState: { flex: 1, minWidth: 300, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 36, alignItems: "center" },
  emptyStateIcon: { fontSize: 30, color: COLORS.textMuted },
  emptyStateTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text, marginTop: 10 },
  emptyStateDescription: { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 19, color: COLORS.textMuted, textAlign: "center", marginTop: 5, maxWidth: 320 },
  emptyMini: { minHeight: 100, alignItems: "center", justifyContent: "center" },
  emptyMiniText: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.textMuted },

  footerSummary: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footerEyebrow: { fontFamily: FONTS.medium, fontSize: 11, letterSpacing: 0.8, color: COLORS.textMuted },
  footerTitle: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.text, marginTop: 5 },
  footerBalance: { fontFamily: FONTS.bold, fontSize: 28 },

  // ==================================================
  // MOBILE RESPONSIVE STYLES
  // Desktop styles above remain unchanged.
  // ==================================================

  contentMobile: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 40,
    maxWidth: 768,
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
    fontSize: 28,
    lineHeight: 34,
  },
  subtitleMobile: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  headerRightMobile: {
    width: "100%",
    marginLeft: 0,
    marginTop: 14,
  },
  monthButtonMobile: {
    width: "100%",
    minWidth: 0,
    minHeight: 56,
  },
  monthSelectorMobile: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  monthGridMobile: {
    gap: 6,
  },
  monthOptionMobile: {
    width: "31.5%",
    minWidth: 0,
    height: 40,
  },
  kpiGridMobile: {
    gap: 10,
    marginBottom: 16,
  },
  kpiCardMobile: {
    flexBasis: "47%",
    minWidth: 0,
    minHeight: 125,
    padding: 14,
    borderRadius: 13,
  },
  quickActionsMobile: {
    gap: 10,
    marginBottom: 24,
  },
  quickActionMobile: {
    flexBasis: "47%",
    minWidth: 0,
    minHeight: 70,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  occasionGridMobile: {
    flexDirection: "column",
    gap: 10,
    marginBottom: 20,
  },
  occasionCardMobile: {
    minWidth: 0,
    width: "100%",
    padding: 14,
    borderRadius: 13,
  },
  filteredSummaryCardMobile: {
    padding: 14,
    marginBottom: 20,
  },
  chartCardMobile: {
    padding: 14,
    marginBottom: 20,
  },
  sectionHeaderMobile: {
    marginBottom: 12,
  },
  chartMobile: {
    height: 185,
    paddingTop: 10,
  },
  twoColumnMobile: {
    flexDirection: "column",
    gap: 0,
    marginBottom: 8,
  },
  panelMobile: {
    minWidth: 0,
    width: "100%",
    padding: 14,
    borderRadius: 13,
    marginBottom: 12,
  },
  transactionRowMobile: {
    minHeight: 66,
  },
  transactionDateMobile: {
    width: 72,
    marginRight: 8,
  },
  transactionAmountMobile: {
    width: 86,
    fontSize: 13,
  },
  footerSummaryMobile: {
    padding: 16,
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
});
