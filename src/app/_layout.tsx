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

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Roboto-Regular": Roboto_400Regular,
    "Roboto-Medium": Roboto_500Medium,
    "Roboto-Bold": Roboto_700Bold,
  });

  // If fonts are still loading, show loader.
  // But if the browser cannot load the font in production,
  // don't keep the entire application stuck forever.
  if (!fontsLoaded && !fontError) {
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
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}