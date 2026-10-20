// Valores reales del atributo MOTO_TYPE de Mercado Libre (categoría Motos,
// MLA1763 en Argentina) -confirmado en vivo contra
// GET /categories/MLA1763/attributes, público, sin auth. Es el único
// atributo realmente obligatorio para publicar una moto (a diferencia de
// autos, donde versión/combustible/puertas sí son obligatorios) -ver
// lib/mercadolibre.ts.
export const TIPOS_MOTO = [
  "On-Off",
  "Mini Motos",
  "Custom",
  "Chopper",
  "Touring",
  "Scooters",
  "Enduro",
  "Trial",
  "Cuatriciclos",
  "Naked",
  "Doble propósito",
  "Crucero",
  "Triciclos",
  "Deportivas",
  "Motocarros",
  "Street",
] as const;
