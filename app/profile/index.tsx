// app/profile/index.tsx — Pantalla de perfil con saldo, historial y tallas
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../lib/firebase";
import { useAppStore } from "../../store/appStore";

const STATUS_LABEL: Record<string, string> = {
  pending: "⏳ Pendiente de aprobación",
  approved: "✅ Aprobado",
  rejected: "❌ Rechazado",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "#ffa500",
  approved: "#00ff87",
  rejected: "#ff4757",
};

export default function Profile() {
  const router = useRouter();
  const { currentUser, services, logout } = useAppStore();

  const [tab, setTab] = useState<"info" | "historial">("info");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [uploading, setUploading] = useState(false);

  if (!currentUser) return null;

  const isGK = currentUser.role === "goalkeeper";

  // Historial de servicios del usuario
  const myServices = services.filter((s) =>
    isGK ? s.confirmedGkId === currentUser.id : s.playerId === currentUser.id,
  );

  const filterByDate = (svcs: typeof myServices) => {
    return svcs.filter((s) => {
      if (fechaDesde && s.fecha < fechaDesde) return false;
      if (fechaHasta && s.fecha > fechaHasta) return false;
      return true;
    });
  };

  const completed = filterByDate(
    myServices.filter((s) => s.status === "completed"),
  );
  const cancelled = filterByDate(
    myServices.filter((s) => s.status === "cancelled"),
  );
  const totalGanado = completed.reduce((a, s) => a + (s.total || 0), 0);

  // Cambiar foto de perfil
  const changePhoto = async () => {
    Alert.alert("Foto de perfil", "¿Cómo quieres cambiar tu foto?", [
      { text: "Cámara", onPress: () => launchCamera() },
      { text: "Galería", onPress: () => launchGallery() },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      await uploadPhoto(result.assets[0].base64);
    }
  };

  const launchGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      await uploadPhoto(result.assets[0].base64);
    }
  };

  const uploadPhoto = async (base64: string) => {
    setUploading(true);
    try {
      const { auth } = await import("../../lib/firebase");
      const idToken = await auth.currentUser!.getIdToken();
      const bucket = "keepersapp-6b982.firebasestorage.app";
      const path = `profiles/${currentUser.id}.jpg`;
      const encoded = encodeURIComponent(path);
      const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?uploadType=media`;

      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "image/jpeg",
          Authorization: `Bearer ${idToken}`,
        },
        body: bytes,
      });
      if (!res.ok) throw new Error("Error subiendo foto");
      const data = await res.json();
      const photoURL = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media&token=${data.downloadTokens}`;

      await updateDoc(doc(db, "users", currentUser.id), { photoURL });
      Alert.alert("✅", "Foto actualizada correctamente");
    } catch {
      Alert.alert("Error", "No se pudo actualizar la foto");
    } finally {
      setUploading(false);
    }
  };

  const regStatus = currentUser.registrationStatus || "approved";

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <TouchableOpacity
          onPress={() => {
            Alert.alert("Cerrar sesión", "¿Seguro?", [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Salir",
                style: "destructive",
                onPress: async () => {
                  await logout();
                  router.replace("/" as any);
                },
              },
            ]);
          }}
        >
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(["info", "historial"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "info" ? "👤 Información" : "📋 Historial"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* ── INFO ── */}
        {tab === "info" && (
          <View>
            {/* Avatar */}
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={changePhoto} style={styles.avatarWrap}>
                {currentUser.photoURL ? (
                  <Image
                    source={{ uri: currentUser.photoURL }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {currentUser.nombre.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {uploading && (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator color="#00ff87" />
                  </View>
                )}
                <View style={styles.editBadge}>
                  <Text style={styles.editBadgeText}>✏️</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.profileName}>{currentUser.nombre}</Text>
              <Text style={styles.profileRole}>
                {isGK ? "🧤 Portero" : "⚽ Jugador"}
              </Text>
              <Text style={styles.profileCity}>📍 {currentUser.ciudad}</Text>
              {isGK && (
                <View
                  style={[
                    styles.regBadge,
                    { backgroundColor: `${STATUS_COLOR[regStatus]}15` },
                  ]}
                >
                  <Text
                    style={[
                      styles.regBadgeText,
                      { color: STATUS_COLOR[regStatus] },
                    ]}
                  >
                    {STATUS_LABEL[regStatus]}
                  </Text>
                  {regStatus === "rejected" && currentUser.registrationNote && (
                    <Text style={styles.regNote}>
                      Motivo: {currentUser.registrationNote}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Saldo / Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statVal}>
                  ${totalGanado.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Ganado total</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statVal, { color: "#ffa500" }]}>
                  ⭐ {currentUser.rating || 5}
                </Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statVal, { color: "#00aaff" }]}>
                  {completed.length}
                </Text>
                <Text style={styles.statLabel}>Completados</Text>
              </View>
            </View>

            {/* Datos personales */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Datos personales</Text>
              {[
                ["📧 Email", currentUser.email],
                ["📱 Teléfono", currentUser.telefono],
                ["🏦 Banco", currentUser.banco || "—"],
                [
                  "💳 Cuenta",
                  currentUser.numCuenta
                    ? `****${currentUser.numCuenta.slice(-4)}`
                    : "—",
                ],
              ].map(([k, v]) => (
                <View key={k} style={styles.infoRow}>
                  <Text style={styles.infoKey}>{k}</Text>
                  <Text style={styles.infoVal}>{v}</Text>
                </View>
              ))}
            </View>

            {/* Tallas */}
            {isGK ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tallas</Text>
                <View style={styles.tallasGrid}>
                  {[
                    ["Guantes", currentUser.tallaGuantes],
                    ["Guayos", currentUser.tallaGuayos],
                    ["Camisa", currentUser.tallaCamisa],
                    ["Licra", currentUser.tallaLicra],
                    ["Pantaloneta", currentUser.tallaPantaloneta],
                  ].map(([k, v]) =>
                    v ? (
                      <View key={k} style={styles.tallaChip}>
                        <Text style={styles.tallaChipLabel}>{k}</Text>
                        <Text style={styles.tallaChipVal}>{v}</Text>
                      </View>
                    ) : null,
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tallas</Text>
                <View style={styles.tallasGrid}>
                  {[
                    ["Guayos", currentUser.tallaGuayos],
                    ["Camisa", currentUser.tallaCamisa],
                    ["Licra", currentUser.tallaLicra],
                    ["Pantaloneta", currentUser.tallaPantaloneta],
                  ].map(([k, v]) =>
                    v ? (
                      <View key={k} style={styles.tallaChip}>
                        <Text style={styles.tallaChipLabel}>{k}</Text>
                        <Text style={styles.tallaChipVal}>{v}</Text>
                      </View>
                    ) : null,
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── HISTORIAL ── */}
        {tab === "historial" && (
          <View>
            <Text style={styles.sectionTitle}>Filtrar por fecha</Text>
            <View style={styles.filterRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterLabel}>DESDE</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#444"
                  value={fechaDesde}
                  onChangeText={setFechaDesde}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterLabel}>HASTA</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#444"
                  value={fechaHasta}
                  onChangeText={setFechaHasta}
                />
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
              ✅ Completados ({completed.length})
            </Text>
            {completed.length === 0 && (
              <Text style={styles.emptyText}>Sin servicios completados</Text>
            )}
            {completed.map((s) => (
              <View key={s.id} style={styles.histCard}>
                <View style={styles.histRow}>
                  <Text style={styles.histTitle}>
                    {s.tipoPartido} · {s.ciudad}
                  </Text>
                  <Text style={styles.histAmount}>
                    ${(s.total || 0).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.histSub}>
                  📅 {s.fecha} · {s.hora} · {s.horas}h
                </Text>
                <Text style={styles.histSub}>📍 {s.cancha}</Text>
              </View>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
              ❌ Cancelados ({cancelled.length})
            </Text>
            {cancelled.length === 0 && (
              <Text style={styles.emptyText}>Sin servicios cancelados</Text>
            )}
            {cancelled.map((s) => (
              <View
                key={s.id}
                style={[styles.histCard, styles.histCardCancelled]}
              >
                <View style={styles.histRow}>
                  <Text style={styles.histTitle}>
                    {s.tipoPartido} · {s.ciudad}
                  </Text>
                  <Text style={[styles.histAmount, { color: "#ff4757" }]}>
                    Cancelado
                  </Text>
                </View>
                <Text style={styles.histSub}>
                  📅 {s.fecha} · {s.hora}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0f" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e2a",
  },
  backBtn: { padding: 4 },
  backText: { color: "#00ff87", fontSize: 22, fontWeight: "700" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#f0ede8" },
  logoutText: { color: "#555", fontSize: 13 },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e2a",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#00ff87" },
  tabText: { color: "#555", fontSize: 11, fontWeight: "700" },
  tabTextActive: { color: "#00ff87" },
  avatarSection: { alignItems: "center", paddingVertical: 20 },
  avatarWrap: { position: "relative", marginBottom: 12 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "#00ff87",
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#00ff87",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 36, fontWeight: "800", color: "#0a0a0f" },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,.6)",
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#16161f",
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: "#2a2a35",
  },
  editBadgeText: { fontSize: 12 },
  profileName: { fontSize: 20, fontWeight: "800", color: "#f0ede8" },
  profileRole: { fontSize: 13, color: "#555", marginTop: 4 },
  profileCity: { fontSize: 12, color: "#444", marginTop: 2 },
  regBadge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  regBadgeText: { fontWeight: "700", fontSize: 13 },
  regNote: { color: "#ff4757", fontSize: 11, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: "#13131c",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e1e2a",
  },
  statVal: { fontSize: 18, fontWeight: "800", color: "#00ff87" },
  statLabel: { fontSize: 10, color: "#555", marginTop: 4 },
  section: {
    backgroundColor: "#13131c",
    borderRadius: 8,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1e1e2a",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#f0ede8",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a24",
  },
  infoKey: { color: "#555", fontSize: 13 },
  infoVal: { color: "#f0ede8", fontSize: 13, fontWeight: "600" },
  tallasGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tallaChip: {
    backgroundColor: "#16161f",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#2a2a35",
    alignItems: "center",
    minWidth: 70,
  },
  tallaChipLabel: {
    fontSize: 9,
    color: "#555",
    fontWeight: "700",
    letterSpacing: 1,
  },
  tallaChipVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#00ff87",
    marginTop: 2,
  },
  filterRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  filterLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#555",
    letterSpacing: 1,
    marginBottom: 4,
  },
  filterInput: {
    backgroundColor: "#16161f",
    borderWidth: 1,
    borderColor: "#2a2a35",
    color: "#f0ede8",
    padding: 10,
    borderRadius: 4,
    fontSize: 13,
  },
  histCard: {
    backgroundColor: "#13131c",
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e1e2a",
  },
  histCardCancelled: { borderColor: "rgba(255,71,87,.2)" },
  histRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  histTitle: { fontSize: 13, fontWeight: "700", color: "#f0ede8" },
  histAmount: { fontSize: 14, fontWeight: "800", color: "#00ff87" },
  histSub: { fontSize: 11, color: "#555", marginTop: 2 },
  emptyText: { color: "#444", fontSize: 13, marginBottom: 8 },
});
