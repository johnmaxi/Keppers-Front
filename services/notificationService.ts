// services/notificationService.ts
// Maneja registro de token y envío de notificaciones push via Expo

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

// ── Configuración global de cómo se muestran las notificaciones ──────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// ── Registrar dispositivo y guardar token en Firestore ────────────────────────
export async function registerPushToken(userId: string): Promise<string | null> {
  // Solo funciona en dispositivo físico
  if (!Device.isDevice) {
    console.log("Push notifications solo funcionan en dispositivo físico");
    return null;
  }

  // Pedir permiso
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Permiso de notificaciones denegado");
    return null;
  }

  // Canal de Android
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("keepers", {
      name:       "Keepers",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#00ff87",
      sound:      "default",
    });
  }

  // Obtener token de Expo
  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: "keepersapp-6b982", // tu projectId de Firebase/Expo
  })).data;

  // Guardar token en Firestore para poder enviar notificaciones a este usuario
  await updateDoc(doc(db, "users", userId), { pushToken: token });
  console.log("Push token registrado:", token);
  return token;
}

// ── Obtener token de un usuario desde Firestore ───────────────────────────────
export async function getUserPushToken(userId: string): Promise<string | null> {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return null;
  return snap.data().pushToken || null;
}

// ── Enviar notificación push via Expo Push API ────────────────────────────────
export async function sendPushNotification({
  token, title, body, data = {},
}: {
  token: string;
  title: string;
  body:  string;
  data?: Record<string, any>;
}): Promise<void> {
  await fetch("https://exp.host/--/api/v2/push/send", {
    method:  "POST",
    headers: {
      "Accept":       "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to:    token,
      sound: "default",
      title,
      body,
      data,
      channelId: "keepers",
    }),
  });
}

// ── Notificaciones específicas de Keepers ─────────────────────────────────────

// Cuando un portero envía oferta → notifica al jugador
export async function notifyNewOffer({
  playerToken, gkName, serviceId, tipoPartido, amount,
}: {
  playerToken: string;
  gkName:      string;
  serviceId:   string;
  tipoPartido: string;
  amount:      number;
}): Promise<void> {
  await sendPushNotification({
    token: playerToken,
    title: "🧤 Nueva oferta recibida",
    body:  `${gkName} ofrece $${amount.toLocaleString()}/hr para tu partido de ${tipoPartido}`,
    data:  { screen: "player/dashboard", tab: "svcs", serviceId },
  });
}

// Cuando el jugador acepta oferta → notifica al portero
export async function notifyOfferAccepted({
  gkToken, playerName, serviceId, tipoPartido, ciudad,
}: {
  gkToken:     string;
  playerName:  string;
  serviceId:   string;
  tipoPartido: string;
  ciudad:      string;
}): Promise<void> {
  await sendPushNotification({
    token: gkToken,
    title: "✅ ¡Oferta aceptada!",
    body:  `${playerName} aceptó tu oferta para ${tipoPartido} en ${ciudad}`,
    data:  { screen: "goalkeeper/dashboard", tab: "confirmed", serviceId },
  });
}

// Cuando el portero envía contraoferta → notifica al jugador
export async function notifyCounterOffer({
  playerToken, gkName, serviceId, amount, horas,
}: {
  playerToken: string;
  gkName:      string;
  serviceId:   string;
  amount:      number;
  horas:       number;
}): Promise<void> {
  await sendPushNotification({
    token: playerToken,
    title: "🔄 Contraoferta recibida",
    body:  `${gkName} propone $${amount.toLocaleString()}/hr por ${horas}h`,
    data:  { screen: "player/dashboard", tab: "svcs", serviceId },
  });
}

// Cuando el portero inicia el servicio → notifica al jugador
export async function notifyServiceStarted({
  playerToken, gkName, cancha,
}: {
  playerToken: string;
  gkName:      string;
  cancha:      string;
}): Promise<void> {
  await sendPushNotification({
    token: playerToken,
    title: "🟢 ¡Portero en camino!",
    body:  `${gkName} está en camino a ${cancha}`,
    data:  { screen: "player/dashboard" },
  });
}

// Cuando el servicio se completa → notifica a ambos para calificar
export async function notifyServiceCompleted({
  playerToken, gkToken, gkName, playerName,
}: {
  playerToken: string;
  gkToken:     string;
  gkName:      string;
  playerName:  string;
}): Promise<void> {
  await Promise.all([
    sendPushNotification({
      token: playerToken,
      title: "🏁 Servicio completado",
      body:  `¿Cómo estuvo ${gkName}? Deja tu calificación`,
      data:  { screen: "player/dashboard", tab: "svcs" },
    }),
    sendPushNotification({
      token: gkToken,
      title: "🏁 Servicio completado",
      body:  `¿Cómo estuvo ${playerName}? Deja tu calificación`,
      data:  { screen: "goalkeeper/dashboard", tab: "confirmed" },
    }),
  ]);
}

// Nuevo mensaje de chat → notifica al otro participante  
export async function notifyNewMessage({
  recipientToken, senderName, text, serviceId,
}: {
  recipientToken: string;
  senderName:     string;
  text:           string;
  serviceId:      string;
}): Promise<void> {
  await sendPushNotification({
    token: recipientToken,
    title: `💬 ${senderName}`,
    body:  text.length > 60 ? text.slice(0, 60) + "…" : text,
    data:  { screen: "chat/index", serviceId },
  });
}
