export const CIUDADES = [
  "Bogotá",
  "Medellín",
  "Cali",
  "Barranquilla",
  "Cartagena",
  "Bucaramanga",
  "Pereira",
  "Manizales",
];

export const CANCHAS: Record<string, string[]> = {
  Bogotá: [
    "Cancha El Campín",
    "La Aurora",
    "Potrero Norte",
    "Centro Deportivo Kennedy",
  ],
  Medellín: ["Cancha Belén", "La América", "Estadio Atanasio", "Robledo Park"],
  Cali: ["Cancha Aguablanca", "Univalle", "La Floresta", "Ciudad Deportiva"],
  Barranquilla: [
    "El Paraíso",
    "Metropolitano",
    "La Castellana",
    "Simón Bolívar",
  ],
  Cartagena: ["Boquilla", "Manga", "Ternera", "San Felipe"],
  Bucaramanga: ["Álvaro Gómez", "La Flora", "Cabecera", "Norte"],
  Pereira: ["Lago Uribe", "Cuba", "Villa Olímpica", "El Jardín"],
  Manizales: ["Palogrande", "La Enea", "Chipre", "Milán"],
};

export const CANCHA_COORDS: Record<string, [number, number]> = {
  "Cancha El Campín": [4.6459, -74.0777],
  "La Aurora": [4.6601, -74.0934],
  "Potrero Norte": [4.7134, -74.0722],
  "Centro Deportivo Kennedy": [4.6276, -74.1527],
  "Cancha Belén": [6.2361, -75.5933],
  "La América": [6.2517, -75.5962],
  "Estadio Atanasio": [6.2574, -75.5908],
  "Robledo Park": [6.2792, -75.5976],
  "Cancha Aguablanca": [3.4056, -76.4893],
  Univalle: [3.3765, -76.535],
  "La Floresta": [3.4516, -76.5217],
  "Ciudad Deportiva": [3.4372, -76.4995],
  "El Paraíso": [10.9878, -74.7889],
  Metropolitano: [10.9179, -74.7997],
  "La Castellana": [10.9998, -74.8064],
  "Simón Bolívar": [10.9639, -74.8225],
  Boquilla: [10.4496, -75.5074],
  Manga: [10.3997, -75.5481],
  Ternera: [10.4082, -75.5278],
  "San Felipe": [10.4241, -75.5423],
  "Álvaro Gómez": [7.1254, -73.1198],
  "La Flora": [7.0993, -73.1289],
  Cabecera: [7.118, -73.1102],
  Norte: [7.1398, -73.115],
  "Lago Uribe": [4.8143, -75.6946],
  Cuba: [4.8019, -75.7098],
  "Villa Olímpica": [4.8099, -75.6801],
  "El Jardín": [4.7944, -75.6924],
  Palogrande: [5.0689, -75.5074],
  "La Enea": [5.0412, -75.4801],
  Chipre: [5.0721, -75.5238],
  Milán: [5.0588, -75.5121],
};

export const TIPOS_PARTIDO = [
  "Fútbol 5",
  "Fútbol 7",
  "Fútbol 11",
  "Pichanga",
  "Torneo Amateur",
];
export const MEDIOS_PAGO = [
  "Nequi",
  "Daviplata",
  "Transferencia Bancaria",
  "Efectivo",
];
export const BASE = 45000;

export const GKS = [
  {
    id: 1,
    nombre: "Carlos Mosquera",
    edad: 24,
    ciudad: "Bogotá",
    rating: 4.8,
    reviews: 34,
    tarifa: 45000,
    disponible: true,
    foto: "CM",
    descripcion: "Portero profesional con 6 años de experiencia.",
    especialidad: "Fútbol 11 / Fútbol 7",
  },
  {
    id: 2,
    nombre: "Andrés Herrera",
    edad: 28,
    ciudad: "Medellín",
    rating: 4.6,
    reviews: 21,
    tarifa: 38000,
    disponible: true,
    foto: "AH",
    descripcion:
      "Atajadas de alto rendimiento, gran comunicación con la defensa.",
    especialidad: "Fútbol 5 / Fútbol 7",
  },
  {
    id: 3,
    nombre: "Diego Vargas",
    edad: 22,
    ciudad: "Cali",
    rating: 4.9,
    reviews: 47,
    tarifa: 50000,
    disponible: false,
    foto: "DV",
    descripcion: "Reflexos rápidos, experiencia en torneos regionales.",
    especialidad: "Todos los formatos",
  },
  {
    id: 4,
    nombre: "Luis Patiño",
    edad: 26,
    ciudad: "Bogotá",
    rating: 4.5,
    reviews: 18,
    tarifa: 40000,
    disponible: true,
    foto: "LP",
    descripcion: "Especialista en penales y salidas aéreas.",
    especialidad: "Fútbol 11",
  },
];

export interface User {
  id: number;
  nombre: string;
  email: string;
  password: string;
  telefono: string;
  ciudad: string;
  role: "player" | "goalkeeper";
  rating: number;
  tarifa: number;
  banco?: string;
  numCuenta?: string;
  tipoCuenta?: string;
  cedula?: string;
}

export interface Offer {
  id: number;
  gkId: number;
  gkName: string;
  gkRating: number;
  mensaje: string;
  amount: number;
  status: "pending" | "accepted" | "rejected" | "countered";
  counterAmount?: number;
  counterHoras?: number;
  counterMsg?: string;
}

export interface Service {
  id: number;
  ciudad: string;
  cancha: string;
  tipoPartido: string;
  horas: number;
  medioPago: string;
  fecha: string;
  hora: string;
  nota: string;
  playerId: number;
  playerName: string;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  total: number;
  ofertas: Offer[];
  acceptedOffer?: number;
  confirmedGkName?: string;
  confirmedGkId?: number;
  gkRatingGiven?: number;
  playerRatingGiven?: number;
  gkRatingComment?: string;
  playerRatingComment?: string;
}
