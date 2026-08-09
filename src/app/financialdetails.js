import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../services/firebase";

import {
  COLORS,
  FONTS,
} from "../constants/theme";

const MONTHS = [
  "All Months",
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

const MONTH_NAMES = MONTHS.slice(1);

const CURRENT_YEAR =
  new Date().getFullYear();

/* =========================================================
   HELPERS
========================================================= */

const formatAmount = (value) => {
  return Number(value || 0).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 2,
    }
  );
};

const getDateObject = (value) => {
  if (!value) return null;

  if (
    typeof value === "object" &&
    typeof value.toDate === "function"
  ) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const text = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] =
      text.split("-").map(Number);

    return new Date(
      year,
      month - 1,
      day
    );
  }

  const date = new Date(text);

  return Number.isNaN(date.getTime())
    ? null
    : date;
};

const getYear = (value) => {
  const date = getDateObject(value);
  return date
    ? date.getFullYear()
    : null;
};

const getMonth = (value) => {
  const date = getDateObject(value);
  return date
    ? date.getMonth() + 1
    : null;
};

const formatDate = (value) => {
  const date = getDateObject(value);

  if (!date) {
    return value
      ? String(value)
      : "-";
  }

  return `${String(
    date.getDate()
  ).padStart(2, "0")} ${MONTH_NAMES[
    date.getMonth()
  ].substring(0, 3)} ${date.getFullYear()}`;
};

/* =========================================================
   MAIN SCREEN
========================================================= */

export default function FinancialDetails() {
  const [contributions, setContributions] =
    useState([]);

  const [expenses, setExpenses] =
    useState([]);

  const [occasions, setOccasions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [selectedMonth, setSelectedMonth] =
    useState(
      new Date().getMonth() + 1
    );

  const [selectedYear, setSelectedYear] =
    useState(CURRENT_YEAR);

  const [selectedOccasion, setSelectedOccasion] =
    useState("All");

  const [transactionType, setTransactionType] =
    useState("All");

  const [modalType, setModalType] =
    useState(null);

  /* =======================================================
     FIREBASE
  ======================================================= */

  useEffect(() => {
    let contributionLoaded = false;
    let expenseLoaded = false;
    let occasionLoaded = false;

    const checkLoading = () => {
      if (
        contributionLoaded &&
        expenseLoaded &&
        occasionLoaded
      ) {
        setLoading(false);
      }
    };

    const unsubscribeContributions =
      onSnapshot(
        collection(
          db,
          "contributions"
        ),
        (snapshot) => {
          setContributions(
            snapshot.docs.map(
              (doc) => ({
                id: doc.id,
                ...doc.data(),
              })
            )
          );

          contributionLoaded = true;
          checkLoading();
        },
        (error) => {
          console.log(
            "Contributions error:",
            error
          );

          contributionLoaded = true;
          checkLoading();
        }
      );

    const unsubscribeExpenses =
      onSnapshot(
        collection(
          db,
          "expenses"
        ),
        (snapshot) => {
          setExpenses(
            snapshot.docs.map(
              (doc) => ({
                id: doc.id,
                ...doc.data(),
              })
            )
          );

          expenseLoaded = true;
          checkLoading();
        },
        (error) => {
          console.log(
            "Expenses error:",
            error
          );

          expenseLoaded = true;
          checkLoading();
        }
      );

    const unsubscribeOccasions =
      onSnapshot(
        collection(
          db,
          "occasions"
        ),
        (snapshot) => {
          setOccasions(
            snapshot.docs.map(
              (doc) => ({
                id: doc.id,
                ...doc.data(),
              })
            )
          );

          occasionLoaded = true;
          checkLoading();
        },
        (error) => {
          console.log(
            "Occasions error:",
            error
          );

          occasionLoaded = true;
          checkLoading();
        }
      );

    return () => {
      unsubscribeContributions();
      unsubscribeExpenses();
      unsubscribeOccasions();
    };
  }, []);

  /* =======================================================
     OCCASION MAP
  ======================================================= */

  const occasionMap = useMemo(() => {
    const map = {};

    occasions.forEach(
      (occasion) => {
        map[occasion.id] =
          occasion.name ||
          occasion.title ||
          "Unnamed Occasion";
      }
    );

    return map;
  }, [occasions]);

  const getOccasionName = (item) => {
    if (item.occasionName) {
      return item.occasionName;
    }

    if (item.occasionId) {
      return (
        occasionMap[item.occasionId] ||
        "Unknown Occasion"
      );
    }

    return "General";
  };

  /* =======================================================
     FILTER INCOME
  ======================================================= */

  const filteredIncome = useMemo(() => {
    return contributions.filter(
      (item) => {
        const year = getYear(
          item.date
        );

        const month = getMonth(
          item.date
        );

        if (
          selectedYear !== "All" &&
          year !==
            Number(selectedYear)
        ) {
          return false;
        }

        if (
          selectedMonth !== 0 &&
          month !==
            Number(selectedMonth)
        ) {
          return false;
        }

        if (
          selectedOccasion !==
          "All"
        ) {
          if (
            selectedOccasion ===
            "General"
          ) {
            if (
              item.occasionId
            ) {
              return false;
            }
          } else if (
            item.occasionId !==
            selectedOccasion
          ) {
            return false;
          }
        }

        return true;
      }
    );
  }, [
    contributions,
    selectedMonth,
    selectedYear,
    selectedOccasion,
  ]);

  /* =======================================================
     FILTER EXPENSE
  ======================================================= */

  const filteredExpenses = useMemo(() => {
    return expenses.filter(
      (item) => {
        const year = getYear(
          item.date
        );

        const month = getMonth(
          item.date
        );

        if (
          selectedYear !== "All" &&
          year !==
            Number(selectedYear)
        ) {
          return false;
        }

        if (
          selectedMonth !== 0 &&
          month !==
            Number(selectedMonth)
        ) {
          return false;
        }

        if (
          selectedOccasion !==
          "All"
        ) {
          if (
            selectedOccasion ===
            "General"
          ) {
            if (
              item.occasionId
            ) {
              return false;
            }
          } else if (
            item.occasionId !==
            selectedOccasion
          ) {
            return false;
          }
        }

        return true;
      }
    );
  }, [
    expenses,
    selectedMonth,
    selectedYear,
    selectedOccasion,
  ]);

  /* =======================================================
     TOTALS
  ======================================================= */

  const totalIncome = useMemo(
    () =>
      filteredIncome.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.amount || 0
          ),
        0
      ),
    [filteredIncome]
  );

  const totalExpenses = useMemo(
    () =>
      filteredExpenses.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.amount || 0
          ),
        0
      ),
    [filteredExpenses]
  );

  const netBalance =
    totalIncome -
    totalExpenses;

  const totalTransactions =
    filteredIncome.length +
    filteredExpenses.length;

  /* =======================================================
     OCCASION REPORT
  ======================================================= */

  const occasionReport = useMemo(() => {
    const result = {};

    filteredIncome.forEach(
      (item) => {
        const id =
          item.occasionId ||
          "General";

        if (!result[id]) {
          result[id] = {
            id,
            name:
              getOccasionName(
                item
              ),
            income: 0,
            expense: 0,
            entries: 0,
          };
        }

        result[id].income +=
          Number(
            item.amount || 0
          );

        result[id].entries += 1;
      }
    );

    filteredExpenses.forEach(
      (item) => {
        const id =
          item.occasionId ||
          "General";

        if (!result[id]) {
          result[id] = {
            id,
            name:
              getOccasionName(
                item
              ),
            income: 0,
            expense: 0,
            entries: 0,
          };
        }

        result[id].expense +=
          Number(
            item.amount || 0
          );

        result[id].entries += 1;
      }
    );

    return Object.values(
      result
    )
      .map((item) => ({
        ...item,
        balance:
          item.income -
          item.expense,
      }))
      .sort(
        (a, b) =>
          b.income +
          b.expense -
          (a.income +
            a.expense)
      );
  }, [
    filteredIncome,
    filteredExpenses,
    occasionMap,
  ]);

  /* =======================================================
     TRANSACTIONS
  ======================================================= */

  const transactions = useMemo(() => {
    const income =
      filteredIncome.map(
        (item) => ({
          id:
            `income-${item.id}`,
          type: "Income",
          date: item.date,
          person:
            item.personName ||
            item.name ||
            item.contributorName ||
            "Contribution",
          occasion:
            getOccasionName(
              item
            ),
          mode:
            item.paymentMode ||
            item.mode ||
            "-",
          amount:
            Number(
              item.amount || 0
            ),
        })
      );

    const expense =
      filteredExpenses.map(
        (item) => ({
          id:
            `expense-${item.id}`,
          type: "Expense",
          date: item.date,
          person:
            item.description ||
            item.category ||
            "Expense",
          occasion:
            getOccasionName(
              item
            ),
          mode:
            item.paymentMode ||
            item.mode ||
            "-",
          amount:
            Number(
              item.amount || 0
            ),
        })
      );

    let combined = [
      ...income,
      ...expense,
    ];

    if (
      transactionType !==
      "All"
    ) {
      combined =
        combined.filter(
          (item) =>
            item.type ===
            transactionType
        );
    }

    return combined.sort(
      (a, b) => {
        const dateA =
          getDateObject(
            a.date
          )?.getTime() || 0;

        const dateB =
          getDateObject(
            b.date
          )?.getTime() || 0;

        return (
          dateB - dateA
        );
      }
    );
  }, [
    filteredIncome,
    filteredExpenses,
    transactionType,
    occasionMap,
  ]);

  /* =======================================================
     YEARS
  ======================================================= */

  const years = useMemo(() => {
    const set =
      new Set();

    [
      ...contributions,
      ...expenses,
    ].forEach(
      (item) => {
        const year =
          getYear(
            item.date
          );

        if (year) {
          set.add(year);
        }
      }
    );

    set.add(
      CURRENT_YEAR
    );

    return Array.from(
      set
    ).sort(
      (a, b) =>
        b - a
    );
  }, [
    contributions,
    expenses,
  ]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <View
        style={
          styles.loading
        }
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
          Preparing financial report...
        </Text>
      </View>
    );
  }

  /* =======================================================
     SCREEN
  ======================================================= */

  return (
    <View
      style={
        styles.container
      }
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
          style={
            styles.header
          }
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
              FINANCIAL REPORT
            </Text>

            <Text
              style={
                styles.title
              }
            >
              Financial Details
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Review income, expenses and
              occasion-wise balances
            </Text>
          </View>

          <View
            style={
              styles.periodBadge
            }
          >
            <Text
              style={
                styles.periodLabel
              }
            >
              REPORT PERIOD
            </Text>

            <Text
              style={
                styles.periodValue
              }
            >
              {selectedMonth ===
              0
                ? "All Months"
                : MONTH_NAMES[
                    selectedMonth -
                      1
                  ]}{" "}
              {selectedYear}
            </Text>
          </View>
        </View>

        {/* FILTERS */}

        <View
          style={
            styles.filterPanel
          }
        >
          <View
            style={
              styles.filterHeader
            }
          >
            <Text
              style={
                styles.filterTitle
              }
            >
              Report Filters
            </Text>

            <TouchableOpacity
              onPress={() => {
                setSelectedMonth(
                  new Date().getMonth() +
                    1
                );

                setSelectedYear(
                  CURRENT_YEAR
                );

                setSelectedOccasion(
                  "All"
                );

                setTransactionType(
                  "All"
                );
              }}
            >
              <Text
                style={
                  styles.resetText
                }
              >
                Reset Filters
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={
              styles.filterRow
            }
          >
            <FilterButton
              label="MONTH"
              value={
                selectedMonth ===
                0
                  ? "All Months"
                  : MONTH_NAMES[
                      selectedMonth -
                        1
                    ]
              }
              onPress={() =>
                setModalType(
                  "month"
                )
              }
            />

            <FilterButton
              label="YEAR"
              value={
                String(
                  selectedYear
                )
              }
              onPress={() =>
                setModalType(
                  "year"
                )
              }
            />

            <FilterButton
              label="OCCASION"
              value={
                selectedOccasion ===
                "All"
                  ? "All Occasions"
                  : selectedOccasion ===
                    "General"
                  ? "General"
                  : occasionMap[
                      selectedOccasion
                    ] ||
                    "Selected Occasion"
              }
              onPress={() =>
                setModalType(
                  "occasion"
                )
              }
            />

            <View
              style={
                styles.typeFilter
              }
            >
              <Text
                style={
                  styles.filterLabel
                }
              >
                TRANSACTION TYPE
              </Text>

              <View
                style={
                  styles.typeSelector
                }
              >
                {[
                  "All",
                  "Income",
                  "Expense",
                ].map(
                  (type) => {
                    const active =
                      transactionType ===
                      type;

                    return (
                      <TouchableOpacity
                        key={
                          type
                        }
                        style={[
                          styles.typeButton,
                          active &&
                            styles.typeButtonActive,
                          active &&
                            type ===
                              "Income" &&
                            styles.incomeActive,
                          active &&
                            type ===
                              "Expense" &&
                            styles.expenseActive,
                        ]}
                        onPress={() =>
                          setTransactionType(
                            type
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.typeText,
                            active &&
                              styles.typeTextActive,
                          ]}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
            </View>
          </View>
        </View>

        {/* SUMMARY */}

        <View
          style={
            styles.summaryGrid
          }
        >
          <SummaryCard
            label="TOTAL INCOME"
            value={`₹${formatAmount(
              totalIncome
            )}`}
            description={`${filteredIncome.length} income transaction${
              filteredIncome.length ===
              1
                ? ""
                : "s"
            }`}
            color={
              COLORS.success
            }
            lightColor={
              COLORS.successLight
            }
            icon="↑"
          />

          <SummaryCard
            label="TOTAL EXPENSES"
            value={`₹${formatAmount(
              totalExpenses
            )}`}
            description={`${filteredExpenses.length} expense transaction${
              filteredExpenses.length ===
              1
                ? ""
                : "s"
            }`}
            color={
              COLORS.danger
            }
            lightColor={
              COLORS.dangerLight
            }
            icon="↓"
          />

          <SummaryCard
            label="NET BALANCE"
            value={`₹${formatAmount(
              netBalance
            )}`}
            description={
              netBalance >=
              0
                ? "Positive financial position"
                : "Expenses exceed income"
            }
            color={
              netBalance >=
              0
                ? COLORS.primary
                : COLORS.danger
            }
            lightColor={
              netBalance >=
              0
                ? COLORS.primaryLight
                : COLORS.dangerLight
            }
            icon={
              netBalance >=
              0
                ? "✓"
                : "!"
            }
          />

          <SummaryCard
            label="TOTAL TRANSACTIONS"
            value={
              totalTransactions
            }
            description="Records in selected period"
            color={
              COLORS.accent
            }
            lightColor={
              COLORS.accentLight
            }
            icon="≡"
          />
        </View>

        {/* TWO COLUMN REPORT */}

        <View
          style={
            styles.reportColumns
          }
        >
          {/* OCCASION SUMMARY */}

          <View
            style={[
              styles.panel,
              styles.occasionPanel,
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
                    styles.panelTitle
                  }
                >
                  Occasion-wise Financial Summary
                </Text>

                <Text
                  style={
                    styles.panelSubtitle
                  }
                >
                  Income, expenses and balance by
                  occasion
                </Text>
              </View>
            </View>

            <View
              style={
                styles.occasionTable
              }
            >
              <View
                style={
                  styles.occasionHeader
                }
              >
                <Text
                  style={
                    styles.occasionHeaderName
                  }
                >
                  OCCASION
                </Text>

                <Text
                  style={
                    styles.occasionHeaderValue
                  }
                >
                  INCOME
                </Text>

                <Text
                  style={
                    styles.occasionHeaderValue
                  }
                >
                  EXPENSE
                </Text>

                <Text
                  style={
                    styles.occasionHeaderValue
                  }
                >
                  BALANCE
                </Text>

                <Text
                  style={
                    styles.occasionHeaderEntries
                  }
                >
                  ENTRIES
                </Text>
              </View>

              {occasionReport.length ===
              0 ? (
                <EmptyState />
              ) : (
                occasionReport.map(
                  (item) => (
                    <View
                      key={
                        item.id
                      }
                      style={
                        styles.occasionRow
                      }
                    >
                      <Text
                        style={
                          styles.occasionName
                        }
                        numberOfLines={
                          2
                        }
                      >
                        {item.name}
                      </Text>

                      <Text
                        style={
                          styles.incomeValue
                        }
                      >
                        ₹
                        {formatAmount(
                          item.income
                        )}
                      </Text>

                      <Text
                        style={
                          styles.expenseValue
                        }
                      >
                        ₹
                        {formatAmount(
                          item.expense
                        )}
                      </Text>

                      <Text
                        style={[
                          styles.balanceValue,
                          {
                            color:
                              item.balance >=
                              0
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

                      <Text
                        style={
                          styles.entriesValue
                        }
                      >
                        {
                          item.entries
                        }
                      </Text>
                    </View>
                  )
                )
              )}

              <View
                style={
                  styles.totalRow
                }
              >
                <Text
                  style={
                    styles.totalLabel
                  }
                >
                  TOTAL
                </Text>

                <Text
                  style={
                    styles.incomeValue
                  }
                >
                  ₹
                  {formatAmount(
                    totalIncome
                  )}
                </Text>

                <Text
                  style={
                    styles.expenseValue
                  }
                >
                  ₹
                  {formatAmount(
                    totalExpenses
                  )}
                </Text>

                <Text
                  style={[
                    styles.balanceValue,
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

                <Text
                  style={
                    styles.entriesValue
                  }
                >
                  {
                    totalTransactions
                  }
                </Text>
              </View>
            </View>
          </View>

          {/* TRANSACTION DETAILS */}

          <View
            style={[
              styles.panel,
              styles.transactionPanel,
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
                    styles.panelTitle
                  }
                >
                  Transaction Details
                </Text>

                <Text
                  style={
                    styles.panelSubtitle
                  }
                >
                  Read-only financial transaction
                  register
                </Text>
              </View>

              <View
                style={
                  styles.readOnlyBadge
                }
              >
                <Text
                  style={
                    styles.readOnlyText
                  }
                >
                  READ ONLY
                </Text>
              </View>
            </View>

            <View
              style={
                styles.transactionTable
              }
            >
              <View
                style={
                  styles.transactionHeader
                }
              >
                <Text
                  style={
                    styles.dateColumn
                  }
                >
                  DATE
                </Text>

                <Text
                  style={
                    styles.typeColumn
                  }
                >
                  TYPE
                </Text>

                <Text
                  style={
                    styles.personColumn
                  }
                >
                  PERSON / DESCRIPTION
                </Text>

                <Text
                  style={
                    styles.occasionTransactionColumn
                  }
                >
                  OCCASION
                </Text>

                <Text
                  style={
                    styles.modeColumn
                  }
                >
                  MODE
                </Text>

                <Text
                  style={
                    styles.amountColumn
                  }
                >
                  AMOUNT
                </Text>
              </View>

              {transactions.length ===
              0 ? (
                <EmptyState />
              ) : (
                transactions
                  .slice(
                    0,
                    8
                  )
                  .map(
                    (
                      item
                    ) => (
                      <View
                        key={
                          item.id
                        }
                        style={
                          styles.transactionRow
                        }
                      >
                        <Text
                          style={
                            styles.dateColumn
                          }
                        >
                          {formatDate(
                            item.date
                          )}
                        </Text>

                        <View
                          style={
                            styles.typeColumn
                          }
                        >
                          <View
                            style={[
                              styles.transactionIcon,
                              {
                                backgroundColor:
                                  item.type ===
                                  "Income"
                                    ? COLORS.successLight
                                    : COLORS.dangerLight,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.transactionIconText,
                                {
                                  color:
                                    item.type ===
                                    "Income"
                                      ? COLORS.success
                                      : COLORS.danger,
                                },
                              ]}
                            >
                              {item.type ===
                              "Income"
                                ? "↑"
                                : "↓"}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={
                            styles.personColumn
                          }
                        >
                          <Text
                            style={
                              styles.personName
                            }
                            numberOfLines={
                              1
                            }
                          >
                            {
                              item.person
                            }
                          </Text>

                          <Text
                            style={
                              styles.transactionTypeText
                            }
                          >
                            {
                              item.type
                            }
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.occasionTransactionColumn
                          }
                          numberOfLines={
                            2
                          }
                        >
                          {
                            item.occasion
                          }
                        </Text>

                        <Text
                          style={
                            styles.modeColumn
                          }
                        >
                          {
                            item.mode
                          }
                        </Text>

                        <Text
                          style={[
                            styles.amountColumn,
                            {
                              color:
                                item.type ===
                                "Income"
                                  ? COLORS.success
                                  : COLORS.danger,
                            },
                          ]}
                        >
                          {item.type ===
                          "Income"
                            ? "+"
                            : "-"}
                          ₹
                          {formatAmount(
                            item.amount
                          )}
                        </Text>
                      </View>
                    )
                  )
              )}
            </View>
          </View>
        </View>

        {/* FOOTER */}

        <View
          style={
            styles.footerCard
          }
        >
          <View>
            <Text
              style={
                styles.footerLabel
              }
            >
              FINANCIAL POSITION
            </Text>

            <Text
              style={
                styles.footerDescription
              }
            >
              {netBalance >=
              0
                ? "The selected period is financially positive."
                : "The selected period has more expenses than income."}
            </Text>
          </View>

          <View
            style={
              styles.footerRight
            }
          >
            <Text
              style={[
                styles.footerAmount,
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

            <Text
              style={
                styles.footerNet
              }
            >
              Net Balance
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* =====================================================
          FILTER MODAL
      ===================================================== */}

      <FilterModal
        visible={
          modalType === "month"
        }
        title="Select Month"
        onClose={() =>
          setModalType(null)
        }
      >
        {MONTHS.map(
          (
            month,
            index
          ) => (
            <ModalOption
              key={month}
              label={month}
              selected={
                selectedMonth ===
                index
              }
              onPress={() => {
                setSelectedMonth(
                  index
                );
                setModalType(
                  null
                );
              }}
            />
          )
        )}
      </FilterModal>

      <FilterModal
        visible={
          modalType === "year"
        }
        title="Select Year"
        onClose={() =>
          setModalType(null)
        }
      >
        {years.map(
          (year) => (
            <ModalOption
              key={year}
              label={String(
                year
              )}
              selected={
                Number(
                  selectedYear
                ) ===
                Number(year)
              }
              onPress={() => {
                setSelectedYear(
                  year
                );
                setModalType(
                  null
                );
              }}
            />
          )
        )}
      </FilterModal>

      <FilterModal
        visible={
          modalType ===
          "occasion"
        }
        title="Select Occasion"
        onClose={() =>
          setModalType(null)
        }
      >
        <ModalOption
          label="All Occasions"
          selected={
            selectedOccasion ===
            "All"
          }
          onPress={() => {
            setSelectedOccasion(
              "All"
            );
            setModalType(null);
          }}
        />

        <ModalOption
          label="General"
          selected={
            selectedOccasion ===
            "General"
          }
          onPress={() => {
            setSelectedOccasion(
              "General"
            );
            setModalType(null);
          }}
        />

        {occasions.map(
          (occasion) => (
            <ModalOption
              key={
                occasion.id
              }
              label={
                occasion.name ||
                occasion.title ||
                "Unnamed Occasion"
              }
              selected={
                selectedOccasion ===
                occasion.id
              }
              onPress={() => {
                setSelectedOccasion(
                  occasion.id
                );
                setModalType(
                  null
                );
              }}
            />
          )
        )}
      </FilterModal>
    </View>
  );
}

/* =========================================================
   FILTER BUTTON
========================================================= */

function FilterButton({
  label,
  value,
  onPress,
}) {
  return (
    <View
      style={
        styles.filterItem
      }
    >
      <Text
        style={
          styles.filterLabel
        }
      >
        {label}
      </Text>

      <TouchableOpacity
        style={
          styles.filterButton
        }
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text
          style={
            styles.filterValue
          }
          numberOfLines={1}
        >
          {value}
        </Text>

        <Text
          style={
            styles.filterChevron
          }
        >
          ▾
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  label,
  value,
  description,
  color,
  lightColor,
  icon,
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
          style={[
            styles.summaryLabel,
            {
              color,
            },
          ]}
        >
          {label}
        </Text>

        <View
          style={[
            styles.summaryIcon,
            {
              backgroundColor:
                lightColor,
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

      <Text
        style={[
          styles.summaryValue,
          {
            color,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={
          styles.summaryDescription
        }
      >
        {description}
      </Text>
    </View>
  );
}

/* =========================================================
   MODAL
========================================================= */

function FilterModal({
  visible,
  title,
  onClose,
  children,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={
        onClose
      }
    >
      <Pressable
        style={
          styles.modalOverlay
        }
        onPress={onClose}
      >
        <Pressable
          style={
            styles.modalCard
          }
          onPress={(event) =>
            event.stopPropagation()
          }
        >
          <View
            style={
              styles.modalHeader
            }
          >
            <Text
              style={
                styles.modalTitle
              }
            >
              {title}
            </Text>

            <TouchableOpacity
              onPress={onClose}
            >
              <Text
                style={
                  styles.modalClose
                }
              >
                ×
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={
              styles.modalList
            }
            showsVerticalScrollIndicator={
              false
            }
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ModalOption({
  label,
  selected,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.modalOption,
        selected &&
          styles.modalOptionSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text
        style={[
          styles.modalOptionText,
          selected &&
            styles.modalOptionTextSelected,
        ]}
      >
        {label}
      </Text>

      {selected && (
        <Text
          style={
            styles.modalCheck
          }
        >
          ✓
        </Text>
      )}
    </TouchableOpacity>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState() {
  return (
    <View
      style={
        styles.emptyState
      }
    >
      <Text
        style={
          styles.emptyTitle
        }
      >
        No records found
      </Text>

      <Text
        style={
          styles.emptyText
        }
      >
        There are no financial records for
        the selected filters.
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
    backgroundColor:
      COLORS.background,
  },

  content: {
    paddingHorizontal: 26,
    paddingTop: 27,
    paddingBottom: 45,
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
    fontSize: 12,
    color:
      COLORS.textSecondary,
    marginTop: 10,
  },

  /* HEADER */

  header: {
    flexDirection:
      "row",
    alignItems:
      "flex-end",
    justifyContent:
      "space-between",
    marginBottom: 22,
  },

  headerLeft: {
    flex: 1,
  },

  eyebrow: {
    fontFamily:
      FONTS.bold,
    fontSize: 11,
    letterSpacing: 1.1,
    color:
      COLORS.primary,
    marginBottom: 5,
  },

  title: {
    fontFamily:
      FONTS.bold,
    fontSize: 36,
    color:
      COLORS.text,
  },

  subtitle: {
    fontFamily:
      FONTS.regular,
    fontSize: 16,
    color:
      COLORS.textSecondary,
    marginTop: 6,
  },

  periodBadge: {
    minWidth: 190,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    backgroundColor:
      COLORS.surface,
    borderRadius: 13,
    paddingHorizontal: 17,
    paddingVertical: 12,
  },

  periodLabel: {
    fontFamily:
      FONTS.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    color:
      COLORS.textMuted,
  },

  periodValue: {
    fontFamily:
      FONTS.bold,
    fontSize: 14,
    color:
      COLORS.primary,
    marginTop: 4,
  },

  /* FILTER */

  filterPanel: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 14,
    padding: 17,
    marginBottom: 13,
  },

  filterHeader: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    marginBottom: 13,
  },

  filterTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 16,
    color:
      COLORS.text,
  },

  resetText: {
    fontFamily:
      FONTS.bold,
    fontSize: 12,
    color:
      COLORS.primary,
  },

  filterRow: {
    flexDirection:
      "row",
    gap: 12,
  },

  filterItem: {
    flex: 1,
    minWidth: 150,
  },

  typeFilter: {
    flex: 1.35,
    minWidth: 220,
  },

  filterLabel: {
    fontFamily:
      FONTS.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    color:
      COLORS.textMuted,
    marginBottom: 6,
  },

  filterButton: {
    height: 46,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 9,
    backgroundColor:
      COLORS.surface,
    paddingHorizontal: 12,
    flexDirection:
      "row",
    alignItems:
      "center",
    justifyContent:
      "space-between",
  },

  filterValue: {
    flex: 1,
    fontFamily:
      FONTS.medium,
    fontSize: 18,
    color:
      COLORS.text,
  },

  filterChevron: {
    fontFamily:
      FONTS.bold,
    fontSize: 16,
    color:
      COLORS.textMuted,
    marginLeft: 8,
  },

  typeSelector: {
    height: 46,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 9,
    padding: 3,
    flexDirection:
      "row",
  },

  typeButton: {
    flex: 1,
    borderRadius: 7,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  typeButtonActive: {
    backgroundColor:
      COLORS.primary,
  },

  incomeActive: {
    backgroundColor:
      COLORS.success,
  },

  expenseActive: {
    backgroundColor:
      COLORS.danger,
  },

  typeText: {
    fontFamily:
      FONTS.medium,
    fontSize: 13,
    color:
      COLORS.textSecondary,
  },

  typeTextActive: {
    fontFamily:
      FONTS.bold,
    color:
      COLORS.white,
  },

  /* SUMMARY */

  summaryGrid: {
    flexDirection:
      "row",
    gap: 12,
    marginBottom: 14,
  },

  summaryCard: {
    flex: 1,
    minHeight: 148,
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 14,
    padding: 20,
  },

  summaryTop: {
    flexDirection:
      "row",
    alignItems:
      "center",
    justifyContent:
      "space-between",
  },

  summaryLabel: {
    fontFamily:
      FONTS.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },

  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  summaryIconText: {
    fontFamily:
      FONTS.bold,
    fontSize: 18,
  },

  summaryValue: {
    fontFamily:
      FONTS.bold,
    fontSize: 30,
    marginTop: 15,
  },

  summaryDescription: {
    fontFamily:
      FONTS.regular,
    fontSize: 13,
    color:
      COLORS.textSecondary,
    marginTop: 4,
  },

  /* REPORT COLUMNS */

  reportColumns: {
    flexDirection:
      "row",
    gap: 14,
  },

  panel: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 14,
    padding: 17,
  },

  occasionPanel: {
    flex: 1,
    minWidth: 500,
  },

  transactionPanel: {
    flex: 1,
    minWidth: 500,
  },

  panelHeader: {
    flexDirection:
      "row",
    alignItems:
      "flex-start",
    justifyContent:
      "space-between",
    marginBottom: 14,
  },

  panelTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 18,
    color:
      COLORS.text,
  },

  panelSubtitle: {
    fontFamily:
      FONTS.regular,
    fontSize: 12,
    color:
      COLORS.textMuted,
    marginTop: 4,
  },

  /* OCCASION TABLE */

  occasionTable: {
    width: "100%",
  },

  occasionHeader: {
    flexDirection:
      "row",
    alignItems:
      "center",
    minHeight: 42,
    backgroundColor:
      COLORS.primaryLight,
    borderRadius: 7,
    paddingHorizontal: 9,
  },

  occasionHeaderName: {
    flex: 2.1,
    fontFamily:
      FONTS.bold,
    fontSize: 10,
    color:
      COLORS.primary,
  },

  occasionHeaderValue: {
    flex: 1,
    textAlign:
      "right",
    fontFamily:
      FONTS.bold,
    fontSize: 10,
    color:
      COLORS.primary,
  },

  occasionHeaderEntries: {
    width: 48,
    textAlign:
      "right",
    fontFamily:
      FONTS.bold,
    fontSize: 10,
    color:
      COLORS.primary,
  },

  occasionRow: {
    flexDirection:
      "row",
    alignItems:
      "center",
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor:
      "#EEF2F7",
    paddingHorizontal: 9,
  },

  occasionName: {
    flex: 2.1,
    fontFamily:
      FONTS.medium,
    fontSize: 14,
    color:
      COLORS.text,
  },

  incomeValue: {
    flex: 1,
    textAlign:
      "right",
    fontFamily:
      FONTS.bold,
    fontSize: 13,
    color:
      COLORS.success,
  },

  expenseValue: {
    flex: 1,
    textAlign:
      "right",
    fontFamily:
      FONTS.bold,
    fontSize: 13,
    color:
      COLORS.danger,
  },

  balanceValue: {
    flex: 1,
    textAlign:
      "right",
    fontFamily:
      FONTS.bold,
    fontSize: 13,
  },

  entriesValue: {
    width: 48,
    textAlign:
      "right",
    fontFamily:
      FONTS.medium,
    fontSize: 13,
    color:
      COLORS.textSecondary,
  },

  totalRow: {
    flexDirection:
      "row",
    alignItems:
      "center",
    minHeight: 54,
    backgroundColor:
      COLORS.primaryLight,
    borderRadius: 7,
    paddingHorizontal: 9,
    marginTop: 7,
  },

  totalLabel: {
    flex: 2.1,
    fontFamily:
      FONTS.bold,
    fontSize: 12,
    color:
      COLORS.primary,
  },

  /* TRANSACTIONS */

  readOnlyBadge: {
    backgroundColor:
      COLORS.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  readOnlyText: {
    fontFamily:
      FONTS.bold,
    fontSize: 9,
    letterSpacing: 0.7,
    color:
      COLORS.primary,
  },

  transactionHeader: {
    flexDirection:
      "row",
    alignItems:
      "center",
    minHeight: 42,
    backgroundColor:
      COLORS.primaryLight,
    borderRadius: 7,
    paddingHorizontal: 8,
  },

  transactionRow: {
    flexDirection:
      "row",
    alignItems:
      "center",
    minHeight: 66,
    borderBottomWidth: 1,
    borderBottomColor:
      "#EEF2F7",
    paddingHorizontal: 8,
  },

  dateColumn: {
    width: 78,
    fontFamily:
      FONTS.medium,
    fontSize: 14,
    color:
      COLORS.textSecondary,
  },

  typeColumn: {
    width: 34,
    alignItems:
      "center",
    fontFamily:
      FONTS.bold,
    fontSize: 10,
    color:
      COLORS.textMuted,
  },

  personColumn: {
    flex: 1.45,
    minWidth: 100,
    fontFamily:
      FONTS.bold,
    fontSize: 10,
    color:
      COLORS.textMuted,
  },

  occasionTransactionColumn: {
    flex: 1.1,
    minWidth: 90,
    fontFamily:
      FONTS.bold,
    fontSize: 10,
    color:
      COLORS.textMuted,
  },

  modeColumn: {
    width: 52,
    fontFamily:
      FONTS.bold,
    fontSize: 10,
    color:
      COLORS.textMuted,
  },

  amountColumn: {
    width: 82,
    textAlign:
      "right",
    fontFamily:
      FONTS.bold,
    fontSize: 13,
    color:
      COLORS.text,
  },

  transactionIcon: {
    width: 27,
    height: 27,
    borderRadius: 7,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  transactionIconText: {
    fontFamily:
      FONTS.bold,
    fontSize: 15,
  },

  personName: {
    fontFamily:
      FONTS.medium,
    fontSize: 13,
    color:
      COLORS.text,
  },

  transactionTypeText: {
    fontFamily:
      FONTS.regular,
    fontSize: 10,
    color:
      COLORS.textMuted,
    marginTop: 2,
  },

  /* EMPTY */

  emptyState: {
    paddingVertical: 35,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  emptyTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 14,
    color:
      COLORS.text,
  },

  emptyText: {
    fontFamily:
      FONTS.regular,
    fontSize: 12,
    color:
      COLORS.textMuted,
    marginTop: 5,
  },

  /* FOOTER */

  footerCard: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 14,
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 19,
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "center",
  },

  footerLabel: {
    fontFamily:
      FONTS.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    color:
      COLORS.textMuted,
  },

  footerDescription: {
    fontFamily:
      FONTS.medium,
    fontSize: 14,
    color:
      COLORS.text,
    marginTop: 4,
  },

  footerRight: {
    alignItems:
      "flex-end",
  },

  footerAmount: {
    fontFamily:
      FONTS.bold,
    fontSize: 28,
  },

  footerNet: {
    fontFamily:
      FONTS.regular,
    fontSize: 10,
    color:
      COLORS.textMuted,
    marginTop: 2,
  },

  /* MODAL */

  modalOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(15, 23, 42, 0.38)",
    alignItems:
      "center",
    justifyContent:
      "center",
    padding: 20,
  },

  modalCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "75vh",
    backgroundColor:
      COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    overflow: "hidden",
  },

  modalHeader: {
    height: 58,
    paddingHorizontal: 18,
    flexDirection:
      "row",
    alignItems:
      "center",
    justifyContent:
      "space-between",
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.border,
  },

  modalTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 18,
    color:
      COLORS.text,
  },

  modalClose: {
    fontFamily:
      FONTS.regular,
    fontSize: 30,
    color:
      COLORS.textMuted,
  },

  modalList: {
    padding: 9,
  },

  modalOption: {
    minHeight: 50,
    borderRadius: 8,
    paddingHorizontal: 13,
    flexDirection:
      "row",
    alignItems:
      "center",
    justifyContent:
      "space-between",
    marginBottom: 3,
  },

  modalOptionSelected: {
    backgroundColor:
      COLORS.primaryLight,
  },

  modalOptionText: {
    fontFamily:
      FONTS.regular,
    fontSize: 14,
    color:
      COLORS.textSecondary,
  },

  modalOptionTextSelected: {
    fontFamily:
      FONTS.bold,
    color:
      COLORS.primary,
  },

  modalCheck: {
    fontFamily:
      FONTS.bold,
    fontSize: 16,
    color:
      COLORS.primary,
  },
});