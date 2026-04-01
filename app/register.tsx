// app/register.tsx — Sprint 1: bancos scroll, validación teléfono/cuenta, términos
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useAppStore } from "../store/appStore";

const CIUDADES = [
  "Bogotá",
  "Medellín",
  "Cali",
  "Barranquilla",
  "Cartagena",
  "Cúcuta",
  "Bucaramanga",
  "Pereira",
  "Santa Marta",
  "Ibagué",
  "Manizales",
  "Villavicencio",
];

const BANCOS = [
  "Bancolombia",
  "Davivienda",
  "Banco de Bogotá",
  "BBVA Colombia",
  "Banco Popular",
  "Scotiabank Colpatria",
  "Banco de Occidente",
  "Banco Caja Social",
  "Nequi",
  "Daviplata",
  "Banco Agrario",
  "Banco Falabella",
  "Banco Pichincha",
  "Bancamía",
  "Otro",
];

const TIPOS_CUENTA = ["Ahorros", "Corriente", "Nequi", "Daviplata"];

// Validate Colombian phone: 10 digits starting with 3
function validarTelefono(t: string) {
  const clean = t.replace(/\s/g, "");
  return /^3\d{9}$/.test(clean);
}

// ── Dropdown genérico ──────────────────────────────────────────────────────────
function Dropdown({
  label,
  value,
  options,
  onSelect,
  placeholder,
  open,
  onToggle,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  placeholder: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectBtn, open && styles.selectBtnOpen]}
        onPress={onToggle}
      >
        <Text style={value ? styles.selectVal : styles.selectPlaceholder}>
          {value || placeholder}
        </Text>
        <Text style={styles.selectArrow}>{open ? "▴" : "▾"}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdown}>
          <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }}>
            {options.map((o) => (
              <TouchableOpacity
                key={o}
                style={styles.dropdownItem}
                onPress={() => onSelect(o)}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    value === o && styles.dropdownActive,
                  ]}
                >
                  {value === o ? "✓ " : ""}
                  {o}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );
}

// ── Modal Términos y Condiciones ───────────────────────────────────────────────
function TerminosModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={termS.overlay}>
        <View style={termS.box}>
          <Text style={termS.title}>Términos y Condiciones</Text>
          <ScrollView style={termS.body}>
            <Text style={termS.text}>
              {`KEEPERZ — TÉRMINOS Y CONDICIONES DE USO\n\nÚltima actualización: 2026\n\n1. ACEPTACIÓN\nAl registrarse en Keeperz, el usuario acepta estos términos en su totalidad.\n\n2. DESCRIPCIÓN DEL SERVICIO\nKeeperz es una plataforma de intermediación que conecta jugadores de fútbol con porteros disponibles en Colombia.\n\n3. COMISIONES Y PAGOS\n• La plataforma retiene el 15% del valor del servicio como comisión.\n• Si el portero cancela un servicio confirmado, se le descuenta el 15% del valor total.\n• Si el jugador cancela un servicio confirmado, se descuenta el 15% del total: 10% para la app y 5% para el portero.\n• Los pagos se procesan a través de MercadoPago.\n\n4. OBLIGACIONES DEL PORTERO\n• Mantener información actualizada y verídica.\n• Cédula de ciudadanía vigente para verificación.\n• Presentarse puntualmente a los servicios contratados.\n• Comportamiento profesional y respetuoso.\n\n5. OBLIGACIONES DEL JUGADOR\n• Información verídica en el registro.\n• Pago oportuno del servicio contratado.\n• Buen trato hacia el portero.\n\n6. CANCELACIONES\n• Las cancelaciones deben realizarse con al menos 1 hora de anticipación.\n• Las cancelaciones generan las penalidades descritas en la sección 3.\n\n7. CALIFICACIONES\n• El sistema de calificaciones es vinculante.\n• Calificaciones falsas o manipuladas conllevan suspensión de la cuenta.\n\n8. PRIVACIDAD\n• Los datos personales se tratan conforme a la Ley 1581 de 2012 (Habeas Data Colombia).\n• No se comparten datos con terceros sin consentimiento expreso.\n\n9. RESPONSABILIDAD\n• Keeperz actúa como intermediario. No es responsable de incidentes durante el servicio.\n• Los usuarios son responsables de su conducta y acuerdos.\n\n10. MODIFICACIONES\n• Keeperz puede modificar estos términos con previo aviso de 7 días.\n\nPara dudas: soporte@keeperz.app`}
            </Text>
          </ScrollView>
          <TouchableOpacity style={termS.btn} onPress={onClose}>
            <Text style={termS.btnText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Registro principal ─────────────────────────────────────────────────────────
export default function Register() {
  const router = useRouter();
  const { register } = useAppStore();

  const [role, setRole] = useState<"player" | "goalkeeper">("player");
  const [step, setStep] = useState(1);
  const totalSteps = role === "goalkeeper" ? 3 : 2;

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const toggleDrop = (key: string) =>
    setOpenDropdown(openDropdown === key ? null : key);

  const [loading, setLoading] = useState(false);
  const [termosOk, setTermosOk] = useState(false);
  const [termModal, setTermModal] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    ciudad: "",
    password: "",
    banco: "",
    numCuenta: "",
    tipoCuenta: "Ahorros",
    cedula: "",
  });
  const up = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // ── Validaciones por paso ────────────────────────────────────────────────────
  const validateStep1 = () => {
    if (!form.nombre.trim()) {
      Alert.alert("Error", "Ingresa tu nombre completo");
      return false;
    }
    if (!form.email.trim() || !form.email.includes("@")) {
      Alert.alert("Error", "Correo inválido");
      return false;
    }
    if (!validarTelefono(form.telefono)) {
      Alert.alert(
        "Error",
        "Teléfono inválido. Debe ser un celular colombiano de 10 dígitos empezando por 3 (ej. 3001234567)",
      );
      return false;
    }
    if (!form.ciudad) {
      Alert.alert("Error", "Selecciona tu ciudad");
      return false;
    }
    if (form.password.length < 6) {
      Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres");
      return false;
    }
    if (!termosOk) {
      Alert.alert("Error", "Debes aceptar los términos y condiciones");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!form.banco) {
      Alert.alert("Error", "Selecciona tu banco");
      return false;
    }
    if (!form.numCuenta.trim()) {
      Alert.alert("Error", "Ingresa el número de cuenta");
      return false;
    }
    if (form.numCuenta.length > 15) {
      Alert.alert(
        "Error",
        "El número de cuenta no puede tener más de 15 dígitos",
      );
      return false;
    }
    if (!/^\d+$/.test(form.numCuenta)) {
      Alert.alert("Error", "El número de cuenta solo puede contener dígitos");
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && role === "goalkeeper" && !validateStep2()) return;
    setStep((s) => s + 1);
  };

  const finish = async () => {
    if (step === 2 && role === "player" && !validateStep2()) return;
    setLoading(true);
    try {
      await register({ ...form, role });
    } catch (e: any) {
      const msg =
        e?.code === "auth/email-already-in-use"
          ? "Este correo ya está registrado"
          : e?.message || "Error al crear la cuenta";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar style="light" />
      <TerminosModal visible={termModal} onClose={() => setTermModal(false)} />

      {/* Logo */}
      <View style={styles.logoRow}>
        <View style={styles.logoIcon}>
          <Text style={styles.logoEmoji}>🧤</Text>
        </View>
        <Text style={styles.logoText}>
          Keep<Text style={styles.green}>erz</Text>
        </Text>
      </View>

      {/* Selector rol */}
      {step === 1 && (
        <View style={styles.roleRow}>
          {(["player", "goalkeeper"] as const).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              onPress={() => setRole(r)}
            >
              <Text style={styles.roleEmoji}>
                {r === "player" ? "⚽" : "🧤"}
              </Text>
              <Text
                style={[styles.roleLabel, role === r && styles.roleLabelActive]}
              >
                {r === "player" ? "Jugador" : "Portero"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.title}>
        Registro{" "}
        <Text style={styles.green}>
          {role === "player" ? "Jugador" : "Portero"}
        </Text>
      </Text>
      <Text style={styles.stepLabel}>
        Paso {step} de {totalSteps}
      </Text>

      <View style={styles.progressBar}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[styles.progressSeg, i < step && styles.progressActive]}
          />
        ))}
      </View>

      {/* ── PASO 1 — Datos personales ── */}
      {step === 1 && (
        <View style={styles.form}>
          <Text style={styles.label}>NOMBRE COMPLETO</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Carlos Rodríguez"
            placeholderTextColor="#444"
            value={form.nombre}
            onChangeText={(v) => up("nombre", v)}
          />

          <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
          <TextInput
            style={styles.input}
            placeholder="tu@correo.com"
            placeholderTextColor="#444"
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(v) => up("email", v)}
          />

          <Text style={styles.label}>TELÉFONO CELULAR</Text>
          <TextInput
            style={styles.input}
            placeholder="3001234567"
            placeholderTextColor="#444"
            keyboardType="numeric"
            maxLength={10}
            value={form.telefono}
            onChangeText={(v) => up("telefono", v.replace(/\D/g, ""))}
          />
          <Text style={styles.fieldHint}>10 dígitos, empieza por 3</Text>

          <Dropdown
            label="CIUDAD"
            value={form.ciudad}
            options={CIUDADES}
            placeholder="Selecciona tu ciudad"
            open={openDropdown === "ciudad"}
            onToggle={() => toggleDrop("ciudad")}
            onSelect={(v) => {
              up("ciudad", v);
              setOpenDropdown(null);
            }}
          />

          <Text style={styles.label}>CONTRASEÑA</Text>
          <TextInput
            style={styles.input}
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor="#444"
            secureTextEntry
            value={form.password}
            onChangeText={(v) => up("password", v)}
          />

          {/* Términos y condiciones */}
          <View style={styles.termRow}>
            <TouchableOpacity
              style={[styles.checkbox, termosOk && styles.checkboxActive]}
              onPress={() => setTermosOk(!termosOk)}
            >
              {termosOk && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
            <Text style={styles.termText}>
              Acepto los{" "}
              <Text style={styles.termLink} onPress={() => setTermModal(true)}>
                Términos y Condiciones
              </Text>{" "}
              de Keeperz
            </Text>
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={nextStep}>
            <Text style={styles.btnPrimaryText}>Continuar →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── PASO 2 — Cuenta bancaria ── */}
      {step === 2 && (
        <View style={styles.form}>
          <Dropdown
            label="BANCO"
            value={form.banco}
            options={BANCOS}
            placeholder="Selecciona tu banco"
            open={openDropdown === "banco"}
            onToggle={() => toggleDrop("banco")}
            onSelect={(v) => {
              up("banco", v);
              setOpenDropdown(null);
            }}
          />

          <Text style={styles.label}>NÚMERO DE CUENTA</Text>
          <TextInput
            style={styles.input}
            placeholder="Máximo 15 dígitos"
            placeholderTextColor="#444"
            keyboardType="numeric"
            maxLength={15}
            value={form.numCuenta}
            onChangeText={(v) => up("numCuenta", v.replace(/\D/g, ""))}
          />
          <Text style={styles.fieldHint}>
            {form.numCuenta.length}/15 dígitos
          </Text>

          <Dropdown
            label="TIPO DE CUENTA"
            value={form.tipoCuenta}
            options={TIPOS_CUENTA}
            placeholder="Tipo de cuenta"
            open={openDropdown === "tipoCuenta"}
            onToggle={() => toggleDrop("tipoCuenta")}
            onSelect={(v) => {
              up("tipoCuenta", v);
              setOpenDropdown(null);
            }}
          />

          <View style={styles.rowBtns}>
            <TouchableOpacity
              style={styles.btnOutline}
              onPress={() => setStep(1)}
            >
              <Text style={styles.btnOutlineText}>← Atrás</Text>
            </TouchableOpacity>
            {role === "goalkeeper" ? (
              <TouchableOpacity
                style={[styles.btnPrimary, { flex: 1 }]}
                onPress={nextStep}
              >
                <Text style={styles.btnPrimaryText}>Continuar →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  { flex: 1 },
                  loading && styles.btnDisabled,
                ]}
                onPress={finish}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#0a0a0f" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Crear cuenta</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ── PASO 3 — Solo portero: cédula ── */}
      {step === 3 && role === "goalkeeper" && (
        <View style={styles.form}>
          <Text style={styles.label}>CÉDULA DE CIUDADANÍA</Text>
          <TextInput
            style={styles.input}
            placeholder="1234567890"
            placeholderTextColor="#444"
            keyboardType="numeric"
            maxLength={12}
            value={form.cedula}
            onChangeText={(v) => up("cedula", v.replace(/\D/g, ""))}
          />

          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>
              🔒 Tu cédula será verificada por el administrador en 24h.{"\n"}
              Recibirás una notificación con el resultado.
            </Text>
          </View>

          <View style={styles.rowBtns}>
            <TouchableOpacity
              style={styles.btnOutline}
              onPress={() => setStep(2)}
            >
              <Text style={styles.btnOutlineText}>← Atrás</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btnPrimary,
                { flex: 1 },
                loading && styles.btnDisabled,
              ]}
              onPress={finish}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0a0a0f" />
              ) : (
                <Text style={styles.btnPrimaryText}>Crear cuenta</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity
        onPress={() => router.push("/login" as any)}
        style={styles.loginLink}
      >
        <Text style={styles.loginLinkText}>
          ¿Ya tienes cuenta? <Text style={styles.green}>Iniciar sesión</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const termS = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.8)",
    justifyContent: "flex-end",
  },
  box: {
    backgroundColor: "#13131c",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "85%",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f0ede8",
    marginBottom: 16,
  },
  body: { marginBottom: 16 },
  text: { color: "#888", fontSize: 13, lineHeight: 22 },
  btn: {
    backgroundColor: "#00ff87",
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: "center",
  },
  btnText: { color: "#0a0a0f", fontWeight: "700", fontSize: 15 },
});

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#0a0a0f",
    alignItems: "center",
    padding: 24,
    paddingTop: 60,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  logoIcon: { backgroundColor: "#00ff87", borderRadius: 8, padding: 8 },
  logoEmoji: { fontSize: 20 },
  logoText: { fontSize: 24, fontWeight: "800", color: "#f0ede8" },
  green: { color: "#00ff87" },
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 20, width: "100%" },
  roleBtn: {
    flex: 1,
    backgroundColor: "#16161f",
    borderWidth: 1.5,
    borderColor: "#2a2a35",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  roleBtnActive: {
    borderColor: "#00ff87",
    backgroundColor: "rgba(0,255,135,0.06)",
  },
  roleEmoji: { fontSize: 24, marginBottom: 6 },
  roleLabel: { color: "#555", fontWeight: "700", fontSize: 13 },
  roleLabelActive: { color: "#00ff87" },
  title: { fontSize: 22, fontWeight: "800", color: "#f0ede8", marginBottom: 4 },
  stepLabel: { fontSize: 11, color: "#444", marginBottom: 14 },
  progressBar: {
    flexDirection: "row",
    gap: 6,
    width: "100%",
    marginBottom: 24,
  },
  progressSeg: {
    flex: 1,
    height: 3,
    backgroundColor: "#2a2a35",
    borderRadius: 2,
  },
  progressActive: { backgroundColor: "#00ff87" },
  form: { width: "100%" },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#777",
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: "#16161f",
    borderWidth: 1.5,
    borderColor: "#2a2a35",
    color: "#f0ede8",
    padding: 12,
    borderRadius: 4,
    fontSize: 14,
  },
  fieldHint: { fontSize: 10, color: "#444", marginTop: 4 },
  selectBtn: {
    backgroundColor: "#16161f",
    borderWidth: 1.5,
    borderColor: "#2a2a35",
    borderRadius: 4,
    padding: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 0,
  },
  selectBtnOpen: { borderColor: "#00ff87" },
  selectVal: { color: "#f0ede8", fontSize: 14 },
  selectPlaceholder: { color: "#444", fontSize: 14 },
  selectArrow: { color: "#555", fontSize: 16 },
  dropdown: {
    backgroundColor: "#16161f",
    borderWidth: 1.5,
    borderColor: "#00ff87",
    borderRadius: 4,
    marginTop: 4,
  },
  dropdownItem: {
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e2a",
  },
  dropdownText: { color: "#f0ede8", fontSize: 14 },
  dropdownActive: { color: "#00ff87", fontWeight: "700" },
  termRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
    padding: 14,
    backgroundColor: "#13131c",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e1e2a",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#2a2a35",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { backgroundColor: "#00ff87", borderColor: "#00ff87" },
  checkmark: { color: "#0a0a0f", fontWeight: "800", fontSize: 13 },
  termText: { flex: 1, color: "#888", fontSize: 12, lineHeight: 18 },
  termLink: { color: "#00ff87", fontWeight: "700" },
  btnPrimary: {
    backgroundColor: "#00ff87",
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 22,
  },
  btnDisabled: { backgroundColor: "#1a3a1a" },
  btnPrimaryText: { color: "#0a0a0f", fontWeight: "700", fontSize: 15 },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: "#00ff87",
    paddingVertical: 13,
    borderRadius: 4,
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 22,
  },
  btnOutlineText: { color: "#00ff87", fontWeight: "600", fontSize: 14 },
  rowBtns: { flexDirection: "row", gap: 10, alignItems: "center" },
  infoBanner: {
    backgroundColor: "rgba(0,255,135,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,255,135,0.2)",
    borderRadius: 6,
    padding: 12,
    marginTop: 16,
  },
  infoBannerText: {
    color: "#00ff87",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  loginLink: { marginTop: 24 },
  loginLinkText: { fontSize: 12, color: "#444" },
});
