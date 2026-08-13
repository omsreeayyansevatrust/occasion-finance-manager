import { useEffect, useMemo, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    Platform,
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

import {
    COLORS,
    FONTS,
    RADIUS,
    SHADOWS,
} from "../constants/theme";

import { db } from "../services/firebase";

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";

/* =========================================================
   REPORT OPTIONS
   ========================================================= */

const REPORT_OPTIONS = [
  {
    label: "People",
    value: "people",
    description: "Export the complete People Master",
  },
  {
    label: "Contribution Report",
    value: "contribution",
    description:
      "Occasion-wise contribution status for all people",
  },
];

/* =========================================================
   HELPERS
   ========================================================= */

const formatAmount = (value) => {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const getPersonName = (person) => {
  return (
    person?.name ||
    person?.fullName ||
    person?.displayName ||
    "Unknown Person"
  );
};

const getMobileNumber = (person) => {
  return (
    person?.mobile ||
    person?.phone ||
    person?.phoneNumber ||
    "-"
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
    return "";
  }

  try {
    if (
      typeof value === "object" &&
      typeof value.toDate === "function"
    ) {
      return value.toDate().toLocaleString("en-IN");
    }

    if (value instanceof Date) {
      return value.toLocaleString("en-IN");
    }

    return String(value);
  } catch {
    return String(value);
  }
};

/* =========================================================
   SCREEN
   ========================================================= */

export default function ReportsScreen() {
  const [reportType, setReportType] =
    useState("people");

  const [showReportPicker, setShowReportPicker] =
    useState(false);

  /* -------------------------------------------------------
     EXISTING PEOPLE REPORT DATA
     ------------------------------------------------------- */

  const [people, setPeople] = useState([]);

  /* -------------------------------------------------------
     NEW CONTRIBUTION REPORT DATA
     ------------------------------------------------------- */

  const [contributions, setContributions] =
    useState([]);

  const [occasions, setOccasions] =
    useState([]);

  const [
    selectedOccasionId,
    setSelectedOccasionId,
  ] = useState("");

  const [
    showOccasionPicker,
    setShowOccasionPicker,
  ] = useState(false);

  const [
    contributionStatusFilter,
    setContributionStatusFilter,
  ] = useState("All");

  const [loading, setLoading] =
    useState(true);

  const [exporting, setExporting] =
    useState(false);

  /* =======================================================
     FIREBASE DATA
     ======================================================= */

  useEffect(() => {
    let peopleLoaded = false;
    let contributionsLoaded = false;
    let occasionsLoaded = false;

    const checkLoading = () => {
      if (
        peopleLoaded &&
        contributionsLoaded &&
        occasionsLoaded
      ) {
        setLoading(false);
      }
    };

    /* -------------------------------------------------------
       PEOPLE
       ------------------------------------------------------- */

    const unsubscribePeople =
      onSnapshot(
        collection(db, "people"),
        (snapshot) => {
          setPeople(
            snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            }))
          );

          peopleLoaded = true;
          checkLoading();
        },
        (error) => {
          console.log(
            "People report error:",
            error
          );

          peopleLoaded = true;
          checkLoading();

          Alert.alert(
            "Unable to load report",
            "People data could not be loaded."
          );
        }
      );

    /* -------------------------------------------------------
       CONTRIBUTIONS
       ------------------------------------------------------- */

    const unsubscribeContributions =
      onSnapshot(
        collection(db, "contributions"),
        (snapshot) => {
          setContributions(
            snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            }))
          );

          contributionsLoaded = true;
          checkLoading();
        },
        (error) => {
          console.log(
            "Contribution report error:",
            error
          );

          contributionsLoaded = true;
          checkLoading();

          Alert.alert(
            "Unable to load contributions",
            "Contribution data could not be loaded."
          );
        }
      );

    /* -------------------------------------------------------
       OCCASIONS
       ------------------------------------------------------- */

    const unsubscribeOccasions =
      onSnapshot(
        collection(db, "occasions"),
        (snapshot) => {
          setOccasions(
            snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            }))
          );

          occasionsLoaded = true;
          checkLoading();
        },
        (error) => {
          console.log(
            "Occasion report error:",
            error
          );

          occasionsLoaded = true;
          checkLoading();

          Alert.alert(
            "Unable to load occasions",
            "Occasion data could not be loaded."
          );
        }
      );

    return () => {
      unsubscribePeople();
      unsubscribeContributions();
      unsubscribeOccasions();
    };
  }, []);

  /* =======================================================
     SELECTED REPORT
     ======================================================= */

  const selectedReport = useMemo(
    () =>
      REPORT_OPTIONS.find(
        (item) =>
          item.value === reportType
      ) || REPORT_OPTIONS[0],
    [reportType]
  );

  /* =======================================================
     SORTED OCCASIONS
     ======================================================= */

  const sortedOccasions = useMemo(() => {
    return [...occasions].sort(
      (a, b) =>
        getOccasionName(a).localeCompare(
          getOccasionName(b)
        )
    );
  }, [occasions]);

  /* =======================================================
     SELECTED OCCASION
     ======================================================= */

  const selectedOccasion = useMemo(() => {
    return occasions.find(
      (item) =>
        item.id === selectedOccasionId
    );
  }, [
    occasions,
    selectedOccasionId,
  ]);

  /* =======================================================
     CONTRIBUTION MAP

     One person can have multiple contribution records
     for the same occasion.

     Example:

     Ravi
       ₹500 Cash
       ₹500 UPI
       ₹1,000 Bank

     Report:

     Ravi → ₹2,000
   ======================================================= */

  const contributionMap = useMemo(() => {
    const map = {};

    contributions.forEach((item) => {
      if (!item.personId) {
        return;
      }

      if (!item.occasionId) {
        return;
      }

      const key =
        `${item.personId}__${item.occasionId}`;

      if (!map[key]) {
        map[key] = {
          personId: item.personId,
          occasionId: item.occasionId,
          amount: 0,
          transactions: 0,
          paymentModes: [],
          latestDate: "",
        };
      }

      map[key].amount += Number(
        item.amount || 0
      );

      map[key].transactions += 1;

      if (item.paymentMode) {
        if (
          !map[key].paymentModes.includes(
            item.paymentMode
          )
        ) {
          map[key].paymentModes.push(
            item.paymentMode
          );
        }
      }

      if (item.date) {
        map[key].latestDate = item.date;
      }
    });

    return map;
  }, [contributions]);

  /* =======================================================
     CONTRIBUTION REPORT

     IMPORTANT:
     PEOPLE IS THE MASTER LIST.

     Therefore:
     - Contribution exists → Contributed
     - No contribution → Not Contributed
   ======================================================= */

  const contributionReport = useMemo(() => {
    if (!selectedOccasionId) {
      return [];
    }

    return people
      .map((person) => {
        const key =
          `${person.id}__${selectedOccasionId}`;

        const contribution =
          contributionMap[key];

        const amount = Number(
          contribution?.amount || 0
        );

        const contributed =
          amount > 0;

        return {
          id: person.id,

          name: getPersonName(person),

          mobile:
            getMobileNumber(person),

          amount,

          status: contributed
            ? "Contributed"
            : "Not Contributed",

          contributed,

          paymentMode:
            contribution?.paymentModes?.join(
              ", "
            ) || "-",

          date:
            contribution?.latestDate || "",

          transactions:
            contribution?.transactions || 0,
        };
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      );
  }, [
    people,
    contributionMap,
    selectedOccasionId,
  ]);

  /* =======================================================
     UI DATA

     THIS IS THE DATA USED BOTH BY:
     1. UI
     2. EXCEL EXPORT

     So Excel always matches the UI.
   ======================================================= */

  const filteredContributionReport =
    useMemo(() => {
      if (
        contributionStatusFilter ===
        "All"
      ) {
        return contributionReport;
      }

      if (
        contributionStatusFilter ===
        "Contributed"
      ) {
        return contributionReport.filter(
          (item) =>
            item.contributed
        );
      }

      return contributionReport.filter(
        (item) =>
          !item.contributed
      );
    }, [
      contributionReport,
      contributionStatusFilter,
    ]);

  /* =======================================================
     CONTRIBUTION SUMMARY
   ======================================================= */

  const contributionSummary =
    useMemo(() => {
      const totalPeople =
        contributionReport.length;

      const contributed =
        contributionReport.filter(
          (item) =>
            item.contributed
        ).length;

      const notContributed =
        totalPeople - contributed;

      const totalAmount =
        contributionReport.reduce(
          (sum, item) =>
            sum +
            Number(item.amount || 0),
          0
        );

      const percentage =
        totalPeople > 0
          ? (contributed /
              totalPeople) *
            100
          : 0;

      return {
        totalPeople,
        contributed,
        notContributed,
        totalAmount,
        percentage,
      };
    }, [contributionReport]);

  /* =======================================================
     EXISTING PEOPLE EXPORT

     THIS FUNCTION IS INTENTIONALLY KEPT AS THE
     EXISTING PEOPLE REPORT LOGIC.
   ======================================================= */

  const exportPeople = async () => {
    if (!people.length) {
      Alert.alert(
        "No Data",
        "There are no people records to export."
      );

      return;
    }

    setExporting(true);

    try {
      const rows = people.map(
        (person, index) => ({
          "S.No": index + 1,
          Name: person.name || "",
          Mobile: person.mobile || "",
          "Date of Birth":
            person.dob || "",
          "Blood Group":
            person.bloodGroup || "",
          Email: person.email || "",
          Type: person.type || "",
          Address: person.address || "",
          Status: person.status || "",
          "Created At":
            formatDate(
              person.createdAt
            ),
          "Updated At":
            formatDate(
              person.updatedAt
            ),
          "Record ID":
            person.id || "",
        })
      );

      const worksheet =
        XLSX.utils.json_to_sheet(
          rows
        );

      worksheet["!cols"] = [
        { wch: 7 },
        { wch: 28 },
        { wch: 16 },
        { wch: 15 },
        { wch: 13 },
        { wch: 32 },
        { wch: 14 },
        { wch: 40 },
        { wch: 12 },
        { wch: 22 },
        { wch: 22 },
        { wch: 30 },
      ];

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "People"
      );

      const filename =
        `People_Report_${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`;

      await saveWorkbook(
        workbook,
        filename,
        "Export People Report"
      );
    } catch (error) {
      console.log(
        "People report export error:",
        error
      );

      Alert.alert(
        "Export Failed",
        "Unable to generate the Excel report. Please try again."
      );
    } finally {
      setExporting(false);
    }
  };

  /* =======================================================
     NEW CONTRIBUTION REPORT EXPORT

     IMPORTANT:
     EXPORTS filteredContributionReport,
     which is EXACTLY what is displayed in UI.
   ======================================================= */

  const exportContributionReport =
    async () => {
      if (!selectedOccasionId) {
        Alert.alert(
          "Select Occasion",
          "Please select an occasion first."
        );

        return;
      }

      if (
        filteredContributionReport.length ===
        0
      ) {
        Alert.alert(
          "No Data",
          "There are no records available for the selected filter."
        );

        return;
      }

      setExporting(true);

      try {
        const occasionName =
          getOccasionName(
            selectedOccasion
          );

        /* ---------------------------------------------------
           EXACTLY THE SAME DATA AS UI
        --------------------------------------------------- */

        const detailRows =
          filteredContributionReport.map(
            (item, index) => ({
              "S.No": index + 1,

              Person: item.name,

              Mobile: item.mobile,

              Status: item.status,

              Contribution:
                Number(
                  item.amount || 0
                ),

              "Payment Mode":
                item.paymentMode,

              "Contribution Date":
                item.date
                  ? formatDate(
                      item.date
                    )
                  : "",

              Transactions:
                item.transactions,

              "Person ID":
                item.id,
            })
          );

        const worksheet =
          XLSX.utils.json_to_sheet(
            detailRows
          );

        worksheet["!cols"] = [
          { wch: 8 },
          { wch: 30 },
          { wch: 18 },
          { wch: 20 },
          { wch: 18 },
          { wch: 25 },
          { wch: 24 },
          { wch: 14 },
          { wch: 34 },
        ];

        /* ---------------------------------------------------
           WORKBOOK

           Only one Details sheet because the user requested
           the Excel to represent the UI data.
        --------------------------------------------------- */

        const workbook =
          XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          "Contribution Report"
        );

        const safeOccasionName =
          occasionName
            .replace(
              /[^a-zA-Z0-9-_ ]/g,
              ""
            )
            .replace(
              /\s+/g,
              "_"
            );

        const safeFilter =
          contributionStatusFilter
            .replace(
              /\s+/g,
              "_"
            );

        const filename =
          `Contribution_Report_${safeOccasionName}_${safeFilter}_${new Date()
            .toISOString()
            .slice(0, 10)}.xlsx`;

        await saveWorkbook(
          workbook,
          filename,
          "Export Contribution Report"
        );
      } catch (error) {
        console.log(
          "Contribution report export error:",
          error
        );

        Alert.alert(
          "Export Failed",
          "Unable to generate the contribution report."
        );
      } finally {
        setExporting(false);
      }
    };

  /* =======================================================
     WORKBOOK SAVE
   ======================================================= */

  const saveWorkbook = async (
    workbook,
    filename,
    dialogTitle
  ) => {
    if (Platform.OS === "web") {
      const buffer =
        XLSX.write(workbook, {
          bookType: "xlsx",
          type: "array",
        });

      const blob = new Blob(
        [buffer],
        {
          type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }
      );

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        filename;

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      URL.revokeObjectURL(
        url
      );

      return;
    }

    const base64 =
      XLSX.write(workbook, {
        bookType: "xlsx",
        type: "base64",
      });

    const fileUri =
      `${FileSystem.cacheDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(
      fileUri,
      base64,
      {
        encoding:
          FileSystem.EncodingType.Base64,
      }
    );

    if (
      await Sharing.isAvailableAsync()
    ) {
      await Sharing.shareAsync(
        fileUri,
        {
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

          dialogTitle,

          UTI:
            "org.openxmlformats.spreadsheetml.sheet",
        }
      );
    } else {
      Alert.alert(
        "Export Complete",
        `Excel file created at:\n${fileUri}`
      );
    }
  };

  /* =======================================================
     LOADING
   ======================================================= */

  if (loading) {
    return (
      <View style={styles.loading}>
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
          Loading reports...
        </Text>
      </View>
    );
  }

  /* =======================================================
     UI
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
        {/* =================================================
            HEADER
        ================================================= */}

        <View
          style={
            styles.header
          }
        >
          <View
            style={
              styles.headerText
            }
          >
            <Text
              style={
                styles.eyebrow
              }
            >
              DATA & REPORTING
            </Text>

            <Text
              style={
                styles.title
              }
            >
              Reports
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              Generate reports from your
              application data
            </Text>
          </View>
        </View>

        {/* =================================================
            REPORT SELECTOR
        ================================================= */}

        <View
          style={
            styles.card
          }
        >
          <Text
            style={
              styles.cardTitle
            }
          >
            Select Report
          </Text>

          <Text
            style={
              styles.cardSubtitle
            }
          >
            Choose the report you want
            to view or download.
          </Text>

          <Text
            style={
              styles.label
            }
          >
            REPORT TYPE
          </Text>

          <TouchableOpacity
            style={
              styles.dropdown
            }
            onPress={() =>
              setShowReportPicker(
                !showReportPicker
              )
            }
            activeOpacity={
              0.8
            }
          >
            <View
              style={
                styles.dropdownText
              }
            >
              <Text
                style={
                  styles.dropdownValue
                }
              >
                {
                  selectedReport.label
                }
              </Text>

              <Text
                style={
                  styles.dropdownDescription
                }
              >
                {
                  selectedReport.description
                }
              </Text>
            </View>

            <Text
              style={
                styles.chevron
              }
            >
              {showReportPicker
                ? "▲"
                : "▼"}
            </Text>
          </TouchableOpacity>

          {showReportPicker ? (
            <View
              style={
                styles.dropdownMenu
              }
            >
              {REPORT_OPTIONS.map(
                (option) => (
                  <TouchableOpacity
                    key={
                      option.value
                    }
                    style={[
                      styles.option,
                      option.value ===
                        reportType &&
                        styles.optionActive,
                    ]}
                    onPress={() => {
                      setReportType(
                        option.value
                      );

                      setShowReportPicker(
                        false
                      );

                      if (
                        option.value !==
                        "contribution"
                      ) {
                        setShowOccasionPicker(
                          false
                        );
                      }
                    }}
                    activeOpacity={
                      0.8
                    }
                  >
                    <View
                      style={
                        styles.optionText
                      }
                    >
                      <Text
                        style={[
                          styles.optionLabel,
                          option.value ===
                            reportType &&
                            styles.optionLabelActive,
                        ]}
                      >
                        {
                          option.label
                        }
                      </Text>

                      <Text
                        style={
                          styles.optionDescription
                        }
                      >
                        {
                          option.description
                        }
                      </Text>
                    </View>

                    {option.value ===
                    reportType ? (
                      <Text
                        style={
                          styles.check
                        }
                      >
                        ✓
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                )
              )}
            </View>
          ) : null}

          {/* =================================================
              PEOPLE REPORT

              THIS SECTION RETAINS THE EXISTING FUNCTIONALITY.
          ================================================= */}

          {reportType ===
          "people" ? (
            <>
              <View
                style={
                  styles.previewCard
                }
              >
                <View
                  style={
                    styles.previewIcon
                  }
                >
                  <Text
                    style={
                      styles.previewIconText
                    }
                  >
                    XLS
                  </Text>
                </View>

                <View
                  style={
                    styles.previewText
                  }
                >
                  <Text
                    style={
                      styles.previewTitle
                    }
                  >
                    People Master
                  </Text>

                  <Text
                    style={
                      styles.previewDescription
                    }
                  >
                    Complete people data
                    including name,
                    mobile, DOB, blood
                    group, email, type,
                    address and status.
                  </Text>
                </View>

                <View
                  style={
                    styles.countBadge
                  }
                >
                  <Text
                    style={
                      styles.countValue
                    }
                  >
                    {
                      people.length
                    }
                  </Text>

                  <Text
                    style={
                      styles.countLabel
                    }
                  >
                    Records
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.downloadButton,
                  exporting &&
                    styles.downloadButtonDisabled,
                ]}
                onPress={
                  exportPeople
                }
                disabled={
                  exporting
                }
                activeOpacity={
                  0.8
                }
              >
                {exporting ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      COLORS.white
                    }
                  />
                ) : (
                  <Text
                    style={
                      styles.downloadIcon
                    }
                  >
                    ↓
                  </Text>
                )}

                <Text
                  style={
                    styles.downloadText
                  }
                >
                  {exporting
                    ? "Generating Excel..."
                    : "Download Excel"}
                </Text>
              </TouchableOpacity>

              <View
                style={
                  styles.infoCard
                }
              >
                <Text
                  style={
                    styles.infoTitle
                  }
                >
                  People Report
                </Text>

                <Text
                  style={
                    styles.infoText
                  }
                >
                  The report always
                  exports the complete
                  People Master. Active
                  search and filters on
                  the People screen do
                  not affect this report.
                </Text>
              </View>
            </>
          ) : null}

          {/* =================================================
              CONTRIBUTION REPORT
          ================================================= */}

          {reportType ===
          "contribution" ? (
            <>
              {/* OCCASION */}

              <Text
                style={[
                  styles.label,
                  {
                    marginTop: 22,
                  },
                ]}
              >
                OCCASION
              </Text>

              <TouchableOpacity
                style={
                  styles.dropdown
                }
                onPress={() =>
                  setShowOccasionPicker(
                    !showOccasionPicker
                  )
                }
                activeOpacity={
                  0.8
                }
              >
                <View
                  style={
                    styles.dropdownText
                  }
                >
                  <Text
                    style={
                      styles.dropdownValue
                    }
                  >
                    {selectedOccasion
                      ? getOccasionName(
                          selectedOccasion
                        )
                      : "Select Occasion"}
                  </Text>

                  <Text
                    style={
                      styles.dropdownDescription
                    }
                  >
                    Generate contribution
                    status for this
                    occasion
                  </Text>
                </View>

                <Text
                  style={
                    styles.chevron
                  }
                >
                  {showOccasionPicker
                    ? "▲"
                    : "▼"}
                </Text>
              </TouchableOpacity>

              {showOccasionPicker ? (
                <View
                  style={
                    styles.dropdownMenu
                  }
                >
                  {sortedOccasions.length ===
                  0 ? (
                    <View
                      style={
                        styles.noOption
                      }
                    >
                      <Text
                        style={
                          styles.noOptionText
                        }
                      >
                        No occasions
                        available
                      </Text>
                    </View>
                  ) : (
                    sortedOccasions.map(
                      (occasion) => (
                        <TouchableOpacity
                          key={
                            occasion.id
                          }
                          style={[
                            styles.option,
                            occasion.id ===
                              selectedOccasionId &&
                              styles.optionActive,
                          ]}
                          onPress={() => {
                            setSelectedOccasionId(
                              occasion.id
                            );

                            setContributionStatusFilter(
                              "All"
                            );

                            setShowOccasionPicker(
                              false
                            );
                          }}
                          activeOpacity={
                            0.8
                          }
                        >
                          <View
                            style={
                              styles.optionText
                            }
                          >
                            <Text
                              style={[
                                styles.optionLabel,
                                occasion.id ===
                                  selectedOccasionId &&
                                  styles.optionLabelActive,
                              ]}
                            >
                              {
                                getOccasionName(
                                  occasion
                                )
                              }
                            </Text>
                          </View>

                          {occasion.id ===
                          selectedOccasionId ? (
                            <Text
                              style={
                                styles.check
                              }
                            >
                              ✓
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      )
                    )
                  )}
                </View>
              ) : null}

              {/* BEFORE OCCASION SELECTION */}

              {!selectedOccasionId ? (
                <View
                  style={
                    styles.selectMessage
                  }
                >
                  <Text
                    style={
                      styles.selectMessageText
                    }
                  >
                    Select an occasion to
                    generate the contribution
                    report.
                  </Text>
                </View>
              ) : (
                <>
                  {/* =================================================
                      SUMMARY
                  ================================================= */}

                  <View
                    style={
                      styles.reportHeader
                    }
                  >
                    <View
                      style={
                        styles.reportHeaderText
                      }
                    >
                      <Text
                        style={
                          styles.sectionTitle
                        }
                      >
                        Contribution Summary
                      </Text>

                      <Text
                        style={
                          styles.sectionSubtitle
                        }
                      >
                        {
                          getOccasionName(
                            selectedOccasion
                          )
                        }
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.summaryGrid
                    }
                  >
                    {/* TOTAL PEOPLE */}

                    <View
                      style={[
                        styles.summaryCard,
                        styles.summaryBlue,
                      ]}
                    >
                      <Text
                        style={
                          styles.summaryLabel
                        }
                      >
                        TOTAL PEOPLE
                      </Text>

                      <Text
                        style={
                          styles.summaryValue
                        }
                      >
                        {
                          contributionSummary.totalPeople
                        }
                      </Text>
                    </View>

                    {/* CONTRIBUTED */}

                    <View
                      style={[
                        styles.summaryCard,
                        styles.summaryGreen,
                      ]}
                    >
                      <Text
                        style={
                          styles.summaryLabel
                        }
                      >
                        CONTRIBUTED
                      </Text>

                      <Text
                        style={
                          styles.summaryValue
                        }
                      >
                        {
                          contributionSummary.contributed
                        }
                      </Text>
                    </View>

                    {/* NOT CONTRIBUTED */}

                    <View
                      style={[
                        styles.summaryCard,
                        styles.summaryRed,
                      ]}
                    >
                      <Text
                        style={
                          styles.summaryLabel
                        }
                      >
                        NOT CONTRIBUTED
                      </Text>

                      <Text
                        style={
                          styles.summaryValue
                        }
                      >
                        {
                          contributionSummary.notContributed
                        }
                      </Text>
                    </View>

                    {/* TOTAL AMOUNT */}

                    <View
                      style={[
                        styles.summaryCard,
                        styles.summaryYellow,
                      ]}
                    >
                      <Text
                        style={
                          styles.summaryLabel
                        }
                      >
                        TOTAL CONTRIBUTION
                      </Text>

                      <Text
                        style={
                          styles.summaryAmount
                        }
                      >
                        ₹
                        {formatAmount(
                          contributionSummary.totalAmount
                        )}
                      </Text>
                    </View>
                  </View>

                  {/* CONTRIBUTION RATE */}

                  <View
                    style={
                      styles.rateCard
                    }
                  >
                    <View
                      style={
                        styles.rateHeader
                      }
                    >
                      <Text
                        style={
                          styles.rateTitle
                        }
                      >
                        Contribution Rate
                      </Text>

                      <Text
                        style={
                          styles.rateValue
                        }
                      >
                        {contributionSummary.percentage.toFixed(
                          1
                        )}
                        %
                      </Text>
                    </View>

                    <View
                      style={
                        styles.rateTrack
                      }
                    >
                      <View
                        style={[
                          styles.rateFill,
                          {
                            width: `${Math.min(
                              contributionSummary.percentage,
                              100
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* =================================================
                      DETAILS
                  ================================================= */}

                  <View
                    style={
                      styles.detailsCard
                    }
                  >
                    <View
                      style={
                        styles.detailsHeader
                      }
                    >
                      <View>
                        <Text
                          style={
                            styles.sectionTitle
                          }
                        >
                          Contribution Details
                        </Text>

                        <Text
                          style={
                            styles.sectionSubtitle
                          }
                        >
                          All people are included
                          from People Master
                        </Text>
                      </View>
                    </View>

                    {/* STATUS FILTER */}

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={
                        false
                      }
                      contentContainerStyle={
                        styles.filterRow
                      }
                    >
                      <TouchableOpacity
                        style={[
                          styles.filterChip,
                          contributionStatusFilter ===
                            "All" &&
                            styles.filterChipActive,
                        ]}
                        onPress={() =>
                          setContributionStatusFilter(
                            "All"
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            contributionStatusFilter ===
                              "All" &&
                              styles.filterChipTextActive,
                          ]}
                        >
                          All (
                          {
                            contributionSummary.totalPeople
                          }
                          )
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.filterChip,
                          contributionStatusFilter ===
                            "Contributed" &&
                            styles.filterChipGreen,
                        ]}
                        onPress={() =>
                          setContributionStatusFilter(
                            "Contributed"
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            contributionStatusFilter ===
                              "Contributed" &&
                              styles.filterChipTextActive,
                          ]}
                        >
                          Contributed (
                          {
                            contributionSummary.contributed
                          }
                          )
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.filterChip,
                          contributionStatusFilter ===
                            "Not Contributed" &&
                            styles.filterChipRed,
                        ]}
                        onPress={() =>
                          setContributionStatusFilter(
                            "Not Contributed"
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            contributionStatusFilter ===
                              "Not Contributed" &&
                              styles.filterChipTextActive,
                          ]}
                        >
                          Not Contributed (
                          {
                            contributionSummary.notContributed
                          }
                          )
                        </Text>
                      </TouchableOpacity>
                    </ScrollView>

                    {/* TABLE */}

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={
                        true
                      }
                    >
                      <View
                        style={
                          styles.table
                        }
                      >
                        {/* HEADER */}

                        <View
                          style={
                            styles.tableHeader
                          }
                        >
                          <Text
                            style={
                              styles.colNumber
                            }
                          >
                            #
                          </Text>

                          <Text
                            style={
                              styles.colPerson
                            }
                          >
                            PERSON
                          </Text>

                          <Text
                            style={
                              styles.colMobile
                            }
                          >
                            MOBILE
                          </Text>

                          <Text
                            style={
                              styles.colStatus
                            }
                          >
                            STATUS
                          </Text>

                          <Text
                            style={
                              styles.colAmount
                            }
                          >
                            CONTRIBUTION
                          </Text>

                          <Text
                            style={
                              styles.colMode
                            }
                          >
                            PAYMENT MODE
                          </Text>

                          <Text
                            style={
                              styles.colDate
                            }
                          >
                            DATE
                          </Text>
                        </View>

                        {/* DATA */}

                        {filteredContributionReport.length ===
                        0 ? (
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
                              There are no people
                              matching the selected
                              status.
                            </Text>
                          </View>
                        ) : (
                          filteredContributionReport.map(
                            (
                              item,
                              index
                            ) => (
                              <View
                                key={
                                  item.id
                                }
                                style={
                                  styles.tableRow
                                }
                              >
                                <Text
                                  style={
                                    styles.colNumber
                                  }
                                >
                                  {index +
                                    1}
                                </Text>

                                <View
                                  style={
                                    styles.personCell
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
                                      {item.name
                                        .charAt(
                                          0
                                        )
                                        .toUpperCase()}
                                    </Text>
                                  </View>

                                  <Text
                                    style={
                                      styles.personName
                                    }
                                    numberOfLines={
                                      1
                                    }
                                  >
                                    {
                                      item.name
                                    }
                                  </Text>
                                </View>

                                <Text
                                  style={
                                    styles.colMobile
                                  }
                                >
                                  {
                                    item.mobile
                                  }
                                </Text>

                                <View
                                  style={
                                    styles.colStatusView
                                  }
                                >
                                  <View
                                    style={[
                                      styles.statusBadge,
                                      item.contributed
                                        ? styles.statusGreen
                                        : styles.statusRed,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.statusText,
                                        item.contributed
                                          ? styles.statusTextGreen
                                          : styles.statusTextRed,
                                      ]}
                                    >
                                      {
                                        item.status
                                      }
                                    </Text>
                                  </View>
                                </View>

                                <Text
                                  style={[
                                    styles.colAmount,
                                    item.contributed
                                      ? styles.amountGreen
                                      : styles.amountZero,
                                  ]}
                                >
                                  ₹
                                  {formatAmount(
                                    item.amount
                                  )}
                                </Text>

                                <Text
                                  style={
                                    styles.colMode
                                  }
                                >
                                  {
                                    item.paymentMode
                                  }
                                </Text>

                                <Text
                                  style={
                                    styles.colDate
                                  }
                                >
                                  {item.date
                                    ? formatDate(
                                        item.date
                                      )
                                    : "-"}
                                </Text>
                              </View>
                            )
                          )
                        )}
                      </View>
                    </ScrollView>
                  </View>

                  {/* =================================================
                      EXPORT

                      Uses EXACTLY the filtered UI dataset.
                  ================================================= */}

                  <TouchableOpacity
                    style={[
                      styles.downloadButton,
                      exporting &&
                        styles.downloadButtonDisabled,
                    ]}
                    onPress={
                      exportContributionReport
                    }
                    disabled={
                      exporting
                    }
                    activeOpacity={
                      0.8
                    }
                  >
                    {exporting ? (
                      <ActivityIndicator
                        size="small"
                        color={
                          COLORS.white
                        }
                      />
                    ) : (
                      <Text
                        style={
                          styles.downloadIcon
                        }
                      >
                        ↓
                      </Text>
                    )}

                    <Text
                      style={
                        styles.downloadText
                      }
                    >
                      {exporting
                        ? "Generating Excel..."
                        : "Download Contribution Report"}
                    </Text>
                  </TouchableOpacity>

                  <View
                    style={
                      styles.infoCard
                    }
                  >
                    <Text
                      style={
                        styles.infoTitle
                      }
                    >
                      Contribution Report
                    </Text>

                    <Text
                      style={
                        styles.infoText
                      }
                    >
                      The report starts with the
                      complete People Master and
                      checks each person against
                      contributions for the selected
                      occasion. The Excel export uses
                      exactly the data currently
                      displayed in the report.
                    </Text>
                  </View>
                </>
              )}
            </>
          ) : null}
        </View>
      </ScrollView>
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
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 40,
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
  },

  header: {
    marginBottom: 24,
  },

  headerText: {
    flex: 1,
  },

  eyebrow: {
    fontFamily:
      FONTS.medium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.2,
    color:
      COLORS.primary,
    marginBottom: 4,
  },

  title: {
    fontFamily:
      FONTS.bold,
    fontSize: 30,
    lineHeight: 38,
    color: COLORS.text,
  },

  subtitle: {
    fontFamily:
      FONTS.regular,
    fontSize: 15,
    lineHeight: 21,
    color:
      COLORS.textSecondary,
    marginTop: 3,
  },

  card: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius:
      RADIUS.card,
    padding: 24,
    ...SHADOWS.card,
  },

  cardTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 20,
    lineHeight: 27,
    color: COLORS.text,
  },

  cardSubtitle: {
    fontFamily:
      FONTS.regular,
    fontSize: 13,
    lineHeight: 19,
    color:
      COLORS.textMuted,
    marginTop: 3,
    marginBottom: 24,
  },

  label: {
    fontFamily:
      FONTS.medium,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.7,
    color:
      COLORS.textMuted,
    marginBottom: 7,
  },

  dropdown: {
    minHeight: 58,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 10,
    backgroundColor:
      COLORS.surface,
    flexDirection:
      "row",
    alignItems:
      "center",
    justifyContent:
      "space-between",
    paddingHorizontal: 14,
  },

  dropdownText: {
    flex: 1,
  },

  dropdownValue: {
    fontFamily:
      FONTS.medium,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
  },

  dropdownDescription: {
    fontFamily:
      FONTS.regular,
    fontSize: 11,
    lineHeight: 16,
    color:
      COLORS.textMuted,
    marginTop: 2,
  },

  chevron: {
    fontFamily:
      FONTS.bold,
    fontSize: 11,
    color:
      COLORS.textMuted,
    marginLeft: 12,
  },

  dropdownMenu: {
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 10,
    backgroundColor:
      COLORS.surface,
    marginTop: 6,
    overflow: "hidden",
  },

  option: {
    minHeight: 58,
    flexDirection:
      "row",
    alignItems:
      "center",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.borderLight,
  },

  optionActive: {
    backgroundColor:
      COLORS.primaryLight,
  },

  optionText: {
    flex: 1,
  },

  optionLabel: {
    fontFamily:
      FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },

  optionLabelActive: {
    fontFamily:
      FONTS.bold,
    color:
      COLORS.primary,
  },

  optionDescription: {
    fontFamily:
      FONTS.regular,
    fontSize: 11,
    color:
      COLORS.textMuted,
    marginTop: 2,
  },

  check: {
    fontFamily:
      FONTS.bold,
    fontSize: 17,
    color:
      COLORS.primary,
    marginLeft: 10,
  },

  /* =======================================================
     PEOPLE REPORT
     Existing styles retained
     ======================================================= */

  previewCard: {
    marginTop: 22,
    minHeight: 88,
    borderWidth: 1,
    borderColor:
      COLORS.borderLight,
    borderRadius: 12,
    backgroundColor:
      COLORS.background,
    flexDirection:
      "row",
    alignItems:
      "center",
    padding: 14,
  },

  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor:
      COLORS.successLight,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  previewIconText: {
    fontFamily:
      FONTS.bold,
    fontSize: 12,
    color:
      COLORS.success,
  },

  previewText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 13,
  },

  previewTitle: {
    fontFamily:
      FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },

  previewDescription: {
    fontFamily:
      FONTS.regular,
    fontSize: 11,
    lineHeight: 16,
    color:
      COLORS.textMuted,
    marginTop: 3,
  },

  countBadge: {
    alignItems:
      "center",
    justifyContent:
      "center",
    minWidth: 70,
    marginLeft: 12,
  },

  countValue: {
    fontFamily:
      FONTS.bold,
    fontSize: 20,
    color:
      COLORS.primary,
  },

  countLabel: {
    fontFamily:
      FONTS.regular,
    fontSize: 9,
    color:
      COLORS.textMuted,
    marginTop: 1,
  },

  /* =======================================================
     CONTRIBUTION REPORT
     ======================================================= */

  selectMessage: {
    marginTop: 20,
    padding: 18,
    borderRadius: 12,
    backgroundColor:
      COLORS.primaryLight,
    borderWidth: 1,
    borderColor:
      COLORS.borderLight,
  },

  selectMessageText: {
    fontFamily:
      FONTS.regular,
    fontSize: 13,
    color:
      COLORS.textSecondary,
    textAlign: "center",
  },

  reportHeader: {
    marginTop: 26,
    marginBottom: 14,
  },

  reportHeaderText: {
    flex: 1,
  },

  sectionTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
  },

  sectionSubtitle: {
    fontFamily:
      FONTS.regular,
    fontSize: 12,
    color:
      COLORS.textMuted,
    marginTop: 3,
  },

  summaryGrid: {
    flexDirection:
      "row",
    flexWrap:
      "wrap",
    gap: 12,
  },

  summaryCard: {
    flexGrow: 1,
    minWidth: 155,
    minHeight: 105,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },

  summaryBlue: {
    backgroundColor:
      "#F1F5FF",
    borderColor:
      "#DCE5FF",
  },

  summaryGreen: {
    backgroundColor:
      "#F0FDF4",
    borderColor:
      "#DCFCE7",
  },

  summaryRed: {
    backgroundColor:
      "#FFF5F5",
    borderColor:
      "#FEE2E2",
  },

  summaryYellow: {
    backgroundColor:
      "#FFFBEB",
    borderColor:
      "#FEF3C7",
  },

  summaryLabel: {
    fontFamily:
      FONTS.medium,
    fontSize: 9,
    letterSpacing: 0.7,
    color:
      COLORS.textMuted,
  },

  summaryValue: {
    fontFamily:
      FONTS.bold,
    fontSize: 26,
    color: COLORS.text,
    marginTop: 10,
  },

  summaryAmount: {
    fontFamily:
      FONTS.bold,
    fontSize: 20,
    color: COLORS.text,
    marginTop: 13,
  },

  rateCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 12,
    backgroundColor:
      COLORS.background,
    borderWidth: 1,
    borderColor:
      COLORS.borderLight,
  },

  rateHeader: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "center",
  },

  rateTitle: {
    fontFamily:
      FONTS.medium,
    fontSize: 13,
    color: COLORS.text,
  },

  rateValue: {
    fontFamily:
      FONTS.bold,
    fontSize: 14,
    color:
      COLORS.primary,
  },

  rateTrack: {
    height: 8,
    borderRadius: 10,
    backgroundColor:
      COLORS.borderLight,
    overflow:
      "hidden",
    marginTop: 10,
  },

  rateFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor:
      COLORS.primary,
  },

  detailsCard: {
    marginTop: 20,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 12,
    overflow:
      "hidden",
    backgroundColor:
      COLORS.surface,
  },

  detailsHeader: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.borderLight,
  },

  filterRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },

  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor:
      COLORS.background,
    borderWidth: 1,
    borderColor:
      COLORS.border,
  },

  filterChipActive: {
    backgroundColor:
      COLORS.primaryLight,
    borderColor:
      COLORS.primary,
  },

  filterChipGreen: {
    backgroundColor:
      "#F0FDF4",
    borderColor:
      COLORS.success,
  },

  filterChipRed: {
    backgroundColor:
      "#FFF5F5",
    borderColor:
      COLORS.danger,
  },

  filterChipText: {
    fontFamily:
      FONTS.medium,
    fontSize: 11,
    color:
      COLORS.textSecondary,
  },

  filterChipTextActive: {
    fontFamily:
      FONTS.bold,
    color:
      COLORS.primary,
  },

  table: {
    minWidth: 1000,
  },

  tableHeader: {
    minHeight: 44,
    backgroundColor:
      COLORS.background,
    flexDirection:
      "row",
    alignItems:
      "center",
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor:
      COLORS.borderLight,
  },

  tableRow: {
    minHeight: 64,
    flexDirection:
      "row",
    alignItems:
      "center",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.borderLight,
  },

  colNumber: {
    width: 45,
    fontFamily:
      FONTS.medium,
    fontSize: 10,
    color:
      COLORS.textMuted,
  },

  colPerson: {
    width: 230,
    fontFamily:
      FONTS.medium,
    fontSize: 10,
    letterSpacing: 0.5,
    color:
      COLORS.textMuted,
  },

  colMobile: {
    width: 150,
    fontFamily:
      FONTS.regular,
    fontSize: 11,
    color:
      COLORS.textSecondary,
    paddingHorizontal: 5,
  },

  colStatus: {
    width: 160,
    fontFamily:
      FONTS.medium,
    fontSize: 10,
    letterSpacing: 0.5,
    color:
      COLORS.textMuted,
  },

  colStatusView: {
    width: 160,
    paddingHorizontal: 4,
  },

  colAmount: {
    width: 150,
    textAlign:
      "right",
    fontFamily:
      FONTS.bold,
    fontSize: 12,
    color: COLORS.text,
    paddingHorizontal: 8,
  },

  colMode: {
    width: 170,
    fontFamily:
      FONTS.regular,
    fontSize: 11,
    color:
      COLORS.textSecondary,
    paddingHorizontal: 8,
  },

  colDate: {
    width: 170,
    fontFamily:
      FONTS.regular,
    fontSize: 11,
    color:
      COLORS.textSecondary,
    paddingHorizontal: 8,
  },

  personCell: {
    width: 230,
    flexDirection:
      "row",
    alignItems:
      "center",
    minWidth: 0,
  },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems:
      "center",
    justifyContent:
      "center",
    backgroundColor:
      COLORS.primaryLight,
  },

  avatarText: {
    fontFamily:
      FONTS.bold,
    fontSize: 12,
    color:
      COLORS.primary,
  },

  personName: {
    flex: 1,
    fontFamily:
      FONTS.medium,
    fontSize: 12,
    color: COLORS.text,
    marginLeft: 9,
  },

  statusBadge: {
    alignSelf:
      "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  statusGreen: {
    backgroundColor:
      "#DCFCE7",
  },

  statusRed: {
    backgroundColor:
      "#FEE2E2",
  },

  statusText: {
    fontFamily:
      FONTS.medium,
    fontSize: 9,
  },

  statusTextGreen: {
    color:
      COLORS.success,
  },

  statusTextRed: {
    color:
      COLORS.danger,
  },

  amountGreen: {
    color:
      COLORS.success,
  },

  amountZero: {
    color:
      COLORS.textMuted,
  },

  emptyState: {
    minHeight: 180,
    alignItems:
      "center",
    justifyContent:
      "center",
    padding: 30,
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
    textAlign:
      "center",
  },

  /* =======================================================
     EXPORT
     ======================================================= */

  downloadButton: {
    height: 48,
    borderRadius: 10,
    backgroundColor:
      COLORS.primary,
    alignItems:
      "center",
    justifyContent:
      "center",
    flexDirection:
      "row",
    marginTop: 20,
  },

  downloadButtonDisabled: {
    opacity: 0.7,
  },

  downloadIcon: {
    fontFamily:
      FONTS.bold,
    fontSize: 19,
    color:
      COLORS.white,
    marginRight: 8,
  },

  downloadText: {
    fontFamily:
      FONTS.bold,
    fontSize: 13,
    color:
      COLORS.white,
  },

  /* =======================================================
     INFO
     ======================================================= */

  infoCard: {
    marginTop: 16,
    padding: 18,
    backgroundColor:
      COLORS.primaryLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor:
      COLORS.borderLight,
  },

  infoTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 13,
    color:
      COLORS.text,
  },

  infoText: {
    fontFamily:
      FONTS.regular,
    fontSize: 12,
    lineHeight: 18,
    color:
      COLORS.textSecondary,
    marginTop: 4,
  },

  noOption: {
    padding: 18,
    alignItems:
      "center",
  },

  noOptionText: {
    fontFamily:
      FONTS.regular,
    fontSize: 13,
    color:
      COLORS.textMuted,
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
      COLORS.textMuted,
    marginTop: 12,
  },
});