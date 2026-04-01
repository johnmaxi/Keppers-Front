// app/_layout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAppStore } from "../store/appStore";

// NO importar useNotifications aquí — se maneja en cada dashboard
// para evitar el error de expo-notifications en Expo Go

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { currentUser, authLoading, initAuth } = useAppStore();

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    const inApp = segments[0] === "player" || segments[0] === "goalkeeper";
    if (!currentUser && inApp) {
      router.replace("/" as any);
    } else if (currentUser && !inApp) {
      router.replace(
        currentUser.role === "player"
          ? ("/player/dashboard" as any)
          : ("/goalkeeper/dashboard" as any),
      );
    }
  }, [currentUser, authLoading]);

  if (authLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0a0a0f",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color="#00ff87" size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="player/dashboard" />
      <Stack.Screen name="goalkeeper/dashboard" />
      <Stack.Screen name="chat/index" />
      <Stack.Screen name="map/index" />
      <Stack.Screen name="rating/index" />
    </Stack>
  );
}
