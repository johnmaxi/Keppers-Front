// services/notificationService.ts
// Push notifications solo funcionan en APK real (no Expo Go SDK 53+)
import Constants from "expo-constants";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

const isExpoGo = Constants.appOwnership === "expo";

// ── Registrar token push ──────────────────────────────────────────────────────
export async function registerPushToken(userId: string): Promise<string | null> {
  if (isExpoGo) {
    console.log("Expo Go: push notifications not supported");
    return null;
  }
  try {
    const Notifications = await import("expo-notifications");
    const Device        = await import("expo-device");
    const { Platform }  = await import("react-native");

    console.log("Registering push token for user:", userId);
    console.log("Is device:", Device.default.isDevice);

    if (!Device.default.isDevice) {
      console.log("Not a physical device, skipping push token");
      return null;
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    console.log("Current permission status:", existing);
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log("New permission status:", status);
    }
    if (finalStatus !== "granted") {
      console.log("Push permission denied");
      return null;
    }

    if (Platform.OS === "android") {
      const channels = [
        { id: "keepers-default",     name: "Keepers General",    sound: "default",          importance: Notifications.AndroidImportance.MAX },
        { id: "keepers-solicitud",   name: "Nuevas Solicitudes", sound: "nueva_solicitud",  importance: Notifications.AndroidImportance.MAX },
        { id: "keepers-oferta",      name: "Ofertas",            sound: "oferta_recibida",  importance: Notifications.AndroidImportance.HIGH },
        { id: "keepers-contraoferta",name: "Contraofertas",      sound: "contraoferta",     importance: Notifications.AndroidImportance.HIGH },
        { id: "keepers-aceptado",    name: "Aceptados",          sound: "aceptado",         importance: Notifications.AndroidImportance.MAX },
        { id: "keepers-completado",  name: "Completados",        sound: "completado",       importance: Notifications.AndroidImportance.HIGH },
        { id: "keepers-aprobado",    name: "Aprobaciones",       sound: "aprobado",         importance: Notifications.AndroidImportance.MAX },
        { id: "keepers-rechazado",   name: "Rechazos",           sound: "rechazado",        importance: Notifications.AndroidImportance.HIGH },
        { id: "keepers-recarga",     name: "Recargas",           sound: "recarga",          importance: Notifications.AndroidImportance.MAX },
      ];
      for (const ch of channels) {
        await Notifications.setNotificationChannelAsync(ch.id, {
          name:             ch.name,
          importance:       ch.importance,
          vibrationPattern: [0, 250, 250, 250],
          lightColor:       "#00ff87",
          sound:            ch.sound,
          enableVibrate:    true,
        });
      }
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    console.log("Using projectId:", projectId);

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    console.log("Got push token:", token?.substring(0, 30) + "...");

    await updateDoc(doc(db, "users", userId), { pushToken: token });
    console.log("Push token saved to Firestore ✅");
    return token;
  } catch (e) {
    console.error("Push token registration FAILED:", e);
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
  token:     string,
  title:     string,
  body:      string,
  data?:     object,
  sound?:    string,
  channelId?: string,
): Promise<void> {
  if (!token) return;
  try {
    const payload: any = {
      to:         token,
      title,
      body,
      data:       data || {},
      sound:      sound || "default",
      priority:   "high",
      channelId:  channelId || "keepers-default",
      ttl:        3600,
      badge:      1,
    };
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Accept":        "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (result?.data?.status === "error") {
      console.error("Push error:", result.data.message);
    }
  } catch (e) { console.error("sendPush error:", e); }
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
  if (token) await sendPush(token, "🧤 Nueva oferta recibida", `${gkName} quiere ser tu portero por $${amount.toLocaleString()} COP`, { screen: "player/dashboard" }, "oferta_recibida", "keepers-oferta");
}

export async function notifyCounterOffer(playerId: string, gkName: string, amount: number): Promise<void> {
  const token = await getUserPushToken(playerId);
  if (token) await sendPush(token, "🔄 Contraoferta recibida", `${gkName} propone $${amount.toLocaleString()} COP`, { screen: "player/dashboard" }, "contraoferta", "keepers-contraoferta");
}

export async function notifyOfferAccepted(gkId: string, playerName: string, tipoPartido: string): Promise<void> {
  const token = await getUserPushToken(gkId);
  if (token) await sendPush(token, "✅ ¡Oferta aceptada!", `${playerName} aceptó tu oferta para ${tipoPartido}`, { screen: "goalkeeper/dashboard" }, "aceptado", "keepers-aceptado");
}

export async function notifyServiceCompletedPlayer(playerId: string): Promise<void> {
  const token = await getUserPushToken(playerId);
  if (token) await sendPush(token, "🏁 Servicio finalizado", "El portero confirmó el pago. ¡Califica tu experiencia!", { screen: "player/dashboard" }, "completado", "keepers-completado");
}

export async function notifyServiceCompletedGK(gkId: string, total: number): Promise<void> {
  const token = await getUserPushToken(gkId);
  const comision = Math.round(total * 0.15);
  if (token) await sendPush(token, "🏁 Servicio completado", `Se descontaron $${comision.toLocaleString()} COP de comisión.`, { screen: "profile" }, "completado", "keepers-completado");
}

export async function notifyRegistrationStatus(userId: string, approved: boolean, note?: string): Promise<void> {
  const token = await getUserPushToken(userId);
  if (token) await sendPush(token,
    approved ? "✅ Registro aprobado" : "❌ Registro rechazado",
    approved ? "¡Tu cuenta fue aprobada! Ya puedes recibir solicitudes." : `Motivo: ${note || "Ver app"}`,
    { screen: "goalkeeper/dashboard" }, approved ? "aprobado" : "rechazado", approved ? "keepers-aprobado" : "keepers-rechazado"
  );
}

export async function notifyRecargaStatus(userId: string, approved: boolean, amount?: number): Promise<void> {
  const token = await getUserPushToken(userId);
  if (token) await sendPush(token,
    approved ? "💰 Recarga aprobada" : "❌ Recarga rechazada",
    approved ? `Se acreditaron $${(amount || 0).toLocaleString()} COP a tu cuenta` : "Comprobante rechazado. Contacta soporte.",
    { screen: "recargar" }, approved ? "recarga" : "rechazado", approved ? "keepers-recarga" : "keepers-rechazado"
  );
}

export async function notifyNewService(gkId: string, ciudad: string, tipoPartido: string): Promise<void> {
  const token = await getUserPushToken(gkId);
  if (token) await sendPush(token, "⚽ Nueva solicitud disponible", `${tipoPartido} en ${ciudad}`, { screen: "goalkeeper/dashboard" }, "nueva_solicitud", "keepers-solicitud");
}
