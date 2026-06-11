// store/appStore.ts
import { create } from "zustand";
import { onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  AppUser, loginUser, registerUser, logoutUser, onAuthChanged,
} from "../services/authService";
import {
  Service, Offer,
  createService, updateService as fbUpdateService,
  addOffer as fbAddOffer, updateOffer as fbUpdateOffer,
  listenAvailableServices, listenPlayerServices, listenGoalkeeperServices,
} from "../services/serviceService";
import { sendMessage, listenMessages, Message } from "../services/chatService";
import {
  notifyNewOffer, notifyOfferAccepted, notifyCounterOffer,
  notifyServiceCompletedPlayer, notifyServiceCompletedGK,
} from "../services/notificationService";

interface AppState {
  currentUser:  AppUser | null;
  authLoading:  boolean;
  services:     Service[];
  chats:        Record<string, Message[]>;
  _unsubs:      (() => void)[];

  initAuth:       () => void;
  login:          (email: string, password: string) => Promise<void>;
  register:       (form: any) => Promise<void>;
  logout:         () => Promise<void>;
  startListening: () => void;
  stopListening:  () => void;
  addService:     (data: Omit<Service, "id" | "createdAt">) => Promise<void>;
  updateService:  (id: string, patch: Partial<Omit<Service, "id">>) => Promise<void>;
  addOffer:       (serviceId: string, offer: Offer) => Promise<void>;
  updateOffer:    (serviceId: string, offerId: string, patch: Partial<Offer>) => Promise<void>;
  listenChat:     (serviceId: string) => void;
  sendMsg:        (serviceId: string, msg: Omit<Message, "id" | "createdAt">) => Promise<void>;
}

// ── Registrar push token y canales Android ───────────────────────────────────
async function setupPushNotifications(userId: string, projectId: string) {
  try {
    const Notifications = await import("expo-notifications");
    const { isDevice }  = await import("expo-device");
    const { Platform }  = await import("react-native");
    if (!isDevice) return;

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;

    if (Platform.OS === "android") {
      const channels = [
        { id: "keepers-default",      name: "Keepers General",    sound: "default",         importance: Notifications.AndroidImportance.MAX },
        { id: "keepers-solicitud",    name: "Nuevas Solicitudes", sound: "nueva_solicitud", importance: Notifications.AndroidImportance.MAX },
        { id: "keepers-oferta",       name: "Ofertas",            sound: "oferta_recibida", importance: Notifications.AndroidImportance.HIGH },
        { id: "keepers-contraoferta", name: "Contraofertas",      sound: "contraoferta",    importance: Notifications.AndroidImportance.HIGH },
        { id: "keepers-aceptado",     name: "Aceptados",          sound: "aceptado",        importance: Notifications.AndroidImportance.MAX },
        { id: "keepers-completado",   name: "Completados",        sound: "completado",      importance: Notifications.AndroidImportance.HIGH },
        { id: "keepers-aprobado",     name: "Aprobaciones",       sound: "aprobado",        importance: Notifications.AndroidImportance.MAX },
        { id: "keepers-rechazado",    name: "Rechazos",           sound: "rechazado",       importance: Notifications.AndroidImportance.HIGH },
        { id: "keepers-recarga",      name: "Recargas",           sound: "recarga",         importance: Notifications.AndroidImportance.MAX },
      ];
      for (const ch of channels) {
        await Notifications.setNotificationChannelAsync(ch.id, {
          name: ch.name, importance: ch.importance,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#00ff87", sound: ch.sound, enableVibrate: true,
        });
      }
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    await updateDoc(doc(db, "users", userId), {
      pushToken: token,
      pushTokenUpdatedAt: Date.now(),
    });
  } catch (e: any) {
    console.error("Push setup error:", e?.message || e);
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  authLoading: true,
  services:    [],
  chats:       {},
  _unsubs:     [],

  initAuth: () => {
    const unsub = onAuthChanged(async (user) => {
      set({ currentUser: user, authLoading: false });
      if (user) {
        get().startListening();
        // Registrar push token y canales
        setupPushNotifications(user.id, "309577c9-2a5b-443a-8e26-fe021dd499c3");
        // Escuchar cambios en tiempo real del perfil (saldo, etc.)
        const userUnsub = onSnapshot(doc(db, "users", user.id), (snap) => {
          if (snap.exists()) {
            set((s) => ({
              currentUser: s.currentUser
                ? { ...s.currentUser, ...snap.data(), id: user.id } as any
                : null,
            }));
          }
        });
        set((s) => ({ _unsubs: [...s._unsubs, userUnsub] }));
      } else {
        get().stopListening();
        set({ services: [] });
      }
    });
    set((s) => ({ _unsubs: [...s._unsubs, unsub] }));
  },

  login: async (email, password) => {
    const user = await loginUser(email, password);
    set({ currentUser: user });
    get().startListening();
    setupPushNotifications(user.id, "309577c9-2a5b-443a-8e26-fe021dd499c3");
  },

  register: async (form) => {
    const user = await registerUser(form);
    set({ currentUser: user });
    get().startListening();
  },

  logout: async () => {
    get().stopListening();
    await logoutUser();
    set({ currentUser: null, services: [], chats: {} });
  },

  startListening: () => {
    const { currentUser, _unsubs } = get();
    if (!currentUser) return;
    _unsubs.forEach((u) => u());
    const newUnsubs: (() => void)[] = [];

    if (currentUser.role === "player") {
      newUnsubs.push(
        listenPlayerServices(currentUser.id, (svcs) => set({ services: svcs }))
      );
      newUnsubs.push(
        listenAvailableServices((available) => {
          set((s) => {
            const myIds  = new Set(s.services.map((x) => x.id));
            const merged = [...s.services, ...available.filter((a) => !myIds.has(a.id))];
            return { services: merged };
          });
        })
      );
    } else {
      newUnsubs.push(
        listenAvailableServices((svcs) => {
          set((s) => {
            const nonPending    = s.services.filter((x) => x.status !== "pending");
            const nonPendingIds = new Set(nonPending.map((x) => x.id));
            return { services: [...nonPending, ...svcs.filter((x) => !nonPendingIds.has(x.id))] };
          });
        })
      );
      newUnsubs.push(
        listenGoalkeeperServices(currentUser.id, (confirmed) => {
          set((s) => {
            const confirmedIds = new Set(confirmed.map((x) => x.id));
            return { services: [...s.services.filter((x) => !confirmedIds.has(x.id)), ...confirmed] };
          });
        })
      );
    }
    set({ _unsubs: newUnsubs });
  },

  stopListening: () => {
    get()._unsubs.forEach((u) => u());
    set({ _unsubs: [] });
  },

  addService: async (data) => {
    await createService(data);
  },

  updateService: async (id, patch) => {
    const svc = get().services.find((s) => s.id === id);
    await fbUpdateService(id, patch);
    if (!svc) return;
    if (patch.status === "completed" && svc.confirmedGkId) {
      notifyServiceCompletedPlayer(svc.playerId).catch(() => {});
      notifyServiceCompletedGK(svc.confirmedGkId, svc.total || 0).catch(() => {});
    }
    if (patch.status === "confirmed" && patch.confirmedGkId) {
      notifyOfferAccepted(patch.confirmedGkId, svc.playerName || "Jugador", svc.tipoPartido || "servicio").catch(() => {});
    }
  },

  addOffer: async (serviceId, offer) => {
    const svc = get().services.find((s) => s.id === serviceId);
    await fbAddOffer(serviceId, offer);
    if (!svc) return;
    if (offer.status === "countered") {
      notifyCounterOffer(svc.playerId, offer.gkName, offer.counterAmount || offer.amount).catch(() => {});
    } else {
      notifyNewOffer(svc.playerId, offer.gkName, offer.amount).catch(() => {});
    }
  },

  updateOffer: async (serviceId, offerId, patch) => {
    await fbUpdateOffer(serviceId, offerId, patch);
  },

  listenChat: (serviceId) => {
    if (get().chats[serviceId] !== undefined) return;
    const unsub = listenMessages(serviceId, (msgs) => {
      set((s) => ({ chats: { ...s.chats, [serviceId]: msgs } }));
    });
    set((s) => ({
      chats:   { ...s.chats, [serviceId]: [] },
      _unsubs: [...s._unsubs, unsub],
    }));
  },

  sendMsg: async (serviceId, msg) => {
    await sendMessage(serviceId, msg);
  },
}));