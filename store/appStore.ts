// store/appStore.ts
import { create } from "zustand";
import {
  AppUser,
  loginUser,
  logoutUser,
  onAuthChanged,
  registerUser,
} from "../services/authService";
import { listenMessages, Message, sendMessage } from "../services/chatService";
import {
  getUserPushToken,
  notifyCounterOffer,
  notifyNewMessage,
  notifyNewOffer,
  notifyOfferAccepted,
  notifyServiceCompleted,
  notifyServiceStarted,
} from "../services/notificationService";
import {
  createService,
  addOffer as fbAddOffer,
  updateOffer as fbUpdateOffer,
  updateService as fbUpdateService,
  listenAvailableServices,
  listenGoalkeeperServices,
  listenPlayerServices,
  Offer,
  Service,
} from "../services/serviceService";

interface AppState {
  currentUser: AppUser | null;
  authLoading: boolean;
  services: Service[];
  chats: Record<string, Message[]>;
  _unsubs: (() => void)[];

  initAuth: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (form: any) => Promise<void>;
  logout: () => Promise<void>;
  startListening: () => void;
  stopListening: () => void;
  addService: (data: Omit<Service, "id" | "createdAt">) => Promise<void>;
  updateService: (id: string, patch: Partial<Service>) => Promise<void>;
  addOffer: (
    serviceId: string,
    offer: Omit<Offer, "createdAt">,
  ) => Promise<void>;
  updateOffer: (
    serviceId: string,
    offerId: string,
    patch: Partial<Offer>,
  ) => Promise<void>;
  listenChat: (serviceId: string) => void;
  sendMsg: (
    serviceId: string,
    msg: Omit<Message, "id" | "createdAt">,
  ) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  authLoading: true,
  services: [],
  chats: {},
  _unsubs: [],

  initAuth: () => {
    const unsub = onAuthChanged((user) => {
      set({ currentUser: user, authLoading: false });
      if (user) get().startListening();
      else {
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
        listenPlayerServices(currentUser.id, (svcs) => set({ services: svcs })),
      );
      newUnsubs.push(
        listenAvailableServices((available) => {
          set((s) => {
            const myIds = new Set(s.services.map((x) => x.id));
            const merged = [
              ...s.services,
              ...available.filter((a) => !myIds.has(a.id)),
            ];
            return { services: merged };
          });
        }),
      );
    } else {
      newUnsubs.push(
        listenAvailableServices((svcs) => set({ services: svcs })),
      );
      newUnsubs.push(
        listenGoalkeeperServices(currentUser.id, (confirmed) => {
          set((s) => {
            const pendingIds = new Set(
              s.services.filter((x) => x.status === "pending").map((x) => x.id),
            );
            const merged = [
              ...s.services.filter((x) => pendingIds.has(x.id)),
              ...confirmed,
            ];
            return { services: merged };
          });
        }),
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

    // ── Notificación: portero inicia servicio ────────────────────────────────
    if (patch.status === "in_progress" && svc) {
      const playerToken = await getUserPushToken(svc.playerId);
      if (playerToken && svc.confirmedGkName) {
        notifyServiceStarted({
          playerToken,
          gkName: svc.confirmedGkName,
          cancha: svc.cancha,
        }).catch(console.error);
      }
    }

    // ── Notificación: servicio completado → ambos calificar ──────────────────
    if (patch.status === "completed" && svc && svc.confirmedGkId) {
      const [playerToken, gkToken] = await Promise.all([
        getUserPushToken(svc.playerId),
        getUserPushToken(svc.confirmedGkId),
      ]);
      const gkName = svc.confirmedGkName || "Portero";
      const playerName = svc.playerName || "Jugador";
      if (playerToken && gkToken) {
        notifyServiceCompleted({
          playerToken,
          gkToken,
          gkName,
          playerName,
        }).catch(console.error);
      }
    }

    // ── Notificación: jugador acepta oferta → notifica portero ───────────────
    if (patch.status === "confirmed" && patch.confirmedGkId && svc) {
      const gkToken = await getUserPushToken(patch.confirmedGkId);
      if (gkToken) {
        notifyOfferAccepted({
          gkToken,
          playerName: svc.playerName,
          serviceId: id,
          tipoPartido: svc.tipoPartido,
          ciudad: svc.ciudad,
        }).catch(console.error);
      }
    }
  },

  addOffer: async (serviceId, offer) => {
    const svc = get().services.find((s) => s.id === serviceId);
    await fbAddOffer(serviceId, offer);

    // ── Notificación: portero envía oferta → notifica jugador ────────────────
    if (svc) {
      const playerToken = await getUserPushToken(svc.playerId);
      if (playerToken) {
        const isCounter = offer.status === "countered";
        if (isCounter) {
          notifyCounterOffer({
            playerToken,
            gkName: offer.gkName,
            serviceId,
            amount: offer.counterAmount || offer.amount,
            horas: offer.counterHoras || svc.horas,
          }).catch(console.error);
        } else {
          notifyNewOffer({
            playerToken,
            gkName: offer.gkName,
            serviceId,
            tipoPartido: svc.tipoPartido,
            amount: offer.amount,
          }).catch(console.error);
        }
      }
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
      chats: { ...s.chats, [serviceId]: [] },
      _unsubs: [...s._unsubs, unsub],
    }));
  },

  sendMsg: async (serviceId, msg) => {
    await sendMessage(serviceId, msg);
    // ── Notificación: mensaje de chat ─────────────────────────────────────────
    const svc = get().services.find((s) => s.id === serviceId);
    const currentUser = get().currentUser;
    if (!svc || !currentUser) return;

    const recipientId =
      currentUser.role === "player" ? svc.confirmedGkId : svc.playerId;

    if (recipientId) {
      const recipientToken = await getUserPushToken(recipientId);
      if (recipientToken) {
        notifyNewMessage({
          recipientToken,
          senderName: msg.senderName,
          text: msg.text,
          serviceId,
        }).catch(console.error);
      }
    }
  },
}));
