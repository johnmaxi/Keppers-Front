// app/_layout.tsx
import { useEffect, useRef } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { useAppStore } from "../store/appStore";
import { View, ActivityIndicator } from "react-native";

const PROTECTED = ["player", "goalkeeper", "profile", "admin", "chat", "map", "rating", "recargar"];
const AUTH_ONLY = ["", "login", "register"];

export default function RootLayout() {
  const router   = useRouter();
  const segments = useSegments();
  const { currentUser, authLoading, initAuth } = useAppStore();
  const timer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    // DEBUG: confirmar que este codigo corre
    const { Alert } = require("react-native");
    Alert.alert("APP VERSION", "v2.0 - codigo nuevo cargado OK");
    initAuth();
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      if (!mounted.current) return;
      const seg0   = (segments[0] as string) ?? "";
      const inApp  = PROTECTED.includes(seg0);
      const isAuth = AUTH_ONLY.includes(seg0);

      if (!currentUser && inApp) {
        router.replace("/" as any);
      } else if (currentUser && isAuth) {
        if (currentUser.role === "admin") {
          router.replace("/admin/dashboard" as any);
        } else if (currentUser.role === "player") {
          router.replace("/player/dashboard" as any);
        } else {
          router.replace("/goalkeeper/dashboard" as any);
        }
      }
    }, 150);

    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [currentUser?.id, authLoading, segments[0]]);

  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0f", alignItems: "center", justifyContent: "center" }}>
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
      <Stack.Screen name="admin/dashboard" />
      <Stack.Screen name="profile/index" options={{ presentation: "card" }} />
      <Stack.Screen name="chat/index" options={{ presentation: "card" }} />
      <Stack.Screen name="map/index" options={{ presentation: "card" }} />
      <Stack.Screen name="rating/index" options={{ presentation: "card" }} />
    </Stack>
  );
}