// hooks/useNotifications.ts — SDK 55, silencia error en Expo Go
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { registerPushToken } from "../services/notificationService";
import { useAppStore } from "../store/appStore";

const isExpoGo = Constants.appOwnership === "expo";

// Solo configurar handler si NO estamos en Expo Go
// (en Expo Go SDK 55 esto lanza error repetido en consola)
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export function useNotifications() {
  const router = useRouter();
  const { currentUser } = useAppStore();
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!currentUser || isExpoGo) return;

    registerPushToken(currentUser.id).catch(console.error);

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log(
          "Notificación recibida:",
          notification.request.content.title,
        );
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as any;
        if (!data?.screen) return;
        const { screen, serviceId } = data;
        if (screen === "player/dashboard")
          router.push("/player/dashboard" as any);
        else if (screen === "goalkeeper/dashboard")
          router.push("/goalkeeper/dashboard" as any);
        else if (screen === "chat/index" && serviceId)
          router.push(`/chat?serviceId=${serviceId}` as any);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [currentUser]);
}
