import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    View,
} from "react-native";

import { usePathname } from "expo-router";

import {
    onAuthStateChanged,
} from "firebase/auth";

import { COLORS } from "../constants/theme";
import { auth } from "../services/firebase";

import AppMenu from "./AppMenu";

export default function AppShell({
  children,
}) {
  const pathname = usePathname();

  const [user, setUser] =
    useState(auth.currentUser);

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setCheckingAuth(false);
        }
      );

    return unsubscribe;
  }, []);

  /*
   * Login screen should NOT have the sidebar.
   *
   * Our login route is "/"
   */
  const isLoginScreen =
    pathname === "/" ||
    pathname === "/login";

  if (checkingAuth) {
    return (
      <View
        style={
          styles.loading
        }
      >
        <ActivityIndicator
          size="large"
          color={
            COLORS.primary
          }
        />
      </View>
    );
  }

  /*
   * Login screen
   */
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

  /*
   * Authenticated application
   * with standard left sidebar.
   */
  return (
    <View
      style={
        styles.appContainer
      }
    >
      <View
        style={
          styles.sidebar
        }
      >
        <AppMenu />
      </View>

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

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor:
      COLORS.background,
    height: "100vh",
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
    height: "100%",
    overflow: "hidden",
  },

  fullScreen: {
    flex: 1,
    width: "100%",
    height: "100%",
  },

  loading: {
    flex: 1,
    width: "100%",
    height: "100vh",
    alignItems:
      "center",
    justifyContent:
      "center",
    backgroundColor:
      COLORS.background,
  },
});