import Ionicons from "@expo/vector-icons/Ionicons";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";

import {
  ActivityIndicator,
  View,
} from "react-native";

import AppShell from "../components/AppShell";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Roboto-Regular": require("../../assets/fonts/Roboto-Regular.ttf"),
    "Roboto-Medium": require("../../assets/fonts/Roboto-Medium.ttf"),
    "Roboto-Bold": require("../../assets/fonts/Roboto-Bold.ttf"),

    // Preload Expo Vector Icons
    ...Ionicons.font,
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F8FAFC",
        }}
      >
        <ActivityIndicator size="small" color="#1D4ED8" />
      </View>
    );
  }

  return (
    <AppShell>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </AppShell>
  );
}