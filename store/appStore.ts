import { create } from "zustand";
import { User, Service } from "../components/constants";

interface AppState {
  currentUser: User | null;
  users: User[];
  services: Service[];
  chats: Record<number, { id: number; senderId: number; senderName: string; text: string; ts: string }[]>;
  setCurrentUser: (user: User | null) => void;
  addUser: (user: User) => void;
  addService: (service: Service) => void;
  updateService: (id: number, patch: Partial<Service>) => void;
  addOffer: (serviceId: number, offer: any) => void;
  updateOffer: (serviceId: number, offerId: number, patch: any) => void;
  addMessage: (serviceId: number, msg: any) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  users: [],
  services: [],
  chats: {},

  setCurrentUser: (user) => set({ currentUser: user }),

  addUser: (user) => set((state) => ({ users: [...state.users, user] })),

  addService: (service) =>
    set((state) => ({ services: [...state.services, service] })),

  updateService: (id, patch) =>
    set((state) => ({
      services: state.services.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })),

  addOffer: (serviceId, offer) =>
    set((state) => ({
      services: state.services.map((s) =>
        s.id === serviceId ? { ...s, ofertas: [...s.ofertas, offer] } : s
      ),
    })),

  updateOffer: (serviceId, offerId, patch) =>
    set((state) => ({
      services: state.services.map((s) =>
        s.id !== serviceId ? s : {
          ...s,
          ofertas: s.ofertas.map((o) => (o.id === offerId ? { ...o, ...patch } : o)),
        }
      ),
    })),

  addMessage: (serviceId, msg) =>
    set((state) => ({
      chats: {
        ...state.chats,
        [serviceId]: [...(state.chats[serviceId] || []), msg],
      },
    })),

  logout: () => set({ currentUser: null }),
}));
