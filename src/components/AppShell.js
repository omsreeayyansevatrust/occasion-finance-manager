// src/components/AppShell.js

import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

import { usePathname } from "expo-router";

import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import { COLORS } from "../constants/theme";
import { auth, db } from "../services/firebase";

import AppMenu from "./AppMenu";
import MobileBottomNav from "./MobileBottomNav";


// ==========================================================
// DATE HELPERS
// ==========================================================

function getTodayStart() {
  const today = new Date();

  return new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
}


// ----------------------------------------------------------
// Parse DOB
// ----------------------------------------------------------

function parseDOB(value) {
  if (!value) {
    return null;
  }

  // Firestore Timestamp
  if (
    typeof value === "object" &&
    typeof value.toDate === "function"
  ) {
    return value.toDate();
  }

  const stringValue = String(value).trim();

  // YYYY-MM-DD
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      stringValue
    )
  ) {
    const [
      year,
      month,
      day,
    ] = stringValue
      .split("-")
      .map(Number);

    return new Date(
      year,
      month - 1,
      day
    );
  }

  // DD/MM/YYYY
  if (
    /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(
      stringValue
    )
  ) {
    const [
      day,
      month,
      year,
    ] = stringValue
      .split("/")
      .map(Number);

    return new Date(
      year,
      month - 1,
      day
    );
  }

  const parsed = new Date(
    stringValue
  );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed;
}


// ----------------------------------------------------------
// Get next birthday date
// ----------------------------------------------------------

function getNextBirthday(dob) {
  const birthDate =
    parseDOB(dob);

  if (!birthDate) {
    return null;
  }

  const today =
    getTodayStart();

  let birthday = new Date(
    today.getFullYear(),
    birthDate.getMonth(),
    birthDate.getDate()
  );

  // If birthday already passed this year,
  // use next year.
  if (birthday < today) {
    birthday = new Date(
      today.getFullYear() + 1,
      birthDate.getMonth(),
      birthDate.getDate()
    );
  }

  return birthday;
}


// ----------------------------------------------------------
// Difference in days
// ----------------------------------------------------------

function getDaysDifference(
  date
) {
  const today =
    getTodayStart();

  const target =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

  const diff =
    target.getTime() -
    today.getTime();

  return Math.round(
    diff /
      (1000 * 60 * 60 * 24)
  );
}


// ----------------------------------------------------------
// Display birthday date
// ----------------------------------------------------------

function formatBirthdayDate(
  date
) {
  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
    }
  );
}


// ----------------------------------------------------------
// Display relative text
// ----------------------------------------------------------

function getRelativeText(
  days
) {
  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "Tomorrow";
  }

  if (days < 0) {
    return "Today";
  }

  return `In ${days} days`;
}


// ==========================================================
// BIRTHDAY NOTIFICATION BELL
// ==========================================================

function BirthdayNotificationBell({
  isMobile,
}) {
  const [
    people,
    setPeople,
  ] = useState([]);

  const [
    visible,
    setVisible,
  ] = useState(false);


  // --------------------------------------------------------
  // FIRESTORE LISTENER
  // --------------------------------------------------------

  useEffect(() => {
    const unsubscribe =
      onSnapshot(
        collection(
          db,
          "people"
        ),
        (snapshot) => {
          const list =
            snapshot.docs.map(
              (doc) => ({
                id: doc.id,
                ...doc.data(),
              })
            );

          setPeople(list);
        },
        (error) => {
          console.error(
            "Birthday notification listener error:",
            error
          );
        }
      );

    return unsubscribe;
  }, []);


  // --------------------------------------------------------
  // CALCULATE UPCOMING BIRTHDAYS
  // --------------------------------------------------------

  const upcomingBirthdays =
    useMemo(() => {
      const today =
        getTodayStart();

      const result =
        people
          .map((person) => {
            const nextBirthday =
              getNextBirthday(
                person.dob
              );

            if (
              !nextBirthday
            ) {
              return null;
            }

            const days =
              getDaysDifference(
                nextBirthday
              );

            return {
              ...person,
              nextBirthday,
              days,
            };
          })
          .filter(Boolean)
          .sort(
            (a, b) =>
              a.nextBirthday -
              b.nextBirthday
          );

      /*
       * Show birthdays coming
       * within the next 30 days.
       *
       * If there are none,
       * we still show the next
       * birthday.
       */

      const within30Days =
        result.filter(
          (item) =>
            item.days >= 0 &&
            item.days <= 30
        );

      if (
        within30Days.length > 0
      ) {
        return within30Days;
      }

      return result.slice(
        0,
        5
      );
    }, [people]);


  // --------------------------------------------------------
  // NOTIFICATION COUNT
  // --------------------------------------------------------

  const notificationCount =
    useMemo(() => {
      return upcomingBirthdays.filter(
        (item) =>
          item.days >= 0 &&
          item.days <= 30
      ).length;
    }, [
      upcomingBirthdays,
    ]);


  // --------------------------------------------------------
  // NEXT BIRTHDAY
  // --------------------------------------------------------

  const nextBirthday =
    upcomingBirthdays.length > 0
      ? upcomingBirthdays[0]
      : null;


  // --------------------------------------------------------
  // BELL
  // --------------------------------------------------------

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() =>
          setVisible(true)
        }
        style={[
          styles.notificationButton,
          isMobile &&
            styles.notificationButtonMobile,
        ]}
      >
        <Ionicons
          name="notifications-outline"
          size={24}
          color="#1D4ED8"
        />

        {notificationCount >
          0 && (
          <View
            style={
              styles.notificationBadge
            }
          >
            <Text
              style={
                styles.notificationBadgeText
              }
            >
              {notificationCount >
              9
                ? "9+"
                : notificationCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>


      {/* ==================================================
          NOTIFICATION MODAL
          ================================================== */}

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setVisible(false)
        }
      >
        <Pressable
          style={
            styles.modalOverlay
          }
          onPress={() =>
            setVisible(false)
          }
        >
          <Pressable
            style={[
              styles.notificationPanel,
              isMobile &&
                styles.notificationPanelMobile,
            ]}
            onPress={(event) =>
              event.stopPropagation()
            }
          >

            {/* HEADER */}

            <View
              style={
                styles.notificationHeader
              }
            >
              <View
                style={
                  styles.notificationHeaderLeft
                }
              >
                <View
                  style={
                    styles.notificationHeaderIcon
                  }
                >
                  <Ionicons
                    name="gift-outline"
                    size={22}
                    color="#1D4ED8"
                  />
                </View>

                <View>
                  <Text
                    style={
                      styles.notificationTitle
                    }
                  >
                    Birthday Updates
                  </Text>

                  <Text
                    style={
                      styles.notificationSubtitle
                    }
                  >
                    Upcoming birthdays
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setVisible(false)
                }
                style={
                  styles.closeButton
                }
              >
                <Ionicons
                  name="close"
                  size={22}
                  color="#667085"
                />
              </TouchableOpacity>
            </View>


            {/* NEXT BIRTHDAY HIGHLIGHT */}

            {nextBirthday && (
              <View
                style={
                  styles.nextBirthdayCard
                }
              >
                <View
                  style={
                    styles.nextBirthdayIcon
                  }
                >
                  <Text
                    style={
                      styles.nextBirthdayEmoji
                    }
                  >
                    🎂
                  </Text>
                </View>

                <View
                  style={
                    styles.nextBirthdayContent
                  }
                >
                  <Text
                    style={
                      styles.nextBirthdayLabel
                    }
                  >
                    NEXT BIRTHDAY
                  </Text>

                  <Text
                    style={
                      styles.nextBirthdayName
                    }
                    numberOfLines={1}
                  >
                    {nextBirthday.name ||
                      "Unknown"}
                  </Text>

                  <Text
                    style={
                      styles.nextBirthdayDate
                    }
                  >
                    {formatBirthdayDate(
                      nextBirthday.nextBirthday
                    )}
                    {" • "}
                    {getRelativeText(
                      nextBirthday.days
                    )}
                  </Text>
                </View>
              </View>
            )}


            {/* LIST */}

            <View
              style={
                styles.listHeader
              }
            >
              <Text
                style={
                  styles.listHeaderText
                }
              >
                UPCOMING BIRTHDAYS
              </Text>

              <Text
                style={
                  styles.listHeaderCount
                }
              >
                {upcomingBirthdays.length}
              </Text>
            </View>


            <ScrollView
              style={
                styles.notificationList
              }
              showsVerticalScrollIndicator={
                false
              }
            >

              {upcomingBirthdays.length ===
              0 ? (
                <View
                  style={
                    styles.emptyNotification
                  }
                >
                  <Ionicons
                    name="calendar-outline"
                    size={38}
                    color="#98A2B3"
                  />

                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    No birthdays found
                  </Text>

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    Birthday information
                    will appear here
                    automatically.
                  </Text>
                </View>
              ) : (
                upcomingBirthdays.map(
                  (
                    birthday,
                    index
                  ) => {
                    const initials =
                      String(
                        birthday.name ||
                          "?"
                      )
                        .trim()
                        .split(
                          /\s+/
                        )
                        .map(
                          (part) =>
                            part.charAt(
                              0
                            )
                        )
                        .join("")
                        .substring(
                          0,
                          2
                        )
                        .toUpperCase();

                    return (
                      <View
                        key={
                          birthday.id ||
                          index
                        }
                        style={
                          styles.birthdayRow
                        }
                      >

                        {/* AVATAR */}

                        <View
                          style={
                            styles.birthdayAvatar
                          }
                        >
                          <Text
                            style={
                              styles.birthdayAvatarText
                            }
                          >
                            {initials}
                          </Text>
                        </View>


                        {/* NAME */}

                        <View
                          style={
                            styles.birthdayInfo
                          }
                        >
                          <Text
                            style={
                              styles.birthdayName
                            }
                            numberOfLines={
                              1
                            }
                          >
                            {birthday.name ||
                              "Unknown"}
                          </Text>

                          <Text
                            style={
                              styles.birthdayDate
                            }
                          >
                            {formatBirthdayDate(
                              birthday.nextBirthday
                            )}
                          </Text>
                        </View>


                        {/* DAYS */}

                        <View
                          style={[
                            styles.birthdayDays,
                            birthday.days ===
                              0 &&
                              styles.birthdayDaysToday,
                          ]}
                        >
                          <Text
                            style={[
                              styles.birthdayDaysText,
                              birthday.days ===
                                0 &&
                                styles.birthdayDaysTextToday,
                            ]}
                          >
                            {getRelativeText(
                              birthday.days
                            )}
                          </Text>
                        </View>

                      </View>
                    );
                  }
                )
              )}

              <View
                style={{
                  height: 15,
                }}
              />
            </ScrollView>

          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}


// ==========================================================
// APP SHELL
// ==========================================================

export default function AppShell({
  children,
}) {
  const pathname =
    usePathname();

  const { width } =
    useWindowDimensions();

  const isMobile =
    width < 768;

  const [
    user,
    setUser,
  ] = useState(
    auth.currentUser
  );

  const [
    checkingAuth,
    setCheckingAuth,
  ] = useState(true);


  // --------------------------------------------------------
  // AUTH
  // --------------------------------------------------------

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(
            currentUser
          );

          setCheckingAuth(
            false
          );
        }
      );

    return unsubscribe;
  }, []);


  const isLoginScreen =
    pathname === "/" ||
    pathname === "/login";


  // --------------------------------------------------------
  // AUTH LOADING
  // --------------------------------------------------------

  if (checkingAuth) {
    return (
      <View
        style={
          styles.loading
        }
      >
        <ActivityIndicator
          size="small"
          color="#1D4ED8"
        />
      </View>
    );
  }


  // --------------------------------------------------------
  // LOGIN
  // --------------------------------------------------------

  if (
    isLoginScreen ||
    !user
  ) {
    return (
      <View
        style={
          styles.fullScreen
        }
      >
        {children}
      </View>
    );
  }


  // --------------------------------------------------------
  // MOBILE
  // --------------------------------------------------------

  if (isMobile) {
    return (
      <View
        style={
          styles.mobileContainer
        }
      >

        <View
          style={
            styles.mobileContent
          }
        >
          {children}
        </View>




        {/* EXISTING NAVIGATION */}

        <MobileBottomNav />

      </View>
    );
  }


  // --------------------------------------------------------
  // WEB / DESKTOP
  // --------------------------------------------------------

  return (
    <View
      style={
        styles.appContainer
      }
    >

      {/* EXISTING SIDEBAR */}

      <View
        style={
          styles.sidebar
        }
      >
        <AppMenu />
      </View>


      {/* EXISTING CONTENT */}

      <View
        style={
          styles.content
        }
      >
        {children}
      </View>



    </View>
  );
}


// ==========================================================
// STYLES
// ==========================================================

const styles =
  StyleSheet.create({

    // ======================================================
    // APP SHELL
    // ======================================================

    appContainer: {
      flex: 1,
      flexDirection: "row",
      backgroundColor:
        COLORS.background,
      width: "100%",
      height: "100%",
      minHeight: "100vh",
      position: "relative",
    },

    sidebar: {
      width: 245,
      height: "100%",
      flexShrink: 0,
    },

    content: {
      flex: 1,
      minWidth: 0,
      width: "auto",
      height: "100%",
      overflow: "hidden",
      backgroundColor:
        COLORS.background,
    },

    mobileContainer: {
      flex: 1,
      width: "100%",
      minHeight: "100%",
      backgroundColor:
        COLORS.background,
      position: "relative",
    },

    mobileContent: {
      flex: 1,
      width: "100%",
      minWidth: 0,
      minHeight: 0,
      paddingBottom: 72,
      backgroundColor:
        COLORS.background,
    },

    fullScreen: {
      flex: 1,
      width: "100%",
      height: "100%",
      backgroundColor:
        COLORS.background,
    },

    loading: {
      flex: 1,
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.background,
    },


    // ======================================================
    // NOTIFICATION BUTTON
    // ======================================================

    notificationButton: {
      position: "absolute",
      top: 18,
      right: 24,

      width: 46,
      height: 46,

      borderRadius: 14,

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,
      borderColor:
        "#E4E7EC",

      alignItems: "center",
      justifyContent: "center",

      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.08,
      shadowRadius: 8,

      elevation: 4,

      zIndex: 9999,
    },

    notificationButtonMobile: {
      top: 16,
      right: 16,

      width: 44,
      height: 44,

      borderRadius: 13,
    },

    notificationBadge: {
      position: "absolute",

      top: -4,
      right: -4,

      minWidth: 19,
      height: 19,

      borderRadius: 10,

      paddingHorizontal: 4,

      backgroundColor:
        "#EF4444",

      alignItems: "center",
      justifyContent: "center",

      borderWidth: 2,
      borderColor:
        "#FFFFFF",
    },

    notificationBadgeText: {
      color: "#FFFFFF",
      fontSize: 9,
      fontWeight: "800",
    },


    // ======================================================
    // MODAL
    // ======================================================

    modalOverlay: {
      flex: 1,

      backgroundColor:
        "rgba(15, 23, 42, 0.18)",

      alignItems: "flex-end",
      justifyContent: "flex-start",

      paddingTop: 72,
      paddingRight: 24,
    },

    notificationPanel: {
      width: 390,
      maxHeight: "78%",

      backgroundColor:
        "#FFFFFF",

      borderRadius: 18,

      overflow: "hidden",

      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.18,
      shadowRadius: 24,

      elevation: 10,
    },

    notificationPanelMobile: {
      width: "94%",
      maxHeight: "82%",

      marginRight: "3%",
    },


    // ======================================================
    // NOTIFICATION HEADER
    // ======================================================

    notificationHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",

      paddingHorizontal: 18,
      paddingVertical: 16,

      borderBottomWidth: 1,
      borderBottomColor:
        "#EAECF0",
    },

    notificationHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },

    notificationHeaderIcon: {
      width: 42,
      height: 42,

      borderRadius: 12,

      backgroundColor:
        "#EFF6FF",

      alignItems: "center",
      justifyContent: "center",

      marginRight: 12,
    },

    notificationTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: "#101828",
    },

    notificationSubtitle: {
      fontSize: 12,
      color: "#667085",
      marginTop: 2,
    },

    closeButton: {
      width: 36,
      height: 36,

      borderRadius: 10,

      alignItems: "center",
      justifyContent: "center",

      backgroundColor:
        "#F9FAFB",
    },


    // ======================================================
    // NEXT BIRTHDAY
    // ======================================================

    nextBirthdayCard: {
      flexDirection: "row",
      alignItems: "center",

      margin: 14,

      padding: 14,

      borderRadius: 14,

      backgroundColor:
        "#EFF6FF",

      borderWidth: 1,
      borderColor:
        "#DBEAFE",
    },

    nextBirthdayIcon: {
      width: 48,
      height: 48,

      borderRadius: 14,

      backgroundColor:
        "#FFFFFF",

      alignItems: "center",
      justifyContent: "center",

      marginRight: 12,
    },

    nextBirthdayEmoji: {
      fontSize: 25,
    },

    nextBirthdayContent: {
      flex: 1,
    },

    nextBirthdayLabel: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1,
      color: "#2563EB",
      marginBottom: 3,
    },

    nextBirthdayName: {
      fontSize: 16,
      fontWeight: "800",
      color: "#101828",
    },

    nextBirthdayDate: {
      fontSize: 12,
      color: "#475467",
      marginTop: 3,
    },


    // ======================================================
    // LIST HEADER
    // ======================================================

    listHeader: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",

      paddingHorizontal: 18,
      paddingTop: 4,
      paddingBottom: 8,
    },

    listHeaderText: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1,

      color: "#667085",
    },

    listHeaderCount: {
      fontSize: 11,
      fontWeight: "700",

      color: "#2563EB",

      backgroundColor:
        "#EFF6FF",

      paddingHorizontal: 8,
      paddingVertical: 3,

      borderRadius: 10,
    },


    // ======================================================
    // BIRTHDAY ROW
    // ======================================================

    notificationList: {
      paddingHorizontal: 12,
    },

    birthdayRow: {
      flexDirection: "row",
      alignItems: "center",

      paddingHorizontal: 6,
      paddingVertical: 11,

      borderBottomWidth: 1,
      borderBottomColor:
        "#F2F4F7",
    },

    birthdayAvatar: {
      width: 42,
      height: 42,

      borderRadius: 13,

      backgroundColor:
        "#E0EAFF",

      alignItems: "center",
      justifyContent: "center",

      marginRight: 11,
    },

    birthdayAvatarText: {
      color: "#1D4ED8",
      fontSize: 13,
      fontWeight: "800",
    },

    birthdayInfo: {
      flex: 1,
      minWidth: 0,
    },

    birthdayName: {
      fontSize: 14,
      fontWeight: "700",
      color: "#101828",
    },

    birthdayDate: {
      fontSize: 11,
      color: "#667085",
      marginTop: 3,
    },

    birthdayDays: {
      paddingHorizontal: 9,
      paddingVertical: 6,

      borderRadius: 9,

      backgroundColor:
        "#F2F4F7",
    },

    birthdayDaysToday: {
      backgroundColor:
        "#DCFCE7",
    },

    birthdayDaysText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#475467",
    },

    birthdayDaysTextToday: {
      color: "#15803D",
    },


    // ======================================================
    // EMPTY
    // ======================================================

    emptyNotification: {
      alignItems: "center",
      justifyContent: "center",

      paddingVertical: 45,
      paddingHorizontal: 25,
    },

    emptyTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: "#344054",

      marginTop: 12,
    },

    emptyText: {
      fontSize: 12,
      color: "#667085",

      textAlign: "center",

      marginTop: 5,

      lineHeight: 18,
    },
  });