import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { collection, onSnapshot } from "firebase/firestore";
import { COLORS, FONTS } from "../constants/theme";
import { db } from "../services/firebase";

const pad = (n) => String(n).padStart(2, "0");
const today = new Date();
const CURRENT_YEAR = today.getFullYear();
const CURRENT_MONTH = today.getMonth() + 1;
const MONTH_NAMES = [
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

const isoDate = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const formatAmount = (value) =>
  Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const getDateObject = (value) => {
  if (!value) return null;
  if (typeof value === "object" && typeof value.toDate === "function")
    return value.toDate();
  if (value instanceof Date) return value;
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [y, m, d] = text.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = getDateObject(value);
  if (!date) return value ? String(value) : "-";
  return `${pad(date.getDate())} ${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;
};

const normaliseDateText = (value) => {
  const date = getDateObject(value);
  return date ? isoDate(date) : "";
};

export default function FinancialDetails() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [contributions, setContributions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [billBooks, setBillBooks] = useState([]);
  const [occasions, setOccasions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Existing month/year flow is preserved through the quick period selector.
  const [fromDate, setFromDate] = useState(
    isoDate(new Date(CURRENT_YEAR, CURRENT_MONTH - 1, 1)),
  );
  const [toDate, setToDate] = useState(isoDate(today));
  const [selectedOccasion, setSelectedOccasion] = useState("All");
  const [selectedBillBook, setSelectedBillBook] = useState("All");
  const [selectedCollector, setSelectedCollector] = useState("All");
  const [transactionType, setTransactionType] = useState("All");
  const [modalType, setModalType] = useState(null);
  const [datePicker, setDatePicker] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );

  useEffect(() => {
    let loaded = 0;
    const done = () => {
      loaded += 1;
      if (loaded >= 5) setLoading(false);
    };
    const subscribe = (name, setter) =>
      onSnapshot(
        collection(db, name),
        (snapshot) => {
          setter(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
          done();
        },
        (error) => {
          console.log(`${name} error:`, error);
          done();
        },
      );

    const unsubs = [
      subscribe("contributions", setContributions),
      subscribe("expenses", setExpenses),
      subscribe("receipts", setReceipts),
      subscribe("billBooks", setBillBooks),
      subscribe("occasions", setOccasions),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const occasionMap = useMemo(() => {
    const map = {};
    occasions.forEach((o) => {
      map[o.id] = o.name || o.title || "Unnamed Occasion";
    });
    return map;
  }, [occasions]);

  const getOccasionName = (item) =>
    item.occasionName ||
    occasionMap[item.occasionId] ||
    (item.occasionId ? "Unknown Occasion" : "General");
  const getCollectorName = (item) =>
    item.collectorName || item.collector || "Unassigned";
  const getBookKey = (item) =>
    `${item.occasionId || ""}::${item.billBookNumber || ""}`;

  const inDateRange = (item) => {
    const date = normaliseDateText(item.date);
    if (!date) return false;
    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
    return true;
  };

  const matchesCommon = (item) => {
    if (!inDateRange(item)) return false;
    if (selectedOccasion !== "All") {
      if (selectedOccasion === "General" && item.occasionId) return false;
      if (
        selectedOccasion !== "General" &&
        item.occasionId !== selectedOccasion
      )
        return false;
    }
    return true;
  };

  const filteredContributions = useMemo(
    () => contributions.filter(matchesCommon),
    [contributions, fromDate, toDate, selectedOccasion, occasionMap],
  );
  const filteredExpenses = useMemo(
    () => expenses.filter(matchesCommon),
    [expenses, fromDate, toDate, selectedOccasion, occasionMap],
  );
  const filteredReceipts = useMemo(
    () =>
      receipts.filter((item) => {
        if (!matchesCommon(item)) return false;
        if (selectedBillBook !== "All" && getBookKey(item) !== selectedBillBook)
          return false;
        if (
          selectedCollector !== "All" &&
          (item.collectorId || getCollectorName(item)) !== selectedCollector
        )
          return false;
        return true;
      }),
    [
      receipts,
      fromDate,
      toDate,
      selectedOccasion,
      selectedBillBook,
      selectedCollector,
      occasionMap,
    ],
  );

  const moneyReceipts = useMemo(
    () =>
      filteredReceipts.filter(
        (r) => String(r.contributionType || "Money").toLowerCase() === "money",
      ),
    [filteredReceipts],
  );
  const inKindReceipts = useMemo(
    () =>
      filteredReceipts.filter(
        (r) => String(r.contributionType || "").toLowerCase() === "in-kind",
      ),
    [filteredReceipts],
  );

  const receiptRevenue = useMemo(
    () => moneyReceipts.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [moneyReceipts],
  );
  const otherContributions = useMemo(
    () =>
      filteredContributions.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [filteredContributions],
  );
  const totalRevenue = receiptRevenue + otherContributions;
  const totalExpenses = useMemo(
    () => filteredExpenses.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [filteredExpenses],
  );

  // Consolidated expense summary by date.
  // Multiple expense entries on the same date are combined into one row.
  const expenseDateReport = useMemo(() => {
    const map = new Map();

    filteredExpenses.forEach((expense) => {
      const date = normaliseDateText(expense.date);
      if (!date) return;

      const current = map.get(date) || 0;
      map.set(date, current + Number(expense.amount || 0));
    });

    return Array.from(map.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredExpenses]);

  // Consolidated expense summary by description.
  // Same descriptions are combined case-insensitively and with surrounding
  // spaces ignored, while the first recorded description is displayed.
  const expenseDescriptionReport = useMemo(() => {
    const map = new Map();

    filteredExpenses.forEach((expense) => {
      const rawDescription =
        expense.description || expense.category || "Unspecified Expense";
      const description = String(rawDescription).trim() || "Unspecified Expense";
      const key = description.toLowerCase();

      const current = map.get(key);

      if (current) {
        current.transactions += 1;
        current.amount += Number(expense.amount || 0);
      } else {
        map.set(key, {
          key,
          description,
          transactions: 1,
          amount: Number(expense.amount || 0),
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) =>
        b.amount - a.amount ||
        a.description.localeCompare(b.description),
    );
  }, [filteredExpenses]);

  const expenseDescriptionTotal = useMemo(
    () =>
      expenseDescriptionReport.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      ),
    [expenseDescriptionReport],
  );

  const expenseDescriptionTransactionTotal = useMemo(
    () =>
      expenseDescriptionReport.reduce(
        (sum, item) => sum + Number(item.transactions || 0),
        0,
      ),
    [expenseDescriptionReport],
  );

  const netBalance = totalRevenue - totalExpenses;

  const transactions = useMemo(() => {
    const rows = [
      ...moneyReceipts.map((r) => ({
        id: `receipt-${r.id}`,
        type: "Receipt Revenue",
        date: r.date,
        person: r.personName || r.name || r.contributorName || "Contribution",
        occasion: getOccasionName(r),
        mode: r.paymentMode || r.mode || "-",
        amount: Number(r.amount || 0),
        billBook: r.billBookNumber || "-",
        receipt: r.receiptNumber || "-",
        collector: getCollectorName(r),
      })),
      ...filteredContributions.map((r) => ({
        id: `income-${r.id}`,
        type: "Other Contribution",
        date: r.date,
        person: r.personName || r.name || r.contributorName || "Contribution",
        occasion: getOccasionName(r),
        mode: r.paymentMode || r.mode || "-",
        amount: Number(r.amount || 0),
        billBook: "-",
        receipt: "-",
        collector: "-",
      })),
      ...filteredExpenses.map((r) => ({
        id: `expense-${r.id}`,
        type: "Expense",
        date: r.date,
        person: r.description || r.category || "Expense",
        occasion: getOccasionName(r),
        mode: r.paymentMode || r.mode || "-",
        amount: Number(r.amount || 0),
        billBook: "-",
        receipt: "-",
        collector: "-",
      })),
    ];
    if (transactionType === "Receipt Revenue")
      return rows.filter((r) => r.type === transactionType);
    if (transactionType === "Income")
      return rows.filter((r) => r.type !== "Expense");
    if (transactionType === "Expense")
      return rows.filter((r) => r.type === "Expense");
    return rows.sort(
      (a, b) =>
        (getDateObject(b.date)?.getTime() || 0) -
        (getDateObject(a.date)?.getTime() || 0),
    );
  }, [
    moneyReceipts,
    filteredContributions,
    filteredExpenses,
    transactionType,
    occasionMap,
  ]);

  const billBookOptions = useMemo(() => {
    const map = new Map();
    billBooks.forEach((b) => {
      const key = `${b.occasionId || ""}::${b.billBookNumber || ""}`;
      if (!b.billBookNumber) return;
      if (
        selectedOccasion !== "All" &&
        selectedOccasion !== "General" &&
        b.occasionId !== selectedOccasion
      )
        return;
      map.set(key, {
        key,
        label: `${b.billBookNumber} • ${b.occasionName || occasionMap[b.occasionId] || "General"}`,
        number: b.billBookNumber,
        occasionId: b.occasionId,
        collectorId: b.collectorId,
        collectorName: b.collectorName,
      });
    });
    receipts.forEach((r) => {
      if (!r.billBookNumber) return;
      if (
        selectedOccasion !== "All" &&
        selectedOccasion !== "General" &&
        r.occasionId !== selectedOccasion
      )
        return;
      const key = getBookKey(r);
      if (!map.has(key))
        map.set(key, {
          key,
          label: `${r.billBookNumber} • ${getOccasionName(r)}`,
          number: r.billBookNumber,
          occasionId: r.occasionId,
          collectorId: r.collectorId,
          collectorName: r.collectorName,
        });
    });
    return Array.from(map.values()).sort((a, b) =>
      String(a.number).localeCompare(String(b.number), undefined, {
        numeric: true,
      }),
    );
  }, [billBooks, receipts, selectedOccasion, occasionMap]);

  const collectorOptions = useMemo(() => {
    const map = new Map();
    [...billBooks, ...receipts].forEach((r) => {
      const name = getCollectorName(r);
      if (name === "Unassigned") return;
      const key = r.collectorId || name;
      map.set(key, name);
    });
    return Array.from(map.entries())
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [billBooks, receipts]);

  const billBookReport = useMemo(() => {
    const map = new Map();
    filteredReceipts.forEach((r) => {
      const key = getBookKey(r);
      if (!map.has(key))
        map.set(key, {
          key,
          billBookNumber: r.billBookNumber || "-",
          occasion: getOccasionName(r),
          collector: getCollectorName(r),
          receipts: 0,
          money: 0,
          inKind: 0,
        });
      const row = map.get(key);
      row.receipts += 1;
      if (String(r.contributionType || "Money").toLowerCase() === "money")
        row.money += Number(r.amount || 0);
      else row.inKind += 1;
    });
    return Array.from(map.values()).sort(
      (a, b) =>
        b.money - a.money ||
        String(a.billBookNumber).localeCompare(
          String(b.billBookNumber),
          undefined,
          { numeric: true },
        ),
    );
  }, [filteredReceipts, occasionMap]);

  const collectorReport = useMemo(() => {
    const map = new Map();
    filteredReceipts.forEach((r) => {
      const key = r.collectorId || getCollectorName(r);
      if (!map.has(key))
        map.set(key, {
          key,
          collector: getCollectorName(r),
          receipts: 0,
          money: 0,
          inKind: 0,
          books: new Set(),
        });
      const row = map.get(key);
      row.receipts += 1;
      if (String(r.contributionType || "Money").toLowerCase() === "money")
        row.money += Number(r.amount || 0);
      else row.inKind += 1;
      if (r.billBookNumber) row.books.add(getBookKey(r));
    });
    return Array.from(map.values())
      .map((r) => ({ ...r, books: r.books.size }))
      .sort((a, b) => b.money - a.money);
  }, [filteredReceipts]);

  const occasionReport = useMemo(() => {
    const map = {};
    const add = (id, name) => {
      if (!map[id])
        map[id] = { id, name, revenue: 0, expense: 0, receipts: 0, inKind: 0 };
      return map[id];
    };
    moneyReceipts.forEach((r) => {
      const x = add(r.occasionId || "General", getOccasionName(r));
      x.revenue += Number(r.amount || 0);
      x.receipts += 1;
    });
    filteredContributions.forEach((r) => {
      const x = add(r.occasionId || "General", getOccasionName(r));
      x.revenue += Number(r.amount || 0);
    });
    inKindReceipts.forEach((r) => {
      const x = add(r.occasionId || "General", getOccasionName(r));
      x.inKind += 1;
    });
    filteredExpenses.forEach((r) => {
      const x = add(r.occasionId || "General", getOccasionName(r));
      x.expense += Number(r.amount || 0);
    });
    return Object.values(map)
      .map((x) => ({ ...x, balance: x.revenue - x.expense }))
      .sort((a, b) => b.revenue - b.expense - (a.revenue - a.expense));
  }, [
    moneyReceipts,
    filteredContributions,
    inKindReceipts,
    filteredExpenses,
    occasionMap,
  ]);

  const paymentModeReport = useMemo(() => {
    const map = {};
    moneyReceipts.forEach((r) => {
      const mode = r.paymentMode || r.mode || "Other";
      map[mode] = (map[mode] || 0) + Number(r.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [moneyReceipts]);

  const setQuickPeriod = (mode) => {
    const now = new Date();
    if (mode === "month") {
      setFromDate(isoDate(new Date(now.getFullYear(), now.getMonth(), 1)));
      setToDate(isoDate(now));
    }
    if (mode === "year") {
      setFromDate(`${now.getFullYear()}-01-01`);
      setToDate(isoDate(now));
    }
    if (mode === "all") {
      setFromDate("");
      setToDate("");
    }
  };

  const resetFilters = () => {
    setQuickPeriod("month");
    setSelectedOccasion("All");
    setSelectedBillBook("All");
    setSelectedCollector("All");
    setTransactionType("All");
  };

  const currentPeriodText =
    fromDate || toDate
      ? `${fromDate ? formatDate(fromDate) : "Beginning"} – ${toDate ? formatDate(toDate) : "Today"}`
      : "All Dates";
  const selectedBookLabel =
    selectedBillBook === "All"
      ? "All Bill Books"
      : billBookOptions.find((x) => x.key === selectedBillBook)?.label ||
        "Selected Bill Book";
  const selectedCollectorLabel =
    selectedCollector === "All"
      ? "All Collectors"
      : collectorOptions.find((x) => x.key === selectedCollector)?.name ||
        "Selected Collector";

  if (loading)
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Preparing financial report...</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          isMobile && styles.contentMobile,
        ]}
      >
        <View style={[styles.header, isMobile && styles.headerMobile]}>
          <View style={styles.headerLeft}>
            <Text style={styles.eyebrow}>FINANCIAL REPORT</Text>
            <Text style={[styles.title, isMobile && styles.titleMobile]}>
              Financial Details
            </Text>
            <Text style={[styles.subtitle, isMobile && styles.subtitleMobile]}>
              Live revenue, receipts, expenses and in-kind contribution
              reporting
            </Text>
          </View>
          <View
            style={[styles.periodBadge, isMobile && styles.periodBadgeMobile]}
          >
            <Text style={styles.periodLabel}>REPORT PERIOD</Text>
            <Text style={styles.periodValue}>{currentPeriodText}</Text>
          </View>
        </View>

        <View style={styles.filterPanel}>
          <View
            style={[styles.filterHeader, isMobile && styles.filterHeaderMobile]}
          >
            <View>
              <Text style={styles.filterTitle}>Report Filters</Text>
              <Text style={styles.filterHint}>
                Filter the same live data by date, occasion, bill book and
                collector
              </Text>
            </View>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.resetText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.quickRow, isMobile && styles.filterRowMobile]}>
            <QuickButton
              label="Current Month"
              active={
                fromDate ===
                  isoDate(new Date(CURRENT_YEAR, CURRENT_MONTH - 1, 1)) &&
                toDate === isoDate(today)
              }
              onPress={() => setQuickPeriod("month")}
            />
            <QuickButton
              label="Current Year"
              active={
                fromDate === `${CURRENT_YEAR}-01-01` &&
                toDate === isoDate(today)
              }
              onPress={() => setQuickPeriod("year")}
            />
            <QuickButton
              label="All Dates"
              active={!fromDate && !toDate}
              onPress={() => setQuickPeriod("all")}
            />
          </View>
          <View style={[styles.filterRow, isMobile && styles.filterRowMobile]}>
            <DateField
              label="FROM DATE"
              value={fromDate}
              onPress={() => {
                setDatePicker("from");
                setCalendarMonth(
                  getDateObject(fromDate)
                    ? new Date(
                        getDateObject(fromDate).getFullYear(),
                        getDateObject(fromDate).getMonth(),
                        1,
                      )
                    : new Date(today.getFullYear(), today.getMonth(), 1),
                );
              }}
            />
            <DateField
              label="TO DATE"
              value={toDate}
              onPress={() => {
                setDatePicker("to");
                setCalendarMonth(
                  getDateObject(toDate)
                    ? new Date(
                        getDateObject(toDate).getFullYear(),
                        getDateObject(toDate).getMonth(),
                        1,
                      )
                    : new Date(today.getFullYear(), today.getMonth(), 1),
                );
              }}
            />
            <FilterButton
              isMobile={isMobile}
              label="OCCASION"
              value={
                selectedOccasion === "All"
                  ? "All Occasions"
                  : selectedOccasion === "General"
                    ? "General"
                    : occasionMap[selectedOccasion] || "Selected Occasion"
              }
              onPress={() => setModalType("occasion")}
            />
            <FilterButton
              isMobile={isMobile}
              label="BILL BOOK"
              value={selectedBookLabel}
              onPress={() => setModalType("billBook")}
            />
            <FilterButton
              isMobile={isMobile}
              label="COLLECTOR"
              value={selectedCollectorLabel}
              onPress={() => setModalType("collector")}
            />
          </View>
          <View
            style={[styles.typeFilter, isMobile && styles.typeFilterMobile]}
          >
            <Text style={styles.filterLabel}>TRANSACTION TYPE</Text>
            <View style={styles.typeSelector}>
              {["All", "Income", "Receipt Revenue", "Expense"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    transactionType === type && styles.typeButtonActive,
                    transactionType === type &&
                      type === "Expense" &&
                      styles.expenseActive,
                    transactionType === type &&
                      type !== "Expense" &&
                      styles.incomeActive,
                  ]}
                  onPress={() => setTransactionType(type)}
                >
                  <Text
                    style={[
                      styles.typeText,
                      transactionType === type && styles.typeTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View
          style={[styles.summaryGrid, isMobile && styles.summaryGridMobile]}
        >
          <SummaryCard
            isMobile={isMobile}
            label="TOTAL REVENUE"
            value={`₹${formatAmount(totalRevenue)}`}
            description={`₹${formatAmount(receiptRevenue)} receipts + ₹${formatAmount(otherContributions)} other contributions`}
            color={COLORS.success}
            lightColor={COLORS.successLight}
            icon="↑"
          />
          <SummaryCard
            isMobile={isMobile}
            label="RECEIPT REVENUE"
            value={`₹${formatAmount(receiptRevenue)}`}
            description={`${moneyReceipts.length} money receipt${moneyReceipts.length === 1 ? "" : "s"}`}
            color={COLORS.primary}
            lightColor={COLORS.primaryLight}
            icon="₹"
          />
          <SummaryCard
            isMobile={isMobile}
            label="TOTAL EXPENSES"
            value={`₹${formatAmount(totalExpenses)}`}
            description={`${filteredExpenses.length} expense transaction${filteredExpenses.length === 1 ? "" : "s"}`}
            color={COLORS.danger}
            lightColor={COLORS.dangerLight}
            icon="↓"
          />
          <SummaryCard
            isMobile={isMobile}
            label="NET BALANCE"
            value={`₹${formatAmount(netBalance)}`}
            description={
              netBalance >= 0
                ? "Positive financial position"
                : "Expenses exceed revenue"
            }
            color={netBalance >= 0 ? COLORS.success : COLORS.danger}
            lightColor={
              netBalance >= 0 ? COLORS.successLight : COLORS.dangerLight
            }
            icon={netBalance >= 0 ? "✓" : "!"}
          />
        </View>

        <View style={[styles.statStrip, isMobile && styles.statStripMobile]}>
          <MiniStat label="RECEIPTS ISSUED" value={filteredReceipts.length} />
          <MiniStat label="MONEY RECEIPTS" value={moneyReceipts.length} />
          <MiniStat label="IN-KIND ENTRIES" value={inKindReceipts.length} />
          <MiniStat label="BILL BOOKS" value={billBookReport.length} />
          <MiniStat label="COLLECTORS" value={collectorReport.length} />
        </View>

        <Section
          title="Occasion-wise Financial Summary"
          subtitle="Revenue now includes money collected through receipts, while existing contributions remain separately traceable"
        >
          <TableHeader
            labels={[
              "OCCASION",
              "REVENUE",
              "EXPENSE",
              "BALANCE",
              "RECEIPTS",
              "IN-KIND",
            ]}
            widths={[2.2, 1.2, 1.2, 1.2, 0.9, 0.9]}
          />
          {occasionReport.length === 0 ? (
            <EmptyState />
          ) : (
            occasionReport.map((r) => (
              <TableRow
                key={r.id}
                cells={[
                  r.name,
                  `₹${formatAmount(r.revenue)}`,
                  `₹${formatAmount(r.expense)}`,
                  `₹${formatAmount(r.balance)}`,
                  r.receipts,
                  r.inKind,
                ]}
                widths={[2.2, 1.2, 1.2, 1.2, 0.9, 0.9]}
                positiveIndex={3}
              />
            ))
          )}
        </Section>

        <View
          style={[styles.threeColumns, isMobile && styles.threeColumnsMobile]}
        >
          <Section
            title="Expense Summary"
            style={styles.threeColumnPanel}
            subtitle="Expenses consolidated date-wise for the selected period"
          >
            <TableHeader labels={["DATE", "AMOUNT"]} widths={[2, 1]} />
            {expenseDateReport.length === 0 ? (
              <EmptyState text="No expenses found for the selected filters." />
            ) : (
              <>
                {expenseDateReport.map((r) => (
                  <TableRow
                    key={r.date}
                    cells={[formatDate(r.date), `₹${formatAmount(r.amount)}`]}
                    widths={[2, 1]}
                  />
                ))}
                <View style={styles.expenseTotalRow}>
                  <Text style={styles.expenseTotalLabel}>TOTAL</Text>
                  <Text style={styles.expenseTotalAmount}>
                    ₹{formatAmount(totalExpenses)}
                  </Text>
                </View>
              </>
            )}
          </Section>

          <Section
            title="Bill Book-wise Collection"
            style={styles.threeColumnPanel}
            subtitle="Money, receipt count and in-kind entries for the selected period"
          >
            <TableHeader
              labels={[
                "BILL BOOK",
                "COLLECTOR",
                "RECEIPTS",
                "MONEY",
                "IN-KIND",
              ]}
              widths={[1.5, 1.5, 0.8, 1.1, 0.8]}
            />
            {billBookReport.length === 0 ? (
              <EmptyState />
            ) : (
              billBookReport.map((r) => (
                <TableRow
                  key={r.key}
                  cells={[
                    r.billBookNumber,
                    r.collector,
                    r.receipts,
                    `₹${formatAmount(r.money)}`,
                    r.inKind,
                  ]}
                  widths={[1.5, 1.5, 0.8, 1.1, 0.8]}
                />
              ))
            )}
          </Section>
          <Section
            title="Collector-wise Collection"
            style={styles.threeColumnPanel}
            subtitle="Collector performance across bill books and receipts"
          >
            <TableHeader
              labels={["COLLECTOR", "BOOKS", "RECEIPTS", "MONEY", "IN-KIND"]}
              widths={[1.7, 0.8, 0.9, 1.2, 0.8]}
            />
            {collectorReport.length === 0 ? (
              <EmptyState />
            ) : (
              collectorReport.map((r) => (
                <TableRow
                  key={r.key}
                  cells={[
                    r.collector,
                    r.books,
                    r.receipts,
                    `₹${formatAmount(r.money)}`,
                    r.inKind,
                  ]}
                  widths={[1.7, 0.8, 0.9, 1.2, 0.8]}
                />
              ))
            )}
          </Section>
        </View>

        <Section
          title="Description-wise Expense Summary"
          subtitle="All expenses consolidated by description for the selected period and filters"
        >
          <TableHeader
            labels={["DESCRIPTION", "TRANSACTIONS", "TOTAL AMOUNT"]}
            widths={[2.4, 1.0, 1.2]}
          />

          {expenseDescriptionReport.length === 0 ? (
            <EmptyState text="No expenses found for the selected filters." />
          ) : (
            <>
              {expenseDescriptionReport.map((r) => (
                <TableRow
                  key={r.key}
                  cells={[
                    r.description,
                    r.transactions,
                    `₹${formatAmount(r.amount)}`,
                  ]}
                  widths={[2.4, 1.0, 1.2]}
                />
              ))}

              <View style={styles.expenseDescriptionTotalRow}>
                <View style={styles.expenseDescriptionTotalLeft}>
                  <Text style={styles.expenseDescriptionTotalLabel}>
                    TOTAL
                  </Text>
                  <Text style={styles.expenseDescriptionTotalCount}>
                    {expenseDescriptionTransactionTotal} transaction
                    {expenseDescriptionTransactionTotal === 1 ? "" : "s"}
                  </Text>
                </View>

                <Text style={styles.expenseDescriptionTotalAmount}>
                  ₹{formatAmount(expenseDescriptionTotal)}
                </Text>
              </View>
            </>
          )}
        </Section>

        <Section
          title="In-Kind Contributions"
          subtitle="No rupee value is assigned. Quantity and unit remain exactly as recorded on the receipt"
        >
          <TableHeader
            labels={[
              "DATE",
              "ITEM / CONTRIBUTION",
              "DONOR",
              "QTY",
              "UNIT",
              "BILL BOOK",
              "RECEIPT",
              "COLLECTOR",
            ]}
            widths={[1.0, 2.0, 2.0, 0.7, 0.8, 1.0, 1.0, 1.2]}
          />
          {inKindReceipts.length === 0 ? (
            <EmptyState text="No in-kind contributions found for the selected filters." />
          ) : (
            inKindReceipts
              .slice(0, 50)
              .map((r) => (
                <TableRow
                  key={r.id}
                  cells={[
                    formatDate(r.date),
                    r.item || r.contribution || "-",
                    r.donorName || r.name || "-",
                    r.quantity ?? "-",
                    r.unit || "-",
                    r.billBookNumber || "-",
                    r.receiptNumber || "-",
                    getCollectorName(r),
                  ]}
                  widths={[1.0, 2.0, 2.0, 0.7, 0.8, 1.0, 1.0, 1.2]}
                />
              ))
          )}
          {inKindReceipts.length > 50 && (
            <Text style={styles.moreText}>
              Showing first 50 in-kind entries. Narrow the date range, bill book
              or collector to focus the report.
            </Text>
          )}
        </Section>

        <Section
          title="Receipt Revenue & Payment Modes"
          subtitle="Money receipts are treated as a distinct revenue source; existing Contributions are not overwritten or merged into receipt records"
        >
          <View style={styles.modeGrid}>
            {paymentModeReport.length === 0 ? (
              <EmptyState />
            ) : (
              paymentModeReport.map(([mode, amount]) => (
                <View key={mode} style={styles.modeCard}>
                  <Text style={styles.modeLabel}>{mode}</Text>
                  <Text style={styles.modeAmount}>₹{formatAmount(amount)}</Text>
                </View>
              ))
            )}
          </View>
        </Section>

        <Section
          title="Transaction Details"
          subtitle="Read-only financial register combining receipt revenue, existing contributions and expenses"
        >
          <TableHeader
            labels={[
              "DATE",
              "TYPE",
              "PERSON / DESCRIPTION",
              "OCCASION",
              "BILL BOOK",
              "MODE",
              "AMOUNT",
            ]}
            widths={[1.0, 1.2, 1.7, 1.5, 1.0, 1.0, 1.2]}
          />
          {transactions.length === 0 ? (
            <EmptyState />
          ) : (
            transactions
              .slice(0, 50)
              .map((r) => (
                <TableRow
                  key={r.id}
                  cells={[
                    formatDate(r.date),
                    r.type,
                    r.person,
                    r.occasion,
                    r.billBook,
                    r.mode,
                    `${r.type === "Expense" ? "-" : "+"}₹${formatAmount(r.amount)}`,
                  ]}
                  widths={[1.0, 1.2, 1.7, 1.5, 1.0, 1.0, 1.2]}
                />
              ))
          )}
          {transactions.length > 50 && (
            <Text style={styles.moreText}>
              Showing first 50 transactions. Use the filters to narrow the
              register.
            </Text>
          )}
        </Section>

        <View style={[styles.footerCard, isMobile && styles.footerCardMobile]}>
          <View>
            <Text style={styles.footerLabel}>FINANCIAL POSITION</Text>
            <Text style={styles.footerDescription}>
              {netBalance >= 0
                ? "The selected period is financially positive."
                : "The selected period has more expenses than revenue."}
            </Text>
          </View>
          <View
            style={[styles.footerRight, isMobile && styles.footerRightMobile]}
          >
            <Text
              style={[
                styles.footerAmount,
                { color: netBalance >= 0 ? COLORS.success : COLORS.danger },
              ]}
            >
              ₹{formatAmount(netBalance)}
            </Text>
            <Text style={styles.footerNet}>Net Balance</Text>
          </View>
        </View>
      </ScrollView>

      <FilterModal
        visible={modalType === "occasion"}
        title="Select Occasion"
        onClose={() => setModalType(null)}
      >
        <ModalOption
          label="All Occasions"
          selected={selectedOccasion === "All"}
          onPress={() => {
            setSelectedOccasion("All");
            setSelectedBillBook("All");
            setModalType(null);
          }}
        />
        <ModalOption
          label="General"
          selected={selectedOccasion === "General"}
          onPress={() => {
            setSelectedOccasion("General");
            setSelectedBillBook("All");
            setModalType(null);
          }}
        />
        {occasions.map((o) => (
          <ModalOption
            key={o.id}
            label={o.name || o.title || "Unnamed Occasion"}
            selected={selectedOccasion === o.id}
            onPress={() => {
              setSelectedOccasion(o.id);
              setSelectedBillBook("All");
              setModalType(null);
            }}
          />
        ))}
      </FilterModal>
      <FilterModal
        visible={modalType === "billBook"}
        title="Select Bill Book"
        onClose={() => setModalType(null)}
      >
        <ModalOption
          label="All Bill Books"
          selected={selectedBillBook === "All"}
          onPress={() => {
            setSelectedBillBook("All");
            setModalType(null);
          }}
        />
        {billBookOptions.map((b) => (
          <ModalOption
            key={b.key}
            label={b.label}
            selected={selectedBillBook === b.key}
            onPress={() => {
              setSelectedBillBook(b.key);
              setModalType(null);
            }}
          />
        ))}
      </FilterModal>
      <FilterModal
        visible={modalType === "collector"}
        title="Select Collector"
        onClose={() => setModalType(null)}
      >
        <ModalOption
          label="All Collectors"
          selected={selectedCollector === "All"}
          onPress={() => {
            setSelectedCollector("All");
            setModalType(null);
          }}
        />
        {collectorOptions.map((c) => (
          <ModalOption
            key={c.key}
            label={c.name}
            selected={selectedCollector === c.key}
            onPress={() => {
              setSelectedCollector(c.key);
              setModalType(null);
            }}
          />
        ))}
      </FilterModal>
      <CalendarModal
        visible={!!datePicker}
        title={datePicker === "from" ? "Select From Date" : "Select To Date"}
        value={datePicker === "from" ? fromDate : toDate}
        month={calendarMonth}
        onMonthChange={setCalendarMonth}
        onClose={() => setDatePicker(null)}
        onSelect={(date) => {
          if (datePicker === "from") setFromDate(date);
          if (datePicker === "to") setToDate(date);
          setDatePicker(null);
        }}
      />
    </View>
  );
}

function DateField({ label, value, onPress }) {
  return (
    <View style={styles.filterItem}>
      <Text style={styles.filterLabel}>{label}</Text>
      <TouchableOpacity
        onPress={onPress}
        style={styles.dateInputButton}
        activeOpacity={0.75}
      >
        <Text style={[styles.dateInputText, !value && styles.datePlaceholder]}>
          {value ? formatDate(value) : "Select date"}
        </Text>
        <Text style={styles.calendarIcon}>▣</Text>
      </TouchableOpacity>
    </View>
  );
}

function CalendarModal({
  visible,
  title,
  value,
  month,
  onMonthChange,
  onClose,
  onSelect,
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  const selected = getDateObject(value);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={styles.calendarCard}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>×</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.calendarNav}>
            <TouchableOpacity
              onPress={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
              style={styles.calendarNavButton}
            >
              <Text style={styles.calendarNavText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.calendarMonthTitle}>
              {MONTH_NAMES[monthIndex]} {year}
            </Text>
            <TouchableOpacity
              onPress={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
              style={styles.calendarNavButton}
            >
              <Text style={styles.calendarNavText}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.weekRow}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <Text key={d} style={styles.weekText}>
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {cells.map((day, i) => {
              if (!day)
                return <View key={`blank-${i}`} style={styles.dayCell} />;
              const isSelected =
                selected &&
                selected.getFullYear() === year &&
                selected.getMonth() === monthIndex &&
                selected.getDate() === day;
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() =>
                    onSelect(isoDate(new Date(year, monthIndex, day)))
                  }
                  style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            onPress={() => onSelect(isoDate(today))}
            style={styles.todayButton}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function QuickButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.quickButton, active && styles.quickButtonActive]}
    >
      <Text
        style={[styles.quickButtonText, active && styles.quickButtonTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
function FilterButton({ label, value, onPress }) {
  return (
    <View style={styles.filterItem}>
      <Text style={styles.filterLabel}>{label}</Text>
      <TouchableOpacity style={styles.filterButton} onPress={onPress}>
        <Text style={styles.filterValue} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.filterChevron}>▾</Text>
      </TouchableOpacity>
    </View>
  );
}
function SummaryCard({ label, value, description, color, lightColor, icon }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <Text style={[styles.summaryLabel, { color }]}>{label}</Text>
        <View style={[styles.summaryIcon, { backgroundColor: lightColor }]}>
          <Text style={[styles.summaryIconText, { color }]}>{icon}</Text>
        </View>
      </View>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryDescription}>{description}</Text>
    </View>
  );
}
function MiniStat({ label, value }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatLabel}>{label}</Text>
      <Text style={styles.miniStatValue}>{value}</Text>
    </View>
  );
}
function Section({ title, subtitle, children, style }) {
  return (
    <View style={[styles.panel, style]}>
      <View style={styles.panelHeader}>
        <View>
          <Text style={styles.panelTitle}>{title}</Text>
          <Text style={styles.panelSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.readOnlyBadge}>
          <Text style={styles.readOnlyText}>LIVE / READ ONLY</Text>
        </View>
      </View>
      {children}
    </View>
  );
}
function TableHeader({ labels, widths }) {
  return (
    <View style={styles.tableHeader}>
      {labels.map((label, i) => (
        <Text
          key={label}
          style={[styles.tableHeaderText, { flex: widths[i] }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      ))}
    </View>
  );
}
function TableRow({ cells, widths, positiveIndex }) {
  return (
    <View style={styles.tableRow}>
      {cells.map((cell, i) => (
        <Text
          key={`${i}-${String(cell)}`}
          style={[
            styles.tableCell,
            {
              flex: widths[i],
              color:
                i === positiveIndex
                  ? Number(String(cell).replace(/[^0-9.-]/g, "")) >= 0
                    ? COLORS.success
                    : COLORS.danger
                  : COLORS.text,
            },
          ]}
          numberOfLines={2}
        >
          {String(cell)}
        </Text>
      ))}
    </View>
  );
}
function FilterModal({ visible, title, onClose, children }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={styles.modalCard}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
function ModalOption({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.modalOption, selected && styles.modalOptionSelected]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.modalOptionText,
          selected && styles.modalOptionTextSelected,
        ]}
      >
        {label}
      </Text>
      {selected && <Text style={styles.modalCheck}>✓</Text>}
    </TouchableOpacity>
  );
}
function EmptyState({ text = "No records found for the selected filters." }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No records found</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: {
    paddingHorizontal: 26,
    paddingTop: 27,
    paddingBottom: 45,
    gap: 14,
  },
  contentMobile: { paddingHorizontal: 14, paddingTop: 18, paddingBottom: 28 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerMobile: {
    flexDirection: "column",
    alignItems: "stretch",
    marginBottom: 2,
  },
  headerLeft: { flex: 1 },
  eyebrow: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    letterSpacing: 1.1,
    color: COLORS.primary,
    marginBottom: 5,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 36,
    lineHeight: 43,
    color: COLORS.text,
  },
  titleMobile: { fontSize: 30, lineHeight: 36 },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  subtitleMobile: { fontSize: 14, lineHeight: 20 },
  periodBadge: {
    minWidth: 250,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: 13,
    paddingHorizontal: 17,
    paddingVertical: 12,
  },
  periodBadgeMobile: { width: "100%", minWidth: 0, marginTop: 12 },
  periodLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: COLORS.textMuted,
  },
  periodValue: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.primary,
    marginTop: 4,
  },
  filterPanel: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 17,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 13,
  },
  filterHeaderMobile: { alignItems: "flex-start" },
  filterTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  filterHint: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  resetText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.primary },
  quickRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  quickButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
  },
  quickButtonActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  quickButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  quickButtonTextActive: { fontFamily: FONTS.bold, color: COLORS.primary },
  filterRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  filterRowMobile: { flexDirection: "column", gap: 10 },
  filterItem: { flex: 1, minWidth: 150 },
  filterLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  dateInputButton: {
    height: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateInputText: { fontFamily: FONTS.medium, fontSize: 16, color: COLORS.text },
  datePlaceholder: { color: COLORS.textMuted },
  calendarIcon: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.primary },
  filterButton: {
    height: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterValue: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.text,
  },
  filterChevron: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.textMuted,
    marginLeft: 8,
  },
  typeFilter: { marginTop: 12 },
  typeFilterMobile: { width: "100%" },
  typeSelector: {
    height: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    padding: 3,
    flexDirection: "row",
  },
  typeButton: {
    flex: 1,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  typeButtonActive: { backgroundColor: COLORS.primary },
  incomeActive: { backgroundColor: COLORS.success },
  expenseActive: { backgroundColor: COLORS.danger },
  typeText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  typeTextActive: { fontFamily: FONTS.bold, color: COLORS.white },
  summaryGrid: { flexDirection: "row", gap: 12 },
  summaryGridMobile: { flexDirection: "column" },
  summaryCard: {
    flex: 1,
    minHeight: 148,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 20,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: { fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 0.8 },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryIconText: { fontFamily: FONTS.bold, fontSize: 17 },
  summaryValue: { fontFamily: FONTS.bold, fontSize: 30, marginTop: 15 },
  summaryDescription: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statStrip: { flexDirection: "row", gap: 10 },
  statStripMobile: { flexWrap: "wrap" },
  miniStat: {
    flex: 1,
    minWidth: 130,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    padding: 13,
  },
  miniStatLabel: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: COLORS.textMuted,
  },
  miniStatValue: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.text,
    marginTop: 5,
  },
  panel: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 17,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  panelTitle: { fontFamily: FONTS.bold, fontSize: 19, color: COLORS.text },
  panelSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textMuted,
    marginTop: 4,
    maxWidth: 720,
  },
  readOnlyBadge: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  readOnlyText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: COLORS.textMuted,
  },
  threeColumns: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  threeColumnsMobile: { flexDirection: "column" },
  threeColumnPanel: { flex: 1, minWidth: 0 },
  twoColumns: { flexDirection: "row", gap: 14 },
  twoColumnsMobile: { flexDirection: "column" },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
    gap: 8,
  },
  tableHeaderText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: COLORS.textMuted,
  },
  tableRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
    alignItems: "center",
  },
  tableCell: { fontFamily: FONTS.medium, fontSize: 12, lineHeight: 17 },
  expenseTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  expenseTotalLabel: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.text,
  },
  expenseTotalAmount: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.danger,
  },
  expenseDescriptionTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  expenseDescriptionTotalLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  expenseDescriptionTotalLabel: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.text,
  },
  expenseDescriptionTotalCount: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  expenseDescriptionTotalAmount: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.danger,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
  },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.text },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
  moreText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textMuted,
    paddingTop: 10,
  },
  modeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  modeCard: {
    minWidth: 150,
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 13,
  },
  modeLabel: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.textMuted },
  modeAmount: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.success,
    marginTop: 5,
  },
  footerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 19,
  },
  footerCardMobile: { flexDirection: "column", alignItems: "stretch" },
  footerLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: COLORS.primary,
  },
  footerDescription: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  footerRight: { alignItems: "flex-end" },
  footerRightMobile: {
    alignItems: "flex-start",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
  },
  footerAmount: { fontFamily: FONTS.bold, fontSize: 30 },
  footerNet: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "80%",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 17,
  },
  calendarCard: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
  },
  calendarNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  calendarNavButton: {
    width: 40,
    height: 40,
    borderRadius: 9,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarNavText: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: COLORS.primary,
  },
  calendarMonthTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.text,
  },
  weekRow: { flexDirection: "row", marginBottom: 5 },
  weekText: {
    flex: 1,
    textAlign: "center",
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: "14.2857%",
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
  },
  dayCellSelected: { backgroundColor: COLORS.primary },
  dayText: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.text },
  dayTextSelected: { fontFamily: FONTS.bold, color: COLORS.white },
  todayButton: {
    marginTop: 10,
    height: 42,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  todayButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.primary,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  modalClose: {
    fontFamily: FONTS.regular,
    fontSize: 28,
    color: COLORS.textMuted,
    lineHeight: 28,
  },
  modalList: { maxHeight: 520 },
  modalOption: {
    minHeight: 46,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  modalOptionSelected: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
  },
  modalOptionText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },
  modalOptionTextSelected: { fontFamily: FONTS.bold, color: COLORS.primary },
  modalCheck: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.primary,
    marginLeft: 10,
  },
});
