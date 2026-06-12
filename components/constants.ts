// components/constants.ts
export const BASE = 30000;

export const CIUDADES = [
  "Medellín",
];

// Solo Efectivo y Nequi — MercadoPago en Sprint 4
export const MEDIOS_PAGO = ["Efectivo", "Nequi / Bancolombia / Llaves"];

export const CANCHAS: Record<string, string[]> = {
  "Medellín": [
    // Escenarios deportivos oficiales
    "Estadio Atanasio Girardot",
    "Unidad Deportiva Atanasio Girardot",
    // El Poblado
    "Cancha El Poblado",
    "Cancha La Florida",
    "Cancha Provenza",
    // Laureles - Estadio
    "Cancha Laureles",
    "Cancha Los Ídolos",
    "Cancha Barrio Laureles",
    // Envigado
    "Cancha Envigado Centro",
    "Cancha El Salado - Envigado",
    "Polideportivo Sur - Envigado",
    // Itagüí
    "Cancha Itagüí Centro",
    "Polideportivo Itagüí",
    // Bello
    "Cancha Bello Centro",
    "Polideportivo Bello",
    // Sabaneta
    "Cancha Sabaneta",
    // Copacabana
    "Cancha Copacabana",
    // Robledo
    "Cancha Robledo",
    "Polideportivo Robledo",
    // Belén
    "Cancha Belén",
    "Cancha La Palma - Belén",
    "Polideportivo Belén",
    // Aranjuez
    "Cancha Aranjuez",
    "Polideportivo Aranjuez",
    // Manrique
    "Cancha Manrique",
    "Polideportivo Manrique",
    // Buenos Aires
    "Cancha Buenos Aires",
    // La Candelaria (Centro)
    "Cancha La Candelaria",
    "Cancha Centro Medellín",
    // Castilla
    "Cancha Castilla",
    "Polideportivo Castilla",
    // Guayabal
    "Cancha Guayabal",
    // San Javier
    "Cancha San Javier",
    "Polideportivo San Javier",
    // Popular
    "Cancha Popular",
    // Santa Cruz
    "Cancha Santa Cruz",
    // Canchas sintéticas conocidas
    "Fútbol 5 El Tesoro",
    "Fútbol 5 Oviedo",
    "Fútbol 5 San Diego",
    "Fútbol 5 La 33",
    "Fútbol 5 Manila",
    "Fútbol 5 Conquistadores",
    "Fútbol 5 Ciudad del Río",
    "Cancha Sintética Los Colores",
    "Cancha Sintética La América",
    "Otra",
  ],
};

export const GKS = [
  { id:"1", nombre:"Carlos Mosquera", ciudad:"Bogotá",    foto:"CM", disponible:true,  rating:4.8, reviews:34, tarifa:45000, descripcion:"Portero profesional con 6 años de experiencia en ligas locales." },
  { id:"2", nombre:"Andrés Herrera",  ciudad:"Medellín",  foto:"AH", disponible:true,  rating:4.6, reviews:21, tarifa:38000, descripcion:"Ágil y de alto rendimiento, gran comunicación con la defensa." },
  { id:"3", nombre:"Diego Vargas",    ciudad:"Cali",      foto:"DV", disponible:false, rating:4.9, reviews:47, tarifa:50000, descripcion:"Reflejos rápidos, experiencia en torneos regionales." },
  { id:"4", nombre:"Luis Patiño",     ciudad:"Bogotá",    foto:"LP", disponible:true,  rating:4.7, reviews:18, tarifa:42000, descripcion:"Especialista en fútbol 5 y 7. Puntual y profesional." },
  { id:"5", nombre:"Julián Ríos",     ciudad:"Barranquilla", foto:"JR", disponible:true, rating:4.5, reviews:12, tarifa:35000, descripcion:"Buen manejo de balón, salidas seguras." },
];