import { useRef, useState } from "react";

import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
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

  const { width, height } =
    useWindowDimensions();

  const passwordInputRef = useRef(null);
  const scrollRef = useRef(null);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * Mobile breakpoint
   */
  const isMobile =
    Platform.OS !== "web" ||
    width < 768;

  /*
   * =========================================================
   * LOGIN
   * =========================================================
   */

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

  /*
   * =========================================================
   * PASSWORD FOCUS
   *
   * When the keyboard opens, make sure the password field
   * is visible.
   * =========================================================
   */

  const handlePasswordFocus = () => {
    if (!isMobile) {
      return;
    }

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({
        animated: true,
      });
    }, 250);
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
      keyboardVerticalOffset={
        Platform.OS === "ios"
          ? 10
          : 0
      }
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isMobile &&
            styles.scrollContentMobile,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={
          Platform.OS === "ios"
            ? "interactive"
            : "on-drag"
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View
          style={[
            styles.container,
            isMobile &&
              styles.containerMobile,
          ]}
        >
          <View
            style={[
              styles.loginCard,
              isMobile &&
                styles.loginCardMobile,
            ]}
          >
            {/* =================================================
                BRAND / LOGO
                ================================================= */}

            <Image
              source={require("../../assets/images/logo.png")}
              style={[
                styles.logo,
                isMobile &&
                  styles.logoMobile,
              ]}
              resizeMode="contain"
            />

            <Text
              style={styles.appName}
            >
              Occasion Finance
            </Text>

            <Text
              style={styles.appSubtitle}
            >
              MANAGER
            </Text>

            <View
              style={styles.brandDivider}
            />

            {/* =================================================
                WELCOME
                ================================================= */}

            <Text
              style={[
                styles.welcomeTitle,
                isMobile &&
                  styles.welcomeTitleMobile,
              ]}
            >
              Welcome back
            </Text>

            <Text
              style={[
                styles.welcomeText,
                isMobile &&
                  styles.welcomeTextMobile,
              ]}
            >
              Sign in to manage your finances
              {"\n"}
              and occasions.
            </Text>

            {/* =================================================
                EMAIL
                ================================================= */}

            <Text
              style={styles.label}
            >
              EMAIL ADDRESS
            </Text>

            <TextInput
              value={email}
              onChangeText={(value) => {
                setEmail(value);

                if (error) {
                  setError("");
                }
              }}
              placeholder="Enter your email"
              placeholderTextColor={
                COLORS.textMuted
              }
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => {
                passwordInputRef.current?.focus();
              }}
              style={styles.input}
            />

            {/* =================================================
                PASSWORD
                ================================================= */}

            <Text
              style={styles.label}
            >
              PASSWORD
            </Text>

            <TextInput
              ref={passwordInputRef}
              value={password}
              onChangeText={(value) => {
                setPassword(value);

                if (error) {
                  setError("");
                }
              }}
              placeholder="Enter your password"
              placeholderTextColor={
                COLORS.textMuted
              }
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              style={styles.input}
              onFocus={
                handlePasswordFocus
              }
              onSubmitEditing={
                handleLogin
              }
              returnKeyType="done"
            />

            {/* =================================================
                ERROR
                ================================================= */}

            {error ? (
              <View
                style={styles.errorBox}
              >
                <Text
                  style={styles.errorIcon}
                >
                  !
                </Text>

                <Text
                  style={styles.errorText}
                >
                  {error}
                </Text>
              </View>
            ) : null}

            {/* =================================================
                LOGIN
                ================================================= */}

            <TouchableOpacity
              style={[
                styles.loginButton,
                loading &&
                  styles.loginButtonDisabled,
              ]}
              onPress={
                handleLogin
              }
              disabled={loading}
              activeOpacity={0.82}
            >
              {loading ? (
                <View
                  style={
                    styles.loadingContent
                  }
                >
                  <ActivityIndicator
                    size="small"
                    color={
                      COLORS.white
                    }
                  />

                  <Text
                    style={
                      styles.loginButtonText
                    }
                  >
                    Signing in...
                  </Text>
                </View>
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

            {/* =================================================
                FOOTER
                ================================================= */}

            <Text
              style={styles.footerText}
            >
              Om Sree Iyyan Seva Trust
            </Text>

            <Text
              style={styles.versionText}
            >
              Version 1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* =============================================================
   STYLES
============================================================= */

const styles = StyleSheet.create({

  /*
   * ===========================================================
   * ROOT
   * ===========================================================
   */

  keyboardContainer: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  scrollContentMobile: {
    justifyContent: "center",
  },

  /*
   * ===========================================================
   * CONTAINER
   * ===========================================================
   */

  container: {
    flex: 1,
    minHeight: "100vh",
    width: "100%",

    backgroundColor:
      COLORS.background,

    alignItems: "center",
    justifyContent: "center",

    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  containerMobile: {
    minHeight: undefined,
    paddingHorizontal: 16,
    paddingVertical: 24,
    justifyContent: "center",
  },

  /*
   * ===========================================================
   * LOGIN CARD
   * ===========================================================
   */

  loginCard: {
    width: "100%",
    maxWidth: 460,

    backgroundColor:
      COLORS.surface,

    borderWidth: 1,
    borderColor:
      COLORS.border,

    borderRadius: 20,

    paddingHorizontal: 42,
    paddingVertical: 38,

    alignItems: "stretch",

    shadowColor:
      COLORS.text,

    shadowOffset: {
      width: 0,
      height: 10,
    },

    shadowOpacity: 0.08,
    shadowRadius: 28,

    elevation: 5,
  },

  loginCardMobile: {
    maxWidth: 520,

    borderRadius: 16,

    paddingHorizontal: 22,
    paddingVertical: 26,

    shadowOpacity: 0.06,
    shadowRadius: 16,

    elevation: 3,
  },

  /*
   * ===========================================================
   * LOGO
   * ===========================================================
   */

  logo: {
    width: 76,
    height: 76,

    alignSelf: "center",

    marginBottom: 14,
  },

  logoMobile: {
    width: 66,
    height: 66,

    marginBottom: 10,
  },

  /*
   * ===========================================================
   * BRAND
   * ===========================================================
   */

  appName: {
    fontFamily:
      FONTS.bold,

    fontSize: 21,
    lineHeight: 27,

    color:
      COLORS.text,

    textAlign: "center",
  },

  appSubtitle: {
    fontFamily:
      FONTS.medium,

    fontSize: 10,
    lineHeight: 14,

    letterSpacing: 2,

    color:
      COLORS.primary,

    textAlign: "center",

    marginTop: 4,
  },

  brandDivider: {
    width: 42,
    height: 3,

    borderRadius: 2,

    backgroundColor:
      COLORS.primary,

    alignSelf: "center",

    marginTop: 15,
  },

  /*
   * ===========================================================
   * WELCOME
   * ===========================================================
   */

  welcomeTitle: {
    fontFamily:
      FONTS.bold,

    fontSize: 28,
    lineHeight: 34,

    color:
      COLORS.text,

    textAlign: "center",

    marginTop: 30,
  },

  welcomeTitleMobile: {
    fontSize: 24,
    lineHeight: 30,
    marginTop: 22,
  },

  welcomeText: {
    fontFamily:
      FONTS.regular,

    fontSize: 15,
    lineHeight: 22,

    color:
      COLORS.textSecondary,

    textAlign: "center",

    marginTop: 8,
    marginBottom: 24,
  },

  welcomeTextMobile: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 18,
  },

  /*
   * ===========================================================
   * LABEL
   * ===========================================================
   */

  label: {
    fontFamily:
      FONTS.medium,

    fontSize: 12,
    lineHeight: 17,

    letterSpacing: 0.7,

    color:
      COLORS.textSecondary,

    marginBottom: 8,
    marginTop: 15,
  },

  /*
   * ===========================================================
   * INPUT
   * ===========================================================
   */

  input: {
    height: 52,

    borderWidth: 1,
    borderColor:
      COLORS.border,

    borderRadius: 10,

    paddingHorizontal: 15,

    backgroundColor:
      COLORS.white,

    fontFamily:
      FONTS.regular,

    fontSize: 15,

    color:
      COLORS.text,

    /*
     * Web only
     */
    outlineStyle: "none",
  },

  /*
   * ===========================================================
   * ERROR
   * ===========================================================
   */

  errorBox: {
    minHeight: 46,

    flexDirection: "row",

    alignItems: "center",

    backgroundColor:
      COLORS.dangerLight,

    borderWidth: 1,
    borderColor:
      "#F6B8B8",

    borderRadius: 10,

    paddingHorizontal: 13,
    paddingVertical: 10,

    marginTop: 15,
  },

  errorIcon: {
    width: 22,
    height: 22,

    borderRadius: 11,

    backgroundColor:
      COLORS.danger,

    color:
      COLORS.white,

    fontFamily:
      FONTS.bold,

    fontSize: 13,
    lineHeight: 22,

    textAlign: "center",

    marginRight: 9,
  },

  errorText: {
    flex: 1,

    fontFamily:
      FONTS.medium,

    fontSize: 13,
    lineHeight: 18,

    color:
      COLORS.danger,
  },

  /*
   * ===========================================================
   * LOGIN BUTTON
   * ===========================================================
   */

  loginButton: {
    height: 52,

    borderRadius: 10,

    backgroundColor:
      COLORS.primary,

    alignItems: "center",
    justifyContent: "center",

    marginTop: 22,

    shadowColor:
      COLORS.primary,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.18,
    shadowRadius: 8,

    elevation: 3,
  },

  loginButtonDisabled: {
    opacity: 0.75,
  },

  loadingContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  loginButtonText: {
    fontFamily:
      FONTS.bold,

    fontSize: 15,
    lineHeight: 20,

    color:
      COLORS.white,
  },

  /*
   * ===========================================================
   * FOOTER
   * ===========================================================
   */

  footerText: {
    fontFamily:
      FONTS.medium,

    fontSize: 12,
    lineHeight: 17,

    color:
      COLORS.textSecondary,

    textAlign: "center",

    marginTop: 27,
  },

  versionText: {
    fontFamily:
      FONTS.regular,

    fontSize: 11,
    lineHeight: 16,

    color:
      COLORS.textMuted,

    textAlign: "center",

    marginTop: 4,
  },
});