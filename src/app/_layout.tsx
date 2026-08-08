import {
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
  useFonts,
} from "@expo-google-fonts/roboto";

import { Stack } from "expo-router";

import {
  ActivityIndicator,
  View,
} from "react-native";

import AppShell from "../components/AppShell";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Roboto-Regular": Roboto_400Regular,
    "Roboto-Medium": Roboto_500Medium,
    "Roboto-Bold": Roboto_700Bold,
  });

  /*
   * Show loading screen only while fonts are loading.
   * If the production browser cannot load the font,
   * allow the application to continue.
   */
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