// services/walletService.ts
// Maneja el saldo del portero en la app
import {
  doc, getDoc, updateDoc, addDoc, collection,
  serverTimestamp, query, where, orderBy, onSnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export interface RecargarRequest {
  id:        string;
  userId:    string;
  userName:  string;
  amount:    number;
  status:    "pending" | "approved" | "rejected";
  proofURL:  string | null;
  note:      string;
  createdAt: any;
  reviewedAt?: any;
  adminNote?: string;
}

// ── Obtener saldo actual del portero ─────────────────────────────────────────
export async function getSaldo(userId: string): Promise<number> {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return 0;
  return snap.data().saldo || 0;
}

// ── Descontar comisión al completar servicio ──────────────────────────────────
export async function descontarComision(
  userId:    string,
  serviceId: string,
  total:     number,
): Promise<number> {
  const comision  = Math.round(total * 0.15);
  const userRef   = doc(db, "users", userId);
  const userSnap  = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const data        = userSnap.data();
  // Si no tiene campo saldo, inicializarlo en 0 antes de descontar
  const saldoActual = typeof data.saldo === "number" ? data.saldo : 0;
  // El saldo puede quedar negativo si no tiene suficiente — se registra la deuda
  const nuevoSaldo  = saldoActual - comision;

  await updateDoc(userRef, { saldo: nuevoSaldo });

  // Registrar movimiento
  await addDoc(collection(db, "walletMovements"), {
    userId,
    serviceId,
    type:        "comision",
    amount:      -comision,
    description: `Comisión 15% servicio`,
    saldoBefore: saldoActual,
    saldoAfter:  nuevoSaldo,
    createdAt:   serverTimestamp(),
  });
  return nuevoSaldo;
}

// ── Solicitar recarga ─────────────────────────────────────────────────────────
export async function solicitarRecarga(
  userId:   string,
  userName: string,
  amount:   number,
  proofURL: string | null,
  note:     string,
): Promise<void> {
  await addDoc(collection(db, "recargas"), {
    userId,
    userName,
    amount,
    proofURL,
    note,
    status:    "pending",
    createdAt: serverTimestamp(),
  });
}

// ── Admin: aprobar recarga ────────────────────────────────────────────────────
export async function aprobarRecarga(
  recargaId: string,
  userId:    string,
  amount:    number,
): Promise<void> {
  const userRef  = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  const saldoActual = userSnap.data()?.saldo || 0;
  const nuevoSaldo  = saldoActual + amount;

  await updateDoc(userRef, { saldo: nuevoSaldo });
  await updateDoc(doc(db, "recargas", recargaId), {
    status:     "approved",
    reviewedAt: serverTimestamp(),
  });

  // Registrar movimiento
  await addDoc(collection(db, "walletMovements"), {
    userId,
    type:        "recarga",
    amount:      amount,
    description: "Recarga aprobada por admin",
    saldoBefore: saldoActual,
    saldoAfter:  nuevoSaldo,
    createdAt:   serverTimestamp(),
  });
}

// ── Admin: rechazar recarga ───────────────────────────────────────────────────
export async function rechazarRecarga(
  recargaId: string,
  adminNote: string,
): Promise<void> {
  await updateDoc(doc(db, "recargas", recargaId), {
    status:     "rejected",
    adminNote,
    reviewedAt: serverTimestamp(),
  });
}

// ── Escuchar recargas pendientes (admin) ──────────────────────────────────────
export function listenRecargas(
  status:   "pending" | "approved" | "rejected",
  callback: (recargas: RecargarRequest[]) => void,
): () => void {
  const q = query(
    collection(db, "recargas"),
    where("status", "==", status),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RecargarRequest));
  });
}

// ── Escuchar movimientos del portero ──────────────────────────────────────────
export function listenMovements(
  userId:   string,
  callback: (movements: any[]) => void,
): () => void {
  const q = query(
    collection(db, "walletMovements"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}
