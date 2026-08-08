import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { usePathname, useRouter } from "expo-router";

import { signOut } from "firebase/auth";

import {
  COLORS,
  FONTS,
} from "../constants/theme";
import { auth } from "../services/firebase";

const MENU_ITEMS = [
  {
    label: "Dashboard",
    route: "/dashboard",
    icon: "⌂",
  },
  {
    label: "People",
    route: "/people",
    icon: "◉",
  },
  {
    label: "Occasions",
    route: "/occasions",
    icon: "◆",
  },
  {
    label: "Contributions",
    route: "/contributions",
    icon: "↑",
  },
  {
    label: "Expenses",
    route: "/expenses",
    icon: "↓",
  },
  {
    label: "Financial Details",
    route: "/financialdetails",
    icon: "▣",
  },
];

export default function AppMenu() {
  const router = useRouter();
  const pathname = usePathname();

  const currentUser = auth.currentUser;

  const handleNavigation = (route) => {
    router.push(route);
  };

  const handleLogout = async () => {
    const performLogout = async () => {
      try {
        await signOut(auth);

        router.replace("/");
      } catch (error) {
        console.log(
          "Logout error:",
          error
        );

        if (
          typeof window !==
            "undefined" &&
          window.alert
        ) {
          window.alert(
            "Unable to logout. Please try again."
          );
        } else {
          Alert.alert(
            "Logout Error",
            "Unable to logout. Please try again."
          );
        }
      }
    };

    if (
      typeof window !==
        "undefined" &&
      typeof window.confirm ===
        "function"
    ) {
      const confirmed =
        window.confirm(
          "Are you sure you want to logout?"
        );

      if (confirmed) {
        await performLogout();
      }

      return;
    }

    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress:
            performLogout,
        },
      ]
    );
  };

  const isActive = (route) => {
    if (
      route === "/dashboard"
    ) {
      return (
        pathname ===
          "/dashboard" ||
        pathname === "/"
      );
    }

    return (
      pathname === route ||
      pathname.startsWith(
        `${route}/`
      )
    );
  };

  return (
    <View
      style={styles.container}
    >
      {/* ==================================================
          BRAND
          ================================================== */}

      <View
        style={styles.brand}
      >
        <View
          style={
            styles.logoContainer
          }
        >
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View
          style={styles.brandText}
        >
          <Text
            style={styles.appName}
            numberOfLines={1}
          >
            Occasion Finance
          </Text>

          <Text
            style={
              styles.appSubtitle
            }
          >
            MANAGER
          </Text>
        </View>
      </View>

      {/* ==================================================
          NAVIGATION
          ================================================== */}

      <View
        style={styles.navigation}
      >
        <Text
          style={styles.menuLabel}
        >
          MAIN MENU
        </Text>

        {MENU_ITEMS.map(
          (item) => {
            const active =
              isActive(
                item.route
              );

            return (
              <TouchableOpacity
                key={
                  item.route
                }
                style={[
                  styles.menuItem,
                  active &&
                    styles.menuItemActive,
                ]}
                onPress={() =>
                  handleNavigation(
                    item.route
                  )
                }
                activeOpacity={
                  0.75
                }
              >
                <View
                  style={[
                    styles.menuIcon,
                    active &&
                      styles.menuIconActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.menuIconText,
                      active &&
                        styles.menuIconTextActive,
                    ]}
                  >
                    {
                      item.icon
                    }
                  </Text>
                </View>

                <Text
                  style={[
                    styles.menuText,
                    active &&
                      styles.menuTextActive,
                  ]}
                >
                  {
                    item.label
                  }
                </Text>
              </TouchableOpacity>
            );
          }
        )}
      </View>

      <View
        style={styles.spacer}
      />

      {/* ==================================================
          USER
          ================================================== */}

      <View
        style={styles.userSection}
      >
        <View
          style={
            styles.userAvatar
          }
        >
          <Text
            style={
              styles.userAvatarText
            }
          >
            {getInitial(
              currentUser
                ?.email
            )}
          </Text>
        </View>

        <View
          style={styles.userInfo}
        >
          <Text
            style={
              styles.userName
            }
            numberOfLines={1}
          >
            {currentUser
              ?.displayName ||
              "Administrator"}
          </Text>

          <Text
            style={
              styles.userEmail
            }
            numberOfLines={1}
          >
            {currentUser
              ?.email ||
              "Signed in"}
          </Text>
        </View>
      </View>

      {/* ==================================================
          LOGOUT
          ================================================== */}

      <TouchableOpacity
        style={
          styles.logoutButton
        }
        onPress={
          handleLogout
        }
        activeOpacity={0.75}
      >
        <View
          style={
            styles.logoutIcon
          }
        >
          <Text
            style={
              styles.logoutIconText
            }
          >
            ↪
          </Text>
        </View>

        <Text
          style={
            styles.logoutText
          }
        >
          Logout
        </Text>
      </TouchableOpacity>

      {/* ==================================================
          VERSION
          ================================================== */}

      <Text
        style={styles.version}
      >
        Version 1.0.0
      </Text>
    </View>
  );
}

function getInitial(
  email
) {
  if (!email) {
    return "A";
  }

  return String(email)
    .charAt(0)
    .toUpperCase();
}

const styles = StyleSheet.create({
  container: {
    width: 245,
    height: "100%",
    backgroundColor:
      "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor:
      "#E2E8F0",
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 15,
  },

  // BRAND

  brand: {
    flexDirection:
      "row",
    alignItems:
      "center",
    paddingHorizontal: 6,
    paddingBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor:
      "#F1F5F9",
  },

  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor:
      "#F8FAFC",
    alignItems:
      "center",
    justifyContent:
      "center",
    overflow: "hidden",
  },

  logo: {
    width: 38,
    height: 38,
  },

  brandText: {
    flex: 1,
    marginLeft: 10,
  },

  appName: {
    fontFamily:
      FONTS.bold,
    fontSize: 13,
    color:
      COLORS.text,
  },

  appSubtitle: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 8,
    letterSpacing: 1.1,
    color:
      COLORS.primary,
    marginTop: 3,
  },

  // NAVIGATION

  navigation: {
    marginTop: 24,
  },

  menuLabel: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 8,
    letterSpacing: 0.8,
    color:
      COLORS.textMuted,
    paddingHorizontal: 11,
    marginBottom: 8,
  },

  menuItem: {
    height: 44,
    borderRadius: 9,
    flexDirection:
      "row",
    alignItems:
      "center",
    paddingHorizontal: 9,
    marginBottom: 3,
  },

  menuItemActive: {
    backgroundColor:
      "#EEF2FF",
  },

  menuIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  menuIconActive: {
    backgroundColor:
      COLORS.primary,
  },

  menuIconText: {
    fontFamily:
      FONTS.bold,
    fontSize: 14,
    color:
      "#94A3B8",
  },

  menuIconTextActive: {
    color: "#FFFFFF",
  },

  menuText: {
    fontFamily:
      FONTS.medium,
    fontSize: 11,
    color:
      COLORS.textSecondary,
    marginLeft: 10,
  },

  menuTextActive: {
    fontFamily:
      FONTS.bold,
    color:
      COLORS.primary,
  },

  spacer: {
    flex: 1,
  },

  // USER

  userSection: {
    flexDirection:
      "row",
    alignItems:
      "center",
    padding: 10,
    backgroundColor:
      "#F8FAFC",
    borderRadius: 11,
    marginBottom: 8,
  },

  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor:
      COLORS.primary,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  userAvatarText: {
    fontFamily:
      FONTS.bold,
    fontSize: 12,
    color: "#FFFFFF",
  },

  userInfo: {
    flex: 1,
    marginLeft: 9,
  },

  userName: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 10,
    color:
      COLORS.text,
  },

  userEmail: {
    fontFamily:
      FONTS.regular,
    fontSize: 8,
    color:
      COLORS.textMuted,
    marginTop: 2,
  },

  // LOGOUT

  logoutButton: {
    height: 40,
    borderRadius: 9,
    flexDirection:
      "row",
    alignItems:
      "center",
    paddingHorizontal: 10,
    marginBottom: 8,
  },

  logoutButtonPressed: {
    backgroundColor:
      "#FEF2F2",
  },

  logoutIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  logoutIconText: {
    fontFamily:
      FONTS.bold,
    fontSize: 16,
    color:
      COLORS.danger,
  },

  logoutText: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 10,
    color:
      COLORS.danger,
    marginLeft: 10,
  },

  version: {
    fontFamily:
      FONTS.regular,
    fontSize: 7,
    color:
      "#CBD5E1",
    textAlign:
      "center",
    marginTop: 4,
  },
});