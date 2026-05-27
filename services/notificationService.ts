// services/notificationService.ts
// Las notificaciones push NO funcionan en Expo Go SDK 53+
// Este servicio es un no-op en Expo Go y funciona en APK real

import Constants from "expo-constants";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

const isExpoGo = Constants.appOwnership === "expo";

// ── Registrar token push ──────────────────────────────────────────────────────
export async function registerPushToken(userId: string): Promise<string | null> {
  if (isExpoGo) return null;

  // Solo importar expo-notifications en APK real
  const Notifications = await import("expo-notifications");
  const Device = await import("expo-device");
  const { Platform } = await import("react-native");

  if (!Device.default.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("keepers", {
      name: "Keepers",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#00ff87",
      sound: "default",
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: "Keepers-app",
  })).data;

  await updateDoc(doc(db, "users", userId), { pushToken: token });
  return token;
}

// ── Obtener token de usuario ──────────────────────────────────────────────────
export async function getUserPushToken(userId: string): Promise<string | null> {
  if (isExpoGo) return null;
  try {
    const snap = await getDoc(doc(db, "users", userId));
    if (!snap.exists()) return null;
    return snap.data().pushToken || null;
  } catch {
    return null;
  }
}

// ── Enviar notificación ───────────────────────────────────────────────────────
export async function sendPushNotification({
  token, title, body, data = {},
}: {
  token: string; title: string; body: string; data?: Record<string, any>;
}): Promise<void> {
  if (isExpoGo || !token) return;
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Accept": "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ to: token, sound: "default", title, body, data, channelId: "keepers" }),
  });
}

// ── Notificaciones específicas (todas son no-op en Expo Go) ───────────────────
export async function notifyNewOffer(p: { playerToken: string; gkName: string; serviceId: string; tipoPartido: string; amount: number }) {
  if (isExpoGo) return;
  await sendPushNotification({ token: p.playerToken, title: "🧤 Nueva oferta recibida", body: `${p.gkName} ofrece $${p.amount.toLocaleString()} para tu partido de ${p.tipoPartido}`, data: { screen: "player/dashboard", serviceId: p.serviceId } });
}

export async function notifyOfferAccepted(p: { gkToken: string; playerName: string; serviceId: string; tipoPartido: string; ciudad: string }) {
  if (isExpoGo) return;
  await sendPushNotification({ token: p.gkToken, title: "✅ ¡Oferta aceptada!", body: `${p.playerName} aceptó tu oferta para ${p.tipoPartido} en ${p.ciudad}`, data: { screen: "goalkeeper/dashboard", serviceId: p.serviceId } });
}

export async function notifyCounterOffer(p: { playerToken: string; gkName: string; serviceId: string; amount: number; horas: number }) {
  if (isExpoGo) return;
  await sendPushNotification({ token: p.playerToken, title: "🔄 Contraoferta recibida", body: `${p.gkName} propone $${p.amount.toLocaleString()} por ${p.horas}h`, data: { screen: "player/dashboard", serviceId: p.serviceId } });
}

export async function notifyServiceStarted(p: { playerToken: string; gkName: string; cancha: string }) {
  if (isExpoGo) return;
  await sendPushNotification({ token: p.playerToken, title: "🟢 ¡Portero en camino!", body: `${p.gkName} está en camino a ${p.cancha}` });
}

export async function notifyServiceCompleted(p: { playerToken: string; gkToken: string; gkName: string; playerName: string }) {
  if (isExpoGo) return;
  await Promise.all([
    sendPushNotification({ token: p.playerToken, title: "🏁 Servicio completado", body: `¿Cómo estuvo ${p.gkName}? Deja tu calificación` }),
    sendPushNotification({ token: p.gkToken,    title: "🏁 Servicio completado", body: `¿Cómo estuvo ${p.playerName}? Deja tu calificación` }),
  ]);
}

export async function notifyNewMessage(p: { recipientToken: string; senderName: string; text: string; serviceId: string }) {
  if (isExpoGo) return;
  await sendPushNotification({ token: p.recipientToken, title: `💬 ${p.senderName}`, body: p.text.length > 60 ? p.text.slice(0, 60) + "…" : p.text, data: { screen: "chat/index", serviceId: p.serviceId } });
}
