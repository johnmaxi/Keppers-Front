// hooks/useNotifications.ts
// Hook para inicializar notificaciones y manejar taps

import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { registerPushToken } from "../services/notificationService";
import { useAppStore } from "../store/appStore";

export function useNotifications() {
  const router      = useRouter();
  const { currentUser } = useAppStore();
  const responseListener = useRef<any>();
  const notificationListener = useRef<any>();

  useEffect(() => {
    if (!currentUser) return;

    // Registrar token al iniciar sesión
    registerPushToken(currentUser.id).catch(console.error);

    // Escuchar notificaciones recibidas mientras la app está abierta
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notificación recibida:", notification);
      }
    );

    // Manejar tap en notificación → navegar a la pantalla correcta
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as any;
        if (!data?.screen) return;

        const { screen, serviceId, tab } = data;

        if (screen === "player/dashboard") {
          router.push("/player/dashboard" as any);
        } else if (screen === "goalkeeper/dashboard") {
          router.push("/goalkeeper/dashboard" as any);
        } else if (screen === "chat/index" && serviceId) {
          router.push(`/chat?serviceId=${serviceId}` as any);
        }
      }
    );

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [currentUser]);
}
