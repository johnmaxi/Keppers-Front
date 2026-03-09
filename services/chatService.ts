// services/chatService.ts
// Chat en tiempo real con Firestore

import {
  collection, addDoc, onSnapshot,
  query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export interface Message {
  id:         string;
  senderId:   string;
  senderName: string;
  text:       string;
  createdAt:  any;
}

// ── Enviar mensaje ────────────────────────────────────────────────────────────
// Cada chat vive en: chats/{serviceId}/messages/{msgId}
export async function sendMessage(
  serviceId: string,
  msg: Omit<Message, "id" | "createdAt">
): Promise<void> {
  await addDoc(
    collection(db, "chats", serviceId, "messages"),
    { ...msg, createdAt: serverTimestamp() }
  );
}

// ── Escuchar mensajes en tiempo real ──────────────────────────────────────────
export function listenMessages(
  serviceId: string,
  callback: (messages: Message[]) => void
): () => void {
  const q = query(
    collection(db, "chats", serviceId, "messages"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Message));
  });
}
