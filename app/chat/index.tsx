import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAppStore } from "../../store/appStore";

const AUTO_REPLIES = [
  "¡Ya voy en camino! 🧤",
  "¿A qué hora exactamente?",
  "Unos 8 minutos llego.",
  "¿Necesito traer algo?",
  "Listo, confirmo 👍",
  "¿Cuántos jugadores van?",
  "Entendido, ahí estaré.",
  "¡Buena suerte en el partido!",
  "Ya estoy en la cancha.",
  "¿Cómo quieren el calentamiento?",
];

export default function ChatScreen() {
  const router = useRouter();
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const { currentUser, services, chats, addMessage } = useAppStore();
  const [text, setText] = useState("");
  const flatRef = useRef<FlatList>(null);

  const svcId = serviceId || "";
  const svc = services.find((s) => s.id === svcId);
  const msgs = chats[svcId] || [];

  const isPlayer = currentUser?.role === "player";
  const otherName = isPlayer ? svc?.confirmedGkName : svc?.playerName;
  const active = svc?.status === "confirmed" || svc?.status === "in_progress";

  useEffect(() => {
    if (msgs.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [msgs.length]);

  const send = () => {
    if (!text.trim() || !active) return;
    const msg = {
      id: Date.now(),
      senderId: currentUser!.id,
      senderName: currentUser!.nombre,
      text: text.trim(),
      ts: new Date().toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    addMessage(svcId, msg);
    setText("");

    // Auto-respuesta simulada
    if (Math.random() > 0.35) {
      setTimeout(
        () => {
          const auto = {
            id: Date.now() + 1,
            senderId: -1,
            senderName: otherName || "Usuario",
            text: AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)],
            ts: new Date().toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
          addMessage(svcId, auto);
        },
        900 + Math.random() * 900,
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{otherName?.charAt(0) || "?"}</Text>
          </View>
          <View>
            <Text style={styles.headerName}>{otherName || "Chat"}</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>
                {active ? "En línea" : "Chat no disponible"}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.svcBadge}>
          <Text style={styles.svcBadgeText}>{svc?.tipoPartido}</Text>
        </View>
      </View>

      {/* Mensajes */}
      {msgs.length === 0 ? (
        <View style={styles.emptyChat}>
          <Text style={styles.emptyChatEmoji}>💬</Text>
          <Text style={styles.emptyChatText}>
            {active
              ? "Inicia la conversación"
              : "El chat se habilita cuando el servicio es confirmado"}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={msgs}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() =>
            flatRef.current?.scrollToEnd({ animated: true })
          }
          renderItem={({ item: m }) => {
            const mine = m.senderId === currentUser?.id;
            return (
              <View
                style={[
                  styles.msgRow,
                  mine ? styles.msgRowMine : styles.msgRowOther,
                ]}
              >
                {!mine && (
                  <View style={styles.msgAvatar}>
                    <Text style={styles.msgAvatarText}>
                      {m.senderName?.charAt(0)}
                    </Text>
                  </View>
                )}
                <View style={styles.msgColumn}>
                  <View
                    style={[
                      styles.bubble,
                      mine ? styles.bubbleMine : styles.bubbleOther,
                    ]}
                  >
                    <Text
                      style={[styles.bubbleText, mine && styles.bubbleTextMine]}
                    >
                      {m.text}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.msgTs,
                      mine ? styles.msgTsMine : styles.msgTsOther,
                    ]}
                  >
                    {m.ts}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        {active ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#444"
              value={text}
              onChangeText={setText}
              onSubmitEditing={send}
              returnKeyType="send"
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
              onPress={send}
            >
              <Text style={styles.sendBtnText}>➤</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.chatDisabled}>
            Chat disponible solo cuando el servicio está confirmado
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0f" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e2a",
    backgroundColor: "#0d0d16",
  },
  backBtn: { padding: 4 },
  backText: { color: "#f0ede8", fontSize: 22, fontWeight: "600" },
  headerInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#00ff87",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontWeight: "800", fontSize: 14, color: "#0a0a0f" },
  headerName: { fontWeight: "700", fontSize: 14, color: "#f0ede8" },
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00ff87",
  },
  onlineText: { fontSize: 10, color: "#00ff87" },
  svcBadge: {
    backgroundColor: "rgba(0,255,135,.1)",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  svcBadgeText: { color: "#00ff87", fontSize: 9, fontWeight: "700" },
  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyChatEmoji: { fontSize: 48, marginBottom: 12 },
  emptyChatText: {
    color: "#444",
    fontSize: 13,
    textAlign: "center",
    maxWidth: 240,
  },
  msgList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: "row", marginBottom: 14, alignItems: "flex-end" },
  msgRowMine: { justifyContent: "flex-end" },
  msgRowOther: { justifyContent: "flex-start" },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1e1e2a",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
    marginBottom: 2,
  },
  msgAvatarText: { fontSize: 11, fontWeight: "700", color: "#888" },
  msgColumn: { maxWidth: "72%" },
  bubble: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleMine: { backgroundColor: "#00ff87", borderBottomRightRadius: 2 },
  bubbleOther: { backgroundColor: "#1a1a28", borderBottomLeftRadius: 2 },
  bubbleText: { fontSize: 14, color: "#f0ede8", lineHeight: 20 },
  bubbleTextMine: { color: "#0a0a0f" },
  msgTs: { fontSize: 9, marginTop: 3, color: "#444" },
  msgTsMine: { textAlign: "right" },
  msgTsOther: { textAlign: "left" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: "#1e1e2a",
    backgroundColor: "#0d0d16",
  },
  input: {
    flex: 1,
    backgroundColor: "#16161f",
    borderWidth: 1.5,
    borderColor: "#2a2a35",
    color: "#f0ede8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#00ff87",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#1a2a1a" },
  sendBtnText: { color: "#0a0a0f", fontSize: 16, fontWeight: "800" },
  chatDisabled: {
    flex: 1,
    color: "#444",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 14,
  },
});
