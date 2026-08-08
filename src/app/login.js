import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useRouter } from "expo-router";

import {
  signInWithEmailAndPassword,
} from "firebase/auth";

import {
  COLORS,
  FONTS,
} from "../constants/theme";
import { auth } from "../services/firebase";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleLogin = async () => {
    if (!email.trim()) {
      setError(
        "Please enter your email address."
      );
      return;
    }

    if (!password) {
      setError(
        "Please enter your password."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      router.replace(
        "/dashboard"
      );
    } catch (err) {
      console.log(
        "LOGIN ERROR:",
        err
      );

      setError(
        "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={styles.container}
    >
      <View
        style={styles.loginCard}
      >
        {/* LOGO */}

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

        {/* BRAND */}

        <Text
          style={styles.appName}
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

        <Text
          style={
            styles.welcomeTitle
          }
        >
          Welcome back
        </Text>

        <Text
          style={
            styles.welcomeText
          }
        >
          Sign in to manage your
          finances and occasions.
        </Text>

        {/* EMAIL */}

        <Text
          style={styles.label}
        >
          EMAIL ADDRESS
        </Text>

        <TextInput
          value={email}
          onChangeText={
            setEmail
          }
          placeholder="Enter your email"
          placeholderTextColor={
            COLORS.textMuted
          }
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={styles.input}
        />

        {/* PASSWORD */}

        <Text
          style={styles.label}
        >
          PASSWORD
        </Text>

        <TextInput
          value={password}
          onChangeText={
            setPassword
          }
          placeholder="Enter your password"
          placeholderTextColor={
            COLORS.textMuted
          }
          secureTextEntry
          style={styles.input}
          onSubmitEditing={
            handleLogin
          }
        />

        {/* ERROR */}

        {error ? (
          <View
            style={
              styles.errorBox
            }
          >
            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>
          </View>
        ) : null}

        {/* LOGIN */}

        <TouchableOpacity
          style={
            styles.loginButton
          }
          onPress={
            handleLogin
          }
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Text
              style={
                styles.loginButtonText
              }
            >
              Sign In
            </Text>
          )}
        </TouchableOpacity>

        {/* FOOTER */}

        <Text
          style={
            styles.footerText
          }
        >
          Om Sree Iyyan Seva Trust
        </Text>

        <Text
          style={
            styles.versionText
          }
        >
          Version 1.0.0
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: "100vh",
    backgroundColor:
      "#F8FAFC",
    alignItems:
      "center",
    justifyContent:
      "center",
    padding: 20,
  },

  loginCard: {
    width: "100%",
    maxWidth: 430,
    backgroundColor:
      "#FFFFFF",
    borderWidth: 1,
    borderColor:
      "#E2E8F0",
    borderRadius: 20,
    paddingHorizontal: 34,
    paddingVertical: 35,
    alignItems:
      "stretch",
  },

  logoContainer: {
    width: 82,
    height: 82,
    borderRadius: 20,
    backgroundColor:
      "#F8FAFC",
    alignSelf:
      "center",
    alignItems:
      "center",
    justifyContent:
      "center",
    overflow: "hidden",
    marginBottom: 13,
  },

  logo: {
    width: 70,
    height: 70,
  },

  appName: {
    fontFamily:
      FONTS.bold,
    fontSize: 18,
    color:
      COLORS.text,
    textAlign:
      "center",
  },

  appSubtitle: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 8,
    letterSpacing: 1.4,
    color:
      COLORS.primary,
    textAlign:
      "center",
    marginTop: 3,
  },

  welcomeTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 23,
    color:
      COLORS.text,
    textAlign:
      "center",
    marginTop: 30,
  },

  welcomeText: {
    fontFamily:
      FONTS.regular,
    fontSize: 11,
    lineHeight: 17,
    color:
      COLORS.textSecondary,
    textAlign:
      "center",
    marginTop: 6,
    marginBottom: 24,
  },

  label: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 9,
    letterSpacing: 0.5,
    color:
      COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },

  input: {
    height: 46,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 13,
    backgroundColor:
      "#FFFFFF",
    fontFamily:
      FONTS.regular,
    fontSize: 12,
    color:
      COLORS.text,
    outlineStyle:
      "none",
  },

  errorBox: {
    backgroundColor:
      "#FEF2F2",
    borderWidth: 1,
    borderColor:
      "#FECACA",
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 13,
  },

  errorText: {
    fontFamily:
      FONTS.medium,
    fontSize: 10,
    color:
      COLORS.danger,
  },

  loginButton: {
    height: 46,
    borderRadius: 9,
    backgroundColor:
      COLORS.primary,
    alignItems:
      "center",
    justifyContent:
      "center",
    marginTop: 20,
  },

  loginButtonText: {
    fontFamily:
      FONTS.bold,
    fontSize: 12,
    color:
      "#FFFFFF",
  },

  footerText: {
    fontFamily:
      FONTS.medium,
    fontSize: 9,
    color:
      COLORS.textSecondary,
    textAlign:
      "center",
    marginTop: 25,
  },

  versionText: {
    fontFamily:
      FONTS.regular,
    fontSize: 8,
    color:
      COLORS.textMuted,
    textAlign:
      "center",
    marginTop: 3,
  },
});