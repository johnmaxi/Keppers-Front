// services/authService.ts
// Maneja registro e inicio de sesión con Firebase Auth + Firestore

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc, setDoc, getDoc, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { BASE } from "../components/constants";

// ── Tipos ────────────────────────────────────────────────────────────────────
export interface AppUser {
  id:          string;
  nombre:      string;
  email:       string;
  telefono:    string;
  ciudad:      string;
  role:        "player" | "goalkeeper";
  rating:      number;
  reviews:     number;
  tarifa:      number;
  banco:       string;
  numCuenta:   string;
  tipoCuenta:  string;
  cedula:      string;
  disponible:  boolean;
  createdAt:   any;
}

// ── Registro ─────────────────────────────────────────────────────────────────
export async function registerUser(form: {
  nombre: string; email: string; password: string;
  telefono: string; ciudad: string; role: "player" | "goalkeeper";
  banco: string; numCuenta: string; tipoCuenta: string;
  cedula: string; tarifa: string;
}): Promise<AppUser> {
  // 1. Crear cuenta en Firebase Auth
  const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
  const uid  = cred.user.uid;

  // 2. Guardar perfil en Firestore colección "users"
  const userData: AppUser = {
    id:         uid,
    nombre:     form.nombre,
    email:      form.email,
    telefono:   form.telefono,
    ciudad:     form.ciudad,
    role:       form.role,
    rating:     5.0,
    reviews:    0,
    tarifa:     parseInt(form.tarifa) || BASE,
    banco:      form.banco,
    numCuenta:  form.numCuenta,
    tipoCuenta: form.tipoCuenta,
    cedula:     form.cedula,
    disponible: true,
    createdAt:  serverTimestamp(),
  };

  await setDoc(doc(db, "users", uid), userData);
  return userData;
}

// ── Login ────────────────────────────────────────────────────────────────────
export async function loginUser(email: string, password: string): Promise<AppUser> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, "users", cred.user.uid));
  if (!snap.exists()) throw new Error("Perfil no encontrado");
  return { id: snap.id, ...snap.data() } as AppUser;
}

// ── Logout ───────────────────────────────────────────────────────────────────
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// ── Observer sesión activa ────────────────────────────────────────────────────
export function onAuthChanged(
  callback: (user: AppUser | null) => void
): () => void {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) { callback(null); return; }
    const snap = await getDoc(doc(db, "users", firebaseUser.uid));
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() } as AppUser);
    } else {
      callback(null);
    }
  });
}
