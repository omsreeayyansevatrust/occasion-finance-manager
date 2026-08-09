// src/components/AppShell.js

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

import { usePathname } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";

import { COLORS } from "../constants/theme";
import { auth } from "../services/firebase";

import AppMenu from "./AppMenu";
import MobileBottomNav from "./MobileBottomNav";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();

  const isMobile = width < 768;

  const [user, setUser] = useState(auth.currentUser);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setCheckingAuth(false);
      }
    );

    return unsubscribe;
  }, []);

  const isLoginScreen =
    pathname === "/" ||
    pathname === "/login";

  if (checkingAuth) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
      </View>
    );
  }

  if (isLoginScreen || !user) {
    return (
      <View style={styles.fullScreen}>
        {children}
      </View>
    );
  }

  // ---------------------------------------------------------
  // MOBILE
  // ---------------------------------------------------------
  // Keep the existing screens untouched. Only the shell changes:
  // sidebar is hidden and the bottom navigation is displayed.
  if (isMobile) {
    return (
      <View style={styles.mobileContainer}>
        <View style={styles.mobileContent}>
          {children}
        </View>

        <MobileBottomNav />
      </View>
    );
  }

  // ---------------------------------------------------------
  // WEB / DESKTOP
  // ---------------------------------------------------------
  // Existing sidebar behavior remains unchanged.
  return (
    <View style={styles.appContainer}>
      <View style={styles.sidebar}>
        <AppMenu />
      </View>

      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: COLORS.background,
    width: "100%",
    height: "100%",
    minHeight: "100vh",
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
    backgroundColor: COLORS.background,
  },

  mobileContainer: {
    flex: 1,
    width: "100%",
    minHeight: "100%",
    backgroundColor: COLORS.background,
    position: "relative",
  },

  mobileContent: {
    flex: 1,
    width: "100%",
    minWidth: 0,
    minHeight: 0,
    paddingBottom: 72,
    backgroundColor: COLORS.background,
  },

  fullScreen: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.background,
  },

  loading: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
});
