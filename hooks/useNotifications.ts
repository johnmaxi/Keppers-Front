// hooks/useNotifications.ts
import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { registerPushToken } from "../services/notificationService";
import { useAppStore } from "../store/appStore";

// Detectar si estamos en Expo Go (no soporta push en SDK 53+)
const isExpoGo = Constants.appOwnership === "expo";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

export function useNotifications() {
  const router          = useRouter();
  const { currentUser } = useAppStore();
  const responseListener     = useRef<any>();
  const notificationListener = useRef<any>();

  useEffect(() => {
    if (!currentUser) return;

    // Solo registrar token en APK real, no en Expo Go
    if (!isExpoGo) {
      registerPushToken(currentUser.id).catch(console.error);
    }

    // Escuchar notificaciones recibidas (funciona en ambos)
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notificación recibida:", notification.request.content.title);
      });

    // Manejar tap en notificación → navegar
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as any;
        if (!data?.screen) return;
        const { screen, serviceId } = data;
        if (screen === "player/dashboard")     router.push("/player/dashboard" as any);
        else if (screen === "goalkeeper/dashboard") router.push("/goalkeeper/dashboard" as any);
        else if (screen === "chat/index" && serviceId) router.push(`/chat?serviceId=${serviceId}` as any);
      });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [currentUser]);
}
