// services/serviceService.ts
// CRUD de solicitudes/servicios en Firestore con escucha en tiempo real

import {
  collection, doc, addDoc, updateDoc, onSnapshot,
  query, where, orderBy, serverTimestamp, arrayUnion,
  Timestamp, DocumentData,
} from "firebase/firestore";
import { db } from "../lib/firebase";

// ── Tipos ────────────────────────────────────────────────────────────────────
export interface Offer {
  id:            string;
  gkId:          string;
  gkName:        string;
  gkRating:      number;
  amount:        number;
  status:        "pending" | "accepted" | "rejected" | "countered";
  mensaje:       string;
  counterAmount: number | null;
  counterHoras:  number | null;
  counterMsg:    string | null;
  createdAt:     any;
}

export interface Service {
  id:              string;
  playerId:        string;
  playerName:      string;
  ciudad:          string;
  cancha:          string;
  tipoPartido:     string;
  horas:           number;
  medioPago:       string;
  fecha:           string;
  hora:            string;
  nota:            string;
  status:          "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  total:           number;
  ofertas:         Offer[];
  acceptedOffer:   string | null;
  confirmedGkId:   string | null;
  confirmedGkName: string | null;
  gkRatingGiven:   number | null;
  playerRatingGiven: number | null;
  createdAt:       any;
}

// ── Crear solicitud ───────────────────────────────────────────────────────────
export async function createService(data: Omit<Service, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "services"), {
    ...data,
    ofertas:           [],
    acceptedOffer:     null,
    confirmedGkId:     null,
    confirmedGkName:   null,
    gkRatingGiven:     null,
    playerRatingGiven: null,
    createdAt:         serverTimestamp(),
  });
  return ref.id;
}

// ── Actualizar servicio ───────────────────────────────────────────────────────
export async function updateService(
  serviceId: string,
  patch: Partial<Service>
): Promise<void> {
  await updateDoc(doc(db, "services", serviceId), patch as DocumentData);
}

// ── Agregar oferta ────────────────────────────────────────────────────────────
export async function addOffer(serviceId: string, offer: Omit<Offer, "createdAt">): Promise<void> {
  await updateDoc(doc(db, "services", serviceId), {
    ofertas: arrayUnion({ ...offer, createdAt: Timestamp.now() }),
  });
}

// ── Actualizar oferta (por índice) ────────────────────────────────────────────
// Firestore no permite actualizar array items directamente — traemos, modificamos, guardamos
import { getDoc } from "firebase/firestore";

export async function updateOffer(
  serviceId: string,
  offerId: string,
  patch: Partial<Offer>
): Promise<void> {
  const snap    = await getDoc(doc(db, "services", serviceId));
  if (!snap.exists()) return;
  const ofertas: Offer[] = snap.data().ofertas || [];
  const updated = ofertas.map((o) => o.id === offerId ? { ...o, ...patch } : o);
  await updateDoc(doc(db, "services", serviceId), { ofertas: updated });
}

// ── Escuchar solicitudes disponibles (portero) ────────────────────────────────
export function listenAvailableServices(
  callback: (services: Service[]) => void
): () => void {
  const q = query(
    collection(db, "services"),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Service));
  });
}

// ── Escuchar mis solicitudes (jugador) ────────────────────────────────────────
export function listenPlayerServices(
  playerId: string,
  callback: (services: Service[]) => void
): () => void {
  const q = query(
    collection(db, "services"),
    where("playerId", "==", playerId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Service));
  });
}

// ── Escuchar mis servicios (portero) ──────────────────────────────────────────
export function listenGoalkeeperServices(
  gkId: string,
  callback: (services: Service[]) => void
): () => void {
  const q = query(
    collection(db, "services"),
    where("confirmedGkId", "==", gkId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Service));
  });
}
