import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppStore } from "../store/appStore";

export default function Login() {
  const router = useRouter();
  const { login } = useAppStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Ingresa correo y contraseña");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      // _layout.tsx redirige automáticamente al dashboard
    } catch (e: any) {
      const msg =
        e?.code === "auth/user-not-found"
          ? "Correo no registrado"
          : e?.code === "auth/wrong-password"
            ? "Contraseña incorrecta"
            : e?.code === "auth/invalid-credential"
              ? "Correo o contraseña incorrectos"
              : e?.message || "Error al iniciar sesión";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const demo = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.logoRow}>
        <View style={styles.logoIcon}>
          <Text style={styles.logoEmoji}>🧤</Text>
        </View>
        <Text style={styles.logoText}>
          Keep<Text style={styles.green}>ers</Text>
        </Text>
      </View>

      <Text style={styles.title}>Bienvenido</Text>
      <Text style={styles.subtitle}>Inicia sesión en tu cuenta</Text>

      <View style={styles.form}>
        <Text style={styles.label}>CORREO</Text>
        <TextInput
          style={styles.input}
          placeholder="tu@correo.com"
          placeholderTextColor="#444"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>CONTRASEÑA</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#444"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.btnPrimary, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0a0a0f" />
          ) : (
            <Text style={styles.btnPrimaryText}>Iniciar sesión</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Cuentas demo — solo para pruebas */}
      <View style={styles.demoBox}>
        <Text style={styles.demoTitle}>CUENTAS DEMO</Text>
        <View style={styles.demoRow}>
          <TouchableOpacity
            style={styles.demoBtn}
            onPress={() => demo("jugador@demo.com", "demo123")}
          >
            <Text style={styles.demoBtnText}>⚽ Jugador</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.demoBtn}
            onPress={() => demo("portero@demo.com", "demo123")}
          >
            <Text style={styles.demoBtnText}>🧤 Portero</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.demoHint}>Toca para autocompletar</Text>
      </View>

      <TouchableOpacity
        onPress={() => router.push("/register" as any)}
        style={styles.registerLink}
      >
        <Text style={styles.registerLinkText}>
          ¿No tienes cuenta? <Text style={styles.green}>Regístrate</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0f",
    alignItems: "center",
    padding: 24,
    paddingTop: 80,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 32,
  },
  logoIcon: { backgroundColor: "#00ff87", borderRadius: 8, padding: 8 },
  logoEmoji: { fontSize: 20 },
  logoText: { fontSize: 24, fontWeight: "800", color: "#f0ede8" },
  green: { color: "#00ff87" },
  title: { fontSize: 26, fontWeight: "800", color: "#f0ede8", marginBottom: 6 },
  subtitle: { fontSize: 13, color: "#555", marginBottom: 32 },
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
    padding: 13,
    borderRadius: 4,
    fontSize: 14,
  },
  btnPrimary: {
    backgroundColor: "#00ff87",
    paddingVertical: 15,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 24,
  },
  btnDisabled: { backgroundColor: "#1a3a1a" },
  btnPrimaryText: { color: "#0a0a0f", fontWeight: "700", fontSize: 15 },
  demoBox: {
    width: "100%",
    marginTop: 28,
    backgroundColor: "#13131c",
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e1e2a",
  },
  demoTitle: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#444",
    marginBottom: 10,
  },
  demoRow: { flexDirection: "row", gap: 10 },
  demoBtn: {
    flex: 1,
    backgroundColor: "#16161f",
    borderWidth: 1,
    borderColor: "#2a2a35",
    borderRadius: 4,
    padding: 10,
    alignItems: "center",
  },
  demoBtnText: { color: "#888", fontSize: 12, fontWeight: "600" },
  demoHint: { fontSize: 9, color: "#333", marginTop: 8, textAlign: "center" },
  registerLink: { marginTop: 24 },
  registerLinkText: { fontSize: 12, color: "#444" },
});
