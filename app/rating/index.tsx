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
    View
} from "react-native";
import { useAppStore } from "../../store/appStore";

const TAGS_GK = [
  "Puntual",
  "Buen nivel",
  "Profesional",
  "Comunicativo",
  "Buena actitud",
  "Eficiente",
];
const TAGS_PLY = [
  "Respetuoso",
  "Pagó a tiempo",
  "Buen ambiente",
  "Organizado",
  "Puntual",
  "Lo recomiendo",
];

export default function RatingScreen() {
  const router = useRouter();
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const { currentUser, services, updateService } = useAppStore();

  const svcId = parseInt(serviceId || "0");
  const svc = services.find((s) => s.id === svcId);
  const isPlayer = currentUser?.role === "player";

  const targetName = isPlayer ? svc?.confirmedGkName : svc?.playerName;
  const tags = isPlayer ? TAGS_GK : TAGS_PLY;
  const alreadyRated = isPlayer
    ? !!svc?.gkRatingGiven
    : !!svc?.playerRatingGiven;

  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const toggleTag = (t: string) =>
    setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  const submit = () => {
    if (stars === 0) {
      Alert.alert("Error", "Selecciona al menos una estrella");
      return;
    }
    if (isPlayer) {
      updateService(svcId, {
        gkRatingGiven: stars,
        gkRatingComment: comment,
        gkRatingTags: selected,
      } as any);
    } else {
      updateService(svcId, {
        playerRatingGiven: stars,
        playerRatingComment: comment,
        playerRatingTags: selected,
      } as any);
    }
    setSubmitted(true);
  };

  if (alreadyRated || submitted) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.successBox}>
          <Text style={styles.successEmoji}>⭐</Text>
          <Text style={styles.successTitle}>¡Gracias por calificar!</Text>
          <Text style={styles.successSub}>
            Tu calificación ayuda a construir una mejor comunidad en Keepers.
          </Text>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => router.back()}
          >
            <Text style={styles.btnPrimaryText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const displayStars = hover || stars;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calificación</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Avatar y nombre */}
      <View style={styles.targetBox}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>{isPlayer ? "🧤" : "⚽"}</Text>
        </View>
        <Text style={styles.targetName}>{targetName}</Text>
        <Text style={styles.targetRole}>
          {isPlayer ? "Portero" : "Jugador"}
        </Text>
        <View style={styles.svcInfo}>
          <Text style={styles.svcInfoText}>
            {svc?.tipoPartido} · {svc?.ciudad}
          </Text>
          <Text style={styles.svcInfoText}>
            {svc?.fecha} · {svc?.horas}h
          </Text>
        </View>
      </View>

      {/* Estrellas */}
      <Text style={styles.sectionLabel}>¿Cómo fue tu experiencia?</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            onPress={() => setStars(n)}
            onPressIn={() => setHover(n)}
            onPressOut={() => setHover(0)}
            style={styles.starBtn}
          >
            <Text style={[styles.star, n <= displayStars && styles.starActive]}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {displayStars > 0 && (
        <Text style={styles.starLabel}>
          {
            [
              "",
              "Muy malo 😞",
              "Malo 😐",
              "Regular 😊",
              "Bueno 👍",
              "Excelente 🔥",
            ][displayStars]
          }
        </Text>
      )}

      {/* Tags */}
      <Text style={styles.sectionLabel}>¿Qué destacas? (opcional)</Text>
      <View style={styles.tagsWrap}>
        {tags.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tag, selected.includes(t) && styles.tagActive]}
            onPress={() => toggleTag(t)}
          >
            <Text
              style={[
                styles.tagText,
                selected.includes(t) && styles.tagTextActive,
              ]}
            >
              {selected.includes(t) ? "✓ " : ""}
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Comentario */}
      <Text style={styles.sectionLabel}>Comentario (opcional)</Text>
      <TextInput
        style={styles.input}
        multiline
        placeholder={
          isPlayer
            ? "Ej. Excelente portero, muy profesional y puntual..."
            : "Ej. Buen ambiente, el jugador fue muy respetuoso..."
        }
        placeholderTextColor="#444"
        value={comment}
        onChangeText={setComment}
        maxLength={200}
      />
      <Text style={styles.charCount}>{comment.length}/200</Text>

      {/* Resumen */}
      {stars > 0 && (
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tu calificación</Text>
            <View style={styles.summaryStars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Text
                  key={n}
                  style={[
                    styles.summaryStar,
                    n <= stars && styles.summaryStarActive,
                  ]}
                >
                  ★
                </Text>
              ))}
            </View>
          </View>
          {selected.length > 0 && (
            <Text style={styles.summaryTags}>{selected.join(" · ")}</Text>
          )}
        </View>
      )}

      {/* Botón */}
      <TouchableOpacity
        style={[styles.btnPrimary, stars === 0 && styles.btnDisabled]}
        onPress={submit}
      >
        <Text style={styles.btnPrimaryText}>Enviar calificación</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipBtn} onPress={() => router.back()}>
        <Text style={styles.skipText}>Omitir por ahora</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0f" },
  container: { flexGrow: 1, backgroundColor: "#0a0a0f", paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e2a",
  },
  backBtn: { padding: 4 },
  backText: { color: "#f0ede8", fontSize: 22, fontWeight: "600" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#f0ede8" },
  targetBox: {
    alignItems: "center",
    paddingVertical: 28,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e2a",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#0f2a1a",
    borderWidth: 2.5,
    borderColor: "#00ff87",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarEmoji: { fontSize: 32 },
  targetName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#f0ede8",
    marginBottom: 4,
  },
  targetRole: { fontSize: 12, color: "#555", marginBottom: 10 },
  svcInfo: { alignItems: "center", gap: 2 },
  svcInfoText: { fontSize: 11, color: "#444" },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#888",
    marginTop: 24,
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 10,
  },
  starBtn: { padding: 6 },
  star: { fontSize: 42, color: "#2a2a35" },
  starActive: { color: "#ffa500" },
  starLabel: {
    textAlign: "center",
    color: "#888",
    fontSize: 14,
    marginBottom: 8,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tag: {
    borderWidth: 1.5,
    borderColor: "#2a2a35",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tagActive: { borderColor: "#00ff87", backgroundColor: "rgba(0,255,135,.08)" },
  tagText: { color: "#555", fontSize: 12, fontWeight: "600" },
  tagTextActive: { color: "#00ff87" },
  input: {
    backgroundColor: "#13131c",
    borderWidth: 1.5,
    borderColor: "#2a2a35",
    color: "#f0ede8",
    padding: 14,
    borderRadius: 8,
    fontSize: 14,
    height: 100,
    marginHorizontal: 16,
    textAlignVertical: "top",
  },
  charCount: {
    textAlign: "right",
    color: "#333",
    fontSize: 10,
    paddingRight: 16,
    marginTop: 4,
  },
  summaryBox: {
    backgroundColor: "rgba(0,255,135,.04)",
    borderWidth: 1,
    borderColor: "rgba(0,255,135,.2)",
    borderRadius: 8,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 12, color: "#777" },
  summaryStars: { flexDirection: "row", gap: 2 },
  summaryStar: { fontSize: 18, color: "#2a2a35" },
  summaryStarActive: { color: "#ffa500" },
  summaryTags: { fontSize: 11, color: "#00ff87", marginTop: 8 },
  btnPrimary: {
    backgroundColor: "#00ff87",
    paddingVertical: 15,
    borderRadius: 6,
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 20,
  },
  btnDisabled: { backgroundColor: "#1a2a1a" },
  btnPrimaryText: { color: "#0a0a0f", fontWeight: "700", fontSize: 15 },
  skipBtn: { alignItems: "center", marginTop: 14 },
  skipText: { color: "#333", fontSize: 12 },
  successBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  successEmoji: { fontSize: 64, marginBottom: 16 },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#f0ede8",
    marginBottom: 8,
  },
  successSub: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
});
