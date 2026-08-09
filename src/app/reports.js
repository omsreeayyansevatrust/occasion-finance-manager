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

import { collection, onSnapshot } from "firebase/firestore";

import { COLORS, FONTS, RADIUS, SHADOWS } from "../constants/theme";
import { db } from "../services/firebase";

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";

const REPORT_OPTIONS = [
  {
    label: "People",
    value: "people",
    description: "Export the complete People Master",
  },
];

export default function ReportsScreen() {
  const [reportType, setReportType] = useState("people");
  const [showReportPicker, setShowReportPicker] = useState(false);

  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "people"),
      (snapshot) => {
        setPeople(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
        setLoading(false);
      },
      (error) => {
        console.log("People report error:", error);
        setLoading(false);
        Alert.alert(
          "Unable to load report",
          "People data could not be loaded."
        );
      }
    );

    return unsubscribe;
  }, []);

  const selectedReport = useMemo(
    () =>
      REPORT_OPTIONS.find(
        (item) => item.value === reportType
      ) || REPORT_OPTIONS[0],
    [reportType]
  );

  const formatDate = (value) => {
    if (!value) return "";

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
      const rows = people.map((person, index) => ({
        "S.No": index + 1,
        "Name": person.name || "",
        "Mobile": person.mobile || "",
        "Date of Birth": person.dob || "",
        "Blood Group": person.bloodGroup || "",
        "Email": person.email || "",
        "Type": person.type || "",
        "Address": person.address || "",
        "Status": person.status || "",
        "Created At": formatDate(person.createdAt),
        "Updated At": formatDate(person.updatedAt),
        "Record ID": person.id || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);

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

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "People"
      );

      const filename =
        `People_Report_${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`;

      if (Platform.OS === "web") {
        const buffer = XLSX.write(workbook, {
          bookType: "xlsx",
          type: "array",
        });

        const blob = new Blob([buffer], {
          type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
      } else {
        const base64 = XLSX.write(workbook, {
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

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            dialogTitle:
              "Export People Report",
            UTI:
              "org.openxmlformats.spreadsheetml.sheet",
          });
        } else {
          Alert.alert(
            "Export Complete",
            `Excel file created at:\n${fileUri}`
          );
        }
      }
    } catch (error) {
      console.log("People report export error:", error);

      Alert.alert(
        "Export Failed",
        "Unable to generate the Excel report. Please try again."
      );
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
        <Text style={styles.loadingText}>
          Loading reports...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              DATA & REPORTING
            </Text>

            <Text style={styles.title}>
              Reports
            </Text>

            <Text style={styles.subtitle}>
              Generate downloadable reports from your
              application data
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Select Report
          </Text>

          <Text style={styles.cardSubtitle}>
            Choose the report you want to download.
          </Text>

          <Text style={styles.label}>
            REPORT TYPE
          </Text>

          <TouchableOpacity
            style={styles.dropdown}
            onPress={() =>
              setShowReportPicker(
                !showReportPicker
              )
            }
            activeOpacity={0.8}
          >
            <View style={styles.dropdownText}>
              <Text style={styles.dropdownValue}>
                {selectedReport.label}
              </Text>

              <Text style={styles.dropdownDescription}>
                {selectedReport.description}
              </Text>
            </View>

            <Text style={styles.chevron}>
              {showReportPicker ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {showReportPicker ? (
            <View style={styles.dropdownMenu}>
              {REPORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    option.value === reportType &&
                      styles.optionActive,
                  ]}
                  onPress={() => {
                    setReportType(option.value);
                    setShowReportPicker(false);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.optionText}>
                    <Text
                      style={[
                        styles.optionLabel,
                        option.value === reportType &&
                          styles.optionLabelActive,
                      ]}
                    >
                      {option.label}
                    </Text>

                    <Text style={styles.optionDescription}>
                      {option.description}
                    </Text>
                  </View>

                  {option.value === reportType ? (
                    <Text style={styles.check}>
                      ✓
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <View style={styles.previewCard}>
            <View style={styles.previewIcon}>
              <Text style={styles.previewIconText}>
                XLS
              </Text>
            </View>

            <View style={styles.previewText}>
              <Text style={styles.previewTitle}>
                People Master
              </Text>

              <Text style={styles.previewDescription}>
                Complete people data including name,
                mobile, DOB, blood group, email, type,
                address and status.
              </Text>
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countValue}>
                {people.length}
              </Text>

              <Text style={styles.countLabel}>
                Records
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.downloadButton,
              exporting && styles.downloadButtonDisabled,
            ]}
            onPress={exportPeople}
            disabled={exporting}
            activeOpacity={0.8}
          >
            {exporting ? (
              <ActivityIndicator
                size="small"
                color={COLORS.white}
              />
            ) : (
              <Text style={styles.downloadIcon}>
                ↓
              </Text>
            )}

            <Text style={styles.downloadText}>
              {exporting
                ? "Generating Excel..."
                : "Download Excel"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            People Report
          </Text>

          <Text style={styles.infoText}>
            The report always exports the complete
            People Master. Active search and filters
            on the People screen do not affect this
            report.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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

  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.card,
    padding: 24,
    ...SHADOWS.card,
  },

  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    lineHeight: 27,
    color: COLORS.text,
  },

  cardSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textMuted,
    marginTop: 3,
    marginBottom: 24,
  },

  label: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.7,
    color: COLORS.textMuted,
    marginBottom: 7,
  },

  dropdown: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },

  dropdownText: {
    flex: 1,
  },

  dropdownValue: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
  },

  dropdownDescription: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  chevron: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.textMuted,
    marginLeft: 12,
  },

  dropdownMenu: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    marginTop: 6,
    overflow: "hidden",
  },

  option: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },

  optionActive: {
    backgroundColor: COLORS.primaryLight,
  },

  optionText: {
    flex: 1,
  },

  optionLabel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },

  optionLabelActive: {
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },

  optionDescription: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  check: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.primary,
    marginLeft: 10,
  },

  previewCard: {
    marginTop: 22,
    minHeight: 88,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },

  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.successLight,
    alignItems: "center",
    justifyContent: "center",
  },

  previewIconText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.success,
  },

  previewText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 13,
  },

  previewTitle: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },

  previewDescription: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textMuted,
    marginTop: 3,
  },

  countBadge: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
    marginLeft: 12,
  },

  countValue: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.primary,
  },

  countLabel: {
    fontFamily: FONTS.regular,
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  downloadButton: {
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 20,
  },

  downloadButtonDisabled: {
    opacity: 0.7,
  },

  downloadIcon: {
    fontFamily: FONTS.bold,
    fontSize: 19,
    color: COLORS.white,
    marginRight: 8,
  },

  downloadText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white,
  },

  infoCard: {
    marginTop: 16,
    padding: 18,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  infoTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.text,
  },

  infoText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },

  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 12,
  },
});
