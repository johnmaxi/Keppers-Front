// services/serviceService.ts
import {
  collection, doc, addDoc, updateDoc, onSnapshot,
  query, where, orderBy, serverTimestamp, getDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";

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
}

export interface Service {
  id:               string;
  playerId:         string;
  playerName:       string;
  ciudad:           string;
  cancha:           string;
  tipoPartido:      string;
  horas:            number;
  medioPago:        string;
  fecha:            string;
  hora:             string;
  nota:             string;
  status:           "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  total:            number;
  ofertas:          Offer[];
  acceptedOffer:    string | null;
  confirmedGkId:    string | null;
  confirmedGkName:  string | null;
  gkRatingGiven:    number | null;
  playerRatingGiven:number | null;
  createdAt:        any;
  startedAt?:       string;
  completedAt?:     string;
}

// ── Crear solicitud ───────────────────────────────────────────────────────────
export async function createService(
  data: Omit<Service, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "services"), {
    ...data,
    ofertas:            [],
    acceptedOffer:      null,
    confirmedGkId:      null,
    confirmedGkName:    null,
    gkRatingGiven:      null,
    playerRatingGiven:  null,
    createdAt:          serverTimestamp(),
  });
  return ref.id;
}

// ── Actualizar campos del servicio ────────────────────────────────────────────
export async function updateService(
  serviceId: string,
  patch: Partial<Omit<Service, "id">>
): Promise<void> {
  await updateDoc(doc(db, "services", serviceId), patch as any);
}

// ── Agregar oferta (read-modify-write para evitar problemas con arrayUnion) ───
export async function addOffer(
  serviceId: string,
  offer: Offer
): Promise<void> {
  const snap = await getDoc(doc(db, "services", serviceId));
  if (!snap.exists()) throw new Error("Servicio no encontrado");
  const ofertas: Offer[] = snap.data().ofertas || [];
  await updateDoc(doc(db, "services", serviceId), {
    ofertas: [...ofertas, offer],
  });
}

// ── Actualizar oferta ─────────────────────────────────────────────────────────
export async function updateOffer(
  serviceId: string,
  offerId:   string,
  patch:     Partial<Offer>
): Promise<void> {
  const snap = await getDoc(doc(db, "services", serviceId));
  if (!snap.exists()) return;
  const ofertas: Offer[] = snap.data().ofertas || [];
  const updated = ofertas.map((o) =>
    o.id === offerId ? { ...o, ...patch } : o
  );
  await updateDoc(doc(db, "services", serviceId), { ofertas: updated });
}

// ── Listeners en tiempo real ──────────────────────────────────────────────────
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
  }, (err) => console.error("listenAvailable error:", err));
}

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
  }, (err) => console.error("listenPlayer error:", err));
}

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
  }, (err) => console.error("listenGK error:", err));
}
