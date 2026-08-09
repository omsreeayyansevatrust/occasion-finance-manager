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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
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

      router.replace("/dashboard");
    } catch (err) {
      console.log("LOGIN ERROR:", err);
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.loginCard}>
        {/* BRAND / LOGO */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.appName}>
          Occasion Finance
        </Text>

        <Text style={styles.appSubtitle}>
          MANAGER
        </Text>

        <View style={styles.brandDivider} />

        {/* WELCOME */}
        <Text style={styles.welcomeTitle}>
          Welcome back
        </Text>

        <Text style={styles.welcomeText}>
          Sign in to manage your finances
          {"\n"}
          and occasions.
        </Text>

        {/* EMAIL */}
        <Text style={styles.label}>
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
          placeholderTextColor={COLORS.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          style={styles.input}
        />

        {/* PASSWORD */}
        <Text style={styles.label}>
          PASSWORD
        </Text>

        <TextInput
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (error) {
              setError("");
            }
          }}
          placeholder="Enter your password"
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          style={styles.input}
          onSubmitEditing={handleLogin}
          returnKeyType="done"
        />

        {/* ERROR */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>
              !
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* LOGIN */}
        <TouchableOpacity
          style={[
            styles.loginButton,
            loading && styles.loginButtonDisabled,
          ]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.82}
        >
          {loading ? (
            <View style={styles.loadingContent}>
              <ActivityIndicator
                size="small"
                color={COLORS.white}
              />
              <Text style={styles.loginButtonText}>
                Signing in...
              </Text>
            </View>
          ) : (
            <Text style={styles.loginButtonText}>
              Sign In
            </Text>
          )}
        </TouchableOpacity>

        {/* FOOTER */}
        <Text style={styles.footerText}>
          Om Sree Iyyan Seva Trust
        </Text>

        <Text style={styles.versionText}>
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
    width: "100%",
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  loginCard: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 42,
    paddingVertical: 38,
    alignItems: "stretch",

    shadowColor: COLORS.text,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 5,
  },

  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 14,
  },

  logo: {
    width: 76,
    height: 76,
  },

  appName: {
    fontFamily: FONTS.bold,
    fontSize: 21,
    lineHeight: 27,
    color: COLORS.text,
    textAlign: "center",
  },

  appSubtitle: {
    fontFamily: FONTS.medium,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2,
    color: COLORS.primary,
    textAlign: "center",
    marginTop: 4,
  },

  brandDivider: {
    width: 42,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    alignSelf: "center",
    marginTop: 15,
  },

  welcomeTitle: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    lineHeight: 34,
    color: COLORS.text,
    textAlign: "center",
    marginTop: 30,
  },

  welcomeText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },

  label: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.7,
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 15,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: COLORS.white,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.text,
    outlineStyle: "none",
  },

  errorBox: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.dangerLight,
    borderWidth: 1,
    borderColor: "#F6B8B8",
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginTop: 15,
  },

  errorIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.danger,
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 13,
    lineHeight: 22,
    textAlign: "center",
    marginRight: 9,
  },

  errorText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.danger,
  },

  loginButton: {
    height: 52,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,

    shadowColor: COLORS.primary,
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
    fontFamily: FONTS.bold,
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.white,
  },

  footerText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 27,
  },

  versionText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
});
