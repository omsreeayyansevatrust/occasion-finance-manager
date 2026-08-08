import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";

import { Stack } from "expo-router";

import {
  ActivityIndicator,
  View,
} from "react-native";

import AppShell from "../components/AppShell";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Inter-Regular": Inter_400Regular,

    "Inter-Medium": Inter_500Medium,

    "Inter-SemiBold": Inter_600SemiBold,

    "Inter-Bold": Inter_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F7F9FC",
        }}
      >
        <ActivityIndicator
          size="large"
          color="#123F91"
        />
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