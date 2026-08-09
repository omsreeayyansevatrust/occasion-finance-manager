import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
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

import { Ionicons } from "@expo/vector-icons";

import { COLORS, FONTS } from "../constants/theme";
import { db } from "../services/firebase";

/* =========================================================
   HELPERS
========================================================= */

const formatAmount = (value) => {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
};

const getPersonName = (person) => {
  return (
    person?.name ||
    person?.fullName ||
    person?.personName ||
    person?.displayName ||
    ""
  );
};

const getMobileNumber = (person) => {
  return (
    person?.mobile ||
    person?.mobileNumber ||
    person?.phone ||
    person?.phoneNumber ||
    ""
  );
};

const getOccasionName = (occasion) => {
  return (
    occasion?.name ||
    occasion?.title ||
    occasion?.occasionName ||
    "Unnamed Occasion"
  );
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  let date = null;

  if (
    typeof value === "object" &&
    typeof value.toDate === "function"
  ) {
    date = value.toDate();
  } else if (value instanceof Date) {
    date = value;
  } else {
    const text = String(value).trim();

    let match = text.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

    if (match) {
      const [, year, month, day] = match;

      date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
      );
    } else {
      match = text.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
      );

      if (match) {
        const [, day, month, year] = match;

        date = new Date(
          Number(year),
          Number(month) - 1,
          Number(day)
        );
      } else {
        match = text.match(
          /^(\d{1,2})-(\d{1,2})-(\d{4})$/
        );

        if (match) {
          const [, day, month, year] = match;

          date = new Date(
            Number(year),
            Number(month) - 1,
            Number(day)
          );
        } else {
          date = new Date(text);
        }
      }
    }
  }

  if (!date || Number.isNaN(date.getTime())) {
    return String(value);
  }

  return `${String(
    date.getDate()
  ).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
};

const getDateForInput = (value) => {
  if (!value) {
    return "";
  }

  return formatDate(value) === "-"
    ? ""
    : formatDate(value);
};

/*
 * IMPORTANT:
 * Save user-entered dates as YYYY-MM-DD strings, not JavaScript Date
 * objects. This prevents timezone conversion from moving 09/08/2026
 * into September in the browser.
 */
const parseDateInput = (value) => {
  if (!value) {
    return null;
  }

  const text = String(value).trim();

  const match = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  );

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (
    year < 1900 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const date = new Date(
    year,
    month - 1,
    day
  );

  // Strict validation: reject 31/02 etc.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(
    2,
    "0"
  )}-${String(day).padStart(2, "0")}`;
};

/* =========================================================
   MAIN SCREEN
========================================================= */


export default function ContributionsScreen() {
  const [contributions, setContributions] = useState([]);
  const [people, setPeople] = useState([]);
  const [occasions, setOccasions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* FILTERS */

  const [personSearch, setPersonSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);

  const [selectedOccasion, setSelectedOccasion] = useState("All");

  const [monthFilter, setMonthFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");

  /* MODALS */

  const [personModalVisible, setPersonModalVisible] =
    useState(false);

  const [occasionModalVisible, setOccasionModalVisible] =
    useState(false);

  const [
    formOccasionDropdownVisible,
    setFormOccasionDropdownVisible,
  ] = useState(false);

  const [formVisible, setFormVisible] = useState(false);

  const [deleteModalVisible, setDeleteModalVisible] =
    useState(false);

  /* FORM */

  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    personId: "",
    amount: "",
    date: "",
    occasionId: "",
    paymentMode: "Cash",
    notes: "",
  });

  const [formPersonSearch, setFormPersonSearch] =
    useState("");

  const [formPersonModalVisible, setFormPersonModalVisible] =
    useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  /* =======================================================
     FIREBASE LISTENERS
  ======================================================= */

  useEffect(() => {
    let contributionReady = false;
    let peopleReady = false;
    let occasionsReady = false;

    const checkLoading = () => {
      if (
        contributionReady &&
        peopleReady &&
        occasionsReady
      ) {
        setLoading(false);
      }
    };

    const unsubscribeContributions = onSnapshot(
      collection(db, "contributions"),
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setContributions(data);

        contributionReady = true;
        checkLoading();
      },
      (error) => {
        console.log(
          "Contributions error:",
          error
        );

        contributionReady = true;
        checkLoading();
      }
    );

    const unsubscribePeople = onSnapshot(
      collection(db, "people"),
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setPeople(data);

        peopleReady = true;
        checkLoading();
      },
      (error) => {
        console.log(
          "People error:",
          error
        );

        peopleReady = true;
        checkLoading();
      }
    );

    const unsubscribeOccasions = onSnapshot(
      collection(db, "occasions"),
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setOccasions(data);

        occasionsReady = true;
        checkLoading();
      },
      (error) => {
        console.log(
          "Occasions error:",
          error
        );

        occasionsReady = true;
        checkLoading();
      }
    );

    return () => {
      unsubscribeContributions();
      unsubscribePeople();
      unsubscribeOccasions();
    };
  }, []);

  /* =======================================================
     PEOPLE MAP
  ======================================================= */

  const peopleMap = useMemo(() => {
    const map = {};

    people.forEach((person) => {
      map[person.id] = person;
    });

    return map;
  }, [people]);

  /* =======================================================
     OCCASION MAP
  ======================================================= */

  const occasionsMap = useMemo(() => {
    const map = {};

    occasions.forEach((occasion) => {
      map[occasion.id] = occasion;
    });

    return map;
  }, [occasions]);

  /* =======================================================
     SEARCH PEOPLE
     
     THIS IS THE MAIN CHANGE:
     NAME + MOBILE NUMBER
  ======================================================= */

  const filteredPeople = useMemo(() => {
    const search = personSearch
      .trim()
      .toLowerCase();

    if (!search) {
      return people;
    }

    return people.filter((person) => {
      const name = getPersonName(person)
        .toLowerCase();

      const mobile = String(
        getMobileNumber(person)
      ).toLowerCase();

      return (
        name.includes(search) ||
        mobile.includes(search)
      );
    });
  }, [people, personSearch]);

  /* =======================================================
     FORM PEOPLE SEARCH
  ======================================================= */

  const formFilteredPeople = useMemo(() => {
    const search = formPersonSearch
      .trim()
      .toLowerCase();

    if (!search) {
      return people;
    }

    return people.filter((person) => {
      const name = getPersonName(person)
        .toLowerCase();

      const mobile = String(
        getMobileNumber(person)
      ).toLowerCase();

      return (
        name.includes(search) ||
        mobile.includes(search)
      );
    });
  }, [people, formPersonSearch]);

  /* =======================================================
     YEARS
  ======================================================= */

  const years = useMemo(() => {
    const result = new Set();

    contributions.forEach((item) => {
      let date = null;

      const dateValue =
            item.dateKey || item.date;

          if (
            dateValue &&
            typeof dateValue.toDate ===
              "function"
          ) {
            date = dateValue.toDate();
          } else {
            const text =
              String(dateValue || "").trim();

            let match = text.match(
              /^(\d{4})-(\d{2})-(\d{2})$/
            );

            if (match) {
              date = new Date(
                Number(match[1]),
                Number(match[2]) - 1,
                Number(match[3])
              );
            } else {
              match = text.match(
                /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
              );

              if (match) {
                date = new Date(
                  Number(match[3]),
                  Number(match[2]) - 1,
                  Number(match[1])
                );
              } else {
                match = text.match(
                  /^(\d{1,2})-(\d{1,2})-(\d{4})$/
                );

                if (match) {
                  date = new Date(
                    Number(match[3]),
                    Number(match[2]) - 1,
                    Number(match[1])
                  );
                } else {
                  date = new Date(text);
                }
              }
            }
          }

      if (
        date &&
        !Number.isNaN(date.getTime())
      ) {
        result.add(date.getFullYear());
      }
    });

    result.add(new Date().getFullYear());

    return Array.from(result).sort(
      (a, b) => b - a
    );
  }, [contributions]);

  /* =======================================================
     FILTER CONTRIBUTIONS
  ======================================================= */

  const filteredContributions = useMemo(() => {
    return contributions
      .filter((item) => {
        /* PERSON */

        if (selectedPerson) {
          if (
            item.personId !==
            selectedPerson.id
          ) {
            return false;
          }
        }

        /* OCCASION */

        if (
          selectedOccasion !== "All"
        ) {
          if (
            item.occasionId !==
            selectedOccasion
          ) {
            return false;
          }
        }

        /* DATE */

        if (
          monthFilter !== "All" ||
          yearFilter !== "All"
        ) {
          let date = null;

          if (
            item.date &&
            typeof item.date.toDate ===
              "function"
          ) {
            date = item.date.toDate();
          } else {
            date = new Date(
              item.date
            );
          }

          if (
            !date ||
            Number.isNaN(
              date.getTime()
            )
          ) {
            return false;
          }

          if (
            monthFilter !== "All" &&
            date.getMonth() + 1 !==
              Number(monthFilter)
          ) {
            return false;
          }

          if (
            yearFilter !== "All" &&
            date.getFullYear() !==
              Number(yearFilter)
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const dateA =
          a.dateKey &&
          typeof a.dateKey.toDate ===
            "function"
            ? a.dateKey.toDate()
            : a.dateKey
              ? new Date(a.dateKey)
              : a.date &&
                typeof a.date.toDate ===
                  "function"
                ? a.date.toDate()
                : new Date(a.date);

        const dateB =
          b.dateKey &&
          typeof b.dateKey.toDate ===
            "function"
            ? b.dateKey.toDate()
            : b.dateKey
              ? new Date(b.dateKey)
              : b.date &&
                typeof b.date.toDate ===
                  "function"
                ? b.date.toDate()
                : new Date(b.date);

        return (
          dateB.getTime() -
          dateA.getTime()
        );
      });
  }, [
    contributions,
    selectedPerson,
    selectedOccasion,
    monthFilter,
    yearFilter,
  ]);

  /* =======================================================
     TOTAL
  ======================================================= */

  const totalAmount = useMemo(() => {
    return filteredContributions.reduce(
      (total, item) =>
        total +
        Number(item.amount || 0),
      0
    );
  }, [filteredContributions]);

  /* =======================================================
     SELECT PERSON
  ======================================================= */

  const handleSelectPerson = (person) => {
    setSelectedPerson(person);
    setPersonSearch("");
    setPersonModalVisible(false);
  };

  /* =======================================================
     CLEAR PERSON
  ======================================================= */

  const clearPersonFilter = () => {
    setSelectedPerson(null);
    setPersonSearch("");
  };

  /* =======================================================
     OPEN ADD
  ======================================================= */

  const openAddForm = () => {
    setEditingId(null);

    setForm({
      personId: "",
      amount: "",
      date: "",
      occasionId: "",
      paymentMode: "Cash",
      notes: "",
    });

    setFormPersonSearch("");

    setFormVisible(true);
  };

  /* =======================================================
     OPEN EDIT
  ======================================================= */

  const openEditForm = (item) => {
    setEditingId(item.id);

    setForm({
      personId:
        item.personId || "",
      amount:
        item.amount
          ? String(item.amount)
          : "",
      date:
        getDateForInput(
          item.date
        ),
      occasionId:
        item.occasionId || "",
      paymentMode:
        item.paymentMode ||
        "Cash",
      notes:
        item.notes || "",
    });

    const selected =
      peopleMap[
        item.personId
      ];

    setFormPersonSearch(
      selected
        ? getPersonName(selected)
        : ""
    );

    setFormVisible(true);
  };

  /* =======================================================
     SAVE
  ======================================================= */

  const handleSave = async () => {
    if (!form.personId) {
      Alert.alert(
        "Person Required",
        "Please select a person."
      );
      return;
    }

    if (!form.amount) {
      Alert.alert(
        "Amount Required",
        "Please enter the contribution amount."
      );
      return;
    }

    const amount = Number(
      form.amount
    );

    if (
      Number.isNaN(amount) ||
      amount <= 0
    ) {
      Alert.alert(
        "Invalid Amount",
        "Please enter a valid amount."
      );
      return;
    }

    if (!form.date) {
      Alert.alert(
        "Date Required",
        "Please enter the contribution date."
      );
      return;
    }

    const selectedDate =
      parseDateInput(form.date);

    if (!selectedDate) {
      Alert.alert(
        "Invalid Date",
        "Please use DD/MM/YYYY format."
      );
      return;
    }

    try {
      setSaving(true);

      const person =
        peopleMap[
          form.personId
        ];

      const personName =
        person
          ? getPersonName(
              person
            )
          : "";

      const payload = {
        personId:
          form.personId,

        personName,

        amount,

        date: selectedDate,

        // Authoritative date-only key. Prevents timezone/month shifting.
        dateKey: selectedDate,

        occasionId:
          form.occasionId ||
          null,

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
            "contributions",
            editingId
          ),
          payload
        );
      } else {
        await addDoc(
          collection(
            db,
            "contributions"
          ),
          {
            ...payload,
            createdAt:
              serverTimestamp(),
          }
        );
      }

      setFormVisible(false);
      setEditingId(null);
    } catch (error) {
      console.log(
        "Save contribution error:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to save the contribution."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     DELETE
  ======================================================= */

  const confirmDelete = (item) => {
    setDeleteTarget(item);
    setDeleteModalVisible(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteDoc(
        doc(
          db,
          "contributions",
          deleteTarget.id
        )
      );

      setDeleteTarget(null);
      setDeleteModalVisible(false);
    } catch (error) {
      console.log(
        "Delete contribution error:",
        error
      );

      Alert.alert(
        "Delete Failed",
        "Unable to delete this contribution."
      );
    }
  };

  /* =======================================================
     RESET
  ======================================================= */

  const resetFilters = () => {
    setSelectedPerson(null);
    setPersonSearch("");
    setSelectedOccasion("All");
    setMonthFilter("All");
    setYearFilter("All");
  };

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
          Loading contributions...
        </Text>
      </View>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.content
        }
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>
              FINANCIAL MANAGEMENT
            </Text>

            <Text style={styles.title}>
              Contributions
            </Text>

            <Text style={styles.subtitle}>
              Track contributions received from
              volunteers and trustees
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={openAddForm}
          >
            <Ionicons
              name="add"
              size={19}
              color="#FFFFFF"
            />

            <Text style={styles.addButtonText}>
              Add Contribution
            </Text>
          </TouchableOpacity>
        </View>

        {/* FILTER PANEL */}

        <View style={styles.filterPanel}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>
              Filters
            </Text>

            <TouchableOpacity
              onPress={resetFilters}
            >
              <Text style={styles.resetText}>
                Reset Filters
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterRow}>
            {/* PERSON */}

            <View style={styles.personFilter}>
              <Text style={styles.filterLabel}>
                PERSON
              </Text>

              <TouchableOpacity
                style={styles.filterButton}
                onPress={() =>
                  setPersonModalVisible(
                    true
                  )
                }
              >
                <View
                  style={
                    styles.selectedPersonPreview
                  }
                >
                  <View
                    style={
                      styles.personFilterIcon
                    }
                  >
                    <Ionicons
                      name="person-outline"
                      size={16}
                      color={
                        COLORS.primary
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.selectedPersonText
                    }
                  >
                    <Text
                      style={
                        styles.filterValue
                      }
                      numberOfLines={1}
                    >
                      {selectedPerson
                        ? getPersonName(
                            selectedPerson
                          )
                        : "All People"}
                    </Text>

                    {selectedPerson &&
                      getMobileNumber(
                        selectedPerson
                      ) && (
                        <Text
                          style={
                            styles.filterMobile
                          }
                        >
                          {
                            getMobileNumber(
                              selectedPerson
                            )
                          }
                        </Text>
                      )}
                  </View>
                </View>

                <Ionicons
                  name="chevron-down"
                  size={15}
                  color={
                    COLORS.textMuted
                  }
                />
              </TouchableOpacity>
            </View>

            {/* OCCASION */}

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>
                OCCASION
              </Text>

              <TouchableOpacity
                style={styles.filterButton}
                onPress={() =>
                  setOccasionModalVisible(
                    true
                  )
                }
              >
                <Text
                  style={
                    styles.filterValue
                  }
                  numberOfLines={1}
                >
                  {selectedOccasion ===
                  "All"
                    ? "All Occasions"
                    : getOccasionName(
                        occasionsMap[
                          selectedOccasion
                        ]
                      )}
                </Text>

                <Ionicons
                  name="chevron-down"
                  size={15}
                  color={
                    COLORS.textMuted
                  }
                />
              </TouchableOpacity>
            </View>

            {/* MONTH */}

            <View style={styles.filterItemSmall}>
              <Text style={styles.filterLabel}>
                MONTH
              </Text>

              <View style={styles.selectWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={
                    false
                  }
                >
                  {[
                    ["All", "All"],
                    ["1", "Jan"],
                    ["2", "Feb"],
                    ["3", "Mar"],
                    ["4", "Apr"],
                    ["5", "May"],
                    ["6", "Jun"],
                    ["7", "Jul"],
                    ["8", "Aug"],
                    ["9", "Sep"],
                    ["10", "Oct"],
                    ["11", "Nov"],
                    ["12", "Dec"],
                  ].map(
                    ([value, label]) => {
                      const active =
                        monthFilter ===
                        value;

                      return (
                        <TouchableOpacity
                          key={value}
                          style={[
                            styles.monthButton,
                            active &&
                              styles.monthButtonActive,
                          ]}
                          onPress={() =>
                            setMonthFilter(
                              value
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.monthButtonText,
                              active &&
                                styles.monthButtonTextActive,
                            ]}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </ScrollView>
              </View>
            </View>

            {/* YEAR */}

            <View style={styles.yearFilter}>
              <Text style={styles.filterLabel}>
                YEAR
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                style={
                  styles.yearScroll
                }
              >
                {years.map((year) => {
                  const active =
                    String(
                      yearFilter
                    ) ===
                    String(year);

                  return (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.yearButton,
                        active &&
                          styles.yearButtonActive,
                      ]}
                      onPress={() =>
                        setYearFilter(
                          active
                            ? "All"
                            : String(
                                year
                              )
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.yearButtonText,
                          active &&
                            styles.yearButtonTextActive,
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </View>

        {/* SUMMARY */}

        <View style={styles.summaryRow}>
          <SummaryCard
            label="TOTAL CONTRIBUTIONS"
            value={`₹${formatAmount(
              totalAmount
            )}`}
            description={`${filteredContributions.length} contribution${
              filteredContributions.length ===
              1
                ? ""
                : "s"
            }`}
            icon="arrow-up"
            color={
              COLORS.success
            }
            backgroundColor={
              COLORS.successLight
            }
          />

          <SummaryCard
            label="PEOPLE"
            value={
              new Set(
                filteredContributions.map(
                  (item) =>
                    item.personId
                )
              ).size
            }
            description="People who contributed"
            icon="people-outline"
            color={
              COLORS.primary
            }
            backgroundColor={
              COLORS.primaryLight
            }
          />

          <SummaryCard
            label="AVERAGE"
            value={`₹${formatAmount(
              filteredContributions.length
                ? totalAmount /
                    filteredContributions.length
                : 0
            )}`}
            description="Average contribution"
            icon="analytics-outline"
            color={
              COLORS.accent
            }
            backgroundColor={
              COLORS.accentLight
            }
          />
        </View>

        {/* TABLE */}

        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <View>
              <Text style={styles.tableTitle}>
                Contribution Register
              </Text>

              <Text style={styles.tableSubtitle}>
                All contributions for the selected
                filters
              </Text>
            </View>

            <View style={styles.recordBadge}>
              <Text style={styles.recordBadgeText}>
                {
                  filteredContributions.length
                }{" "}
                RECORDS
              </Text>
            </View>
          </View>

          {/* TABLE HEAD */}

          <View style={styles.tableHead}>
            <Text style={styles.dateColumn}>
              DATE
            </Text>

            <Text style={styles.personColumn}>
              PERSON
            </Text>

            <Text style={styles.mobileColumn}>
              MOBILE
            </Text>

            <Text style={styles.occasionColumn}>
              OCCASION
            </Text>

            <Text style={styles.modeColumn}>
              MODE
            </Text>

            <Text style={styles.amountColumn}>
              AMOUNT
            </Text>

            <Text style={styles.actionColumn}>
              ACTION
            </Text>
          </View>

          {filteredContributions.length ===
          0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="wallet-outline"
                size={34}
                color={
                  COLORS.textMuted
                }
              />

              <Text style={styles.emptyTitle}>
                No contributions found
              </Text>

              <Text style={styles.emptyText}>
                Try changing your filters or add
                a new contribution.
              </Text>
            </View>
          ) : (
            filteredContributions.map(
              (item) => {
                const person =
                  peopleMap[
                    item.personId
                  ];

                const occasion =
                  occasionsMap[
                    item.occasionId
                  ];

                const name =
                  person
                    ? getPersonName(
                        person
                      )
                    : item.personName ||
                      "Unknown Person";

                const mobile =
                  person
                    ? getMobileNumber(
                        person
                      )
                    : "-";

                return (
                  <View
                    key={item.id}
                    style={
                      styles.tableRow
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
                        styles.personColumnView
                      }
                    >
                      <View
                        style={
                          styles.avatar
                        }
                      >
                        <Text
                          style={
                            styles.avatarText
                          }
                        >
                          {name
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.personName
                        }
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.mobileColumn
                      }
                    >
                      {mobile ||
                        "-"}
                    </Text>

                    <Text
                      style={
                        styles.occasionColumn
                      }
                      numberOfLines={2}
                    >
                      {occasion
                        ? getOccasionName(
                            occasion
                          )
                        : "General"}
                    </Text>

                    <Text
                      style={
                        styles.modeColumn
                      }
                    >
                      {item.paymentMode ||
                        "-"}
                    </Text>

                    <Text
                      style={
                        styles.amountColumn
                      }
                    >
                      +₹
                      {formatAmount(
                        item.amount
                      )}
                    </Text>

                    <View
                      style={
                        styles.actionColumnView
                      }
                    >
                      <TouchableOpacity
                        style={
                          styles.iconButton
                        }
                        onPress={() =>
                          openEditForm(
                            item
                          )
                        }
                      >
                        <Ionicons
                          name="create-outline"
                          size={17}
                          color={
                            COLORS.primary
                          }
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={
                          styles.iconButtonDanger
                        }
                        onPress={() =>
                          confirmDelete(
                            item
                          )
                        }
                      >
                        <Ionicons
                          name="trash-outline"
                          size={17}
                          color={
                            COLORS.danger
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }
            )
          )}
        </View>
      </ScrollView>

      {/* =====================================================
          PERSON FILTER MODAL
      ===================================================== */}

      <Modal
        visible={
          personModalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setPersonModalVisible(
            false
          )
        }
      >
        <Pressable
          style={
            styles.modalOverlay
          }
          onPress={() =>
            setPersonModalVisible(
              false
            )
          }
        >
          <Pressable
            style={
              styles.personModal
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
              <View>
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Select Person
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  Search by name or mobile number
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setPersonModalVisible(
                    false
                  )
                }
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={
                    COLORS.textSecondary
                  }
                />
              </TouchableOpacity>
            </View>

            {/* SEARCH */}

            <View
              style={
                styles.searchBox
              }
            >
              <Ionicons
                name="search-outline"
                size={18}
                color={
                  COLORS.textMuted
                }
              />

              <TextInput
                value={
                  personSearch
                }
                onChangeText={
                  setPersonSearch
                }
                placeholder="Search name or mobile number"
                placeholderTextColor={
                  COLORS.textMuted
                }
                style={
                  styles.searchInput
                }
                autoFocus
              />

              {personSearch.length >
                0 && (
                <TouchableOpacity
                  onPress={() =>
                    setPersonSearch(
                      ""
                    )
                  }
                >
                  <Ionicons
                    name="close-circle"
                    size={17}
                    color={
                      COLORS.textMuted
                    }
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* ALL PEOPLE */}

            <TouchableOpacity
              style={[
                styles.personOption,
                !selectedPerson &&
                  styles.personOptionActive,
              ]}
              onPress={
                clearPersonFilter
              }
            >
              <View
                style={
                  styles.personOptionIcon
                }
              >
                <Ionicons
                  name="people-outline"
                  size={17}
                  color={
                    COLORS.primary
                  }
                />
              </View>

              <View
                style={
                  styles.personOptionDetails
                }
              >
                <Text
                  style={
                    styles.personOptionName
                  }
                >
                  All People
                </Text>

                <Text
                  style={
                    styles.personOptionMobile
                  }
                >
                  Show contributions from everyone
                </Text>
              </View>

              {!selectedPerson && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={
                    COLORS.primary
                  }
                />
              )}
            </TouchableOpacity>

            {/* PEOPLE LIST */}

            <ScrollView
              style={
                styles.personList
              }
              showsVerticalScrollIndicator={
                false
              }
            >
              {filteredPeople.length ===
              0 ? (
                <View
                  style={
                    styles.noPeople
                  }
                >
                  <Ionicons
                    name="search-outline"
                    size={30}
                    color={
                      COLORS.textMuted
                    }
                  />

                  <Text
                    style={
                      styles.noPeopleTitle
                    }
                  >
                    No people found
                  </Text>

                  <Text
                    style={
                      styles.noPeopleText
                    }
                  >
                    Try another name or mobile
                    number.
                  </Text>
                </View>
              ) : (
                filteredPeople.map(
                  (person) => {
                    const active =
                      selectedPerson?.id ===
                      person.id;

                    return (
                      <TouchableOpacity
                        key={
                          person.id
                        }
                        style={[
                          styles.personOption,
                          active &&
                            styles.personOptionActive,
                        ]}
                        onPress={() =>
                          handleSelectPerson(
                            person
                          )
                        }
                      >
                        <View
                          style={
                            styles.personAvatar
                          }
                        >
                          <Text
                            style={
                              styles.personAvatarText
                            }
                          >
                            {getPersonName(
                              person
                            )
                              .charAt(
                                0
                              )
                              .toUpperCase()}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.personOptionDetails
                          }
                        >
                          <Text
                            style={
                              styles.personOptionName
                            }
                          >
                            {getPersonName(
                              person
                            ) ||
                              "Unnamed Person"}
                          </Text>

                          <View
                            style={
                              styles.mobileRow
                            }
                          >
                            <Ionicons
                              name="call-outline"
                              size={12}
                              color={
                                COLORS.textMuted
                              }
                            />

                            <Text
                              style={
                                styles.personOptionMobile
                              }
                            >
                              {getMobileNumber(
                                person
                              ) ||
                                "Mobile number not available"}
                            </Text>
                          </View>
                        </View>

                        {active && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={
                              COLORS.primary
                            }
                          />
                        )}
                      </TouchableOpacity>
                    );
                  }
                )
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* =====================================================
          OCCASION MODAL
      ===================================================== */}

      <Modal
        visible={
          occasionModalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setOccasionModalVisible(
            false
          )
        }
      >
        <Pressable
          style={
            styles.modalOverlay
          }
          onPress={() =>
            setOccasionModalVisible(
              false
            )
          }
        >
          <Pressable
            style={
              styles.smallModal
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
                Select Occasion
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setOccasionModalVisible(
                    false
                  )
                }
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={
                    COLORS.textSecondary
                  }
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={
                styles.modalList
              }
            >
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  selectedOccasion ===
                    "All" &&
                    styles.modalOptionActive,
                ]}
                onPress={() => {
                  setSelectedOccasion(
                    "All"
                  );
                  setOccasionModalVisible(
                    false
                  );
                }}
              >
                <Text
                  style={
                    styles.modalOptionText
                  }
                >
                  All Occasions
                </Text>

                {selectedOccasion ===
                  "All" && (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={
                      COLORS.primary
                    }
                  />
                )}
              </TouchableOpacity>

              {occasions.map(
                (occasion) => (
                  <TouchableOpacity
                    key={
                      occasion.id
                    }
                    style={[
                      styles.modalOption,
                      selectedOccasion ===
                        occasion.id &&
                        styles.modalOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedOccasion(
                        occasion.id
                      );
                      setOccasionModalVisible(
                        false
                      );
                    }}
                  >
                    <Text
                      style={
                        styles.modalOptionText
                      }
                    >
                      {getOccasionName(
                        occasion
                      )}
                    </Text>

                    {selectedOccasion ===
                      occasion.id && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={
                          COLORS.primary
                        }
                      />
                    )}
                  </TouchableOpacity>
                )
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* =====================================================
          ADD / EDIT MODAL
      ===================================================== */}

      <Modal
        visible={
          formVisible
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setFormVisible(false)
        }
      >
        <Pressable
          style={
            styles.modalOverlay
          }
          onPress={() =>
            setFormVisible(
              false
            )
          }
        >
          <Pressable
            style={
              styles.formModal
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
              <View>
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  {editingId
                    ? "Edit Contribution"
                    : "Add Contribution"}
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  Record contribution details
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setFormVisible(
                    false
                  );
                  setFormOccasionDropdownVisible(
                    false
                  );
                }}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={
                    COLORS.textSecondary
                  }
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.formContent
              }
            >
              {/* PERSON */}

              <Text
                style={
                  styles.formLabel
                }
              >
                PERSON *
              </Text>

              <TouchableOpacity
                style={
                  styles.formSelect
                }
                onPress={() =>
                  setFormPersonModalVisible(
                    true
                  )
                }
              >
                <View
                  style={styles.formPersonInfo}
                >
                  <Ionicons
                    name="person-outline"
                    size={17}
                    color={COLORS.primary}
                  />
                  <View
                    style={styles.formPersonText}
                  >
                    <Text
                      style={styles.formValue}
                    >
                      {form.personId &&
                      peopleMap[form.personId]
                        ? getPersonName(
                            peopleMap[form.personId]
                          )
                        : "Select Person"}
                    </Text>
                    {form.personId &&
                    peopleMap[form.personId] ? (
                      <Text
                        style={styles.formMobile}
                      >
                        {getMobileNumber(
                          peopleMap[form.personId]
                        )}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={
                    COLORS.textMuted
                  }
                />
              </TouchableOpacity>

              {/* AMOUNT */}

              <Text
                style={
                  styles.formLabel
                }
              >
                AMOUNT *
              </Text>

              <View
                style={
                  styles.amountInput
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
                  ) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        amount:
                          value.replace(
                            /[^0-9.]/g,
                            ""
                          ),
                      })
                    )
                  }
                  placeholder="Enter amount"
                  placeholderTextColor={
                    COLORS.textMuted
                  }
                  keyboardType="decimal-pad"
                  style={
                    styles.input
                  }
                />
              </View>

              {/* DATE */}

              <Text
                style={
                  styles.formLabel
                }
              >
                DATE *
              </Text>

              <View
                style={
                  styles.textInputWrapper
                }
              >
                <Ionicons
                  name="calendar-outline"
                  size={17}
                  color={
                    COLORS.textMuted
                  }
                />

                <TextInput
                  value={
                    form.date
                  }
                  onChangeText={(
                    value
                  ) =>
                    setForm(
                      (previous) => ({
                        ...previous,
                        date: value,
                      })
                    )
                  }
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={
                    COLORS.textMuted
                  }
                  style={
                    styles.input
                  }
                />
              </View>

              {/* OCCASION */}

              <Text
                style={
                  styles.formLabel
                }
              >
                OCCASION
              </Text>

              <TouchableOpacity
                style={
                  styles.formSelect
                }
                onPress={() =>
                  setFormOccasionDropdownVisible(
                    (visible) => !visible
                  )
                }
              >
                <Text
                  style={
                    styles.formValue
                  }
                >
                  {form.occasionId &&
                  occasionsMap[
                    form.occasionId
                  ]
                    ? getOccasionName(
                        occasionsMap[
                          form.occasionId
                        ]
                      )
                    : "General"}
                </Text>

                <Ionicons
                  name={
                    formOccasionDropdownVisible
                      ? "chevron-up"
                      : "chevron-down"
                  }
                  size={16}
                  color={
                    COLORS.textMuted
                  }
                />
              </TouchableOpacity>

              {formOccasionDropdownVisible && (
                <View
                  style={
                    styles.formOccasionDropdown
                  }
                >
                  <ScrollView
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={
                      true
                    }
                  >
                    <TouchableOpacity
                      style={[
                        styles.formOccasionOption,
                        !form.occasionId &&
                          styles.formOccasionOptionActive,
                      ]}
                      onPress={() => {
                        setForm(
                          (previous) => ({
                            ...previous,
                            occasionId: "",
                          })
                        );
                        setFormOccasionDropdownVisible(
                          false
                        );
                      }}
                    >
                      <Text
                        style={
                          styles.formOccasionOptionText
                        }
                      >
                        General
                      </Text>

                      {!form.occasionId && (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={
                            COLORS.primary
                          }
                        />
                      )}
                    </TouchableOpacity>

                    {occasions.map(
                      (occasion) => {
                        const active =
                          form.occasionId ===
                          occasion.id;

                        return (
                          <TouchableOpacity
                            key={
                              occasion.id
                            }
                            style={[
                              styles.formOccasionOption,
                              active &&
                                styles.formOccasionOptionActive,
                            ]}
                            onPress={() => {
                              setForm(
                                (previous) => ({
                                  ...previous,
                                  occasionId:
                                    occasion.id,
                                })
                              );
                              setFormOccasionDropdownVisible(
                                false
                              );
                            }}
                          >
                            <Text
                              style={
                                styles.formOccasionOptionText
                              }
                            >
                              {getOccasionName(
                                occasion
                              )}
                            </Text>

                            {active && (
                              <Ionicons
                                name="checkmark"
                                size={18}
                                color={
                                  COLORS.primary
                                }
                              />
                            )}
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </ScrollView>
                </View>
              )}

              {/* PAYMENT MODE */}

              <Text
                style={
                  styles.formLabel
                }
              >
                PAYMENT MODE
              </Text>

              <View
                style={
                  styles.paymentModes
                }
              >
                {[
                  "Cash",
                  "UPI",
                  "Bank Transfer",
                  "Other",
                ].map(
                  (mode) => {
                    const active =
                      form.paymentMode ===
                      mode;

                    return (
                      <TouchableOpacity
                        key={
                          mode
                        }
                        style={[
                          styles.paymentMode,
                          active &&
                            styles.paymentModeActive,
                        ]}
                        onPress={() =>
                          setForm(
                            (
                              previous
                            ) => ({
                              ...previous,
                              paymentMode:
                                mode,
                            })
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.paymentModeText,
                            active &&
                              styles.paymentModeTextActive,
                          ]}
                        >
                          {mode}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>

              {/* NOTES */}

              <Text
                style={
                  styles.formLabel
                }
              >
                NOTES
              </Text>

              <TextInput
                value={
                  form.notes
                }
                onChangeText={(
                  value
                ) =>
                  setForm(
                    (previous) => ({
                      ...previous,
                      notes: value,
                    })
                  )
                }
                placeholder="Optional notes"
                placeholderTextColor={
                  COLORS.textMuted
                }
                multiline
                numberOfLines={3}
                style={
                  styles.notesInput
                }
              />

              {/* BUTTONS */}

              <View
                style={
                  styles.formButtons
                }
              >
                <TouchableOpacity
                  style={
                    styles.cancelButton
                  }
                  onPress={() =>
                    setFormVisible(
                      false
                    )
                  }
                  disabled={
                    saving
                  }
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
                    handleSave
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
                        ? "Update Contribution"
                        : "Save Contribution"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* =====================================================
          FORM PERSON MODAL
      ===================================================== */}

      <Modal
        visible={
          formPersonModalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setFormPersonModalVisible(
            false
          )
        }
      >
        <Pressable
          style={
            styles.modalOverlay
          }
          onPress={() =>
            setFormPersonModalVisible(
              false
            )
          }
        >
          <Pressable
            style={
              styles.personModal
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
              <View>
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Select Person
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  Search by name or mobile number
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setFormPersonModalVisible(
                    false
                  )
                }
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={
                    COLORS.textSecondary
                  }
                />
              </TouchableOpacity>
            </View>

            <View
              style={
                styles.searchBox
              }
            >
              <Ionicons
                name="search-outline"
                size={18}
                color={
                  COLORS.textMuted
                }
              />

              <TextInput
                value={
                  formPersonSearch
                }
                onChangeText={
                  setFormPersonSearch
                }
                placeholder="Search name or mobile number"
                placeholderTextColor={
                  COLORS.textMuted
                }
                style={
                  styles.searchInput
                }
                autoFocus
              />
            </View>

            <ScrollView
              style={
                styles.personList
              }
            >
              {formFilteredPeople.map(
                (person) => (
                  <TouchableOpacity
                    key={
                      person.id
                    }
                    style={
                      styles.personOption
                    }
                    onPress={() => {
                      setForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          personId:
                            person.id,
                        })
                      );

                      setFormPersonSearch(
                        getPersonName(
                          person
                        )
                      );

                      setFormPersonModalVisible(
                        false
                      );
                    }}
                  >
                    <View
                      style={
                        styles.personAvatar
                      }
                    >
                      <Text
                        style={
                          styles.personAvatarText
                        }
                      >
                        {getPersonName(
                          person
                        )
                          .charAt(
                            0
                          )
                          .toUpperCase()}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.personOptionDetails
                      }
                    >
                      <Text
                        style={
                          styles.personOptionName
                        }
                      >
                        {getPersonName(
                          person
                        )}
                      </Text>

                      <View
                        style={
                          styles.mobileRow
                        }
                      >
                        <Ionicons
                          name="call-outline"
                          size={12}
                          color={
                            COLORS.textMuted
                          }
                        />

                        <Text
                          style={
                            styles.personOptionMobile
                          }
                        >
                          {getMobileNumber(
                            person
                          ) ||
                            "Mobile number not available"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* =====================================================
          DELETE MODAL
      ===================================================== */}

      <Modal
        visible={
          deleteModalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setDeleteModalVisible(
            false
          )
        }
      >
        <Pressable
          style={
            styles.modalOverlay
          }
          onPress={() =>
            setDeleteModalVisible(
              false
            )
          }
        >
          <Pressable
            style={
              styles.deleteModal
            }
            onPress={(event) =>
              event.stopPropagation()
            }
          >
            <View
              style={
                styles.deleteIcon
              }
            >
              <Ionicons
                name="trash-outline"
                size={24}
                color={
                  COLORS.danger
                }
              />
            </View>

            <Text
              style={
                styles.deleteTitle
              }
            >
              Delete Contribution?
            </Text>

            <Text
              style={
                styles.deleteText
              }
            >
              This contribution will be permanently
              removed. This action cannot be undone.
            </Text>

            <View
              style={
                styles.deleteButtons
              }
            >
              <TouchableOpacity
                style={
                  styles.cancelButton
                }
                onPress={() =>
                  setDeleteModalVisible(
                    false
                  )
                }
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
                  styles.deleteButton
                }
                onPress={
                  handleDelete
                }
              >
                <Text
                  style={
                    styles.deleteButtonText
                  }
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  icon,
  color,
  backgroundColor,
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <Text
          style={[
            styles.summaryLabel,
            { color },
          ]}
        >
          {label}
        </Text>

        <View
          style={[
            styles.summaryIcon,
            {
              backgroundColor,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={18}
            color={color}
          />
        </View>
      </View>

      <Text
        style={[
          styles.summaryValue,
          { color },
        ]}
      >
        {value}
      </Text>

      <Text
        style={styles.summaryDescription}
      >
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
    backgroundColor:
      COLORS.background,
  },

  content: {
    paddingHorizontal: 26,
    paddingTop: 26,
    paddingBottom: 45,
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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

  /* HEADER */

  header: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "flex-end",
    marginBottom: 22,
  },

  eyebrow: {
    fontFamily:
      FONTS.bold,
    fontSize: 11,
    letterSpacing: 1,
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
    marginTop: 5,
  },

  addButton: {
    height: 48,
    paddingHorizontal: 17,
    borderRadius: 9,
    backgroundColor:
      COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  addButtonText: {
    fontFamily:
      FONTS.bold,
    fontSize: 14,
    color: "#FFFFFF",
  },

  /* FILTER */

  filterPanel: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 14,
    padding: 20,
    marginBottom: 18,
  },

  filterHeader: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: 14,
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
    fontSize: 13,
    color:
      COLORS.primary,
  },

  filterRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-end",
  },

  personFilter: {
    flex: 1.35,
    minWidth: 220,
  },

  filterItem: {
    flex: 1,
    minWidth: 160,
  },

  filterItemSmall: {
    flex: 2,
    minWidth: 270,
  },

  yearFilter: {
    flex: 0.9,
    minWidth: 140,
  },

  filterLabel: {
    fontFamily:
      FONTS.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    color:
      COLORS.textMuted,
    marginBottom: 7,
  },

  filterButton: {
    height: 45,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    backgroundColor:
      COLORS.surface,
  },

  selectedPersonPreview: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  personFilterIcon: {
    width: 31,
    height: 31,
    borderRadius: 8,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  selectedPersonText: {
    flex: 1,
  },

  filterValue: {
    fontFamily:
      FONTS.medium,
    fontSize: 14,
    color:
      COLORS.text,
  },

  filterMobile: {
    fontFamily:
      FONTS.regular,
    fontSize: 11,
    color:
      COLORS.textMuted,
    marginTop: 2,
  },

  selectWrapper: {
    height: 45,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor:
      COLORS.surface,
  },

  monthButton: {
    height: 33,
    minWidth: 42,
    paddingHorizontal: 8,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginHorizontal: 2,
  },

  monthButtonActive: {
    backgroundColor:
      COLORS.primary,
  },

  monthButtonText: {
    fontFamily:
      FONTS.medium,
    fontSize: 12,
    color:
      COLORS.textSecondary,
  },

  monthButtonTextActive: {
    fontFamily:
      FONTS.bold,
    color: "#FFFFFF",
  },

  yearScroll: {
    height: 45,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor:
      COLORS.surface,
  },

  yearButton: {
    height: 33,
    paddingHorizontal: 10,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginHorizontal: 2,
  },

  yearButtonActive: {
    backgroundColor:
      COLORS.primary,
  },

  yearButtonText: {
    fontFamily:
      FONTS.medium,
    fontSize: 12,
    color:
      COLORS.textSecondary,
  },

  yearButtonTextActive: {
    fontFamily:
      FONTS.bold,
    color: "#FFFFFF",
  },

  /* SUMMARY */

  summaryRow: {
    flexDirection: "row",
    gap: 13,
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
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
  },

  summaryLabel: {
    fontFamily:
      FONTS.bold,
    fontSize: 11,
    letterSpacing: 0.5,
  },

  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
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

  /* TABLE */

  tableCard: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 14,
    overflow: "hidden",
  },

  tableHeader: {
    paddingHorizontal: 18,
    paddingVertical: 17,
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
  },

  tableTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 17,
    color:
      COLORS.text,
  },

  tableSubtitle: {
    fontFamily:
      FONTS.regular,
    fontSize: 13,
    color:
      COLORS.textMuted,
    marginTop: 3,
  },

  recordBadge: {
    backgroundColor:
      COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  recordBadgeText: {
    fontFamily:
      FONTS.bold,
    fontSize: 11,
    color:
      COLORS.primary,
  },

  tableHead: {
    minHeight: 42,
    backgroundColor:
      COLORS.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  tableRow: {
    minHeight: 72,
    borderBottomWidth: 1,
    borderBottomColor:
      "#EEF2F7",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  dateColumn: {
    width: 90,
    fontFamily:
      FONTS.medium,
    fontSize: 13,
    color:
      COLORS.textSecondary,
  },

  personColumn: {
    flex: 1.45,
    minWidth: 150,
    fontFamily:
      FONTS.bold,
    fontSize: 12,
    color:
      COLORS.primary,
  },

  mobileColumn: {
    width: 120,
    fontFamily:
      FONTS.medium,
    fontSize: 13,
    color:
      COLORS.textSecondary,
  },

  occasionColumn: {
    flex: 1.2,
    minWidth: 120,
    fontFamily:
      FONTS.medium,
    fontSize: 13,
    color:
      COLORS.text,
  },

  modeColumn: {
    width: 90,
    fontFamily:
      FONTS.medium,
    fontSize: 13,
    color:
      COLORS.textSecondary,
  },

  amountColumn: {
    width: 100,
    textAlign: "right",
    fontFamily:
      FONTS.bold,
    fontSize: 14,
    color:
      COLORS.success,
  },

  actionColumn: {
    width: 95,
    textAlign: "center",
    fontFamily:
      FONTS.bold,
    fontSize: 12,
    color:
      COLORS.textMuted,
  },

  personColumnView: {
    flex: 1.45,
    minWidth: 150,
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  avatarText: {
    fontFamily:
      FONTS.bold,
    fontSize: 14,
    color:
      COLORS.primary,
  },

  personName: {
    flex: 1,
    fontFamily:
      FONTS.medium,
    fontSize: 14,
    color:
      COLORS.text,
  },

  actionColumnView: {
    width: 95,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },

  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  iconButtonDanger: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor:
      COLORS.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },

  /* EMPTY */

  emptyState: {
    paddingVertical: 55,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 17,
    color:
      COLORS.text,
    marginTop: 10,
  },

  emptyText: {
    fontFamily:
      FONTS.regular,
    fontSize: 13,
    color:
      COLORS.textMuted,
    marginTop: 4,
  },

  /* MODALS */

  modalOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(15, 23, 42, 0.42)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  personModal: {
    width: "100%",
    maxWidth: 540,
    height: "78%",
    backgroundColor:
      COLORS.surface,
    borderRadius: 16,
    overflow: "hidden",
  },

  smallModal: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "70%",
    backgroundColor:
      COLORS.surface,
    borderRadius: 16,
    overflow: "hidden",
  },

  formModal: {
    width: "100%",
    maxWidth: 620,
    maxHeight: "90%",
    backgroundColor:
      COLORS.surface,
    borderRadius: 16,
    overflow: "visible",
    zIndex: 20,
    elevation: 20,
  },

  deleteModal: {
    width: "100%",
    maxWidth: 430,
    backgroundColor:
      COLORS.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },

  modalHeader: {
    minHeight: 70,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  modalTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 22,
    color:
      COLORS.text,
  },

  modalSubtitle: {
    fontFamily:
      FONTS.regular,
    fontSize: 13,
    color:
      COLORS.textMuted,
    marginTop: 3,
  },

  searchBox: {
    margin: 16,
    height: 45,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor:
      COLORS.background,
  },

  searchInput: {
    flex: 1,
    marginLeft: 9,
    fontFamily:
      FONTS.regular,
    fontSize: 15,
    color:
      COLORS.text,
    outlineStyle: "none",
  },

  personList: {
    paddingHorizontal: 10,
  },

  personOption: {
    minHeight: 65,
    borderRadius: 9,
    marginBottom: 3,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
  },

  personOptionActive: {
    backgroundColor:
      COLORS.primaryLight,
  },

  personAvatar: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  personAvatarText: {
    fontFamily:
      FONTS.bold,
    fontSize: 14,
    color:
      COLORS.primary,
  },

  personOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  personOptionDetails: {
    flex: 1,
  },

  personOptionName: {
    fontFamily:
      FONTS.medium,
    fontSize: 15,
    color:
      COLORS.text,
  },

  mobileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },

  personOptionMobile: {
    fontFamily:
      FONTS.regular,
    fontSize: 12,
    color:
      COLORS.textMuted,
  },

  noPeople: {
    alignItems: "center",
    paddingVertical: 45,
  },

  noPeopleTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 14,
    color:
      COLORS.text,
    marginTop: 10,
  },

  noPeopleText: {
    fontFamily:
      FONTS.regular,
    fontSize: 11,
    color:
      COLORS.textMuted,
    marginTop: 4,
  },

  modalList: {
    padding: 10,
  },

  modalOption: {
    minHeight: 45,
    paddingHorizontal: 13,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginBottom: 3,
  },

  modalOptionActive: {
    backgroundColor:
      COLORS.primaryLight,
  },

  modalOptionText: {
    fontFamily:
      FONTS.medium,
    fontSize: 14,
    color:
      COLORS.text,
  },

  /* FORM */

  formContent: {
    padding: 20,
    paddingBottom: 30,
  },

  formLabel: {
    fontFamily:
      FONTS.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    color:
      COLORS.textMuted,
    marginTop: 4,
    marginBottom: 7,
  },

  formSelect: {
    minHeight: 46,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginBottom: 15,
    backgroundColor:
      COLORS.surface,
    zIndex: 30,
  },

  formOccasionDropdown: {
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 10,
    backgroundColor:
      COLORS.surface,
    marginTop: -8,
    marginBottom: 15,
    maxHeight: 220,
    overflow: "hidden",
    zIndex: 40,
    elevation: 40,
    shadowColor:
      "#10244A",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },

  formOccasionOption: {
    minHeight: 46,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.borderLight,
  },

  formOccasionOptionActive: {
    backgroundColor:
      COLORS.primaryLight,
  },

  formOccasionOptionText: {
    fontFamily:
      FONTS.medium,
    fontSize: 15,
    color:
      COLORS.text,
    flex: 1,
  },

  formPersonInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  formPersonText: {
    marginLeft: 9,
  },

  formValue: {
    fontFamily:
      FONTS.medium,
    fontSize: 15,
    color:
      COLORS.text,
  },

  formMobile: {
    fontFamily:
      FONTS.regular,
    fontSize: 12,
    color:
      COLORS.textMuted,
    marginTop: 2,
  },

  amountInput: {
    height: 46,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    marginBottom: 15,
  },

  currencySymbol: {
    fontFamily:
      FONTS.bold,
    fontSize: 17,
    color:
      COLORS.primary,
    marginRight: 8,
  },

  textInputWrapper: {
    height: 46,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    marginBottom: 15,
  },

  input: {
    flex: 1,
    fontFamily:
      FONTS.regular,
    fontSize: 15,
    color:
      COLORS.text,
    marginLeft: 7,
    outlineStyle: "none",
  },

  paymentModes: {
    flexDirection: "row",
    gap: 7,
    flexWrap: "wrap",
    marginBottom: 15,
  },

  paymentMode: {
    paddingHorizontal: 14,
    height: 37,
    borderRadius: 8,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  paymentModeActive: {
    backgroundColor:
      COLORS.primary,
    borderColor:
      COLORS.primary,
  },

  paymentModeText: {
    fontFamily:
      FONTS.medium,
    fontSize: 13,
    color:
      COLORS.textSecondary,
  },

  paymentModeTextActive: {
    fontFamily:
      FONTS.bold,
    color: "#FFFFFF",
  },

  notesInput: {
    minHeight: 85,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 9,
    padding: 12,
    fontFamily:
      FONTS.regular,
    fontSize: 15,
    color:
      COLORS.text,
    textAlignVertical: "top",
    marginBottom: 20,
    outlineStyle: "none",
  },

  formButtons: {
    flexDirection: "row",
    gap: 10,
    justifyContent:
      "flex-end",
  },

  cancelButton: {
    minWidth: 100,
    height: 43,
    borderRadius: 8,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
  },

  cancelButtonText: {
    fontFamily:
      FONTS.medium,
    fontSize: 14,
    color:
      COLORS.textSecondary,
  },

  saveButton: {
    minWidth: 170,
    height: 43,
    borderRadius: 8,
    backgroundColor:
      COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
  },

  saveButtonText: {
    fontFamily:
      FONTS.bold,
    fontSize: 14,
    color: "#FFFFFF",
  },

  /* DELETE */

  deleteIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor:
      COLORS.dangerLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  deleteTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 18,
    color:
      COLORS.text,
  },

  deleteText: {
    fontFamily:
      FONTS.regular,
    fontSize: 14,
    lineHeight: 18,
    color:
      COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 22,
  },

  deleteButtons: {
    flexDirection: "row",
    gap: 10,
  },

  deleteButton: {
    minWidth: 100,
    height: 43,
    borderRadius: 8,
    backgroundColor:
      COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  deleteButtonText: {
    fontFamily:
      FONTS.bold,
    fontSize: 14,
    color: "#FFFFFF",
  },
});
