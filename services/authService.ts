// services/authService.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export interface AppUser {
  id:               string;
  nombre:           string;
  email:            string;
  telefono:         string;
  ciudad:           string;
  role:             "player" | "goalkeeper" | "admin";
  banco:            string;
  numCuenta:        string;
  tipoCuenta:       string;
  cedula:           string;
  rating:           number;
  reviews:          number;
  disponible:       boolean;
  pushToken:        string | null;
  photoURL:         string | null;
  cedulaURL:        string | null;
  // Tallas portero
  tallaGuantes?:     string;
  tallaGuayos?:      string;
  tallaCamisa?:      string;
  tallaLicra?:       string;
  tallaPantaloneta?: string;
  // Tallas jugador
  tallaGuayosJ?:      string;
  tallaCamisaJ?:      string;
  tallaLicraJ?:       string;
  tallaPantalonetaJ?: string;
  // Admin
  registrationStatus?: "pending" | "approved" | "rejected";
  registrationNote?:   string;
}

// ── Subir archivo a Firebase Storage via REST API ─────────────────────────────
async function uploadToStorage(
  base64: string,
  mimeType: string,
  path: string,
  idToken: string,
): Promise<string> {
  const bucket  = "keepersapp-6b982.firebasestorage.app";
  const encoded = encodeURIComponent(path);
  const url     = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?uploadType=media`;

  const binary = atob(base64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const res = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": mimeType, "Authorization": `Bearer ${idToken}` },
    body:    bytes,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Storage error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media&token=${data.downloadTokens}`;
}

// ── Registro ──────────────────────────────────────────────────────────────────
export async function registerUser(form: any): Promise<AppUser> {
  const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
  const uid  = cred.user.uid;

  // Obtener token para Storage
  const idToken = await cred.user.getIdToken();

  let photoURL:  string | null = null;
  let cedulaURL: string | null = null;

  // Subir foto de perfil
  if (form.photoBase64) {
    try {
      photoURL = await uploadToStorage(
        form.photoBase64, "image/jpeg",
        `profiles/${uid}.jpg`, idToken,
      );
    } catch (e) {
      console.warn("No se pudo subir la foto de perfil:", e);
    }
  }

  // Subir cédula (solo porteros)
  if (form.role === "goalkeeper" && form.cedulaBase64) {
    const ext  = form.cedulaFileName?.endsWith(".pdf") ? "pdf" : "jpg";
    const mime = ext === "pdf" ? "application/pdf" : "image/jpeg";
    try {
      cedulaURL = await uploadToStorage(
        form.cedulaBase64, mime,
        `cedulas/${uid}.${ext}`, idToken,
      );
    } catch (e) {
      console.warn("No se pudo subir la cédula:", e);
    }
  }

  const user: AppUser = {
    id:               uid,
    nombre:           form.nombre,
    email:            form.email,
    telefono:         form.telefono,
    ciudad:           form.ciudad,
    role:             form.role,
    banco:            form.banco || "",
    numCuenta:        form.numCuenta || "",
    tipoCuenta:       form.tipoCuenta || "Ahorros",
    cedula:           form.cedula || "",
    rating:           5,
    reviews:          0,
    disponible:       true,
    pushToken:        null,
    photoURL,
    cedulaURL,
    // Tallas
    tallaGuantes:      form.tallaGuantes || "",
    tallaGuayos:       form.role === "goalkeeper" ? form.tallaGuayos : form.tallaGuayosJ || "",
    tallaCamisa:       form.role === "goalkeeper" ? form.tallaCamisa : form.tallaCamisaJ || "",
    tallaLicra:        form.role === "goalkeeper" ? form.tallaLicra  : form.tallaLicraJ  || "",
    tallaPantaloneta:  form.role === "goalkeeper" ? form.tallaPantaloneta : form.tallaPantalonetaJ || "",
    registrationStatus: form.role === "goalkeeper" ? "pending" : "approved",
  };

  await setDoc(doc(db, "users", uid), { ...user, createdAt: serverTimestamp() });
  return user;
}

// ── Login ─────────────────────────────────────────────────────────────────────
export async function loginUser(email: string, password: string): Promise<AppUser> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, "users", cred.user.uid));
  if (!snap.exists()) throw new Error("Usuario no encontrado en base de datos");
  return { id: snap.id, ...snap.data() } as AppUser;
}

// ── Logout ────────────────────────────────────────────────────────────────────
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// ── Observer de auth ──────────────────────────────────────────────────────────
export function onAuthChanged(callback: (user: AppUser | null) => void): () => void {
  return onAuthStateChanged(auth, async (firebaseUser: User | null) => {
    if (!firebaseUser) { callback(null); return; }
    try {
      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() } as AppUser);
      } else {
        callback(null);
      }
    } catch {
      callback(null);
    }
  });
}
