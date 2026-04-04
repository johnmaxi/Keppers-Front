// app/map/index.tsx — GPS real con expo-location + Firebase Realtime
import Constants from "expo-constants";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { db } from "../../lib/firebase";
import { useAppStore } from "../../store/appStore";

const isExpoGo = Constants.appOwnership === "expo";

const DARK_MAP = [
  { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#304a7d" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#255763" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0e1626" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#283d6a" }],
  },
];

interface GpsData {
  lat: number;
  lng: number;
  updatedAt: number;
}

export default function MapScreen() {
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const router = useRouter();
  const { currentUser } = useAppStore();
  const mapRef = useRef<MapView>(null);

  const [svc, setSvc] = useState<any>(null);
  const [gkLocation, setGkLocation] = useState<GpsData | null>(null);
  const [myLocation, setMyLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  const [enCamino, setEnCamino] = useState(false);
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

  // Escuchar ubicación GPS del portero en Firestore
  useEffect(() => {
    if (!serviceId) return;
    const unsub = onSnapshot(doc(db, "gpsTracking", serviceId), (snap) => {
      if (snap.exists()) {
        setGkLocation(snap.data() as GpsData);
        setEnCamino(true);
      }
    });
    return () => unsub();
  }, [serviceId]);

  // Solicitar permisos de ubicación
  const requestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permiso requerido",
        "Necesitamos acceso a tu ubicación para el seguimiento.",
      );
      return false;
    }
    return true;
  };

  // Portero: iniciar envío de GPS
  const startTracking = async () => {
    const ok = await requestLocation();
    if (!ok || !serviceId) return;

    setTracking(true);
    locationSub.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000, // cada 3 segundos
        distanceInterval: 10, // o cada 10 metros
      },
      async (loc) => {
        const { latitude: lat, longitude: lng } = loc.coords;
        setMyLocation({ lat, lng });
        // Guardar en Firestore
        await updateDoc(doc(db, "gpsTracking", serviceId), {
          lat,
          lng,
          gkId: currentUser!.id,
          gkName: currentUser!.nombre,
          updatedAt: Date.now(),
          active: true,
        }).catch(async () => {
          // Si no existe el doc, crearlo
          const { setDoc } = await import("firebase/firestore");
          await setDoc(doc(db, "gpsTracking", serviceId), {
            lat,
            lng,
            gkId: currentUser!.id,
            gkName: currentUser!.nombre,
            updatedAt: Date.now(),
            active: true,
          });
        });

        // Centrar mapa en mi ubicación
        mapRef.current?.animateToRegion(
          {
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500,
        );
      },
    );
  };

  const stopTracking = async () => {
    locationSub.current?.remove();
    setTracking(false);
    if (serviceId) {
      await updateDoc(doc(db, "gpsTracking", serviceId), {
        active: false,
      }).catch(() => {});
    }
  };

  // Jugador: obtener mi ubicación para mostrar en mapa
  useEffect(() => {
    if (isGK) return;
    (async () => {
      const ok = await requestLocation();
      if (!ok) return;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setMyLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  useEffect(() => {
    return () => {
      locationSub.current?.remove();
    };
  }, []);

  // Región inicial del mapa
  const initialRegion = gkLocation
    ? {
        latitude: gkLocation.lat,
        longitude: gkLocation.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : myLocation
      ? {
          latitude: myLocation.lat,
          longitude: myLocation.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }
      : {
          latitude: 4.711,
          longitude: -74.0721,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#00ff87" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isGK ? "📍 Mi ubicación en vivo" : "📍 Seguimiento del portero"}
          </Text>
          {svc && (
            <Text style={styles.headerSub}>
              {svc.tipoPartido} · {svc.cancha}
            </Text>
          )}
        </View>
      </View>

      {/* Mapa */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={isExpoGo ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
        customMapStyle={DARK_MAP}
        initialRegion={initialRegion}
        showsUserLocation={!isGK}
        showsMyLocationButton={false}
      >
        {/* Marcador portero (GPS real) */}
        {gkLocation && (
          <Marker
            coordinate={{ latitude: gkLocation.lat, longitude: gkLocation.lng }}
            title="🧤 Portero"
            description={svc?.confirmedGkName || "Portero"}
          >
            <View style={styles.gkMarker}>
              <Text style={styles.gkMarkerText}>🧤</Text>
            </View>
          </Marker>
        )}

        {/* Marcador jugador */}
        {!isGK && myLocation && (
          <Marker
            coordinate={{ latitude: myLocation.lat, longitude: myLocation.lng }}
            title="⚽ Tú"
          >
            <View style={styles.playerMarker}>
              <Text style={styles.playerMarkerText}>⚽</Text>
            </View>
          </Marker>
        )}

        {/* Línea entre portero y jugador */}
        {gkLocation && myLocation && (
          <Polyline
            coordinates={[
              { latitude: gkLocation.lat, longitude: gkLocation.lng },
              { latitude: myLocation.lat, longitude: myLocation.lng },
            ]}
            strokeColor="#00ff87"
            strokeWidth={2}
            lineDashPattern={[8, 4]}
          />
        )}
      </MapView>

      {/* Panel inferior */}
      <View style={styles.panel}>
        {isGK ? (
          // Portero: botones de tracking
          <View>
            <Text style={styles.panelTitle}>
              {tracking
                ? "🟢 Compartiendo ubicación"
                : "📍 Compartir mi ubicación"}
            </Text>
            <Text style={styles.panelSub}>
              {tracking
                ? "El jugador puede verte en el mapa en tiempo real"
                : "Activa para que el jugador vea dónde estás"}
            </Text>
            <TouchableOpacity
              style={[styles.trackBtn, tracking && styles.trackBtnStop]}
              onPress={tracking ? stopTracking : startTracking}
            >
              <Text style={styles.trackBtnText}>
                {tracking ? "⏹ Dejar de compartir" : "▶ Iniciar seguimiento"}
              </Text>
            </TouchableOpacity>
            {serviceId && (
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() =>
                  router.push(`/chat?serviceId=${serviceId}` as any)
                }
              >
                <Text style={styles.chatBtnText}>💬 Abrir chat</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          // Jugador: ver estado del portero
          <View>
            <Text style={styles.panelTitle}>
              {enCamino ? "🧤 Portero en camino" : "⏳ Esperando al portero..."}
            </Text>
            <Text style={styles.panelSub}>
              {enCamino
                ? `${svc?.confirmedGkName || "El portero"} está compartiendo su ubicación`
                : "El portero aún no ha iniciado el seguimiento GPS"}
            </Text>
            {gkLocation && (
              <Text style={styles.lastUpdate}>
                Última actualización:{" "}
                {new Date(gkLocation.updatedAt).toLocaleTimeString("es-CO")}
              </Text>
            )}
            {serviceId && (
              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() =>
                  router.push(`/chat?serviceId=${serviceId}` as any)
                }
              >
                <Text style={styles.chatBtnText}>💬 Abrir chat</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0f" },
  center: {
    flex: 1,
    backgroundColor: "#0a0a0f",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 52,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e2a",
    gap: 10,
    backgroundColor: "#0a0a0f",
    zIndex: 10,
  },
  backBtn: { padding: 4 },
  backText: { color: "#00ff87", fontSize: 22, fontWeight: "700" },
  headerTitle: { fontSize: 14, fontWeight: "700", color: "#f0ede8" },
  headerSub: { fontSize: 11, color: "#555", marginTop: 1 },
  map: { flex: 1 },
  gkMarker: {
    backgroundColor: "#00ff87",
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: "#0a0a0f",
  },
  gkMarkerText: { fontSize: 18 },
  playerMarker: {
    backgroundColor: "#00aaff",
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: "#0a0a0f",
  },
  playerMarkerText: { fontSize: 18 },
  panel: {
    backgroundColor: "#13131c",
    borderTopWidth: 1,
    borderTopColor: "#1e1e2a",
    padding: 20,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#f0ede8",
    marginBottom: 4,
  },
  panelSub: { fontSize: 12, color: "#555", marginBottom: 14 },
  lastUpdate: { fontSize: 10, color: "#444", marginBottom: 10 },
  trackBtn: {
    backgroundColor: "#00ff87",
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  trackBtnStop: { backgroundColor: "#ff4757" },
  trackBtnText: { color: "#0a0a0f", fontWeight: "800", fontSize: 14 },
  chatBtn: {
    borderWidth: 1.5,
    borderColor: "#00aaff",
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: "center",
  },
  chatBtnText: { color: "#00aaff", fontWeight: "700", fontSize: 13 },
});
