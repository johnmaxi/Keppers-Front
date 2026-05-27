// app/recargar/index.tsx — Pantalla de recarga de saldo
import { useState } from "react";
import { useRouter } from "expo-router";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image, Linking,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import { useAppStore } from "../../store/appStore";
import { solicitarRecarga } from "../../services/walletService";

const NEQUI_NUMBER = "3042415204";
const NEQUI_NAME   = "John Arenas";

const MONTOS = [20000, 50000, 100000, 200000, 500000];

export default function RecargarScreen() {
  const router      = useRouter();
  const { currentUser } = useAppStore();

  const [monto,      setMonto]      = useState(0);
  const [montoCustom,setMontoCustom]= useState("");
  const [proofUri,   setProofUri]   = useState<string | null>(null);
  const [proofB64,   setProofB64]   = useState<string | null>(null);
  const [nota,       setNota]       = useState("");
  const [loading,    setLoading]    = useState(false);

  const montoFinal = montoCustom ? parseInt(montoCustom) : monto;

  const pickProof = async () => {
    Alert.alert("Comprobante", "¿Cómo adjuntas el comprobante?", [
      { text: "📸 Tomar foto", onPress: async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") return;
        const r = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true });
        if (!r.canceled && r.assets[0]) { setProofUri(r.assets[0].uri); setProofB64(r.assets[0].base64 || null); }
      }},
      { text: "🖼️ Galería", onPress: async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") return;
        const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: true });
        if (!r.canceled && r.assets[0]) { setProofUri(r.assets[0].uri); setProofB64(r.assets[0].base64 || null); }
      }},
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const uploadProof = async (): Promise<string | null> => {
    if (!proofB64 || !currentUser) return null;
    try {
      const { auth } = await import("../../lib/firebase");
      const idToken  = await auth.currentUser!.getIdToken();
      const bucket   = "keepersapp-6b982.firebasestorage.app";
      const path     = `comprobantes/${currentUser.id}_${Date.now()}.jpg`;
      const encoded  = encodeURIComponent(path);
      const url      = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?uploadType=media`;
      const binary   = atob(proofB64);
      const bytes    = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg", "Authorization": `Bearer ${idToken}` },
        body: bytes,
      });
      if (!res.ok) return null;
      const data = await res.json();
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media&token=${data.downloadTokens}`;
    } catch { return null; }
  };

  const enviarSolicitud = async () => {
    if (!montoFinal || montoFinal < 10000) {
      Alert.alert("Error", "El monto mínimo de recarga es $10.000 COP"); return;
    }
    if (!proofB64) {
      Alert.alert("Error", "Debes adjuntar el comprobante de pago"); return;
    }
    setLoading(true);
    try {
      const proofURL = await uploadProof();
      await solicitarRecarga(
        currentUser!.id,
        currentUser!.nombre,
        montoFinal,
        proofURL,
        nota,
      );
      Alert.alert(
        "✅ Solicitud enviada",
        "Tu solicitud de recarga fue enviada. El administrador la revisará en las próximas horas.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert("Error", e.message || "No se pudo enviar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>💰 Recargar saldo</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

        {/* Info Nequi */}
        <View style={styles.nequiCard}>
          <Text style={styles.nequiTitle}>Transfiere a Nequi</Text>
          <View style={styles.nequiRow}>
            <Text style={styles.nequiNumber}>{NEQUI_NUMBER}</Text>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => {
                Alert.alert("Número copiado", NEQUI_NUMBER);
              }}>
              <Text style={styles.copyBtnText}>Copiar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.nequiName}>A nombre de: {NEQUI_NAME}</Text>
          <Text style={styles.nequiHint}>
            Una vez realizada la transferencia, adjunta el comprobante aquí abajo y envía la solicitud.
          </Text>
          <TouchableOpacity
            style={styles.openNequiBtn}
            onPress={() => Linking.openURL("https://www.nequi.com.co")}>
            <Text style={styles.openNequiBtnText}>Abrir Nequi</Text>
          </TouchableOpacity>
        </View>

        {/* Monto */}
        <Text style={styles.label}>MONTO A RECARGAR</Text>
        <View style={styles.montosGrid}>
          {MONTOS.map((m) => (
            <TouchableOpacity key={m}
              style={[styles.montoBtn, monto === m && !montoCustom && styles.montoBtnActive]}
              onPress={() => { setMonto(m); setMontoCustom(""); }}>
              <Text style={[styles.montoBtnText, monto === m && !montoCustom && styles.montoBtnTextActive]}>
                ${m.toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>OTRO MONTO</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 75000"
          placeholderTextColor="#444"
          keyboardType="numeric"
          value={montoCustom}
          onChangeText={(v) => { setMontoCustom(v); setMonto(0); }}
        />

        {montoFinal > 0 && (
          <View style={styles.resumenBox}>
            <Text style={styles.resumenLabel}>Monto a recargar</Text>
            <Text style={styles.resumenMonto}>${montoFinal.toLocaleString()} COP</Text>
          </View>
        )}

        {/* Comprobante */}
        <Text style={styles.label}>COMPROBANTE DE PAGO *</Text>
        <TouchableOpacity style={styles.uploadBtn} onPress={pickProof}>
          {proofUri ? (
            <Image source={{ uri: proofUri }} style={styles.proofImg} resizeMode="cover" />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Text style={styles.uploadIcon}>📎</Text>
              <Text style={styles.uploadText}>Adjuntar comprobante</Text>
              <Text style={styles.uploadHint}>Foto o captura de pantalla</Text>
            </View>
          )}
        </TouchableOpacity>
        {proofUri && (
          <TouchableOpacity onPress={pickProof} style={styles.changeProofBtn}>
            <Text style={styles.changeProofText}>Cambiar comprobante</Text>
          </TouchableOpacity>
        )}

        {/* Nota */}
        <Text style={styles.label}>NOTA (OPCIONAL)</Text>
        <TextInput
          style={[styles.input, { height: 70 }]}
          placeholder="Ej: Transferencia desde Bancolombia..."
          placeholderTextColor="#444"
          multiline
          value={nota}
          onChangeText={setNota}
        />

        <TouchableOpacity
          style={[styles.btnPrimary, (!montoFinal || !proofB64 || loading) && styles.btnDisabled]}
          onPress={enviarSolicitud}
          disabled={!montoFinal || !proofB64 || loading}>
          {loading
            ? <ActivityIndicator color="#0a0a0f" />
            : <Text style={styles.btnPrimaryText}>Enviar solicitud de recarga</Text>
          }
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          El saldo se acreditará una vez el administrador verifique el comprobante. Proceso: máximo 24 horas hábiles.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:              { flex: 1, backgroundColor: "#0a0a0f" },
  header:            { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#1e1e2a", gap: 12 },
  backBtn:           { padding: 4 },
  backText:          { color: "#00ff87", fontSize: 22, fontWeight: "700" },
  headerTitle:       { fontSize: 18, fontWeight: "800", color: "#f0ede8" },
  nequiCard:         { backgroundColor: "#13131c", borderRadius: 12, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: "rgba(0,255,135,.3)" },
  nequiTitle:        { fontSize: 13, fontWeight: "700", color: "#555", letterSpacing: 1, marginBottom: 12 },
  nequiRow:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  nequiNumber:       { fontSize: 28, fontWeight: "800", color: "#00ff87", letterSpacing: 2 },
  copyBtn:           { backgroundColor: "rgba(0,255,135,.15)", borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(0,255,135,.3)" },
  copyBtnText:       { color: "#00ff87", fontSize: 12, fontWeight: "700" },
  nequiName:         { fontSize: 14, color: "#f0ede8", fontWeight: "600", marginBottom: 10 },
  nequiHint:         { fontSize: 12, color: "#555", lineHeight: 18, marginBottom: 12 },
  openNequiBtn:      { backgroundColor: "#00ff87", paddingVertical: 10, borderRadius: 6, alignItems: "center" },
  openNequiBtnText:  { color: "#0a0a0f", fontWeight: "700", fontSize: 13 },
  label:             { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, color: "#777", marginBottom: 8, marginTop: 16 },
  montosGrid:        { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  montoBtn:          { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1.5, borderColor: "#2a2a35", backgroundColor: "#16161f" },
  montoBtnActive:    { borderColor: "#00ff87", backgroundColor: "rgba(0,255,135,.1)" },
  montoBtnText:      { color: "#555", fontWeight: "700", fontSize: 13 },
  montoBtnTextActive:{ color: "#00ff87" },
  input:             { backgroundColor: "#16161f", borderWidth: 1.5, borderColor: "#2a2a35", color: "#f0ede8", padding: 13, borderRadius: 8, fontSize: 15 },
  resumenBox:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(0,255,135,.06)", borderWidth: 1, borderColor: "rgba(0,255,135,.2)", borderRadius: 8, padding: 14, marginTop: 10 },
  resumenLabel:      { color: "#555", fontSize: 13 },
  resumenMonto:      { color: "#00ff87", fontWeight: "800", fontSize: 18 },
  uploadBtn:         { backgroundColor: "#16161f", borderWidth: 1.5, borderColor: "#2a2a35", borderStyle: "dashed", borderRadius: 10, overflow: "hidden", minHeight: 120, alignItems: "center", justifyContent: "center" },
  proofImg:          { width: "100%", height: 180 },
  uploadPlaceholder: { alignItems: "center", padding: 24 },
  uploadIcon:        { fontSize: 32, marginBottom: 8 },
  uploadText:        { color: "#f0ede8", fontWeight: "600", fontSize: 14 },
  uploadHint:        { color: "#555", fontSize: 11, marginTop: 4 },
  changeProofBtn:    { alignItems: "center", marginTop: 8 },
  changeProofText:   { color: "#00ff87", fontSize: 12 },
  btnPrimary:        { backgroundColor: "#00ff87", paddingVertical: 15, borderRadius: 8, alignItems: "center", marginTop: 24 },
  btnDisabled:       { backgroundColor: "#1a3a1a" },
  btnPrimaryText:    { color: "#0a0a0f", fontWeight: "800", fontSize: 15 },
  disclaimer:        { fontSize: 11, color: "#444", textAlign: "center", marginTop: 14, lineHeight: 18 },
});
