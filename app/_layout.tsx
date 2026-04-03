// app/_layout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAppStore } from "../store/appStore";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const mounted = useRef(false);
  const { currentUser, authLoading, initAuth } = useAppStore();

  useEffect(() => {
    mounted.current = true;
    initAuth();
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!mounted.current) return;
    if (authLoading) return;

    const inApp =
      segments[0] === "player" ||
      segments[0] === "goalkeeper" ||
      segments[0] === "profile" ||
      segments[0] === "admin";

    // Pequeño delay para evitar state update en componente no montado
    const timer = setTimeout(() => {
      if (!mounted.current) return;
      if (!currentUser && inApp) {
        router.replace("/" as any);
      } else if (currentUser && !inApp) {
        router.replace(
          currentUser.role === "player"
            ? ("/player/dashboard" as any)
            : ("/goalkeeper/dashboard" as any),
        );
      }
    }, 50);

    return () => clearTimeout(timer);
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
      <Stack.Screen name="profile/index" />
      <Stack.Screen name="chat/index" />
      <Stack.Screen name="map/index" />
      <Stack.Screen name="rating/index" />
    </Stack>
  );
}
