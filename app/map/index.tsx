// app/map/index.tsx — GPS real con expo-location + Firebase
import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { doc, updateDoc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAppStore } from "../../store/appStore";
import Constants from "expo-constants";

const isExpoGo = Constants.appOwnership === "expo";

const DARK_MAP = [
  { elementType: "geometry",            stylers: [{ color: "#1d2c4d" }] },
  { elementType: "labels.text.fill",    stylers: [{ color: "#8ec3b9" }] },
  { elementType: "labels.text.stroke",  stylers: [{ color: "#1a3646" }] },
  { featureType: "road", elementType: "geometry",        stylers: [{ color: "#304a7d" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#255763" }] },
  { featureType: "water", elementType: "geometry",       stylers: [{ color: "#0e1626" }] },
  { featureType: "poi",   elementType: "geometry",       stylers: [{ color: "#283d6a" }] },
];

export default function MapScreen() {
  const { serviceId }   = useLocalSearchParams<{ serviceId: string }>();
  const router          = useRouter();
  const { currentUser } = useAppStore();
  const mapRef          = useRef<MapView>(null);

  const [svc,        setSvc]        = useState<any>(null);
  const [gkLocation, setGkLocation] = useState<{ lat: number; lng: number; updatedAt: number } | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [tracking,   setTracking]   = useState(false);
  const locationSub = useRef<Location.LocationSubscription | null>(null);

  const isGK = currentUser?.role === "goalkeeper";

  // Cargar servicio
  useEffect(() => {
    if (!serviceId) return;
    getDoc(doc(db, "services", serviceId)).then((snap) => {
      if (snap.exists()) setSvc({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
  }, [serviceId]);

  // Escuchar GPS del portero en tiempo real
  useEffect(() => {
    if (!serviceId) return;
    const unsub = onSnapshot(doc(db, "gpsTracking", serviceId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.active) {
          setGkLocation({ lat: data.lat, lng: data.lng, updatedAt: data.updatedAt });
          // Animar mapa a la ubicación del portero
          mapRef.current?.animateToRegion({
            latitude:       data.lat,
            longitude:      data.lng,
            latitudeDelta:  0.01,
            longitudeDelta: 0.01,
          }, 800);
        }
      }
    });
    return () => unsub();
  }, [serviceId]);

  // Obtener ubicación del jugador
  useEffect(() => {
    if (isGK) return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setMyLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  // Portero: iniciar tracking
  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Necesitamos acceso a tu ubicación.");
      return;
    }
    setTracking(true);
    Alert.alert("📍 Seguimiento activo", "El jugador puede ver tu ubicación en tiempo real.");

    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
      async (loc) => {
        const { latitude: lat, longitude: lng } = loc.coords;
        setMyLocation({ lat, lng });
        mapRef.current?.animateToRegion({
          latitude: lat, longitude: lng,
          latitudeDelta: 0.01, longitudeDelta: 0.01,
        }, 500);
        try {
          await setDoc(doc(db, "gpsTracking", serviceId!), {
            lat, lng,
            gkId:      currentUser!.id,
            gkName:    currentUser!.nombre,
            updatedAt: Date.now(),
            active:    true,
          }, { merge: true });
        } catch (e) { console.error("GPS write error:", e); }
      }
    );
  };

  const stopTracking = async () => {
    locationSub.current?.remove();
    setTracking(false);
    try {
      await setDoc(doc(db, "gpsTracking", serviceId!), { active: false }, { merge: true });
    } catch {}
    Alert.alert("⏹ Seguimiento detenido", "Ya no compartes tu ubicación.");
  };

  useEffect(() => () => { locationSub.current?.remove(); }, []);

  const initialRegion = gkLocation
    ? { latitude: gkLocation.lat, longitude: gkLocation.lng, latitudeDelta: 0.015, longitudeDelta: 0.015 }
    : myLocation
    ? { latitude: myLocation.lat, longitude: myLocation.lng, latitudeDelta: 0.015, longitudeDelta: 0.015 }
    : { latitude: 4.7110, longitude: -74.0721, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator color="#00ff87" size="large" /></View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isGK ? "📍 Mi ubicación en vivo" : "📍 Seguimiento del portero"}
          </Text>
          {svc && <Text style={styles.headerSub}>{svc.tipoPartido} · {svc.cancha}</Text>}
        </View>
        {serviceId && (
          <TouchableOpacity style={styles.chatBtn}
            onPress={() => router.push(`/chat?serviceId=${serviceId}` as any)}>
            <Text style={styles.chatBtnText}>💬</Text>
          </TouchableOpacity>
        )}
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={isExpoGo ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
        customMapStyle={isExpoGo ? [] : DARK_MAP}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton>

        {/* Marcador portero */}
        {gkLocation && (
          <Marker
            coordinate={{ latitude: gkLocation.lat, longitude: gkLocation.lng }}
            title={`🧤 ${svc?.confirmedGkName || "Portero"}`}
            description="Ubicación en tiempo real">
            <View style={styles.gkMarker}>
              <Text style={styles.gkMarkerText}>🧤</Text>
            </View>
          </Marker>
        )}

        {/* Línea portero → jugador */}
        {gkLocation && myLocation && (
          <Polyline
            coordinates={[
              { latitude: gkLocation.lat, longitude: gkLocation.lng },
              { latitude: myLocation.lat, longitude: myLocation.lng },
            ]}
            strokeColor="#00ff87"
            strokeWidth={3}
            lineDashPattern={[8, 4]}
          />
        )}
      </MapView>

      <View style={styles.panel}>
        {isGK ? (
          <View>
            <View style={styles.panelRow}>
              {tracking && <View style={styles.pulseDot} />}
              <Text style={styles.panelTitle}>
                {tracking ? "Compartiendo ubicación en vivo" : "Compartir mi ubicación"}
              </Text>
            </View>
            <Text style={styles.panelSub}>
              {tracking
                ? "El jugador ve tu posición actualizada cada 3 segundos"
                : "Activa para que el jugador pueda seguirte"}
            </Text>
            <TouchableOpacity
              style={[styles.trackBtn, tracking && styles.trackBtnStop]}
              onPress={tracking ? stopTracking : startTracking}>
              <Text style={styles.trackBtnText}>
                {tracking ? "⏹ Detener seguimiento" : "▶ Iniciar seguimiento GPS"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.panelTitle}>
              {gkLocation ? `🧤 ${svc?.confirmedGkName || "Portero"} en camino` : "⏳ Esperando al portero..."}
            </Text>
            <Text style={styles.panelSub}>
              {gkLocation
                ? `Última actualización: ${new Date(gkLocation.updatedAt).toLocaleTimeString("es-CO")}`
                : "El portero aún no ha iniciado el seguimiento GPS"}
            </Text>
            {!gkLocation && (
              <Text style={styles.panelHint}>
                El portero debe presionar "Iniciar seguimiento" en su mapa
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: "#0a0a0f" },
  center:          { flex: 1, backgroundColor: "#0a0a0f", alignItems: "center", justifyContent: "center" },
  header:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 52, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#1e1e2a", gap: 10, backgroundColor: "#0a0a0f", zIndex: 10 },
  backBtn:         { padding: 4 },
  backText:        { color: "#00ff87", fontSize: 22, fontWeight: "700" },
  headerTitle:     { fontSize: 14, fontWeight: "700", color: "#f0ede8" },
  headerSub:       { fontSize: 11, color: "#555", marginTop: 1 },
  chatBtn:         { width: 38, height: 38, backgroundColor: "#16161f", borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#2a2a35" },
  chatBtnText:     { fontSize: 18 },
  map:             { flex: 1 },
  gkMarker:        { backgroundColor: "#00ff87", borderRadius: 20, padding: 8, borderWidth: 2, borderColor: "#0a0a0f", shadowColor: "#00ff87", shadowOpacity: 0.8, shadowRadius: 8, elevation: 5 },
  gkMarkerText:    { fontSize: 20 },
  panel:           { backgroundColor: "#13131c", borderTopWidth: 1, borderTopColor: "#1e1e2a", padding: 20, paddingBottom: 32 },
  panelRow:        { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  pulseDot:        { width: 10, height: 10, borderRadius: 5, backgroundColor: "#00ff87" },
  panelTitle:      { fontSize: 15, fontWeight: "800", color: "#f0ede8" },
  panelSub:        { fontSize: 12, color: "#555", marginBottom: 14 },
  panelHint:       { fontSize: 11, color: "#444", fontStyle: "italic" },
  trackBtn:        { backgroundColor: "#00ff87", paddingVertical: 14, borderRadius: 8, alignItems: "center" },
  trackBtnStop:    { backgroundColor: "#ff4757" },
  trackBtnText:    { color: "#0a0a0f", fontWeight: "800", fontSize: 14 },
});