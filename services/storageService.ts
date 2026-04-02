// services/storageService.ts
// Firebase Storage para fotos de perfil y documentos de cédula
// Usa fetch directo a la REST API de Firebase Storage (sin SDK nativo)

const FIREBASE_PROJECT = "keepersapp-6b982";
const STORAGE_BASE = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_PROJECT}.appspot.com/o`;

// ── Subir imagen o archivo en base64 ─────────────────────────────────────────
export async function uploadFile({
  base64, mimeType, path, token,
}: {
  base64: string;
  mimeType: string;
  path: string;       // ej: "profiles/uid.jpg" o "cedulas/uid.pdf"
  token: string;      // Firebase Auth token
}): Promise<string> {
  const encodedPath = encodeURIComponent(path);
  const url = `${STORAGE_BASE}/${encodedPath}?uploadType=media`;

  // Convertir base64 a blob
  const byteChars = atob(base64);
  const byteNums  = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNums[i] = byteChars.charCodeAt(i);
  }
  const blob = new Uint8Array(byteNums);

  const res = await fetch(url, {
    method:  "POST",
    headers: {
      "Content-Type":  mimeType,
      "Authorization": `Bearer ${token}`,
    },
    body: blob,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "Error subiendo archivo");
  }

  const data = await res.json();
  // Retornar URL pública de descarga
  return `${STORAGE_BASE}/${encodedPath}?alt=media&token=${data.downloadTokens}`;
}

// ── Obtener token de Firebase Auth ───────────────────────────────────────────
export async function getAuthToken(): Promise<string> {
  const { auth } = await import("../lib/firebase");
  const user = auth.currentUser;
  if (!user) throw new Error("No hay sesión activa");
  return await user.getIdToken();
}
