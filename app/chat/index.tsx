// app/chat/index.tsx — Chat real con Firebase
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../lib/firebase";
import { useAppStore } from "../../store/appStore";

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: any;
}

export default function Chat() {
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const router = useRouter();
  const { currentUser, services } = useAppStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [svcInfo, setSvcInfo] = useState<any>(null);
  const listRef = useRef<FlatList>(null);

  const svc = services.find((s) => s.id === serviceId);

  useEffect(() => {
    if (!serviceId) return;

    // Cargar info del servicio
    getDoc(doc(db, "services", serviceId)).then((snap) => {
      if (snap.exists()) setSvcInfo(snap.data());
    });

    // Escuchar mensajes en tiempo real
    const q = query(
      collection(db, "chats", serviceId, "messages"),
      orderBy("createdAt", "asc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as Message,
        );
        setMessages(msgs);
        setLoading(false);
        // Scroll al final
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      },
      (err) => {
        console.error("Chat error:", err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [serviceId]);

  const sendMessage = async () => {
    if (!text.trim() || !currentUser || !serviceId) return;
    const msg = text.trim();
    setText("");
    setSending(true);
    try {
      await addDoc(collection(db, "chats", serviceId, "messages"), {
        text: msg,
        senderId: currentUser.id,
        senderName: currentUser.nombre,
        createdAt: serverTimestamp(),
      });
    } catch (e: any) {
      Alert.alert("Error", "No se pudo enviar el mensaje");
      setText(msg);
    } finally {
      setSending(false);
    }
  };

  const svcTitle = svcInfo
    ? `${svcInfo.tipoPartido} · ${svcInfo.ciudad}`
    : "Chat";

  const otherName =
    currentUser?.role === "player"
      ? svc?.confirmedGkName || svcInfo?.confirmedGkName || "Portero"
      : svc?.playerName || svcInfo?.playerName || "Jugador";

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.senderId === currentUser?.id;
    return (
      <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
        {!isMine && (
          <View style={styles.msgAvatar}>
            <Text style={styles.msgAvatarText}>
              {item.senderName?.charAt(0) || "?"}
            </Text>
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleOther,
          ]}
        >
          {!isMine && (
            <Text style={styles.bubbleSender}>{item.senderName}</Text>
          )}
          <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
            {item.text}
          </Text>
          <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
            {item.createdAt?.toDate
              ? item.createdAt
                  .toDate()
                  .toLocaleTimeString("es-CO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
              : ""}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {svcTitle}
          </Text>
          <Text style={styles.headerSub}>💬 Chat con {otherName}</Text>
        </View>
        {serviceId && (
          <TouchableOpacity
            style={styles.mapBtn}
            onPress={() => router.push(`/map?serviceId=${serviceId}` as any)}
          >
            <Text style={styles.mapBtnText}>📍</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Mensajes */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#00ff87" size="large" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatEmoji}>💬</Text>
              <Text style={styles.emptyChatText}>
                Inicia la conversación con {otherName}
              </Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder={`Mensaje a ${otherName}...`}
          placeholderTextColor="#444"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!text.trim() || sending) && styles.sendBtnDisabled,
          ]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color="#0a0a0f" size="small" />
          ) : (
            <Text style={styles.sendBtnText}>↑</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0a0f" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 52,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e2a",
    gap: 10,
  },
  backBtn: { padding: 4 },
  backText: { color: "#00ff87", fontSize: 22, fontWeight: "700" },
  headerTitle: { fontSize: 14, fontWeight: "700", color: "#f0ede8" },
  headerSub: { fontSize: 11, color: "#555", marginTop: 1 },
  mapBtn: { padding: 8, backgroundColor: "#16161f", borderRadius: 8 },
  mapBtnText: { fontSize: 18 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  messageList: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  msgRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-end",
    gap: 8,
  },
  msgRowMine: { flexDirection: "row-reverse" },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2a2a35",
    alignItems: "center",
    justifyContent: "center",
  },
  msgAvatarText: { color: "#f0ede8", fontSize: 11, fontWeight: "700" },
  bubble: { maxWidth: "75%", borderRadius: 16, padding: 10 },
  bubbleMine: { backgroundColor: "#00ff87", borderBottomRightRadius: 4 },
  bubbleOther: {
    backgroundColor: "#16161f",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#2a2a35",
  },
  bubbleSender: {
    fontSize: 10,
    color: "#555",
    fontWeight: "700",
    marginBottom: 3,
  },
  bubbleText: { fontSize: 14, color: "#f0ede8", lineHeight: 20 },
  bubbleTextMine: { color: "#0a0a0f" },
  bubbleTime: {
    fontSize: 9,
    color: "#888",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  bubbleTimeMine: { color: "#0a0a0f80" },
  emptyChat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyChatEmoji: { fontSize: 40, marginBottom: 10 },
  emptyChatText: { color: "#444", fontSize: 14, textAlign: "center" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#1e1e2a",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#16161f",
    borderWidth: 1,
    borderColor: "#2a2a35",
    color: "#f0ede8",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#00ff87",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#1a3a1a" },
  sendBtnText: { color: "#0a0a0f", fontSize: 18, fontWeight: "800" },
});
