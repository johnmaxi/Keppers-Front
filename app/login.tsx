import { useRouter } from "expo-router";
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
import { useAppStore } from "../store/appStore";

export default function Login() {
  const router = useRouter();
  const { users, setCurrentUser } = useAppStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    // Cuentas demo
    if (email === "jugador@demo.com" && password === "demo123") {
      setCurrentUser({
        id: 999,
        nombre: "Demo Jugador",
        email,
        role: "player",
        ciudad: "Bogotá",
        tarifa: 0,
        rating: 4.5,
        password: "demo123",
        telefono: "",
        banco: "",
        numCuenta: "",
        tipoCuenta: "",
        cedula: "",
      });
      router.replace("/player/dashboard" as any);
      return;
    }
    if (email === "portero@demo.com" && password === "demo123") {
      setCurrentUser({
        id: 998,
        nombre: "Carlos Demo",
        email,
        role: "goalkeeper",
        ciudad: "Bogotá",
        tarifa: 45000,
        rating: 4.8,
        password: "demo123",
        telefono: "",
        banco: "",
        numCuenta: "",
        tipoCuenta: "",
        cedula: "",
      });
      router.replace("/goalkeeper/dashboard" as any);
      return;
    }
    // Usuario registrado
    const found = users.find(
      (u) => u.email === email && u.password === password,
    );
    if (found) {
      setCurrentUser(found);
      router.replace(
        found.role === "player"
          ? ("/player/dashboard" as any)
          : ("/goalkeeper/dashboard" as any),
      );
      return;
    }
    Alert.alert("Error", "Correo o contraseña incorrectos");
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

      <Text style={styles.title}>Iniciar sesión</Text>
      <Text style={styles.subtitle}>Accede a tu cuenta</Text>

      {/* Formulario */}
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
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin}>
          <Text style={styles.btnPrimaryText}>Entrar</Text>
        </TouchableOpacity>
      </View>

      {/* Demo */}
      <View style={styles.demoBox}>
        <Text style={styles.demoTitle}>CUENTAS DEMO</Text>
        <TouchableOpacity
          onPress={() => {
            setEmail("jugador@demo.com");
            setPassword("demo123");
          }}
        >
          <Text style={styles.demoItem}>
            <Text style={styles.green}>jugador@demo.com</Text> / demo123
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setEmail("portero@demo.com");
            setPassword("demo123");
          }}
        >
          <Text style={styles.demoItem}>
            <Text style={styles.green}>portero@demo.com</Text> / demo123
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push("/register" as any)}>
        <Text style={styles.registerLink}>
          ¿No tienes cuenta? <Text style={styles.green}>Regístrate</Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#0a0a0f",
    alignItems: "center",
    padding: 28,
    paddingTop: 70,
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
  title: { fontSize: 24, fontWeight: "800", color: "#f0ede8", marginBottom: 6 },
  subtitle: { fontSize: 13, color: "#555", marginBottom: 28 },
  form: { width: "100%", marginBottom: 20 },
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
  btnPrimary: {
    backgroundColor: "#00ff87",
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 22,
  },
  btnPrimaryText: { color: "#0a0a0f", fontWeight: "700", fontSize: 15 },
  demoBox: {
    width: "100%",
    backgroundColor: "#0f0f18",
    borderWidth: 1,
    borderColor: "#1a1a24",
    borderRadius: 6,
    padding: 14,
    marginBottom: 20,
  },
  demoTitle: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#555",
    marginBottom: 8,
  },
  demoItem: { fontSize: 12, color: "#666", marginBottom: 4 },
  registerLink: { fontSize: 12, color: "#444", marginBottom: 16 },
  backBtn: { marginTop: 4 },
  backText: { fontSize: 12, color: "#555" },
});
