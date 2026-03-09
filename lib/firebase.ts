// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth }       from "firebase/auth";
import { getFirestore }  from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyC83T40z81pLm5Wg2MY3FuBvBJOXjhgdbo",
  authDomain:        "keepersapp-6b982.firebaseapp.com",
  projectId:         "keepersapp-6b982",
  storageBucket:     "keepersapp-6b982.firebasestorage.app",
  messagingSenderId: "449005221403",
  appId:             "1:449005221403:web:7a85734b4d113b0ce5eabe",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
export default app;
