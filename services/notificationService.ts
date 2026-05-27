// services/notificationService.ts
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

const isExpoGo = Constants.appOwnership === "expo";

// Configurar handler de notificaciones — mostrar aunque la app esté abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

// ── Registrar token push ──────────────────────────────────────────────────────
export async function registerPushToken(userId: string): Promise<string | null> {
  if (isExpoGo) return null;
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("keepers-default", {
      name:             "Keepers",
      importance:       Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       "#00ff87",
      sound:            "default",
      enableVibrate:    true,
    });
    await Notifications.setNotificationChannelAsync("keepers-offers", {
      name:             "Ofertas",
      importance:       Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500],
      lightColor:       "#ffa500",
      sound:            "default",
    });
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;
    await updateDoc(doc(db, "users", userId), { pushToken: token });
    return token;
  } catch {
    return null;
  }
}

// ── Obtener token de usuario ──────────────────────────────────────────────────
export async function getUserPushToken(userId: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, "users", userId));
    if (!snap.exists()) return null;
    return snap.data().pushToken || null;
  } catch { return null; }
}

// ── Enviar push via Expo ──────────────────────────────────────────────────────
async function sendPush(
  token:    string,
  title:    string,
  body:     string,
  data?:    object,
  channel?: string,
): Promise<void> {
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        to:           token,
        title,
        body,
        data:         data || {},
        sound:        "default",
        channelId:    channel || "keepers-default",
        priority:     "high",
        ttl:          3600,
      }),
    });
  } catch (e) { console.error("Push error:", e); }
}

// ── PORTERO: nueva solicitud disponible ──────────────────────────────────────
export async function notifyNewService(gkId: string, ciudad: string, tipoPartido: string): Promise<void> {
  const token = await getUserPushToken(gkId);
  if (!token) return;
  await sendPush(token,
    "⚽ Nueva solicitud disponible",
    `${tipoPartido} en ${ciudad} — ¡Envía tu oferta!`,
    { screen: "goalkeeper/dashboard", tab: "available" },
    "keepers-offers"
  );
}

// ── PORTERO: jugador aceptó oferta ───────────────────────────────────────────
export async function notifyOfferAccepted(gkId: string, playerName: string, tipoPartido: string): Promise<void> {
  const token = await getUserPushToken(gkId);
  if (!token) return;
  await sendPush(token,
    "✅ ¡Oferta aceptada!",
    `${playerName} aceptó tu oferta para ${tipoPartido}`,
    { screen: "goalkeeper/dashboard", tab: "confirmed" },
    "keepers-offers"
  );
}

// ── PORTERO: servicio finalizado ─────────────────────────────────────────────
export async function notifyServiceCompletedGK(gkId: string, total: number): Promise<void> {
  const token = await getUserPushToken(gkId);
  if (!token) return;
  const comision = Math.round(total * 0.15);
  await sendPush(token,
    "🏁 Servicio completado",
    `Se descontaron $${comision.toLocaleString()} COP de comisión. ¡Gracias!`,
    { screen: "profile" }
  );
}

// ── JUGADOR: portero envió contraoferta ──────────────────────────────────────
export async function notifyCounterOffer(playerId: string, gkName: string, amount: number): Promise<void> {
  const token = await getUserPushToken(playerId);
  if (!token) return;
  await sendPush(token,
    "🔄 Contraoferta recibida",
    `${gkName} propone $${amount.toLocaleString()} COP — ¡Revisa y responde!`,
    { screen: "player/dashboard", tab: "svcs" },
    "keepers-offers"
  );
}

// ── JUGADOR: portero envió oferta directa ────────────────────────────────────
export async function notifyNewOffer(playerId: string, gkName: string, amount: number): Promise<void> {
  const token = await getUserPushToken(playerId);
  if (!token) return;
  await sendPush(token,
    "🧤 Nueva oferta recibida",
    `${gkName} quiere ser tu portero por $${amount.toLocaleString()} COP`,
    { screen: "player/dashboard", tab: "svcs" },
    "keepers-offers"
  );
}

// ── JUGADOR: servicio confirmado por portero ─────────────────────────────────
export async function notifyServiceConfirmed(playerId: string, gkName: string): Promise<void> {
  const token = await getUserPushToken(playerId);
  if (!token) return;
  await sendPush(token,
    "✅ Portero confirmado",
    `${gkName} confirmó el servicio. Puedes seguirlo en el mapa.`,
    { screen: "player/dashboard", tab: "svcs" }
  );
}

// ── JUGADOR: servicio finalizado ─────────────────────────────────────────────
export async function notifyServiceCompletedPlayer(playerId: string): Promise<void> {
  const token = await getUserPushToken(playerId);
  if (!token) return;
  await sendPush(token,
    "🏁 Servicio finalizado",
    "El portero confirmó el pago. ¡Califica tu experiencia!",
    { screen: "player/dashboard", tab: "svcs" }
  );
}

// ── PORTERO/JUGADOR: registro aprobado/rechazado ─────────────────────────────
export async function notifyRegistrationStatus(userId: string, approved: boolean, note?: string): Promise<void> {
  const token = await getUserPushToken(userId);
  if (!token) return;
  await sendPush(token,
    approved ? "✅ Registro aprobado" : "❌ Registro rechazado",
    approved
      ? "¡Tu cuenta fue aprobada! Ya puedes recibir solicitudes."
      : `Tu registro fue rechazado. Motivo: ${note || "Ver app para más detalles"}`,
    { screen: "goalkeeper/dashboard" }
  );
}

// ── PORTERO: recarga aprobada/rechazada ──────────────────────────────────────
export async function notifyRecargaStatus(userId: string, approved: boolean, amount?: number): Promise<void> {
  const token = await getUserPushToken(userId);
  if (!token) return;
  await sendPush(token,
    approved ? "💰 Recarga aprobada" : "❌ Recarga rechazada",
    approved
      ? `Se acreditaron $${(amount || 0).toLocaleString()} COP a tu cuenta`
      : "Tu solicitud de recarga fue rechazada. Contacta soporte.",
    { screen: "recargar" }
  );
}

// ── Notificación local (in-app, funciona en Expo Go) ─────────────────────────
export async function showLocalNotification(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: "default",
      },
      trigger: null,
    });
  } catch {}
}
