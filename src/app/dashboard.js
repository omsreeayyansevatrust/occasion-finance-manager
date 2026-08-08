import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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

function getDateObject(dateValue) {
  if (!dateValue) {
    return null;
  }

  if (
    typeof dateValue === "object" &&
    dateValue.toDate
  ) {
    return dateValue.toDate();
  }

  const value = String(dateValue);

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] =
      value.split("-").map(Number);

    return new Date(
      year,
      month - 1,
      day
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
  const date =
    getDateObject(dateValue);

  if (!date) {
    return false;
  }

  return (
    date.getMonth() === month &&
    date.getFullYear() === year
  );
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
            item.date,
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
        contentContainerStyle={
          styles.content
        }
      >
        {/* ==================================================
            HEADER
            ================================================== */}

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
              FINANCIAL OVERVIEW
            </Text>

            <Text
              style={styles.title}
            >
              Dashboard
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Monitor income, expenses
              and occasion finances
            </Text>
          </View>

          <View
            style={
              styles.headerRight
            }
          >
            <TouchableOpacity
              style={
                styles.monthButton
              }
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
            style={
              styles.monthSelector
            }
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
              style={
                styles.monthGrid
              }
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
          style={
            styles.kpiGrid
          }
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
          />

          <KpiCard
            label="CONTRIBUTORS"
            value={
              contributorIds.size
            }
            description="Unique contributors"
            icon="P"
            type="people"
          />
        </View>

        {/* ==================================================
            QUICK ACTIONS
            ================================================== */}

        <View
          style={
            styles.quickActions
          }
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
            style={
              styles.sectionHeader
            }
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
            style={
              styles.occasionGrid
            }
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
                    />
                  )
                )
            )}
          </View>
        ) : (
          <View
            style={
              styles.filteredSummaryCard
            }
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
          style={
            styles.chartCard
          }
        >
          <View
            style={
              styles.sectionHeader
            }
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
            style={
              styles.chart
            }
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
          style={
            styles.twoColumn
          }
        >
          {/* TOP CONTRIBUTORS */}

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
          style={
            styles.footerSummary
          }
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
      style={
        styles.kpiCard
      }
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
        style={
          styles.kpiValue
        }
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
      style={
        styles.quickAction
      }
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
}) {
  const balancePositive =
    item.balance >= 0;

  return (
    <View
      style={
        styles.occasionCard
      }
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
}) {
  const income =
    transaction.type ===
    "income";

  return (
    <View
      style={
        styles.transactionRow
      }
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
        style={
          styles.transactionDate
        }
      >
        <Text
          style={
            styles.transactionDateText
          }
        >
          {transaction.date}
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
  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  content: {
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 60,
  },

  loading: {
    flex: 1,
    alignItems:
      "center",
    justifyContent:
      "center",
    backgroundColor:
      COLORS.background,
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
    marginBottom: 22,
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
      COLORS.primary,
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

  headerRight: {
    marginLeft: 20,
  },

  monthButton: {
    minWidth: 190,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 11,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    backgroundColor:
      COLORS.surface,
    flexDirection:
      "row",
    alignItems:
      "center",
  },

  monthIcon: {
    fontFamily:
      FONTS.bold,
    fontSize: 18,
    color:
      COLORS.primary,
    marginRight: 9,
  },

  monthButtonLabel: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 8,
    letterSpacing: 0.7,
    color:
      COLORS.textMuted,
  },

  monthButtonValue: {
    fontFamily:
      FONTS.bold,
    fontSize: 12,
    color:
      COLORS.text,
    marginTop: 2,
  },

  chevron: {
    marginLeft: "auto",
    fontSize: 9,
    color:
      COLORS.textMuted,
  },

  // MONTH SELECTOR

  monthSelector: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 14,
    padding: 15,
    marginBottom: 18,
  },

  yearRow: {
    flexDirection:
      "row",
    alignItems:
      "center",
    justifyContent:
      "center",
    marginBottom: 12,
  },

  yearButton: {
    width: 32,
    height: 30,
    borderRadius: 8,
    backgroundColor:
      "#F1F5F9",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  yearArrow: {
    fontFamily:
      FONTS.bold,
    fontSize: 20,
    color:
      COLORS.textSecondary,
  },

  yearText: {
    fontFamily:
      FONTS.bold,
    fontSize: 15,
    color:
      COLORS.text,
    marginHorizontal: 20,
  },

  monthGrid: {
    flexDirection:
      "row",
    flexWrap:
      "wrap",
    gap: 7,
  },

  monthOption: {
    width: "15.4%",
    minWidth: 90,
    height: 35,
    borderRadius: 8,
    backgroundColor:
      "#F8FAFC",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  monthOptionActive: {
    backgroundColor:
      COLORS.primary,
  },

  monthOptionText: {
    fontFamily:
      FONTS.medium,
    fontSize: 10,
    color:
      COLORS.textSecondary,
  },

  monthOptionTextActive: {
    fontFamily:
      FONTS.semiBold,
    color: "#FFFFFF",
  },

  // KPI

  kpiGrid: {
    flexDirection:
      "row",
    flexWrap:
      "wrap",
    gap: 14,
    marginBottom: 14,
  },

  kpiCard: {
    flex: 1,
    minWidth: 205,
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 15,
    padding: 17,
  },

  kpiTop: {
    flexDirection:
      "row",
    alignItems:
      "center",
    justifyContent:
      "space-between",
  },

  kpiLabel: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 9,
    letterSpacing: 0.7,
    color:
      COLORS.textMuted,
  },

  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  kpiIconText: {
    fontFamily:
      FONTS.bold,
    fontSize: 14,
  },

  kpiValue: {
    fontFamily:
      FONTS.extraBold,
    fontSize: 22,
    color:
      COLORS.text,
    marginTop: 13,
  },

  kpiDescription: {
    fontFamily:
      FONTS.regular,
    fontSize: 9,
    color:
      COLORS.textMuted,
    marginTop: 4,
  },

  // QUICK ACTIONS

  quickActions: {
    flexDirection:
      "row",
    flexWrap:
      "wrap",
    gap: 10,
    marginBottom: 25,
  },

  quickAction: {
    flex: 1,
    minWidth: 190,
    minHeight: 62,
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 12,
    padding: 11,
    flexDirection:
      "row",
    alignItems:
      "center",
  },

  quickActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  quickActionIconText: {
    fontFamily:
      FONTS.bold,
    fontSize: 19,
  },

  quickActionInfo: {
    flex: 1,
    marginLeft: 9,
  },

  quickActionTitle: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 11,
    color:
      COLORS.text,
  },

  quickActionSubtitle: {
    fontFamily:
      FONTS.regular,
    fontSize: 9,
    color:
      COLORS.textMuted,
    marginTop: 2,
  },

  quickActionArrow: {
    fontFamily:
      FONTS.bold,
    fontSize: 18,
    color:
      COLORS.textMuted,
  },

  // SECTIONS

  section: {
    marginBottom: 12,
  },

  sectionHeader: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    marginBottom: 13,
  },

  sectionTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 15,
    color:
      COLORS.text,
  },

  sectionSubtitle: {
    fontFamily:
      FONTS.regular,
    fontSize: 10,
    color:
      COLORS.textMuted,
    marginTop: 3,
  },

  filterScroll: {
    gap: 7,
    paddingBottom: 2,
  },

  filterChip: {
    height: 33,
    paddingHorizontal: 13,
    borderRadius: 8,
    backgroundColor:
      "#F1F5F9",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  filterChipActive: {
    backgroundColor:
      COLORS.primary,
  },

  filterChipText: {
    fontFamily:
      FONTS.medium,
    fontSize: 10,
    color:
      COLORS.textSecondary,
  },

  filterChipTextActive: {
    fontFamily:
      FONTS.semiBold,
    color: "#FFFFFF",
  },

  // OCCASIONS

  occasionGrid: {
    flexDirection:
      "row",
    flexWrap:
      "wrap",
    gap: 12,
    marginBottom: 22,
  },

  occasionCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 15,
    padding: 16,
  },

  occasionCardHeader: {
    flexDirection:
      "row",
    alignItems:
      "center",
  },

  occasionBadge: {
    width: 39,
    height: 39,
    borderRadius: 11,
    backgroundColor:
      "#EEF2FF",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  occasionBadgeText: {
    fontFamily:
      FONTS.bold,
    fontSize: 14,
    color:
      COLORS.primary,
  },

  occasionCardTitleArea: {
    flex: 1,
    marginLeft: 10,
  },

  occasionCardTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 12,
    color:
      COLORS.text,
  },

  occasionCardMeta: {
    fontFamily:
      FONTS.regular,
    fontSize: 9,
    color:
      COLORS.textMuted,
    marginTop: 3,
  },

  occasionNumbers: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    marginTop: 18,
  },

  occasionNumberLabel: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 8,
    letterSpacing: 0.6,
    color:
      COLORS.textMuted,
  },

  occasionIncome: {
    fontFamily:
      FONTS.bold,
    fontSize: 13,
    color:
      COLORS.success,
    marginTop: 3,
  },

  occasionExpense: {
    fontFamily:
      FONTS.bold,
    fontSize: 13,
    color:
      COLORS.danger,
    marginTop: 3,
  },

  occasionBalanceRow: {
    marginTop: 15,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor:
      COLORS.border,
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "center",
  },

  occasionBalanceLabel: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 8,
    letterSpacing: 0.6,
    color:
      COLORS.textMuted,
  },

  occasionBalance: {
    fontFamily:
      FONTS.extraBold,
    fontSize: 15,
  },

  // FILTERED SUMMARY

  filteredSummaryCard: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 15,
    padding: 18,
    marginBottom: 22,
  },

  filteredSummaryTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 14,
    color:
      COLORS.text,
    marginBottom: 15,
  },

  filteredSummaryValues: {
    flexDirection:
      "row",
    gap: 10,
  },

  summaryValueBox: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor:
      "#F8FAFC",
  },

  summaryValueLabel: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 8,
    color:
      COLORS.textMuted,
  },

  summaryValueAmount: {
    fontFamily:
      FONTS.extraBold,
    fontSize: 16,
    marginTop: 5,
  },

  // CHART

  chartCard: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 15,
    padding: 18,
    marginBottom: 22,
  },

  legend: {
    flexDirection:
      "row",
    gap: 12,
  },

  legendItem: {
    flexDirection:
      "row",
    alignItems:
      "center",
  },

  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 4,
  },

  legendText: {
    fontFamily:
      FONTS.regular,
    fontSize: 9,
    color:
      COLORS.textSecondary,
  },

  chart: {
    height: 190,
    flexDirection:
      "row",
    alignItems:
      "flex-end",
    justifyContent:
      "space-around",
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.border,
    paddingTop: 15,
  },

  chartColumn: {
    flex: 1,
    height: 180,
    alignItems:
      "center",
    justifyContent:
      "flex-end",
    borderRadius: 7,
    paddingHorizontal: 3,
  },

  chartColumnSelected: {
    backgroundColor:
      "#F8FAFC",
  },

  bars: {
    height: 155,
    flexDirection:
      "row",
    alignItems:
      "flex-end",
    gap: 3,
  },

  bar: {
    width: 7,
    borderRadius: 4,
    minHeight: 4,
  },

  incomeBar: {
    backgroundColor:
      COLORS.success,
  },

  expenseBar: {
    backgroundColor:
      COLORS.danger,
  },

  chartLabel: {
    fontFamily:
      FONTS.medium,
    fontSize: 8,
    color:
      COLORS.textMuted,
    marginTop: 7,
  },

  chartLabelSelected: {
    fontFamily:
      FONTS.bold,
    color:
      COLORS.primary,
  },

  // TWO COLUMN

  twoColumn: {
    flexDirection:
      "row",
    flexWrap:
      "wrap",
    gap: 14,
    marginBottom: 14,
  },

  panel: {
    flex: 1,
    minWidth: 360,
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 15,
    padding: 18,
    marginBottom: 14,
  },

  panelHeader: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "flex-start",
    marginBottom: 14,
  },

  viewAll: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 10,
    color:
      COLORS.primary,
  },

  // CONTRIBUTORS

  contributorList: {
    gap: 2,
  },

  contributorRow: {
    flexDirection:
      "row",
    alignItems:
      "center",
    minHeight: 54,
  },

  rank: {
    width: 20,
    fontFamily:
      FONTS.bold,
    fontSize: 10,
    color:
      COLORS.textMuted,
  },

  contributorAvatar: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor:
      "#EEF2FF",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  contributorAvatarText: {
    fontFamily:
      FONTS.bold,
    fontSize: 10,
    color:
      COLORS.primary,
  },

  contributorInfo: {
    flex: 1,
    marginLeft: 9,
  },

  contributorName: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 11,
    color:
      COLORS.text,
  },

  contributorMeta: {
    fontFamily:
      FONTS.regular,
    fontSize: 8,
    color:
      COLORS.textMuted,
    marginTop: 2,
  },

  contributorAmount: {
    fontFamily:
      FONTS.bold,
    fontSize: 11,
    color:
      COLORS.success,
  },

  // SNAPSHOT

  snapshotList: {
    marginTop: 2,
  },

  snapshotRow: {
    minHeight: 48,
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "center",
  },

  snapshotBorder: {
    borderBottomWidth: 1,
    borderBottomColor:
      "#F1F5F9",
  },

  snapshotLabel: {
    fontFamily:
      FONTS.medium,
    fontSize: 10,
    color:
      COLORS.textSecondary,
  },

  snapshotValue: {
    fontFamily:
      FONTS.bold,
    fontSize: 12,
  },

  snapshotFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor:
      COLORS.border,
  },

  snapshotFooterText: {
    fontFamily:
      FONTS.regular,
    fontSize: 9,
    color:
      COLORS.textMuted,
  },

  // TRANSACTIONS

  transactionLinks: {
    flexDirection:
      "row",
    gap: 12,
  },

  transactionList: {
    gap: 1,
  },

  transactionRow: {
    minHeight: 58,
    flexDirection:
      "row",
    alignItems:
      "center",
    borderBottomWidth: 1,
    borderBottomColor:
      "#F1F5F9",
  },

  transactionIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  transactionIconText: {
    fontFamily:
      FONTS.bold,
    fontSize: 14,
  },

  transactionInfo: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
  },

  transactionTitle: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 11,
    color:
      COLORS.text,
  },

  transactionSubtitle: {
    fontFamily:
      FONTS.regular,
    fontSize: 8,
    color:
      COLORS.textMuted,
    marginTop: 2,
  },

  transactionDate: {
    width: 100,
    alignItems:
      "flex-end",
    marginRight: 15,
  },

  transactionDateText: {
    fontFamily:
      FONTS.medium,
    fontSize: 9,
    color:
      COLORS.textSecondary,
  },

  transactionPayment: {
    fontFamily:
      FONTS.regular,
    fontSize: 8,
    color:
      COLORS.textMuted,
    marginTop: 2,
  },

  transactionAmount: {
    width: 100,
    textAlign:
      "right",
    fontFamily:
      FONTS.bold,
    fontSize: 11,
  },

  // EMPTY

  emptyState: {
    flex: 1,
    minWidth: 260,
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 15,
    padding: 30,
    alignItems:
      "center",
  },

  emptyStateIcon: {
    fontSize: 25,
    color:
      COLORS.textMuted,
  },

  emptyStateTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 12,
    color:
      COLORS.text,
    marginTop: 8,
  },

  emptyStateDescription: {
    fontFamily:
      FONTS.regular,
    fontSize: 9,
    color:
      COLORS.textMuted,
    textAlign:
      "center",
    marginTop: 4,
    maxWidth: 280,
  },

  emptyMini: {
    minHeight: 90,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  emptyMiniText: {
    fontFamily:
      FONTS.regular,
    fontSize: 10,
    color:
      COLORS.textMuted,
  },

  // FOOTER

  footerSummary: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 15,
    padding: 20,
    flexDirection:
      "row",
    alignItems:
      "center",
    justifyContent:
      "space-between",
  },

  footerEyebrow: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 8,
    letterSpacing: 0.8,
    color:
      COLORS.textMuted,
  },

  footerTitle: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 11,
    color:
      COLORS.text,
    marginTop: 4,
  },

  footerBalance: {
    fontFamily:
      FONTS.extraBold,
    fontSize: 22,
  },
});