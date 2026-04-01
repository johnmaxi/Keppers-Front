// app/login.tsx — sin cuentas demo
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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.logoRow}>
        <View style={styles.logoIcon}>
          <Text style={styles.logoEmoji}>🧤</Text>
        </View>
        <Text style={styles.logoText}>
          Keep<Text style={styles.green}>erz</Text>
        </Text>
      </View>

      <Text style={styles.title}>Bienvenido</Text>
      <Text style={styles.subtitle}>Inicia sesión en tu cuenta</Text>

      <View style={styles.form}>
        <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
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

      <TouchableOpacity
        onPress={() => router.push("/register" as any)}
        style={styles.registerLink}
      >
        <Text style={styles.registerLinkText}>
          ¿No tienes cuenta? <Text style={styles.green}>Regístrate gratis</Text>
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
  registerLink: { marginTop: 28 },
  registerLinkText: { fontSize: 13, color: "#444" },
});
