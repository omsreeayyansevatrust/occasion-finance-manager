import { useEffect, useMemo, useState } from "react";

import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

import {
    collection,
    onSnapshot,
} from "firebase/firestore";

import { db } from "../services/firebase";


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


function parseDOB(value) {
  if (!value) {
    return null;
  }

  if (
    typeof value === "object" &&
    typeof value.toDate === "function"
  ) {
    return value.toDate();
  }

  const valueString = String(value).trim();

  // YYYY-MM-DD
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(valueString)
  ) {
    const [
      year,
      month,
      day,
    ] = valueString
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
    /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(valueString)
  ) {
    const [
      day,
      month,
      year,
    ] = valueString
      .split("/")
      .map(Number);

    return new Date(
      year,
      month - 1,
      day
    );
  }

  const parsed =
    new Date(valueString);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed;
}


function getNextBirthday(dob) {
  const birthDate =
    parseDOB(dob);

  if (!birthDate) {
    return null;
  }

  const today =
    getTodayStart();

  let birthday =
    new Date(
      today.getFullYear(),
      birthDate.getMonth(),
      birthDate.getDate()
    );

  if (birthday < today) {
    birthday =
      new Date(
        today.getFullYear() + 1,
        birthDate.getMonth(),
        birthDate.getDate()
      );
  }

  return birthday;
}


function getDaysDifference(date) {
  const today =
    getTodayStart();

  const target =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

  return Math.round(
    (
      target.getTime() -
      today.getTime()
    ) /
      (1000 * 60 * 60 * 24)
  );
}


function formatBirthdayDate(date) {
  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
    }
  );
}


function relativeText(days) {
  if (days === 0) {
    return "Today";
  }

  if (days === 1) {
    return "Tomorrow";
  }

  return `In ${days} days`;
}


// ==========================================================
// COMPONENT
// ==========================================================

export default function BirthdayNotificationBell({
  mobile = false,
}) {
  const [
    people,
    setPeople,
  ] = useState([]);

  const [
    open,
    setOpen,
  ] = useState(false);


  // ========================================================
  // REALTIME PEOPLE LISTENER
  // ========================================================

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
            "Birthday notification error:",
            error
          );
        }
      );

    return unsubscribe;
  }, []);


  // ========================================================
  // CALCULATE BIRTHDAYS
  // ========================================================

  const birthdays =
    useMemo(() => {
      return people
        .map((person) => {
          const nextBirthday =
            getNextBirthday(
              person.dob
            );

          if (!nextBirthday) {
            return null;
          }

          return {
            id: person.id,

            name:
              person.name ||
              "Unknown",

            nextBirthday,

            days:
              getDaysDifference(
                nextBirthday
              ),
          };
        })
        .filter(Boolean)
        .sort(
          (a, b) =>
            a.days - b.days
        );
    }, [people]);


  // ========================================================
  // NOTIFICATIONS
  // ========================================================

  /*
   * Show people whose birthday is
   * within the next 30 days.
   */

  const notifications =
    birthdays.filter(
      (birthday) =>
        birthday.days >= 0 &&
        birthday.days <= 30
    );


  /*
   * If there are no birthdays
   * within 30 days, show the
   * next 3 birthdays.
   */

  const displayBirthdays =
    notifications.length > 0
      ? notifications
      : birthdays.slice(0, 3);


  const count =
    notifications.length;


  // ========================================================
  // BELL
  // ========================================================

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() =>
          setOpen(true)
        }
        style={[
          styles.bellButton,

          mobile &&
            styles.mobileBellButton,
        ]}
      >
        <Ionicons
          name="notifications-outline"
          size={21}
          color="#1D4ED8"
        />

        {count > 0 && (
          <View
            style={
              styles.badge
            }
          >
            <Text
              style={
                styles.badgeText
              }
            >
              {count > 9
                ? "9+"
                : count}
            </Text>
          </View>
        )}
      </TouchableOpacity>


      {/* ==================================================
          NOTIFICATION POPUP
          ================================================== */}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setOpen(false)
        }
      >
        <Pressable
          style={
            styles.overlay
          }
          onPress={() =>
            setOpen(false)
          }
        >

          <Pressable
            style={
              styles.panel
            }
            onPress={(event) =>
              event.stopPropagation()
            }
          >

            {/* HEADER */}

            <View
              style={
                styles.panelHeader
              }
            >

              <View
                style={
                  styles.titleRow
                }
              >

                <View
                  style={
                    styles.titleIcon
                  }
                >
                  <Ionicons
                    name="gift-outline"
                    size={20}
                    color="#1D4ED8"
                  />
                </View>

                <View>
                  <Text
                    style={
                      styles.title
                    }
                  >
                    Birthday Updates
                  </Text>

                  <Text
                    style={
                      styles.subtitle
                    }
                  >
                    Upcoming birthdays
                  </Text>
                </View>

              </View>


              <TouchableOpacity
                onPress={() =>
                  setOpen(false)
                }
                style={
                  styles.closeButton
                }
              >
                <Ionicons
                  name="close"
                  size={20}
                  color="#667085"
                />
              </TouchableOpacity>

            </View>


            {/* BODY */}

            <ScrollView
              style={
                styles.list
              }
              showsVerticalScrollIndicator={
                false
              }
            >

              {displayBirthdays.length ===
              0 ? (

                <View
                  style={
                    styles.empty
                  }
                >
                  <Ionicons
                    name="calendar-outline"
                    size={34}
                    color="#98A2B3"
                  />

                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    No upcoming birthdays
                  </Text>

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    Birthday notifications
                    will appear here.
                  </Text>
                </View>

              ) : (

                displayBirthdays.map(
                  (birthday) => {

                    const isToday =
                      birthday.days ===
                      0;

                    const initials =
                      String(
                        birthday.name
                      )
                        .trim()
                        .split(
                          /\s+/
                        )
                        .map(
                          (part) =>
                            part[0]
                        )
                        .join("")
                        .slice(
                          0,
                          2
                        )
                        .toUpperCase();

                    return (
                      <View
                        key={
                          birthday.id
                        }
                        style={[
                          styles.row,

                          isToday &&
                            styles.todayRow,
                        ]}
                      >

                        {/* AVATAR */}

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
                            {initials}
                          </Text>
                        </View>


                        {/* DETAILS */}

                        <View
                          style={
                            styles.details
                          }
                        >

                          <Text
                            style={
                              styles.name
                            }
                            numberOfLines={
                              1
                            }
                          >
                            {birthday.name}
                          </Text>

                          <Text
                            style={
                              styles.date
                            }
                          >
                            {formatBirthdayDate(
                              birthday.nextBirthday
                            )}
                          </Text>

                        </View>


                        {/* STATUS */}

                        <View
                          style={[
                            styles.status,

                            isToday &&
                              styles.todayStatus,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,

                              isToday &&
                                styles.todayStatusText,
                            ]}
                          >
                            {relativeText(
                              birthday.days
                            )}
                          </Text>
                        </View>

                      </View>
                    );
                  }
                )

              )}

            </ScrollView>

          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}


// ==========================================================
// STYLES
// ==========================================================

const styles =
  StyleSheet.create({

    bellButton: {
      width: 38,
      height: 38,
      borderRadius: 10,

      backgroundColor:
        "#F8FAFC",

      borderWidth: 1,
      borderColor:
        "#E2E8F0",

      alignItems: "center",
      justifyContent: "center",

      position: "relative",
    },

    mobileBellButton: {
      width: 40,
      height: 40,
      borderRadius: 11,
    },

    badge: {
      position: "absolute",

      top: -5,
      right: -5,

      minWidth: 18,
      height: 18,

      borderRadius: 9,

      backgroundColor:
        "#EF4444",

      alignItems: "center",
      justifyContent: "center",

      paddingHorizontal: 4,

      borderWidth: 2,
      borderColor:
        "#FFFFFF",
    },

    badgeText: {
      color: "#FFFFFF",
      fontSize: 9,
      fontWeight: "800",
    },


    // ======================================================
    // MODAL
    // ======================================================

    overlay: {
      flex: 1,

      backgroundColor:
        "rgba(15, 23, 42, 0.20)",

      alignItems: "center",
      justifyContent: "center",

      padding: 20,
    },

    panel: {
      width: 390,
      maxWidth: "100%",
      maxHeight: 520,

      backgroundColor:
        "#FFFFFF",

      borderRadius: 18,

      overflow: "hidden",

      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 12,
      },
      shadowOpacity: 0.18,
      shadowRadius: 25,

      elevation: 12,
    },


    // ======================================================
    // HEADER
    // ======================================================

    panelHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",

      paddingHorizontal: 18,
      paddingVertical: 15,

      borderBottomWidth: 1,
      borderBottomColor:
        "#EAECF0",
    },

    titleRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    titleIcon: {
      width: 40,
      height: 40,

      borderRadius: 11,

      backgroundColor:
        "#EFF6FF",

      alignItems: "center",
      justifyContent: "center",

      marginRight: 11,
    },

    title: {
      fontSize: 15,
      fontWeight: "800",
      color: "#101828",
    },

    subtitle: {
      fontSize: 11,
      color: "#667085",
      marginTop: 2,
    },

    closeButton: {
      width: 34,
      height: 34,

      borderRadius: 9,

      backgroundColor:
        "#F8FAFC",

      alignItems: "center",
      justifyContent: "center",
    },


    // ======================================================
    // LIST
    // ======================================================

    list: {
      paddingHorizontal: 12,
    },

    row: {
      flexDirection: "row",
      alignItems: "center",

      paddingVertical: 12,
      paddingHorizontal: 6,

      borderBottomWidth: 1,
      borderBottomColor:
        "#F1F5F9",
    },

    todayRow: {
      backgroundColor:
        "#F8FBFF",

      borderRadius: 11,

      paddingHorizontal: 8,
      marginVertical: 3,
    },

    avatar: {
      width: 42,
      height: 42,

      borderRadius: 12,

      backgroundColor:
        "#E8F0FF",

      alignItems: "center",
      justifyContent: "center",

      marginRight: 11,
    },

    avatarText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#1D4ED8",
    },

    details: {
      flex: 1,
      minWidth: 0,
    },

    name: {
      fontSize: 14,
      fontWeight: "700",
      color: "#101828",
    },

    date: {
      fontSize: 11,
      color: "#667085",
      marginTop: 3,
    },

    status: {
      paddingHorizontal: 9,
      paddingVertical: 6,

      borderRadius: 8,

      backgroundColor:
        "#F2F4F7",
    },

    statusText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#475467",
    },

    todayStatus: {
      backgroundColor:
        "#DCFCE7",
    },

    todayStatusText: {
      color: "#15803D",
    },


    // ======================================================
    // EMPTY
    // ======================================================

    empty: {
      alignItems: "center",
      justifyContent: "center",

      paddingVertical: 55,
      paddingHorizontal: 20,
    },

    emptyTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: "#344054",

      marginTop: 10,
    },

    emptyText: {
      fontSize: 11,
      color: "#667085",

      marginTop: 4,

      textAlign: "center",
    },
  });