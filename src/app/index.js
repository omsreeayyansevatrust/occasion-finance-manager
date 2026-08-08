import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import {
  onAuthStateChanged,
} from "firebase/auth";

import { auth } from "../services/firebase";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            router.replace(
              "/dashboard"
            );
          } else {
            router.replace(
              "/login"
            );
          }
        }
      );

    return unsubscribe;
  }, []);

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
        color="#4F46E5"
      />
    </View>
  );
}