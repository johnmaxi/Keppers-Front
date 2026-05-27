// app/admin/dashboard.tsx
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Image, TextInput, Modal, Linking,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, orderBy,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAppStore } from "../../store/appStore";
import {
  listenRecargas, aprobarRecarga, rechazarRecarga,
} from "../../services/walletService";

interface PendingUser {
  id: string; nombre: string; email: string; ciudad: string;
  cedula: string; cedulaURL: string | null; photoURL: string | null;
  createdAt: any; registrationStatus: string; registrationNote?: string;
  tallaGuantes?: string; tallaGuayos?: string; tallaCamisa?: string;
  tallaLicra?: string; tallaPantaloneta?: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { currentUser, logout } = useAppStore();

  const [mainTab,  setMainTab]  = useState<"porteros"|"recargas">("porteros");
  const [tab,      setTab]      = useState<"pending"|"approved"|"rejected">("pending");
  const [users,    setUsers]    = useState<PendingUser[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<PendingUser | null>(null);
  const [note,     setNote]     = useState("");
  const [acting,   setActing]   = useState(false);
  const [recargas, setRecargas] = useState<any[]>([]);

  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      router.replace("/player/dashboard" as any);
    }
  }, [currentUser]);

  // Porteros
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "users"),
      where("role", "==", "goalkeeper"),
      where("registrationStatus", "==", tab),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PendingUser));
      setLoading(false);
    });
    return () => unsub();
  }, [tab]);

  // Recargas pendientes
  useEffect(() => {
    const unsub = listenRecargas("pending", setRecargas);
    return () => unsub();
  }, []);

  const approve = async (user: PendingUser) => {
    setActing(true);
    try {
      const { auth } = await import("../../lib/firebase");
      await auth.currentUser?.getIdToken(true);
      await updateDoc(doc(db, "users", user.id), {
        registrationStatus: "approved",
        registrationNote:   "",
        disponible:         true,
        adminNotification: {
          type: "approved",
          message: "¡Tu registro fue aprobado! Ya puedes recibir solicitudes.",
          readAt: null,
          createdAt: Date.now(),
        },
      });
      Alert.alert("✅", `${user.nombre} aprobado`);
      setSelected(null);
    } catch (e: any) {
      Alert.alert("Error", `${e?.code}: ${e?.message}`);
    } finally {
      setActing(false);
    }
  };

  const reject = async (user: PendingUser) => {
    if (!note.trim()) { Alert.alert("Error", "Escribe el motivo del rechazo"); return; }
    setActing(true);
    try {
      const { auth } = await import("../../lib/firebase");
      await auth.currentUser?.getIdToken(true);
      await updateDoc(doc(db, "users", user.id), {
        registrationStatus: "rejected",
        registrationNote:   note.trim(),
        disponible:         false,
        adminNotification: {
          type: "rejected",
          message: `Tu registro fue rechazado. Motivo: ${note.trim()}`,
          readAt: null,
          createdAt: Date.now(),
        },
      });
      Alert.alert("❌", `${user.nombre} rechazado`);
      setSelected(null);
      setNote("");
    } catch (e: any) {
      Alert.alert("Error", `${e?.code}: ${e?.message}`);
    } finally {
      setActing(false);
    }
  };

  const handleAprobarRecarga = (r: any) => {
    Alert.alert(
      "Aprobar recarga",
      `¿Aprobar $${r.amount?.toLocaleString()} COP para ${r.userName}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "✅ Aprobar", onPress: async () => {
          try {
            await aprobarRecarga(r.id, r.userId, r.amount);
            Alert.alert("✅", `Recarga de $${r.amount?.toLocaleString()} aprobada`);
          } catch (e: any) { Alert.alert("Error", e.message); }
        }},
      ]
    );
  };

  const handleRechazarRecarga = (r: any) => {
    Alert.alert(
      "Rechazar recarga",
      "¿Rechazar esta solicitud de recarga?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "❌ Rechazar", style: "destructive", onPress: async () => {
          try {
            await rechazarRecarga(r.id, "Comprobante inválido o insuficiente");
            Alert.alert("❌", "Recarga rechazada");
          } catch (e: any) { Alert.alert("Error", e.message); }
        }},
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert("Salir", "¿Cerrar sesión?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: () => { logout(); router.replace("/" as any); } },
    ]);
  };

  const TABS = [
    { key: "pending",  label: "Pendientes", color: "#ffa500" },
    { key: "approved", label: "Aprobados",  color: "#00ff87" },
    { key: "rejected", label: "Rechazados", color: "#ff4757" },
  ] as const;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🛡️ Admin Keeperz</Text>
          <Text style={styles.headerSub}>Panel de administración</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Main tabs */}
      <View style={styles.mainTabs}>
        <TouchableOpacity
          style={[styles.mainTab, mainTab === "porteros" && styles.mainTabActive]}
          onPress={() => setMainTab("porteros")}>
          <Text style={[styles.mainTabText, mainTab === "porteros" && styles.mainTabTextActive]}>
            🧤 Porteros
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTab, mainTab === "recargas" && styles.mainTabActive]}
          onPress={() => setMainTab("recargas")}>
          <Text style={[styles.mainTabText, mainTab === "recargas" && styles.mainTabTextActive]}>
            💰 Recargas{recargas.length > 0 ? ` (${recargas.length})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── PORTEROS ── */}
      {mainTab === "porteros" && (
        <>
          <View style={styles.tabs}>
            {TABS.map((t) => (
              <TouchableOpacity key={t.key}
                style={[styles.tab, tab === t.key && { borderBottomColor: t.color }]}
                onPress={() => { setTab(t.key); setLoading(true); }}>
                <Text style={[styles.tabText, tab === t.key && { color: t.color }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <View style={styles.center}><ActivityIndicator color="#00ff87" size="large" /></View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              {users.length === 0 && (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>Sin porteros {tab === "pending" ? "pendientes" : tab === "approved" ? "aprobados" : "rechazados"}</Text>
                </View>
              )}
              {users.map((u) => (
                <TouchableOpacity key={u.id} style={styles.card}
                  onPress={() => { setSelected(u); setNote(""); }}>
                  <View style={styles.cardRow}>
                    {u.photoURL
                      ? <Image source={{ uri: u.photoURL }} style={styles.avatar} />
                      : <View style={styles.avatarPlaceholder}>
                          <Text style={styles.avatarInitial}>{u.nombre.charAt(0)}</Text>
                        </View>
                    }
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>{u.nombre}</Text>
                      <Text style={styles.userSub}>📧 {u.email}</Text>
                      <Text style={styles.userSub}>📍 {u.ciudad}</Text>
                      <Text style={styles.userSub}>🪪 CC: {u.cedula || "No ingresada"}</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </View>
                  {u.registrationNote ? (
                    <Text style={styles.rejectNote}>Motivo: {u.registrationNote}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </>
      )}

      {/* ── RECARGAS ── */}
      {mainTab === "recargas" && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {recargas.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Sin recargas pendientes ✅</Text>
            </View>
          )}
          {recargas.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{r.userName}</Text>
                  <Text style={[styles.userSub, { color: "#00ff87", fontSize: 16, fontWeight: "700" }]}>
                    ${r.amount?.toLocaleString()} COP
                  </Text>
                  <Text style={styles.userSub}>
                    📅 {r.createdAt?.toDate?.()?.toLocaleDateString("es-CO") || "—"}
                  </Text>
                  {r.nota ? <Text style={styles.userSub}>📝 {r.nota}</Text> : null}
                </View>
                {r.proofURL && (
                  <TouchableOpacity
                    style={styles.viewProofBtn}
                    onPress={() => Linking.openURL(r.proofURL)}>
                    <Text style={styles.viewProofText}>Ver comprobante</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.btnApprove} onPress={() => handleAprobarRecarga(r)}>
                  <Text style={styles.btnApproveText}>✅ Aprobar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnReject} onPress={() => handleRechazarRecarga(r)}>
                  <Text style={styles.btnRejectText}>❌ Rechazar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Modal detalle portero ── */}
      <Modal visible={!!selected} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {selected && (
              <ScrollView>
                <Text style={styles.modalTitle}>{selected.nombre}</Text>
                <Text style={styles.modalSub}>{selected.email} · {selected.ciudad}</Text>
                <Text style={styles.modalSub}>CC: {selected.cedula || "—"}</Text>

                {selected.photoURL && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>FOTO DE PERFIL</Text>
                    <Image source={{ uri: selected.photoURL }} style={styles.modalPhoto} />
                  </View>
                )}

                {selected.cedulaURL ? (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>DOCUMENTO CÉDULA</Text>
                    <TouchableOpacity
                      style={styles.viewDocBtn}
                      onPress={() => Linking.openURL(selected.cedulaURL!)}>
                      <Text style={styles.viewDocIcon}>📄</Text>
                      <Text style={styles.viewDocText}>Ver documento cédula</Text>
                      <Text style={styles.viewDocHint}>Toca para abrir</Text>
                    </TouchableOpacity>
                    <Image source={{ uri: selected.cedulaURL }} style={styles.modalCedula} resizeMode="contain" onError={() => {}} />
                  </View>
                ) : (
                  <View style={[styles.modalSection, styles.noCedula]}>
                    <Text style={styles.noCedulaText}>⚠️ No adjuntó cédula</Text>
                  </View>
                )}

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>TALLAS</Text>
                  <View style={styles.tallasRow}>
                    {[
                      ["Guantes", selected.tallaGuantes],
                      ["Guayos",  selected.tallaGuayos],
                      ["Camisa",  selected.tallaCamisa],
                      ["Licra",   selected.tallaLicra],
                      ["Pantaloneta", selected.tallaPantaloneta],
                    ].map(([k,v]) => v ? (
                      <View key={k} style={styles.tallaChip}>
                        <Text style={styles.tallaChipLabel}>{k}</Text>
                        <Text style={styles.tallaChipVal}>{v}</Text>
                      </View>
                    ) : null)}
                  </View>
                </View>

                {tab === "pending" && (
                  <>
                    <Text style={styles.modalLabel}>MOTIVO DE RECHAZO (si aplica)</Text>
                    <TextInput
                      style={styles.noteInput}
                      placeholder="Ej: Cédula ilegible, información incompleta..."
                      placeholderTextColor="#444"
                      multiline
                      value={note}
                      onChangeText={setNote}
                    />
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.btnApprove, acting && styles.btnDisabled]}
                        onPress={() => approve(selected)} disabled={acting}>
                        {acting ? <ActivityIndicator color="#0a0a0f" /> : <Text style={styles.btnApproveText}>✅ Aprobar</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.btnReject, acting && styles.btnDisabled]}
                        onPress={() => reject(selected)} disabled={acting}>
                        {acting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnRejectText}>❌ Rechazar</Text>}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
                {tab === "approved" && (
                  <TouchableOpacity style={styles.btnReject} onPress={() => reject(selected)}>
                    <Text style={styles.btnRejectText}>Revocar aprobación</Text>
                  </TouchableOpacity>
                )}
                {tab === "rejected" && (
                  <TouchableOpacity style={styles.btnApprove} onPress={() => approve(selected)}>
                    <Text style={styles.btnApproveText}>✅ Aprobar ahora</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.btnClose} onPress={() => setSelected(null)}>
                  <Text style={styles.btnCloseText}>Cerrar</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:              { flex: 1, backgroundColor: "#0a0a0f" },
  header:            { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#1e1e2a" },
  headerTitle:       { fontSize: 20, fontWeight: "800", color: "#f0ede8" },
  headerSub:         { fontSize: 11, color: "#555", marginTop: 2 },
  logoutBtn:         { borderWidth: 1, borderColor: "#2a2a35", borderRadius: 4, paddingHorizontal: 10, paddingVertical: 5 },
  logoutText:        { color: "#888", fontSize: 12 },
  mainTabs:          { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1e1e2a" },
  mainTab:           { flex: 1, paddingVertical: 14, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  mainTabActive:     { borderBottomColor: "#00ff87" },
  mainTabText:       { color: "#555", fontSize: 13, fontWeight: "700" },
  mainTabTextActive: { color: "#00ff87" },
  tabs:              { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1e1e2a" },
  tab:               { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText:           { color: "#555", fontSize: 11, fontWeight: "700" },
  center:            { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  empty:             { alignItems: "center", paddingTop: 60 },
  emptyText:         { color: "#444", fontSize: 14 },
  card:              { backgroundColor: "#13131c", borderRadius: 8, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#1e1e2a" },
  cardRow:           { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar:            { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#00ff87", alignItems: "center", justifyContent: "center" },
  avatarInitial:     { color: "#0a0a0f", fontWeight: "800", fontSize: 20 },
  userName:          { fontSize: 15, fontWeight: "700", color: "#f0ede8" },
  userSub:           { fontSize: 11, color: "#555", marginTop: 2 },
  chevron:           { color: "#444", fontSize: 22 },
  rejectNote:        { fontSize: 11, color: "#ff4757", marginTop: 8, fontStyle: "italic" },
  viewProofBtn:      { backgroundColor: "rgba(0,255,135,.1)", borderRadius: 6, padding: 8, borderWidth: 1, borderColor: "rgba(0,255,135,.3)" },
  viewProofText:     { color: "#00ff87", fontSize: 11, fontWeight: "700" },
  actionRow:         { flexDirection: "row", gap: 10, marginTop: 10 },
  btnApprove:        { flex: 1, backgroundColor: "#00ff87", paddingVertical: 13, borderRadius: 6, alignItems: "center" },
  btnApproveText:    { color: "#0a0a0f", fontWeight: "700", fontSize: 14 },
  btnReject:         { flex: 1, backgroundColor: "#ff4757", paddingVertical: 13, borderRadius: 6, alignItems: "center" },
  btnRejectText:     { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnDisabled:       { opacity: 0.5 },
  modalOverlay:      { flex: 1, backgroundColor: "rgba(0,0,0,.85)", justifyContent: "flex-end" },
  modalBox:          { backgroundColor: "#13131c", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: "92%" },
  modalTitle:        { fontSize: 20, fontWeight: "800", color: "#f0ede8", marginBottom: 4 },
  modalSub:          { fontSize: 12, color: "#555", marginBottom: 2 },
  modalSection:      { marginTop: 16 },
  modalLabel:        { fontSize: 9, fontWeight: "700", letterSpacing: 1.5, color: "#555", marginBottom: 8 },
  modalPhoto:        { width: 100, height: 100, borderRadius: 50 },
  modalCedula:       { width: "100%", height: 200, borderRadius: 8, backgroundColor: "#16161f", marginTop: 8 },
  noCedula:          { backgroundColor: "rgba(255,71,87,.08)", borderRadius: 6, padding: 12 },
  noCedulaText:      { color: "#ff4757", fontSize: 13 },
  viewDocBtn:        { backgroundColor: "#16161f", borderRadius: 8, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#00ff87" },
  viewDocIcon:       { fontSize: 28, marginBottom: 4 },
  viewDocText:       { color: "#00ff87", fontWeight: "700", fontSize: 13 },
  viewDocHint:       { color: "#555", fontSize: 10, marginTop: 2 },
  tallasRow:         { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tallaChip:         { backgroundColor: "#16161f", borderRadius: 6, padding: 8, alignItems: "center", minWidth: 60 },
  tallaChipLabel:    { fontSize: 9, color: "#555", fontWeight: "700" },
  tallaChipVal:      { fontSize: 14, fontWeight: "800", color: "#00ff87", marginTop: 2 },
  noteInput:         { backgroundColor: "#16161f", borderWidth: 1, borderColor: "#2a2a35", color: "#f0ede8", padding: 12, borderRadius: 6, fontSize: 13, minHeight: 80, marginBottom: 12 },
  btnClose:          { borderWidth: 1, borderColor: "#2a2a35", paddingVertical: 12, borderRadius: 6, alignItems: "center", marginTop: 8 },
  btnCloseText:      { color: "#888", fontSize: 14 },
});