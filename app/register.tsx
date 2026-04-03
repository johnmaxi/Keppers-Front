// app/register.tsx — Sprint 2: foto perfil, cédula, tallas
import { useState } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity,
  View, Alert, ActivityIndicator, Modal, Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useAppStore } from "../store/appStore";

const CIUDADES = [
  "Bogotá","Medellín","Cali","Barranquilla","Cartagena","Cúcuta",
  "Bucaramanga","Pereira","Santa Marta","Ibagué","Manizales","Villavicencio",
];
const BANCOS = [
  "Bancolombia","Davivienda","Banco de Bogotá","BBVA Colombia","Banco Popular",
  "Scotiabank Colpatria","Banco de Occidente","Banco Caja Social","Nequi",
  "Daviplata","Banco Agrario","Banco Falabella","Banco Pichincha","Bancamía","Otro",
];
const TIPOS_CUENTA = ["Ahorros","Corriente","Nequi","Daviplata"];

function validarTelefono(t: string) {
  return /^3\d{9}$/.test(t.replace(/\s/g,""));
}

function Dropdown({ label, value, options, onSelect, placeholder, open, onToggle }: {
  label: string; value: string; options: string[]; onSelect: (v: string) => void;
  placeholder: string; open: boolean; onToggle: () => void;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={[styles.selectBtn, open && styles.selectBtnOpen]} onPress={onToggle}>
        <Text style={value ? styles.selectVal : styles.selectPlaceholder}>{value || placeholder}</Text>
        <Text style={styles.selectArrow}>{open ? "▴" : "▾"}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdown}>
          <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }}>
            {options.map((o) => (
              <TouchableOpacity key={o} style={styles.dropdownItem} onPress={() => onSelect(o)}>
                <Text style={[styles.dropdownText, value === o && styles.dropdownActive]}>
                  {value === o ? "✓ " : ""}{o}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );
}

function TerminosModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={termS.overlay}>
        <View style={termS.box}>
          <Text style={termS.title}>Términos y Condiciones</Text>
          <ScrollView style={termS.body}>
            <Text style={termS.text}>{`KEEPERZ — TÉRMINOS Y CONDICIONES\n\n1. ACEPTACIÓN\nAl registrarse en Keeperz, el usuario acepta estos términos.\n\n2. SERVICIO\nKeeperz conecta jugadores con porteros en Colombia.\n\n3. COMISIONES\n• 15% de comisión por servicio completado.\n• Portero cancela: descuento del 15% al portero.\n• Jugador cancela: 15% total; 10% app, 5% portero.\n\n4. PORTEROS\n• Cédula vigente requerida para verificación.\n• Presentarse puntualmente al servicio.\n• Comportamiento profesional.\n\n5. JUGADORES\n• Información verídica.\n• Pago oportuno.\n• Buen trato al portero.\n\n6. CANCELACIONES\n• Mínimo 1 hora de anticipación.\n• Se aplican penalidades según sección 3.\n\n7. PRIVACIDAD\n• Datos protegidos bajo Ley 1581 de 2012.\n• No se comparten sin consentimiento.\n\n8. RESPONSABILIDAD\nKeeperz es intermediario y no responde por incidentes durante el servicio.\n\nContacto: soporte@keeperz.app`}</Text>
          </ScrollView>
          <TouchableOpacity style={termS.btn} onPress={onClose}>
            <Text style={termS.btnText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Talla input ───────────────────────────────────────────────────────────────
function TallaInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.tallaItem}>
      <Text style={styles.tallaLabel}>{label}</Text>
      <TextInput
        style={styles.tallaInput}
        placeholder="Ej: M, 42"
        placeholderTextColor="#444"
        maxLength={5}
        autoCapitalize="characters"
        value={value}
        onChangeText={onChange}
      />
    </View>
  );
}

export default function Register() {
  const router = useRouter();
  const { register } = useAppStore();

  const [role, setRole]     = useState<"player" | "goalkeeper">("player");
  const [step, setStep]     = useState(1);
  const totalSteps = role === "goalkeeper" ? 4 : 3;

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const toggleDrop = (key: string) => setOpenDropdown(openDropdown === key ? null : key);

  const [loading,    setLoading]    = useState(false);
  const [termosOk,   setTermosOk]   = useState(false);
  const [termModal,  setTermModal]  = useState(false);
  const [photoUri,   setPhotoUri]   = useState<string | null>(null);
  const [photoB64,   setPhotoB64]   = useState<string | null>(null);
  const [cedulaName, setCedulaName] = useState<string | null>(null);
  const [cedulaB64,  setCedulaB64]  = useState<string | null>(null);

  const [form, setForm] = useState({
    nombre: "", email: "", telefono: "", ciudad: "",
    password: "", banco: "", numCuenta: "", tipoCuenta: "Ahorros", cedula: "",
    // Tallas portero
    tallaGuantes: "", tallaGuayos: "", tallaCamisa: "", tallaLicra: "", tallaPantaloneta: "",
    // Tallas jugador
    tallaGuayosJ: "", tallaCamisaJ: "", tallaLicraJ: "", tallaPantalonetaJ: "",
  });
  const up = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // ── Foto de perfil ────────────────────────────────────────────────────────
  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería para seleccionar la foto.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoB64(result.assets[0].base64 || null);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Necesitamos acceso a tu cámara.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoB64(result.assets[0].base64 || null);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert("Foto de perfil", "¿Cómo quieres agregar tu foto?", [
      { text: "Cámara",   onPress: takePhoto },
      { text: "Galería",  onPress: pickPhoto },
      { text: "Cancelar", style: "cancel"  },
    ]);
  };

  // ── Adjuntar / tomar foto cédula ─────────────────────────────────────────
  const showCedulaOptions = () => {
    Alert.alert("Cédula de ciudadanía", "¿Cómo quieres agregar tu cédula?", [
      { text: "📸 Tomar foto", onPress: takeCedulaPhoto },
      { text: "🖼️ Galería",   onPress: pickCedulaFromGallery },
      { text: "📎 Documento", onPress: pickCedulaDocument },
      { text: "Cancelar",    style: "cancel" },
    ]);
  };

  const takeCedulaPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permiso requerido", "Necesitamos acceso a la cámara."); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, quality: 0.8, base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setCedulaName("cedula_foto.jpg");
      setCedulaB64(result.assets[0].base64 || null);
    }
  };

  const pickCedulaFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permiso requerido", "Necesitamos acceso a la galería."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true, quality: 0.8, base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setCedulaName("cedula_imagen.jpg");
      setCedulaB64(result.assets[0].base64 || null);
    }
  };

  const pickCedulaDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setCedulaName(asset.name);
        const { readAsStringAsync } = await import("expo-file-system/legacy");
        const b64 = await readAsStringAsync(asset.uri, { encoding: "base64" as any });
        setCedulaB64(b64);
      }
    } catch {
      Alert.alert("Error", "No se pudo adjuntar el archivo");
    }
  };

  // ── Validaciones ──────────────────────────────────────────────────────────
  const validateStep1 = () => {
    if (!form.nombre.trim())  { Alert.alert("Error", "Ingresa tu nombre"); return false; }
    if (!form.email.includes("@")) { Alert.alert("Error", "Correo inválido"); return false; }
    if (!validarTelefono(form.telefono)) {
      Alert.alert("Error", "Teléfono inválido. Debe ser celular colombiano de 10 dígitos (ej: 3001234567)");
      return false;
    }
    if (!form.ciudad) { Alert.alert("Error", "Selecciona tu ciudad"); return false; }
    if (form.password.length < 6) { Alert.alert("Error", "Contraseña mínimo 6 caracteres"); return false; }
    if (!termosOk) { Alert.alert("Error", "Debes aceptar los términos y condiciones"); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!form.banco) { Alert.alert("Error", "Selecciona tu banco"); return false; }
    if (!form.numCuenta.trim()) { Alert.alert("Error", "Ingresa el número de cuenta"); return false; }
    if (form.numCuenta.length > 15) { Alert.alert("Error", "Máximo 15 dígitos"); return false; }
    if (!/^\d+$/.test(form.numCuenta)) { Alert.alert("Error", "Solo dígitos en número de cuenta"); return false; }
    return true;
  };

  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    // Step 2 = tallas (no validation needed, all optional)
    // Step 3 = banco for goalkeeper (validated in nextStep before going to cedula)
    if (step === 3 && role === "goalkeeper" && !validateStep2()) return;
    setOpenDropdown(null);
    setStep((s) => s + 1);
  };

  const finish = async () => {
    if (role === "player" && !validateStep2()) return;
    if (role === "goalkeeper" && step === 3 && !validateStep2()) return;
    setLoading(true);
    try {
      await register({
        ...form,
        role,
        photoBase64: photoB64,
        cedulaBase64: cedulaB64,
        cedulaFileName: cedulaName,
      });
    } catch (e: any) {
      Alert.alert("Error", e?.code === "auth/email-already-in-use"
        ? "Este correo ya está registrado" : e?.message || "Error al crear cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <StatusBar style="light" />
      <TerminosModal visible={termModal} onClose={() => setTermModal(false)} />

      <View style={styles.logoRow}>
        <View style={styles.logoIcon}><Text style={styles.logoEmoji}>🧤</Text></View>
        <Text style={styles.logoText}>Keep<Text style={styles.green}>erz</Text></Text>
      </View>

      {step === 1 && (
        <View style={styles.roleRow}>
          {(["player","goalkeeper"] as const).map((r) => (
            <TouchableOpacity key={r}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              onPress={() => setRole(r)}>
              <Text style={styles.roleEmoji}>{r === "player" ? "⚽" : "🧤"}</Text>
              <Text style={[styles.roleLabel, role === r && styles.roleLabelActive]}>
                {r === "player" ? "Jugador" : "Portero"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.title}>
        Registro <Text style={styles.green}>{role === "player" ? "Jugador" : "Portero"}</Text>
      </Text>
      <Text style={styles.stepLabel}>Paso {step} de {totalSteps}</Text>
      <View style={styles.progressBar}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View key={i} style={[styles.progressSeg, i < step && styles.progressActive]} />
        ))}
      </View>

      {/* ── PASO 1 — Datos personales + foto ── */}
      {step === 1 && (
        <View style={styles.form}>
          {/* Foto de perfil */}
          <Text style={styles.label}>FOTO DE PERFIL</Text>
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoCircle} onPress={showPhotoOptions}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoImg} />
              ) : (
                <Text style={styles.photoPlaceholder}>📷{"\n"}Agregar{"\n"}foto</Text>
              )}
            </TouchableOpacity>
            <View style={{ flex: 1, gap: 8 }}>
              <TouchableOpacity style={styles.btnPhotoOpt} onPress={takePhoto}>
                <Text style={styles.btnPhotoOptText}>📸 Tomar foto</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPhotoOpt} onPress={pickPhoto}>
                <Text style={styles.btnPhotoOptText}>🖼️ Galería</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.label}>NOMBRE COMPLETO</Text>
          <TextInput style={styles.input} placeholder="Ej. Carlos Rodríguez"
            placeholderTextColor="#444" value={form.nombre} onChangeText={(v) => up("nombre", v)} />

          <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
          <TextInput style={styles.input} placeholder="tu@correo.com"
            placeholderTextColor="#444" keyboardType="email-address" autoCapitalize="none"
            value={form.email} onChangeText={(v) => up("email", v)} />

          <Text style={styles.label}>TELÉFONO CELULAR</Text>
          <TextInput style={styles.input} placeholder="3001234567"
            placeholderTextColor="#444" keyboardType="numeric" maxLength={10}
            value={form.telefono} onChangeText={(v) => up("telefono", v.replace(/\D/g,""))} />
          <Text style={styles.fieldHint}>10 dígitos, empieza por 3</Text>

          <Dropdown label="CIUDAD" value={form.ciudad} options={CIUDADES}
            placeholder="Selecciona tu ciudad"
            open={openDropdown === "ciudad"} onToggle={() => toggleDrop("ciudad")}
            onSelect={(v) => { up("ciudad", v); setOpenDropdown(null); }} />

          <Text style={styles.label}>CONTRASEÑA</Text>
          <TextInput style={styles.input} placeholder="Mínimo 6 caracteres"
            placeholderTextColor="#444" secureTextEntry
            value={form.password} onChangeText={(v) => up("password", v)} />

          <View style={styles.termRow}>
            <TouchableOpacity style={[styles.checkbox, termosOk && styles.checkboxActive]}
              onPress={() => setTermosOk(!termosOk)}>
              {termosOk && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
            <Text style={styles.termText}>
              Acepto los{" "}
              <Text style={styles.termLink} onPress={() => setTermModal(true)}>Términos y Condiciones</Text>
            </Text>
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={nextStep}>
            <Text style={styles.btnPrimaryText}>Continuar →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── PASO 2 — Tallas ── */}
      {step === 2 && (
        <View style={styles.form}>
          <Text style={styles.sectionHeader}>
            {role === "goalkeeper" ? "🧤 Tallas del portero" : "⚽ Tallas del jugador"}
          </Text>
          <Text style={styles.sectionHint}>Máximo 5 caracteres por talla (ej: S, M, L, XL, 40, 42)</Text>

          <View style={styles.tallasGrid}>
            {role === "goalkeeper" ? (
              <>
                <TallaInput label="Guantes"     value={form.tallaGuantes}     onChange={(v) => up("tallaGuantes", v)} />
                <TallaInput label="Guayos"      value={form.tallaGuayos}      onChange={(v) => up("tallaGuayos", v)} />
                <TallaInput label="Camisa"      value={form.tallaCamisa}      onChange={(v) => up("tallaCamisa", v)} />
                <TallaInput label="Licra"       value={form.tallaLicra}       onChange={(v) => up("tallaLicra", v)} />
                <TallaInput label="Pantaloneta" value={form.tallaPantaloneta} onChange={(v) => up("tallaPantaloneta", v)} />
              </>
            ) : (
              <>
                <TallaInput label="Guayos"      value={form.tallaGuayosJ}      onChange={(v) => up("tallaGuayosJ", v)} />
                <TallaInput label="Camisa"      value={form.tallaCamisaJ}      onChange={(v) => up("tallaCamisaJ", v)} />
                <TallaInput label="Licra"       value={form.tallaLicraJ}       onChange={(v) => up("tallaLicraJ", v)} />
                <TallaInput label="Pantaloneta" value={form.tallaPantalonetaJ} onChange={(v) => up("tallaPantalonetaJ", v)} />
              </>
            )}
          </View>

          <View style={styles.rowBtns}>
            <TouchableOpacity style={styles.btnOutline} onPress={() => setStep(1)}>
              <Text style={styles.btnOutlineText}>← Atrás</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnPrimary, { flex: 1 }]} onPress={nextStep}>
              <Text style={styles.btnPrimaryText}>Continuar →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── PASO 3 — Cuenta bancaria ── */}
      {step === 3 && (
        <View style={styles.form}>
          <Dropdown label="BANCO" value={form.banco} options={BANCOS}
            placeholder="Selecciona tu banco"
            open={openDropdown === "banco"} onToggle={() => toggleDrop("banco")}
            onSelect={(v) => { up("banco", v); setOpenDropdown(null); }} />

          <Text style={styles.label}>NÚMERO DE CUENTA</Text>
          <TextInput style={styles.input} placeholder="Máximo 15 dígitos"
            placeholderTextColor="#444" keyboardType="numeric" maxLength={15}
            value={form.numCuenta} onChangeText={(v) => up("numCuenta", v.replace(/\D/g,""))} />
          <Text style={styles.fieldHint}>{form.numCuenta.length}/15 dígitos</Text>

          <Dropdown label="TIPO DE CUENTA" value={form.tipoCuenta} options={TIPOS_CUENTA}
            placeholder="Tipo de cuenta"
            open={openDropdown === "tipoCuenta"} onToggle={() => toggleDrop("tipoCuenta")}
            onSelect={(v) => { up("tipoCuenta", v); setOpenDropdown(null); }} />

          <View style={styles.rowBtns}>
            <TouchableOpacity style={styles.btnOutline} onPress={() => setStep(2)}>
              <Text style={styles.btnOutlineText}>← Atrás</Text>
            </TouchableOpacity>
            {role === "goalkeeper" ? (
              <TouchableOpacity style={[styles.btnPrimary, { flex: 1 }]} onPress={nextStep}>
                <Text style={styles.btnPrimaryText}>Continuar →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.btnPrimary, { flex: 1 }, loading && styles.btnDisabled]}
                onPress={finish} disabled={loading}>
                {loading ? <ActivityIndicator color="#0a0a0f" />
                  : <Text style={styles.btnPrimaryText}>Crear cuenta</Text>}
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ── PASO 4 — Solo portero: cédula ── */}
      {step === 4 && role === "goalkeeper" && (
        <View style={styles.form}>
          <Text style={styles.label}>CÉDULA DE CIUDADANÍA</Text>
          <TextInput style={styles.input} placeholder="1234567890"
            placeholderTextColor="#444" keyboardType="numeric" maxLength={12}
            value={form.cedula} onChangeText={(v) => up("cedula", v.replace(/\D/g,""))} />

          <Text style={styles.label}>DOCUMENTO / FOTO DE CÉDULA</Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={showCedulaOptions}>
            <Text style={styles.uploadIcon}>📎</Text>
            <Text style={styles.uploadText}>
              {cedulaName || "Adjuntar cédula (PDF o imagen)"}
            </Text>
          </TouchableOpacity>
          {cedulaName && (
            <Text style={styles.uploadDone}>✅ {cedulaName}</Text>
          )}

          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>
              🔒 Tu cédula será verificada por el administrador en 24h.{"\n"}
              Recibirás una notificación con el resultado.
            </Text>
          </View>

          <View style={styles.rowBtns}>
            <TouchableOpacity style={styles.btnOutline} onPress={() => setStep(3)}>
              <Text style={styles.btnOutlineText}>← Atrás</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimary, { flex: 1 }, loading && styles.btnDisabled]}
              onPress={finish} disabled={loading}>
              {loading ? <ActivityIndicator color="#0a0a0f" />
                : <Text style={styles.btnPrimaryText}>Crear cuenta</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity onPress={() => router.push("/login" as any)} style={styles.loginLink}>
        <Text style={styles.loginLinkText}>
          ¿Ya tienes cuenta? <Text style={styles.green}>Iniciar sesión</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const termS = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,.8)", justifyContent: "flex-end" },
  box:     { backgroundColor: "#13131c", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: "85%" },
  title:   { fontSize: 18, fontWeight: "800", color: "#f0ede8", marginBottom: 16 },
  body:    { marginBottom: 16 },
  text:    { color: "#888", fontSize: 13, lineHeight: 22 },
  btn:     { backgroundColor: "#00ff87", paddingVertical: 14, borderRadius: 6, alignItems: "center" },
  btnText: { color: "#0a0a0f", fontWeight: "700", fontSize: 15 },
});

const styles = StyleSheet.create({
  container:         { flexGrow: 1, backgroundColor: "#0a0a0f", alignItems: "center", padding: 24, paddingTop: 60 },
  logoRow:           { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 24 },
  logoIcon:          { backgroundColor: "#00ff87", borderRadius: 8, padding: 8 },
  logoEmoji:         { fontSize: 20 },
  logoText:          { fontSize: 24, fontWeight: "800", color: "#f0ede8" },
  green:             { color: "#00ff87" },
  roleRow:           { flexDirection: "row", gap: 12, marginBottom: 20, width: "100%" },
  roleBtn:           { flex: 1, backgroundColor: "#16161f", borderWidth: 1.5, borderColor: "#2a2a35", borderRadius: 8, padding: 16, alignItems: "center" },
  roleBtnActive:     { borderColor: "#00ff87", backgroundColor: "rgba(0,255,135,0.06)" },
  roleEmoji:         { fontSize: 24, marginBottom: 6 },
  roleLabel:         { color: "#555", fontWeight: "700", fontSize: 13 },
  roleLabelActive:   { color: "#00ff87" },
  title:             { fontSize: 22, fontWeight: "800", color: "#f0ede8", marginBottom: 4 },
  stepLabel:         { fontSize: 11, color: "#444", marginBottom: 14 },
  progressBar:       { flexDirection: "row", gap: 6, width: "100%", marginBottom: 24 },
  progressSeg:       { flex: 1, height: 3, backgroundColor: "#2a2a35", borderRadius: 2 },
  progressActive:    { backgroundColor: "#00ff87" },
  form:              { width: "100%" },
  photoRow:          { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 8 },
  photoCircle:       { width: 90, height: 90, borderRadius: 45, backgroundColor: "#16161f", borderWidth: 2, borderColor: "#2a2a35", borderStyle: "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  photoImg:          { width: 90, height: 90, borderRadius: 45 },
  photoPlaceholder:  { color: "#444", fontSize: 11, textAlign: "center", lineHeight: 16 },
  btnPhotoOpt:       { backgroundColor: "#16161f", borderWidth: 1, borderColor: "#2a2a35", borderRadius: 6, padding: 10, alignItems: "center" },
  btnPhotoOptText:   { color: "#888", fontSize: 12 },
  label:             { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, color: "#777", marginBottom: 6, marginTop: 14 },
  input:             { backgroundColor: "#16161f", borderWidth: 1.5, borderColor: "#2a2a35", color: "#f0ede8", padding: 12, borderRadius: 4, fontSize: 14 },
  fieldHint:         { fontSize: 10, color: "#444", marginTop: 4 },
  selectBtn:         { backgroundColor: "#16161f", borderWidth: 1.5, borderColor: "#2a2a35", borderRadius: 4, padding: 13, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  selectBtnOpen:     { borderColor: "#00ff87" },
  selectVal:         { color: "#f0ede8", fontSize: 14 },
  selectPlaceholder: { color: "#444", fontSize: 14 },
  selectArrow:       { color: "#555", fontSize: 16 },
  dropdown:          { backgroundColor: "#16161f", borderWidth: 1.5, borderColor: "#00ff87", borderRadius: 4, marginTop: 4 },
  dropdownItem:      { padding: 13, borderBottomWidth: 1, borderBottomColor: "#1e1e2a" },
  dropdownText:      { color: "#f0ede8", fontSize: 14 },
  dropdownActive:    { color: "#00ff87", fontWeight: "700" },
  sectionHeader:     { fontSize: 16, fontWeight: "800", color: "#f0ede8", marginBottom: 4, marginTop: 8 },
  sectionHint:       { fontSize: 11, color: "#555", marginBottom: 16 },
  tallasGrid:        { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tallaItem:         { width: "47%", backgroundColor: "#16161f", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#2a2a35" },
  tallaLabel:        { fontSize: 10, fontWeight: "700", color: "#777", letterSpacing: 1, marginBottom: 6 },
  tallaInput:        { color: "#f0ede8", fontSize: 16, fontWeight: "700", borderBottomWidth: 1, borderBottomColor: "#2a2a35", paddingBottom: 4 },
  termRow:           { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20, padding: 14, backgroundColor: "#13131c", borderRadius: 8, borderWidth: 1, borderColor: "#1e1e2a" },
  checkbox:          { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: "#2a2a35", alignItems: "center", justifyContent: "center" },
  checkboxActive:    { backgroundColor: "#00ff87", borderColor: "#00ff87" },
  checkmark:         { color: "#0a0a0f", fontWeight: "800", fontSize: 13 },
  termText:          { flex: 1, color: "#888", fontSize: 12, lineHeight: 18 },
  termLink:          { color: "#00ff87", fontWeight: "700" },
  uploadBtn:         { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#16161f", borderWidth: 1.5, borderColor: "#2a2a35", borderStyle: "dashed", borderRadius: 8, padding: 14, marginTop: 4 },
  uploadIcon:        { fontSize: 20 },
  uploadText:        { color: "#888", fontSize: 13, flex: 1 },
  uploadDone:        { fontSize: 11, color: "#00ff87", marginTop: 6 },
  infoBanner:        { backgroundColor: "rgba(0,255,135,0.06)", borderWidth: 1, borderColor: "rgba(0,255,135,0.2)", borderRadius: 6, padding: 12, marginTop: 16 },
  infoBannerText:    { color: "#00ff87", fontSize: 12, fontWeight: "600", lineHeight: 18 },
  btnPrimary:        { backgroundColor: "#00ff87", paddingVertical: 14, borderRadius: 4, alignItems: "center", marginTop: 22 },
  btnDisabled:       { backgroundColor: "#1a3a1a" },
  btnPrimaryText:    { color: "#0a0a0f", fontWeight: "700", fontSize: 15 },
  btnOutline:        { borderWidth: 1.5, borderColor: "#00ff87", paddingVertical: 13, borderRadius: 4, alignItems: "center", paddingHorizontal: 20, marginTop: 22 },
  btnOutlineText:    { color: "#00ff87", fontWeight: "600", fontSize: 14 },
  rowBtns:           { flexDirection: "row", gap: 10, alignItems: "center" },
  loginLink:         { marginTop: 24 },
  loginLinkText:     { fontSize: 12, color: "#444" },
});
