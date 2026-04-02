import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { CANCHA_COORDS } from "../../components/constants";
import { useAppStore } from "../../store/appStore";

export default function LiveMap() {
  const router = useRouter();
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const { currentUser, services } = useAppStore();

  const svcId = serviceId || "";
  const svc = services.find((s) => s.id === svcId);
  const isGK = currentUser?.role === "goalkeeper";

  // Coordenadas de la cancha
  const canchaCoords = CANCHA_COORDS[svc?.cancha || ""] || [4.711, -74.0721];
  const canchaLatLng = {
    latitude: canchaCoords[0],
    longitude: canchaCoords[1],
  };

  // Posición inicial del portero (offset desde la cancha)
  const gkStart = {
    latitude: canchaCoords[0] - 0.009,
    longitude: canchaCoords[1] - 0.013,
  };

  // Posición del jugador (otro offset)
  const playerPos = {
    latitude: canchaCoords[0] + 0.007,
    longitude: canchaCoords[1] + 0.009,
  };

  const [gkPos, setGkPos] = useState(gkStart);
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState(14);
  const [route, setRoute] = useState([gkStart, canchaLatLng]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const mapRef = useRef<MapView>(null);

  const arrived =
    progress >= 100 ||
    svc?.status === "in_progress" ||
    svc?.status === "completed";

  // Animación de pulso en el marcador del portero
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // Movimiento del portero hacia la cancha
  useEffect(() => {
    if (arrived) {
      setGkPos(canchaLatLng);
      setProgress(100);
      setEta(0);
      return;
    }
    const interval = setInterval(() => {
      setProgress((p) => {
        const np = Math.min(p + 1.2, 100);
        const frac = np / 100;
        const newPos = {
          latitude:
            gkStart.latitude * (1 - frac) + canchaLatLng.latitude * frac,
          longitude:
            gkStart.longitude * (1 - frac) + canchaLatLng.longitude * frac,
        };
        setGkPos(newPos);
        setRoute([newPos, canchaLatLng]);
        setEta(Math.max(0, Math.round(14 * (1 - np / 100))));
        // Centrar mapa en el portero mientras avanza
        if (!isGK) {
          mapRef.current?.animateToRegion(
            { ...newPos, latitudeDelta: 0.03, longitudeDelta: 0.03 },
            300,
          );
        }
        return np;
      });
    }, 350);
    return () => clearInterval(interval);
  }, [arrived]);

  // Estado del servicio
  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: "Portero en camino", color: "#ffa500" },
    confirmed: { label: "Portero en camino", color: "#ffa500" },
    in_progress: { label: "🟢 En progreso", color: "#00ff87" },
    completed: { label: "✓ Completado", color: "#888" },
  };
  const statusInfo = statusMap[svc?.status ?? "confirmed"] ?? {
    label: "–",
    color: "#888",
  };

  // Región inicial del mapa
  const initialRegion = {
    latitude: (gkStart.latitude + canchaLatLng.latitude) / 2,
    longitude: (gkStart.longitude + canchaLatLng.longitude) / 2,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>EN VIVO</Text>
            <Text style={styles.headerSub}>
              {isGK ? "· Tu ruta a la cancha" : "· Seguimiento del portero"}
            </Text>
          </View>
          <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
        <View style={styles.etaBadge}>
          <Text style={styles.etaVal}>{arrived ? "✓" : `~${eta}`}</Text>
          <Text style={styles.etaUnit}>{arrived ? "llegó" : "min"}</Text>
        </View>
      </View>

      {/* Mapa */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        customMapStyle={darkMapStyle}
        showsUserLocation={false}
        showsTraffic={false}
        showsBuildings={false}
      >
        {/* Ruta punteada portero → cancha */}
        {!arrived && (
          <Polyline
            coordinates={route}
            strokeColor="#00ff87"
            strokeWidth={3}
            lineDashPattern={[8, 6]}
          />
        )}

        {/* Marcador CANCHA */}
        <Marker coordinate={canchaLatLng} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.canchaMarker}>
            <Text style={styles.canchaEmoji}>⚽</Text>
          </View>
        </Marker>

        {/* Marcador JUGADOR */}
        <Marker
          coordinate={playerPos}
          anchor={{ x: 0.5, y: 0.5 }}
          title={isGK ? svc?.playerName || "Jugador" : "Tú"}
        >
          <View style={styles.playerMarker}>
            <Text style={styles.markerEmoji}>🙋</Text>
          </View>
        </Marker>

        {/* Marcador PORTERO (animado) */}
        <Marker
          coordinate={gkPos}
          anchor={{ x: 0.5, y: 0.5 }}
          title={isGK ? "Tú" : svc?.confirmedGkName || "Portero"}
        >
          <Animated.View
            style={[
              styles.gkMarker,
              { transform: [{ scale: arrived ? 1 : pulseAnim }] },
            ]}
          >
            <Text style={styles.markerEmoji}>🧤</Text>
          </Animated.View>
        </Marker>
      </MapView>

      {/* Panel inferior */}
      <View style={styles.bottomPanel}>
        {/* Info de la cancha */}
        <View style={styles.canchaInfo}>
          <View style={styles.canchaInfoLeft}>
            <Text style={styles.canchaName}>{svc?.cancha || "Cancha"}</Text>
            <Text style={styles.canchaCity}>
              {svc?.ciudad} · {svc?.tipoPartido}
            </Text>
          </View>
          <View style={styles.canchaInfoRight}>
            <Text style={styles.canchaHora}>{svc?.hora}</Text>
            <Text style={styles.canchaFecha}>{svc?.fecha}</Text>
          </View>
        </View>

        {/* Barra de progreso */}
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>
            {isGK ? "Tu progreso" : "Portero en camino"}
          </Text>
          <Text style={styles.progressPct}>{Math.round(progress)}%</Text>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        {/* Leyenda */}
        <View style={styles.legend}>
          {[
            [
              "🧤",
              isGK ? "Tú" : svc?.confirmedGkName?.split(" ")[0] || "Portero",
              "#00ff87",
            ],
            [
              "🙋",
              isGK ? svc?.playerName?.split(" ")[0] || "Jugador" : "Tú",
              "#00aaff",
            ],
            [
              "⚽",
              (svc?.cancha || "Cancha").split(" ").slice(0, 2).join(" "),
              "#ffa500",
            ],
          ].map(([emoji, label, color]) => (
            <View key={label as string} style={styles.legendItem}>
              <Text style={styles.legendEmoji}>{emoji}</Text>
              <Text style={[styles.legendLabel, { color: color as string }]}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* Botón volver al chat */}
        <TouchableOpacity
          style={styles.btnChat}
          onPress={() => router.push(`/chat?serviceId=${svcId}` as any)}
        >
          <Text style={styles.btnChatText}>💬 Ir al chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Estilo oscuro para el mapa de Google
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0a0a0f" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1e2535" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#2a3040" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#050d1a" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#1e1e2a" }],
  },
];

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0f" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
    backgroundColor: "#0d0d16",
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e2a",
  },
  backBtn: { padding: 4 },
  backText: { color: "#f0ede8", fontSize: 22, fontWeight: "600" },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#00ff87" },
  liveText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#00ff87",
    letterSpacing: 1,
  },
  headerSub: { fontSize: 11, color: "#555" },
  statusLabel: { fontSize: 12, fontWeight: "700", marginTop: 3 },
  etaBadge: {
    backgroundColor: "#13131c",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    minWidth: 52,
  },
  etaVal: { fontSize: 18, fontWeight: "800", color: "#00ff87" },
  etaUnit: { fontSize: 9, color: "#555", marginTop: 1 },
  map: { flex: 1 },
  canchaMarker: {
    backgroundColor: "#0a2018",
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: "#00ff87",
  },
  canchaEmoji: { fontSize: 18 },
  playerMarker: {
    backgroundColor: "#0a1525",
    borderRadius: 16,
    padding: 6,
    borderWidth: 2,
    borderColor: "#00aaff",
  },
  gkMarker: {
    backgroundColor: "#0a2010",
    borderRadius: 16,
    padding: 6,
    borderWidth: 2.5,
    borderColor: "#00ff87",
  },
  markerEmoji: { fontSize: 16 },
  bottomPanel: {
    backgroundColor: "#0d0d16",
    borderTopWidth: 1,
    borderTopColor: "#1e1e2a",
    padding: 16,
    paddingBottom: 28,
  },
  canchaInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  canchaInfoLeft: { flex: 1 },
  canchaName: { fontWeight: "700", fontSize: 14, color: "#f0ede8" },
  canchaCity: { fontSize: 11, color: "#555", marginTop: 3 },
  canchaInfoRight: { alignItems: "flex-end" },
  canchaHora: { fontWeight: "800", fontSize: 16, color: "#00ff87" },
  canchaFecha: { fontSize: 11, color: "#555", marginTop: 2 },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: { fontSize: 11, color: "#555" },
  progressPct: { fontSize: 11, fontWeight: "700", color: "#00ff87" },
  progressBg: {
    height: 4,
    backgroundColor: "#1e1e2a",
    borderRadius: 2,
    marginBottom: 14,
  },
  progressFill: { height: "100%", backgroundColor: "#00ff87", borderRadius: 2 },
  legend: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 14,
  },
  legendItem: { alignItems: "center", gap: 4 },
  legendEmoji: { fontSize: 18 },
  legendLabel: { fontSize: 10, fontWeight: "700" },
  btnChat: {
    borderWidth: 1.5,
    borderColor: "#00aaff",
    borderRadius: 6,
    padding: 11,
    alignItems: "center",
  },
  btnChatText: { color: "#00aaff", fontWeight: "700", fontSize: 13 },
});
