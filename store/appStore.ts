// store/appStore.ts
import { create } from "zustand";
import { Alert } from "react-native";
import { onSnapshot, doc } from "firebase/firestore";
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
  getUserPushToken,
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

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  authLoading: true,
  services:    [],
  chats:       {},
  _unsubs:     [],

  initAuth: () => {
    const unsub = onAuthChanged(async (user) => {
      // DEBUG - confirmar que onAuthChanged dispara
      Alert.alert("AUTH CHANGED", user ? "User: " + user.id.substring(0, 8) : "Logged out");
      set({ currentUser: user, authLoading: false });
      if (user) {
        get().startListening();

        // Registrar token push (tambien en onAuthChanged)
        import("../services/notificationService").then(async ({ registerPushToken }) => {
          try {
            const token = await registerPushToken(user.id);
            Alert.alert("TOKEN AUTH", token ? "OK: " + token.substring(0, 30) : "NULL");
          } catch (e: any) {
            Alert.alert("TOKEN AUTH ERROR", String(e));
          }
        });

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
    // Registrar push token al hacer login
    try {
      const { registerPushToken } = await import("../services/notificationService");
      const token = await registerPushToken(user.id);
      Alert.alert("TOKEN RESULT", token ? "OK: " + token.substring(0, 30) : "NULL - no token");
    } catch (e: any) {
      Alert.alert("TOKEN ERROR", String(e));
    }
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
            const merged = [
              ...s.services,
              ...available.filter((a) => !myIds.has(a.id)),
            ];
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
            return {
              services: [
                ...nonPending,
                ...svcs.filter((x) => !nonPendingIds.has(x.id)),
              ],
            };
          });
        })
      );
      newUnsubs.push(
        listenGoalkeeperServices(currentUser.id, (confirmed) => {
          set((s) => {
            const confirmedIds = new Set(confirmed.map((x) => x.id));
            return {
              services: [
                ...s.services.filter((x) => !confirmedIds.has(x.id)),
                ...confirmed,
              ],
            };
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

    // Notif: servicio completado
    if (patch.status === "completed" && svc.confirmedGkId) {
      notifyServiceCompletedPlayer(svc.playerId).catch(() => {});
      notifyServiceCompletedGK(svc.confirmedGkId, svc.total || 0).catch(() => {});
    }

    // Notif: jugador acepta oferta → notificar al portero
    if (patch.status === "confirmed" && patch.confirmedGkId) {
      notifyOfferAccepted(
        patch.confirmedGkId,
        svc.playerName || "Jugador",
        svc.tipoPartido || "servicio"
      ).catch(() => {});
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