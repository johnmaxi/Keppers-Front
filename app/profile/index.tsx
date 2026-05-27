// app/profile/index.tsx
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator, TextInput,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAppStore } from "../../store/appStore";
import { listenMovements } from "../../services/walletService";

const STATUS_LABEL: Record<string, string> = {
  pending:  "⏳ Pendiente de aprobación",
  approved: "✅ Aprobado",
  rejected: "❌ Rechazado",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "#ffa500", approved: "#00ff87", rejected: "#ff4757",
};

export default function ProfileScreen() {
  const router = useRouter();
  const { currentUser, services, logout } = useAppStore();
  const [tab,        setTab]        = useState<"info"|"historial">("info");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [uploading,  setUploading]  = useState(false);
  const [notification, setNotification] = useState<any>(null);
  const [movements,    setMovements]    = useState<any[]>([]);
  const [saldo,        setSaldo]        = useState<number>(0);

  // Cargar movimientos y saldo del portero
  useEffect(() => {
    if (!currentUser || currentUser.role !== "goalkeeper") return;
    const unsub = listenMovements(currentUser.id, setMovements);
    return () => unsub();
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    setSaldo((currentUser as any).saldo || 0);
  }, [currentUser]);

  // Verificar si hay notificación pendiente del admin
  useEffect(() => {
    if (!currentUser) return;
    const n = (currentUser as any).adminNotification;
    if (n && !n.readAt) setNotification(n);
  }, [currentUser]);

  const dismissNotification = async () => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.id), {
        "adminNotification.readAt": Date.now(),
      });
    } catch {}
    setNotification(null);
  };

  const goBack = () => {
    if (currentUser?.role === "player") {
      router.replace("/player/dashboard" as any);
    } else if (currentUser?.role === "admin") {
      router.replace("/admin/dashboard" as any);
    } else {
      router.replace("/goalkeeper/dashboard" as any);
    }
  };

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: async () => {
          await logout();
          router.replace("/" as any);
      }},
    ]);
  };

  const changePhoto = () => {
    Alert.alert("Foto de perfil", "¿Cómo quieres cambiar tu foto?", [
      { text: "📸 Cámara",  onPress: () => launchCamera() },
      { text: "🖼️ Galería", onPress: () => launchGallery() },
      { text: "Cancelar",   style: "cancel" },
    ]);
  };

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1,1], quality: 0.7, base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64)
      await uploadPhoto(result.assets[0].base64);
  };

  const launchGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true, aspect: [1,1], quality: 0.7, base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64)
      await uploadPhoto(result.assets[0].base64);
  };

  const uploadPhoto = async (base64: string) => {
    if (!currentUser) return;
    setUploading(true);
    try {
      const { auth } = await import("../../lib/firebase");
      const idToken = await auth.currentUser!.getIdToken();
      const bucket  = "keepersapp-6b982.firebasestorage.app";
      const path    = `profiles/${currentUser.id}.jpg`;
      const encoded = encodeURIComponent(path);
      const url     = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?uploadType=media`;

      const binary = atob(base64);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg", "Authorization": `Bearer ${idToken}` },
        body: bytes,
      });
      if (!res.ok) throw new Error(`Storage error ${res.status}`);
      const data     = await res.json();
      const photoURL = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media&token=${data.downloadTokens}`;
      await updateDoc(doc(db, "users", currentUser.id), { photoURL });
      Alert.alert("✅", "Foto actualizada");
    } catch (e: any) {
      Alert.alert("Error", e.message || "No se pudo actualizar la foto");
    } finally {
      setUploading(false);
    }
  };

  if (!currentUser) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#00ff87" />
      </View>
    );
  }

  const isGK       = currentUser.role === "goalkeeper";
  const myServices = services.filter((s) =>
    isGK ? s.confirmedGkId === currentUser.id : s.playerId === currentUser.id
  );
  const filterByDate = (svcs: typeof myServices) => svcs.filter((s) => {
    if (fechaDesde && s.fecha < fechaDesde) return false;
    if (fechaHasta && s.fecha > fechaHasta) return false;
    return true;
  });
  const completed   = filterByDate(myServices.filter((s) => s.status === "completed"));
  const cancelled   = filterByDate(myServices.filter((s) => s.status === "cancelled"));
  const totalGanado = completed.reduce((a, s) => a + (s.total || 0), 0);
  const regStatus   = (currentUser as any).registrationStatus || "approved";

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Notificación admin pendiente */}
      {notification && (
        <View style={[styles.notifBanner, { backgroundColor: notification.type === "approved" ? "rgba(0,255,135,.1)" : "rgba(255,71,87,.1)" }]}>
          <Text style={[styles.notifText, { color: notification.type === "approved" ? "#00ff87" : "#ff4757" }]}>
            {notification.message}
          </Text>
          <TouchableOpacity onPress={dismissNotification} style={styles.notifClose}>
            <Text style={styles.notifCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {(["info","historial"] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "info" ? "👤 Información" : "📋 Historial"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

        {tab === "info" && (
          <View>
            {/* Avatar */}
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={changePhoto} style={styles.avatarWrap}>
                {currentUser.photoURL ? (
                  <Image source={{ uri: currentUser.photoURL }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>{currentUser.nombre?.charAt(0)?.toUpperCase() || "?"}</Text>
                  </View>
                )}
                {uploading && (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator color="#00ff87" />
                  </View>
                )}
                <View style={styles.editBadge}><Text>✏️</Text></View>
              </TouchableOpacity>
              <Text style={styles.profileName}>{currentUser.nombre}</Text>
              <Text style={styles.profileRole}>{isGK ? "🧤 Portero" : "⚽ Jugador"}</Text>
              <Text style={styles.profileCity}>📍 {currentUser.ciudad}</Text>

              {isGK && (
                <View style={[styles.regBadge, { backgroundColor: `${STATUS_COLOR[regStatus]}15` }]}>
                  <Text style={[styles.regBadgeText, { color: STATUS_COLOR[regStatus] }]}>
                    {STATUS_LABEL[regStatus]}
                  </Text>
                  {regStatus === "rejected" && (currentUser as any).registrationNote && (
                    <Text style={styles.regNote}>Motivo: {(currentUser as any).registrationNote}</Text>
                  )}
                </View>
              )}
            </View>

            {/* Stats */}
            {/* Saldo para portero */}
            {isGK && (
              <View style={styles.saldoCard}>
                <View>
                  <Text style={styles.saldoLabel}>SALDO EN CUENTA</Text>
                  <Text style={[styles.saldoMonto, { color: saldo < 0 ? "#ff4757" : "#00ff87" }]}>
            {saldo < 0 ? "-$" + Math.abs(saldo).toLocaleString() : "$" + saldo.toLocaleString()} COP
          </Text>
                  <Text style={[styles.saldoHint, { color: saldo < -5000 ? "#ff4757" : "#444" }]}>
                    {saldo < -5000 ? "⚠️ Cuenta bloqueada — recarga para recibir servicios" : "Se descuenta 15% por servicio completado"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.recargarBtn}
                  onPress={() => router.push("/recargar" as any)}>
                  <Text style={styles.recargarBtnText}>+ Recargar</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statVal}>${totalGanado.toLocaleString()}</Text>
                <Text style={styles.statLabel}>{isGK ? "Ganado" : "Total pagado"}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statVal, { color: "#ffa500" }]}>⭐ {currentUser.rating || 5}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statVal, { color: "#00aaff" }]}>{completed.length}</Text>
                <Text style={styles.statLabel}>Servicios</Text>
              </View>
            </View>

            {/* Datos */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Datos personales</Text>
              {[
                ["📧 Email",    currentUser.email],
                ["📱 Teléfono", currentUser.telefono || "—"],
                ["🏦 Banco",    currentUser.banco    || "—"],
                ["💳 Cuenta",   currentUser.numCuenta ? `****${currentUser.numCuenta.slice(-4)}` : "—"],
              ].map(([k,v]) => (
                <View key={k} style={styles.infoRow}>
                  <Text style={styles.infoKey}>{k}</Text>
                  <Text style={styles.infoVal}>{v}</Text>
                </View>
              ))}
            </View>

            {/* Tallas */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tallas</Text>
              <View style={styles.tallasGrid}>
                {(isGK ? [
                  ["Guantes",     (currentUser as any).tallaGuantes],
                  ["Guayos",      (currentUser as any).tallaGuayos],
                  ["Camisa",      (currentUser as any).tallaCamisa],
                  ["Licra",       (currentUser as any).tallaLicra],
                  ["Pantaloneta", (currentUser as any).tallaPantaloneta],
                ] : [
                  ["Guayos",      (currentUser as any).tallaGuayos],
                  ["Camisa",      (currentUser as any).tallaCamisa],
                  ["Licra",       (currentUser as any).tallaLicra],
                  ["Pantaloneta", (currentUser as any).tallaPantaloneta],
                ]).filter(([,v]) => v).map(([k,v]) => (
                  <View key={k} style={styles.tallaChip}>
                    <Text style={styles.tallaChipLabel}>{k}</Text>
                    <Text style={styles.tallaChipVal}>{v}</Text>
                  </View>
                ))}
                {!isGK && !(currentUser as any).tallaGuayos && (
                  <Text style={styles.noTallas}>Sin tallas registradas</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {tab === "historial" && (
          <View>
            <Text style={styles.sectionTitle}>Filtrar por fecha</Text>
            <View style={styles.filterRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterLabel}>DESDE</Text>
                <TextInput style={styles.filterInput} placeholder="YYYY-MM-DD"
                  placeholderTextColor="#444" value={fechaDesde} onChangeText={setFechaDesde} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterLabel}>HASTA</Text>
                <TextInput style={styles.filterInput} placeholder="YYYY-MM-DD"
                  placeholderTextColor="#444" value={fechaHasta} onChangeText={setFechaHasta} />
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>✅ Completados ({completed.length})</Text>
            {completed.length === 0 && <Text style={styles.emptyText}>Sin servicios completados</Text>}
            {completed.map((s) => (
              <View key={s.id} style={styles.histCard}>
                <View style={styles.histRow}>
                  <Text style={styles.histTitle}>{s.tipoPartido} · {s.ciudad}</Text>
                  <Text style={styles.histAmount}>${(s.total||0).toLocaleString()}</Text>
                </View>
                <Text style={styles.histSub}>📅 {s.fecha} · {s.hora} · {s.horas}h</Text>
                <Text style={styles.histSub}>📍 {s.cancha}</Text>
              </View>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>❌ Cancelados ({cancelled.length})</Text>
            {cancelled.length === 0 && <Text style={styles.emptyText}>Sin cancelados</Text>}
            {cancelled.map((s) => (
              <View key={s.id} style={[styles.histCard, styles.histCardCancelled]}>
                <View style={styles.histRow}>
                  <Text style={styles.histTitle}>{s.tipoPartido} · {s.ciudad}</Text>
                  <Text style={[styles.histAmount, { color: "#ff4757" }]}>Cancelado</Text>
                </View>
                <Text style={styles.histSub}>📅 {s.fecha} · {s.hora}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:              { flex: 1, backgroundColor: "#0a0a0f" },
  center:            { flex: 1, backgroundColor: "#0a0a0f", alignItems: "center", justifyContent: "center" },
  header:            { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#1e1e2a" },
  backBtn:           { padding: 4 },
  backText:          { color: "#00ff87", fontSize: 22, fontWeight: "700" },
  headerTitle:       { fontSize: 17, fontWeight: "800", color: "#f0ede8" },
  logoutBtn:         { borderWidth: 1, borderColor: "#2a2a35", borderRadius: 4, paddingHorizontal: 10, paddingVertical: 5 },
  logoutText:        { color: "#888", fontSize: 12 },
  notifBanner:       { flexDirection: "row", alignItems: "center", margin: 12, padding: 14, borderRadius: 8, gap: 10 },
  notifText:         { flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  notifClose:        { padding: 4 },
  notifCloseText:    { color: "#888", fontSize: 16 },
  tabs:              { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1e1e2a" },
  tab:               { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive:         { borderBottomColor: "#00ff87" },
  tabText:           { color: "#555", fontSize: 11, fontWeight: "700" },
  tabTextActive:     { color: "#00ff87" },
  avatarSection:     { alignItems: "center", paddingVertical: 20 },
  avatarWrap:        { position: "relative", marginBottom: 12 },
  avatar:            { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: "#00ff87" },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#00ff87", alignItems: "center", justifyContent: "center" },
  avatarInitial:     { fontSize: 36, fontWeight: "800", color: "#0a0a0f" },
  avatarOverlay:     { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,.6)", borderRadius: 45, alignItems: "center", justifyContent: "center" },
  editBadge:         { position: "absolute", bottom: 0, right: 0, backgroundColor: "#16161f", borderRadius: 12, padding: 4, borderWidth: 1, borderColor: "#2a2a35" },
  profileName:       { fontSize: 20, fontWeight: "800", color: "#f0ede8" },
  profileRole:       { fontSize: 13, color: "#555", marginTop: 4 },
  profileCity:       { fontSize: 12, color: "#444", marginTop: 2 },
  regBadge:          { marginTop: 10, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  regBadgeText:      { fontWeight: "700", fontSize: 13 },
  regNote:           { color: "#ff4757", fontSize: 11, marginTop: 4 },
  statsRow:          { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard:          { flex: 1, backgroundColor: "#13131c", borderRadius: 8, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#1e1e2a" },
  statVal:           { fontSize: 18, fontWeight: "800", color: "#00ff87" },
  statLabel:         { fontSize: 10, color: "#555", marginTop: 4 },
  section:           { backgroundColor: "#13131c", borderRadius: 8, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#1e1e2a" },
  sectionTitle:      { fontSize: 14, fontWeight: "800", color: "#f0ede8", marginBottom: 12 },
  infoRow:           { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1a1a24" },
  infoKey:           { color: "#555", fontSize: 13 },
  infoVal:           { color: "#f0ede8", fontSize: 13, fontWeight: "600" },
  tallasGrid:        { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tallaChip:         { backgroundColor: "#16161f", borderRadius: 8, padding: 10, alignItems: "center", minWidth: 70, borderWidth: 1, borderColor: "#2a2a35" },
  tallaChipLabel:    { fontSize: 9, color: "#555", fontWeight: "700", letterSpacing: 1 },
  tallaChipVal:      { fontSize: 16, fontWeight: "800", color: "#00ff87", marginTop: 2 },
  noTallas:          { color: "#444", fontSize: 12 },
  filterRow:         { flexDirection: "row", gap: 12, marginBottom: 8 },
  filterLabel:       { fontSize: 9, fontWeight: "700", color: "#555", letterSpacing: 1, marginBottom: 4 },
  filterInput:       { backgroundColor: "#16161f", borderWidth: 1, borderColor: "#2a2a35", color: "#f0ede8", padding: 10, borderRadius: 4, fontSize: 13 },
  histCard:          { backgroundColor: "#13131c", borderRadius: 8, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#1e1e2a" },
  histCardCancelled: { borderColor: "rgba(255,71,87,.2)" },
  histRow:           { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  histTitle:         { fontSize: 13, fontWeight: "700", color: "#f0ede8" },
  histAmount:        { fontSize: 14, fontWeight: "800", color: "#00ff87" },
  histSub:           { fontSize: 11, color: "#555", marginTop: 2 },
  saldoCard:         { backgroundColor: "#13131c", borderRadius: 10, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "rgba(0,255,135,.3)", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  saldoLabel:        { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, color: "#555", marginBottom: 4 },
  saldoMonto:        { fontSize: 24, fontWeight: "800", color: "#00ff87" },
  saldoHint:         { fontSize: 10, color: "#444", marginTop: 2 },
  recargarBtn:       { backgroundColor: "#00ff87", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  recargarBtnText:   { color: "#0a0a0f", fontWeight: "800", fontSize: 13 },
  emptyText:         { color: "#444", fontSize: 13, marginBottom: 8 },
});