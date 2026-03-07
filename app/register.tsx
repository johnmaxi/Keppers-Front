import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BASE, CIUDADES } from "../components/constants";
import { useAppStore } from "../store/appStore";

export default function Register() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { users, addUser, setCurrentUser } = useAppStore();

  const [role, setRole] = useState<"player" | "goalkeeper">(
    (params.type as any) || "player",
  );
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
      if (users.find((u) => u.email === form.email)) {
        Alert.alert("Error", "Este correo ya está registrado");
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const finish = () => {
    const newUser = {
      id: Date.now(),
      nombre: form.nombre,
      email: form.email,
      password: form.password,
      telefono: form.telefono,
      ciudad: form.ciudad,
      role,
      rating: 4.5,
      tarifa: parseInt(form.tarifa) || BASE,
      banco: form.banco,
      numCuenta: form.numCuenta,
      tipoCuenta: form.tipoCuenta,
      cedula: form.cedula,
    };
    addUser(newUser);
    setCurrentUser(newUser);
    Alert.alert("¡Bienvenido!", `Hola ${form.nombre}, tu cuenta fue creada.`);
    router.replace(
      role === "player"
        ? ("/player/dashboard" as any)
        : ("/goalkeeper/dashboard" as any),
    );
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

      {/* Título y progreso */}
      <Text style={styles.title}>
        Registro{" "}
        <Text style={styles.green}>
          {role === "player" ? "Jugador" : "Portero"}
        </Text>
      </Text>
      <Text style={styles.stepLabel}>
        Paso {step} de {totalSteps}
      </Text>

      {/* Barra de progreso */}
      <View style={styles.progressBar}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[styles.progressSegment, i < step && styles.progressActive]}
          />
        ))}
      </View>

      {/* PASO 1 — Datos personales */}
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

          <Text style={styles.label}>CORREO</Text>
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
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={form.ciudad}
              onValueChange={(v) => up("ciudad", v)}
              style={styles.picker}
              dropdownIconColor="#555"
            >
              <Picker.Item label="Selecciona tu ciudad" value="" color="#444" />
              {CIUDADES.map((c) => (
                <Picker.Item key={c} label={c} value={c} color="#f0ede8" />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>CONTRASEÑA</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
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

      {/* PASO 2 — Cuenta bancaria */}
      {step === 2 && (
        <View style={styles.form}>
          <Text style={styles.label}>BANCO</Text>
          <TextInput
            style={styles.input}
            placeholder="Bancolombia, Nequi..."
            placeholderTextColor="#444"
            value={form.banco}
            onChangeText={(v) => up("banco", v)}
          />

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
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={form.tipoCuenta}
              onValueChange={(v) => up("tipoCuenta", v)}
              style={styles.picker}
              dropdownIconColor="#555"
            >
              {["Ahorros", "Corriente", "Nequi", "Daviplata"].map((t) => (
                <Picker.Item key={t} label={t} value={t} color="#f0ede8" />
              ))}
            </Picker>
          </View>

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
                style={[styles.btnPrimary, { flex: 1 }]}
                onPress={finish}
              >
                <Text style={styles.btnPrimaryText}>Crear cuenta</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* PASO 3 — Solo portero: cédula y tarifa */}
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
              style={[styles.btnPrimary, { flex: 1 }]}
              onPress={finish}
            >
              <Text style={styles.btnPrimaryText}>Crear cuenta</Text>
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
  pickerWrap: {
    backgroundColor: "#16161f",
    borderWidth: 1.5,
    borderColor: "#2a2a35",
    borderRadius: 4,
    overflow: "hidden",
  },
  picker: { color: "#f0ede8", height: 50 },
  btnPrimary: {
    backgroundColor: "#00ff87",
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 22,
  },
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
