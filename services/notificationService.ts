// services/notificationService.ts
// Push notifications solo funcionan en APK real (no Expo Go SDK 53+)
import Constants from "expo-constants";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

const isExpoGo = Constants.appOwnership === "expo";

// ── Registrar token push ──────────────────────────────────────────────────────
export async function registerPushToken(userId: string): Promise<string | null> {
  if (isExpoGo) return null;
  try {
    const Notifications = await import("expo-notifications");
    const Device        = await import("expo-device");
    const { Platform }  = await import("react-native");

    if (!Device.default.isDevice) return null;

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
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await updateDoc(doc(db, "users", userId), { pushToken: token });
    return token;
  } catch (e) {
    console.log("Push token registration skipped:", e);
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
async function sendPush(token: string, title: string, body: string, data?: object): Promise<void> {
  if (!token) return;
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ to: token, title, body, data: data || {}, sound: "default", priority: "high" }),
    });
  } catch {}
}

// ── Notificación local (funciona en Expo Go para testing) ─────────────────────
export async function showLocalNotification(title: string, body: string): Promise<void> {
  if (isExpoGo) return; // No-op en Expo Go SDK 53+
  try {
    const Notifications = await import("expo-notifications");
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: "default" },
      trigger: null,
    });
  } catch {}
}

// ── Todas las funciones de notificación ──────────────────────────────────────
export async function notifyNewOffer(playerId: string, gkName: string, amount: number): Promise<void> {
  const token = await getUserPushToken(playerId);
  if (token) await sendPush(token, "🧤 Nueva oferta recibida", `${gkName} quiere ser tu portero por $${amount.toLocaleString()} COP`, { screen: "player/dashboard" });
}

export async function notifyCounterOffer(playerId: string, gkName: string, amount: number): Promise<void> {
  const token = await getUserPushToken(playerId);
  if (token) await sendPush(token, "🔄 Contraoferta recibida", `${gkName} propone $${amount.toLocaleString()} COP`, { screen: "player/dashboard" });
}

export async function notifyOfferAccepted(gkId: string, playerName: string, tipoPartido: string): Promise<void> {
  const token = await getUserPushToken(gkId);
  if (token) await sendPush(token, "✅ ¡Oferta aceptada!", `${playerName} aceptó tu oferta para ${tipoPartido}`, { screen: "goalkeeper/dashboard" });
}

export async function notifyServiceCompletedPlayer(playerId: string): Promise<void> {
  const token = await getUserPushToken(playerId);
  if (token) await sendPush(token, "🏁 Servicio finalizado", "El portero confirmó el pago. ¡Califica tu experiencia!", { screen: "player/dashboard" });
}

export async function notifyServiceCompletedGK(gkId: string, total: number): Promise<void> {
  const token = await getUserPushToken(gkId);
  const comision = Math.round(total * 0.15);
  if (token) await sendPush(token, "🏁 Servicio completado", `Se descontaron $${comision.toLocaleString()} COP de comisión.`, { screen: "profile" });
}

export async function notifyRegistrationStatus(userId: string, approved: boolean, note?: string): Promise<void> {
  const token = await getUserPushToken(userId);
  if (token) await sendPush(token,
    approved ? "✅ Registro aprobado" : "❌ Registro rechazado",
    approved ? "¡Tu cuenta fue aprobada! Ya puedes recibir solicitudes." : `Motivo: ${note || "Ver app"}`,
    { screen: "goalkeeper/dashboard" }
  );
}

export async function notifyRecargaStatus(userId: string, approved: boolean, amount?: number): Promise<void> {
  const token = await getUserPushToken(userId);
  if (token) await sendPush(token,
    approved ? "💰 Recarga aprobada" : "❌ Recarga rechazada",
    approved ? `Se acreditaron $${(amount || 0).toLocaleString()} COP a tu cuenta` : "Comprobante rechazado. Contacta soporte.",
    { screen: "recargar" }
  );
}

export async function notifyNewService(gkId: string, ciudad: string, tipoPartido: string): Promise<void> {
  const token = await getUserPushToken(gkId);
  if (token) await sendPush(token, "⚽ Nueva solicitud disponible", `${tipoPartido} en ${ciudad}`, { screen: "goalkeeper/dashboard" });
}
