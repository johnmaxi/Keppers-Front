// components/constants.ts
export const BASE = 45000;

export const CIUDADES = [
  "Bogotá","Medellín","Cali","Barranquilla","Cartagena","Cúcuta",
  "Bucaramanga","Pereira","Santa Marta","Ibagué","Manizales","Villavicencio",
];

// Solo Efectivo y Nequi — MercadoPago en Sprint 4
export const MEDIOS_PAGO = ["Efectivo", "Nequi"];

export const CANCHAS: Record<string, string[]> = {
  "Bogotá":       ["Cancha El Campín","Cancha Santa Fe","Cancha El Salitre","Otra"],
  "Medellín":     ["Cancha Atanasio","Cancha El Poblado","Cancha Laureles","Otra"],
  "Cali":         ["Cancha Pascual Guerrero","Cancha El Campestre","Otra"],
  "Barranquilla": ["Cancha Metropolitano","Cancha El Prado","Otra"],
  "Cartagena":    ["Cancha Jaime Morón","Cancha Bocagrande","Otra"],
  "Cúcuta":       ["Cancha General Santander","Cancha Centro","Otra"],
  "Bucaramanga":  ["Cancha Alfonso López","Cancha Floridablanca","Otra"],
  "Pereira":      ["Cancha Hernán Ramírez","Cancha Centro","Otra"],
  "Santa Marta":  ["Cancha Sierra Nevada","Cancha El Rodadero","Otra"],
  "Ibagué":       ["Cancha Manuel Murillo","Cancha Centro","Otra"],
  "Manizales":    ["Cancha Palogrande","Cancha Centro","Otra"],
  "Villavicencio":["Cancha Bello Horizonte","Cancha Centro","Otra"],
};

export const GKS = [
  { id:"1", nombre:"Carlos Mosquera", ciudad:"Bogotá",    foto:"CM", disponible:true,  rating:4.8, reviews:34, tarifa:45000, descripcion:"Portero profesional con 6 años de experiencia en ligas locales." },
  { id:"2", nombre:"Andrés Herrera",  ciudad:"Medellín",  foto:"AH", disponible:true,  rating:4.6, reviews:21, tarifa:38000, descripcion:"Ágil y de alto rendimiento, gran comunicación con la defensa." },
  { id:"3", nombre:"Diego Vargas",    ciudad:"Cali",      foto:"DV", disponible:false, rating:4.9, reviews:47, tarifa:50000, descripcion:"Reflejos rápidos, experiencia en torneos regionales." },
  { id:"4", nombre:"Luis Patiño",     ciudad:"Bogotá",    foto:"LP", disponible:true,  rating:4.7, reviews:18, tarifa:42000, descripcion:"Especialista en fútbol 5 y 7. Puntual y profesional." },
  { id:"5", nombre:"Julián Ríos",     ciudad:"Barranquilla", foto:"JR", disponible:true, rating:4.5, reviews:12, tarifa:35000, descripcion:"Buen manejo de balón, salidas seguras." },
];
