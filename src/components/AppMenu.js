// src/components/AppMenu.js

import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
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
    icon: "grid-outline",
  },
  {
    label: "People",
    route: "/people",
    icon: "people-outline",
  },
  {
    label: "Occasions",
    route: "/occasions",
    icon: "calendar-outline",
  },
  {
    label: "Contributions",
    route: "/contributions",
    icon: "arrow-up-circle-outline",
  },
  {
    label: "Expenses",
    route: "/expenses",
    icon: "arrow-down-circle-outline",
  },
  {
    label: "Financial Details",
    route: "/financialdetails",
    icon: "analytics-outline",
  },

   {
    label: "Reports",
    route: "/reports",
    icon: "document-text-outline",
  },
];

export default function AppMenu() {
  const router = useRouter();
  const pathname = usePathname();

  const currentUser = auth.currentUser;

  const handleNavigation = (route) => {
    // Do not use push for the current route.
    // replace gives deterministic navigation for the web app.
    if (pathname === route) {
      return;
    }

    router.replace(route);
  };

  const performLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/");
    } catch (error) {
      console.log("Logout error:", error);

      if (
        Platform.OS === "web" &&
        typeof window !== "undefined" &&
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

  const handleLogout = async () => {
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      typeof window.confirm === "function"
    ) {
      const confirmed = window.confirm(
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
          onPress: performLogout,
        },
      ]
    );
  };

  const isActive = (route) => {
    if (route === "/dashboard") {
      return (
        pathname === "/dashboard" ||
        pathname === "/"
      );
    }

    return (
      pathname === route ||
      pathname.startsWith(`${route}/`)
    );
  };

  return (
    <View style={styles.container}>
      {/* BRAND */}
      <View style={styles.brand}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.brandText}>
          <Text
            style={styles.appName}
            numberOfLines={1}
          >
            Occasion Finance
          </Text>

          <Text style={styles.appSubtitle}>
            MANAGER
          </Text>
        </View>
      </View>

      {/* NAVIGATION */}
      <ScrollView
        style={styles.navigation}
        contentContainerStyle={
          styles.navigationContent
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.menuLabel}>
          MAIN MENU
        </Text>

        {MENU_ITEMS.map((item) => {
          const active = isActive(item.route);

          return (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.menuItem,
                active &&
                  styles.menuItemActive,
              ]}
              onPress={() =>
                handleNavigation(item.route)
              }
              activeOpacity={0.8}
            >
              {active ? (
                <View
                  style={styles.activeIndicator}
                />
              ) : null}

              <View
                style={[
                  styles.menuIcon,
                  active &&
                    styles.menuIconActive,
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={19}
                  color={
                    active
                      ? COLORS.primary
                      : COLORS.textMuted
                  }
                />
              </View>

              <Text
                style={[
                  styles.menuText,
                  active &&
                    styles.menuTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* USER / LOGOUT */}
      <View style={styles.bottomArea}>
        <View style={styles.userSection}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {getInitial(
                currentUser?.email
              )}
            </Text>
          </View>

          <View style={styles.userInfo}>
            <Text
              style={styles.userName}
              numberOfLines={1}
            >
              {currentUser?.displayName ||
                "Administrator"}
            </Text>

            <Text
              style={styles.userEmail}
              numberOfLines={1}
            >
              {currentUser?.email ||
                "Signed in"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons
            name="log-out-outline"
            size={19}
            color={COLORS.danger}
          />

          <Text style={styles.logoutText}>
            Logout
          </Text>
        </TouchableOpacity>

        <Text style={styles.version}>
          Version 1.0.0
        </Text>
      </View>
    </View>
  );
}

function getInitial(email) {
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
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 15,
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },

  logoContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  logo: {
    width: 41,
    height: 41,
  },

  brandText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },

  appName: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.text,
  },

  appSubtitle: {
    fontFamily: FONTS.medium,
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 1.7,
    color: COLORS.primary,
    marginTop: 3,
  },

  navigation: {
    flex: 1,
  },

  navigationContent: {
    paddingTop: 24,
    paddingBottom: 12,
  },

  menuLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1,
    color: COLORS.textMuted,
    paddingHorizontal: 10,
    marginBottom: 10,
  },

  menuItem: {
    minHeight: 49,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    marginBottom: 4,
    position: "relative",
  },

  menuItemActive: {
    backgroundColor: COLORS.primaryLight,
  },

  activeIndicator: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },

  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  menuIconActive: {
    backgroundColor: COLORS.white,
  },

  menuText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 19,
    color: COLORS.textSecondary,
    marginLeft: 10,
  },

  menuTextActive: {
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },

  bottomArea: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },

  userSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: COLORS.background,
    borderRadius: 11,
    marginBottom: 7,
  },

  userAvatar: {
    width: 37,
    height: 37,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  userAvatarText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },

  userInfo: {
    flex: 1,
    minWidth: 0,
    marginLeft: 9,
  },

  userName: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.text,
  },

  userEmail: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    lineHeight: 14,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  logoutButton: {
    height: 42,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 4,
  },

  logoutText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.danger,
    marginLeft: 10,
  },

  version: {
    fontFamily: FONTS.regular,
    fontSize: 9,
    lineHeight: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 3,
  },
});
