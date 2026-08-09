// src/components/AppShell.js

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";

import { usePathname } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";

import { COLORS } from "../constants/theme";
import { auth } from "../services/firebase";

import AppMenu from "./AppMenu";

export default function AppShell({ children }) {
  const pathname = usePathname();

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

    // Web
    height: "100vh",
    minHeight: "100vh",
    width: "100%",
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

  fullScreen: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.background,
  },

  loading: {
    flex: 1,
    width: "100%",
    height: "100vh",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
});
