// hooks/useNotifications.ts
import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { registerPushToken } from "../services/notificationService";
import { useAppStore } from "../store/appStore";

const isExpoGo = Constants.appOwnership === "expo";

// SDK 55: NotificationBehavior requiere shouldShowBanner y shouldShowList
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
  }),
});

export function useNotifications() {
  const router          = useRouter();
  const { currentUser } = useAppStore();

  // SDK 55: useRef requiere valor inicial
  const responseListener     = useRef<Notifications.Subscription | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    if (!isExpoGo) {
      registerPushToken(currentUser.id).catch(console.error);
    }

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notificación recibida:", notification.request.content.title);
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
      // SDK 55: se usa .remove() en la suscripción directamente
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [currentUser]);
}
