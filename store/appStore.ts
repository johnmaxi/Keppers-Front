// store/appStore.ts  ← REEMPLAZA el archivo actual
// Zustand store conectado a Firebase

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
  // Auth
  currentUser: AppUser | null;
  authLoading: boolean;
  // Datos
  services: Service[];
  chats: Record<string, Message[]>;
  // Unsubs (para limpiar listeners)
  _unsubs: (() => void)[];

  // ── Auth actions ──────────────────────────────────────────────────────────
  initAuth: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (form: any) => Promise<void>;
  logout: () => Promise<void>;

  // ── Service actions ───────────────────────────────────────────────────────
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

  // ── Chat actions ──────────────────────────────────────────────────────────
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

  // ── Inicializa observer de auth al arrancar la app ─────────────────────────
  initAuth: () => {
    const unsub = onAuthChanged((user) => {
      set({ currentUser: user, authLoading: false });
      if (user) {
        get().startListening();
      } else {
        get().stopListening();
        set({ services: [] });
      }
    });
    set((s) => ({ _unsubs: [...s._unsubs, unsub] }));
  },

  // ── Login ──────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    const user = await loginUser(email, password);
    set({ currentUser: user });
    get().startListening();
  },

  // ── Registro ───────────────────────────────────────────────────────────────
  register: async (form) => {
    const user = await registerUser(form);
    set({ currentUser: user });
    get().startListening();
  },

  // ── Logout ─────────────────────────────────────────────────────────────────
  logout: async () => {
    get().stopListening();
    await logoutUser();
    set({ currentUser: null, services: [], chats: {} });
  },

  // ── Listeners según rol ────────────────────────────────────────────────────
  startListening: () => {
    const { currentUser, _unsubs } = get();
    if (!currentUser) return;

    // Limpiar listeners anteriores
    _unsubs.forEach((u) => u());

    const newUnsubs: (() => void)[] = [];

    if (currentUser.role === "player") {
      // El jugador escucha sus propias solicitudes
      newUnsubs.push(
        listenPlayerServices(currentUser.id, (svcs) => set({ services: svcs })),
      );
      // Y también las disponibles para ver porteros (pestaña explorar)
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
      // El portero escucha solicitudes disponibles
      newUnsubs.push(
        listenAvailableServices((svcs) => set({ services: svcs })),
      );
      // Y sus servicios confirmados
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

  // ── CRUD Servicios ─────────────────────────────────────────────────────────
  addService: async (data) => {
    await createService(data);
    // El listener onSnapshot actualizará automáticamente
  },

  updateService: async (id, patch) => {
    await fbUpdateService(id, patch);
  },

  addOffer: async (serviceId, offer) => {
    await fbAddOffer(serviceId, offer);
  },

  updateOffer: async (serviceId, offerId, patch) => {
    await fbUpdateOffer(serviceId, offerId, patch);
  },

  // ── Chat ───────────────────────────────────────────────────────────────────
  listenChat: (serviceId) => {
    // Solo suscribir si no hay listener activo para este chat
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
    // onSnapshot actualizará automáticamente
  },
}));
