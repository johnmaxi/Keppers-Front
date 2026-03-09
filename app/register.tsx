import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { CIUDADES } from "../components/constants";
import { useAppStore } from "../store/appStore";

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

export default function Register() {
  const router = useRouter();
  const { register } = useAppStore();

  const [cityOpen, setCityOpen] = useState(false);
  const [bancoOpen, setBancoOpen] = useState(false);
  const [tipoOpen, setTipoOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"player" | "goalkeeper">("player");
  const [step, setStep] = useState(1);
  const totalSteps = role === "goalkeeper" ? 3 : 2;

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
    tarifa: "",
  });
  const up = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const nextStep = () => {
    if (step === 1) {
      if (!form.nombre || !form.email || !form.password) {
        Alert.alert("Error", "Completa nombre, correo y contraseña");
        return;
      }
      if (form.password.length < 6) {
        Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres");
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const finish = async () => {
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
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar style="light" />

      {/* Logo */}
      <View style={styles.logoRow}>
        <View style={styles.logoIcon}>
          <Text style={styles.logoEmoji}>🧤</Text>
        </View>
        <Text style={styles.logoText}>
          Keep<Text style={styles.green}>ers</Text>
        </Text>
      </View>

      {/* Selector de rol */}
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
            style={[styles.progressSegment, i < step && styles.progressActive]}
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

          <Text style={styles.label}>TELÉFONO</Text>
          <TextInput
            style={styles.input}
            placeholder="+57 300 000 0000"
            placeholderTextColor="#444"
            keyboardType="phone-pad"
            value={form.telefono}
            onChangeText={(v) => up("telefono", v)}
          />

          <Text style={styles.label}>CIUDAD</Text>
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={() => {
              setCityOpen(!cityOpen);
              setBancoOpen(false);
              setTipoOpen(false);
            }}
          >
            <Text
              style={form.ciudad ? styles.selectVal : styles.selectPlaceholder}
            >
              {form.ciudad || "Selecciona tu ciudad"}
            </Text>
            <Text style={styles.selectArrow}>{cityOpen ? "▴" : "▾"}</Text>
          </TouchableOpacity>
          {cityOpen && (
            <View style={styles.dropdown}>
              {CIUDADES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={styles.dropdownItem}
                  onPress={() => {
                    up("ciudad", c);
                    setCityOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      form.ciudad === c && styles.dropdownActive,
                    ]}
                  >
                    {form.ciudad === c ? "✓ " : ""}
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>CONTRASEÑA</Text>
          <TextInput
            style={styles.input}
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor="#444"
            secureTextEntry
            value={form.password}
            onChangeText={(v) => up("password", v)}
          />

          <TouchableOpacity style={styles.btnPrimary} onPress={nextStep}>
            <Text style={styles.btnPrimaryText}>Continuar →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── PASO 2 — Cuenta bancaria ── */}
      {step === 2 && (
        <View style={styles.form}>
          <Text style={styles.label}>BANCO</Text>
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={() => {
              setBancoOpen(!bancoOpen);
              setTipoOpen(false);
            }}
          >
            <Text
              style={form.banco ? styles.selectVal : styles.selectPlaceholder}
            >
              {form.banco || "Selecciona tu banco"}
            </Text>
            <Text style={styles.selectArrow}>{bancoOpen ? "▴" : "▾"}</Text>
          </TouchableOpacity>
          {bancoOpen && (
            <View style={styles.dropdown}>
              {BANCOS.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={styles.dropdownItem}
                  onPress={() => {
                    up("banco", b);
                    setBancoOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      form.banco === b && styles.dropdownActive,
                    ]}
                  >
                    {form.banco === b ? "✓ " : ""}
                    {b}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>NÚMERO DE CUENTA</Text>
          <TextInput
            style={styles.input}
            placeholder="000000000"
            placeholderTextColor="#444"
            keyboardType="numeric"
            value={form.numCuenta}
            onChangeText={(v) => up("numCuenta", v)}
          />

          <Text style={styles.label}>TIPO DE CUENTA</Text>
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={() => {
              setTipoOpen(!tipoOpen);
              setBancoOpen(false);
            }}
          >
            <Text style={styles.selectVal}>{form.tipoCuenta}</Text>
            <Text style={styles.selectArrow}>{tipoOpen ? "▴" : "▾"}</Text>
          </TouchableOpacity>
          {tipoOpen && (
            <View style={styles.dropdown}>
              {TIPOS_CUENTA.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={styles.dropdownItem}
                  onPress={() => {
                    up("tipoCuenta", t);
                    setTipoOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      form.tipoCuenta === t && styles.dropdownActive,
                    ]}
                  >
                    {form.tipoCuenta === t ? "✓ " : ""}
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

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

      {/* ── PASO 3 — Solo portero ── */}
      {step === 3 && role === "goalkeeper" && (
        <View style={styles.form}>
          <Text style={styles.label}>CÉDULA DE CIUDADANÍA</Text>
          <TextInput
            style={styles.input}
            placeholder="1234567890"
            placeholderTextColor="#444"
            keyboardType="numeric"
            value={form.cedula}
            onChangeText={(v) => up("cedula", v)}
          />

          <Text style={styles.label}>TARIFA POR HORA (COP)</Text>
          <TextInput
            style={styles.input}
            placeholder="45000"
            placeholderTextColor="#444"
            keyboardType="numeric"
            value={form.tarifa}
            onChangeText={(v) => up("tarifa", v)}
          />

          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>
              🔒 Tu cédula será verificada en 24h. Ya puedes usar la app.
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
  progressSegment: {
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
  selectBtn: {
    backgroundColor: "#16161f",
    borderWidth: 1.5,
    borderColor: "#2a2a35",
    borderRadius: 4,
    padding: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectVal: { color: "#f0ede8", fontSize: 14 },
  selectPlaceholder: { color: "#444", fontSize: 14 },
  selectArrow: { color: "#555", fontSize: 16 },
  dropdown: {
    backgroundColor: "#16161f",
    borderWidth: 1.5,
    borderColor: "#00ff87",
    borderRadius: 4,
    marginTop: 4,
    maxHeight: 220,
  },
  dropdownItem: {
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e2a",
  },
  dropdownText: { color: "#f0ede8", fontSize: 14 },
  dropdownActive: { color: "#00ff87", fontWeight: "700" },
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
  infoBannerText: { color: "#00ff87", fontSize: 12, fontWeight: "600" },
  loginLink: { marginTop: 24 },
  loginLinkText: { fontSize: 12, color: "#444" },
});
