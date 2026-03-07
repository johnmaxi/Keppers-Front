import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Landing() {
  const router = useRouter();

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

      {/* Hero */}
      <Text style={styles.hero}>
        Tu portero,{"\n"}
        <Text style={styles.green}>cuando lo necesitas.</Text>
      </Text>
      <Text style={styles.sub}>
        Reserva porteros de fútbol en toda Colombia. Contraofertas, mapa en
        vivo, chat y calificaciones.
      </Text>

      {/* Botones */}
      <TouchableOpacity
        style={styles.btnPrimary}
        onPress={() => router.push("/register" as any)}
      >
        <Text style={styles.btnPrimaryText}>⚽ Soy Jugador</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btnOutline}
        onPress={() => router.push("/register" as any)}
      >
        <Text style={styles.btnOutlineText}>🧤 Soy Portero</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/login" as any)}>
        <Text style={styles.loginLink}>
          ¿Ya tienes cuenta? <Text style={styles.green}>Iniciar sesión</Text>
        </Text>
      </TouchableOpacity>

      {/* Features */}
      <View style={styles.features}>
        {[
          "🔁 Contraofertas",
          "📍 Mapa en vivo",
          "💬 Chat",
          "⭐ Calificaciones",
          "▶ Iniciar/Finalizar",
        ].map((f) => (
          <View key={f} style={styles.featurePill}>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        {[
          ["1,200+", "Porteros"],
          ["8,400+", "Partidos"],
          ["4.8★", "Rating prom."],
        ].map(([v, l]) => (
          <View key={l} style={styles.statItem}>
            <Text style={styles.statVal}>{v}</Text>
            <Text style={styles.statLabel}>{l}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#0a0a0f",
    alignItems: "center",
    padding: 28,
    paddingTop: 80,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 36,
  },
  logoIcon: { backgroundColor: "#00ff87", borderRadius: 8, padding: 8 },
  logoEmoji: { fontSize: 22 },
  logoText: { fontSize: 26, fontWeight: "800", color: "#f0ede8" },
  green: { color: "#00ff87" },
  hero: {
    fontSize: 34,
    fontWeight: "800",
    color: "#f0ede8",
    textAlign: "center",
    lineHeight: 42,
    marginBottom: 14,
  },
  sub: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 36,
    maxWidth: 320,
  },
  btnPrimary: {
    backgroundColor: "#00ff87",
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 4,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  btnPrimaryText: { color: "#0a0a0f", fontWeight: "700", fontSize: 15 },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: "#00ff87",
    paddingVertical: 13,
    borderRadius: 4,
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
  btnOutlineText: { color: "#00ff87", fontWeight: "600", fontSize: 15 },
  loginLink: { color: "#444", fontSize: 12, marginBottom: 32 },
  features: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 32,
  },
  featurePill: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "#2a2a3a",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  featureText: { color: "#777", fontSize: 11 },
  stats: { flexDirection: "row", gap: 32 },
  statItem: { alignItems: "center" },
  statVal: { fontSize: 20, fontWeight: "800", color: "#00ff87" },
  statLabel: { fontSize: 10, color: "#444", marginTop: 2 },
});
