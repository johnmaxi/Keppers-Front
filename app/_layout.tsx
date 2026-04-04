// app/_layout.tsx
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAppStore } from "../store/appStore";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const { currentUser, authLoading, initAuth } = useAppStore();
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    initAuth();
    return () => {
      isMounted.current = false;
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (redirectTimer.current) clearTimeout(redirectTimer.current);

    redirectTimer.current = setTimeout(() => {
      if (!isMounted.current) return;

      const protectedRoutes = ["player", "goalkeeper", "profile", "admin"];
      const inApp = protectedRoutes.includes(segments[0] as string);
      const isAuthRoute =
        !segments[0] || segments[0] === "login" || segments[0] === "register";

      if (!currentUser && inApp) {
        router.replace("/" as any);
      } else if (currentUser && isAuthRoute) {
        router.replace(
          currentUser.role === "player"
            ? ("/player/dashboard" as any)
            : ("/goalkeeper/dashboard" as any),
        );
      }
      // Si está en perfil u otra ruta válida con sesión → no redirigir
    }, 150);

    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, [currentUser?.id, authLoading, segments[0]]);

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
