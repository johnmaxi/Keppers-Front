// app/index.tsx — Landing page con splash AreloTech
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";

export default function Landing() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim  = new Animated.Value(0);
  const fadeMain  = new Animated.Value(0);

  useEffect(() => {
    // Fade in AreloTech logo
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 800, useNativeDriver: true,
    }).start();

    // After 2.5s fade out and show main
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0, duration: 600, useNativeDriver: true,
      }).start(() => {
        setShowSplash(false);
        Animated.timing(fadeMain, {
          toValue: 1, duration: 500, useNativeDriver: true,
        }).start();
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="light" />
        <Animated.View style={[styles.splashContent, { opacity: fadeAnim }]}>
          <Image
            source={require("../assets/images/arelotech_logo.png")}
            style={styles.areloLogo}
            resizeMode="contain"
          />
          <Text style={styles.splashTagline}>Desarrollado por AreloTech</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeMain }]}>
      <StatusBar style="light" />

      <View style={styles.hero}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}><Text style={styles.logoEmoji}>🧤</Text></View>
          <Text style={styles.logoText}>Keep<Text style={styles.green}>ers</Text></Text>
        </View>
        <Text style={styles.tagline}>
          Tu portero,{"\n"}
          <Text style={styles.green}>cuando lo necesitas.</Text>
        </Text>
        <Text style={styles.sub}>
          Reserva porteros de fútbol en toda Colombia.{"\n"}
          Contraofertas, mapa en vivo, chat y calificaciones.
        </Text>
      </View>

      <View style={styles.features}>
        {[
          ["⚡", "Respuesta inmediata", "Porteros disponibles en tu ciudad"],
          ["💬", "Negocia el precio",   "Ofertas y contraofertas en tiempo real"],
          ["📍", "Seguimiento GPS",     "Sigue al portero en tiempo real"],
          ["⭐", "Calificaciones",      "Sistema de reputación verificado"],
        ].map(([icon, title, desc]) => (
          <View key={title} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>{title}</Text>
              <Text style={styles.featureDesc}>{desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.btnGroup}>
        <TouchableOpacity style={styles.btnPrimary}
          onPress={() => router.push("/register" as any)}>
          <Text style={styles.btnPrimaryText}>Crear cuenta gratis</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnOutline}
          onPress={() => router.push("/login" as any)}>
          <Text style={styles.btnOutlineText}>Ya tengo cuenta · Iniciar sesión</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.poweredBy}>Desarrollado por AreloTech</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  splashContainer: { flex: 1, backgroundColor: "#0a0a0f", alignItems: "center", justifyContent: "center" },
  splashContent:   { alignItems: "center" },
  areloLogo:       { width: 260, height: 80, marginBottom: 16 },
  splashTagline:   { color: "#444", fontSize: 13, letterSpacing: 1 },
  container:       { flex: 1, backgroundColor: "#0a0a0f", padding: 24, paddingTop: 70, justifyContent: "space-between" },
  hero:            { alignItems: "center" },
  logoRow:         { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 28 },
  logoIcon:        { backgroundColor: "#00ff87", borderRadius: 10, padding: 10 },
  logoEmoji:       { fontSize: 22 },
  logoText:        { fontSize: 28, fontWeight: "800", color: "#f0ede8" },
  green:           { color: "#00ff87" },
  tagline:         { fontSize: 32, fontWeight: "800", color: "#f0ede8", textAlign: "center", lineHeight: 40, marginBottom: 14 },
  sub:             { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 22 },
  features:        { gap: 14 },
  featureRow:      { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#13131c", borderRadius: 8, padding: 14, borderWidth: 1, borderColor: "#1e1e2a" },
  featureIcon:     { fontSize: 22, width: 32, textAlign: "center" },
  featureTitle:    { color: "#f0ede8", fontWeight: "700", fontSize: 13 },
  featureDesc:     { color: "#555", fontSize: 11, marginTop: 2 },
  btnGroup:        { gap: 12 },
  btnPrimary:      { backgroundColor: "#00ff87", paddingVertical: 16, borderRadius: 6, alignItems: "center" },
  btnPrimaryText:  { color: "#0a0a0f", fontWeight: "800", fontSize: 16 },
  btnOutline:      { borderWidth: 1.5, borderColor: "#2a2a35", paddingVertical: 14, borderRadius: 6, alignItems: "center" },
  btnOutlineText:  { color: "#666", fontWeight: "600", fontSize: 13 },
  poweredBy:       { textAlign: "center", color: "#2a2a35", fontSize: 11, paddingBottom: 8 },
});
