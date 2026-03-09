// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey:            "AIzaSyC83T40z81pLm5Wg2MY3FuBvBJOXjhgdbo",
  authDomain:        "keepersapp-6b982.firebaseapp.com",
  projectId:         "keepersapp-6b982",
  storageBucket:     "keepersapp-6b982.firebasestorage.app",
  messagingSenderId: "449005221403",
  appId:             "1:449005221403:web:7a85734b4d113b0ce5eabe",
};

const app = initializeApp(firebaseConfig);

// Auth con persistencia real entre sesiones
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export const db = getFirestore(app);
export default app;
