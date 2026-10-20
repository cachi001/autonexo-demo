// IDs reales de provincia que usa Mercado Libre (confirmado en vivo contra
// GET /countries/AR, público, sin auth) — hace falta mandar el id exacto
// (ej. "AR-M") en el campo location.state de un aviso, no alcanza con el
// nombre. Se comparte entre el formulario de datos de la agencia (que junta
// ciudad/provincia reales) y la publicación a Mercado Libre (que los usa en
// vez del Mendoza capital hardcodeado que había antes).
export const PROVINCIAS_AR = [
  { id: "AR-B", nombre: "Buenos Aires" },
  { id: "AR-C", nombre: "Capital Federal" },
  { id: "AR-K", nombre: "Catamarca" },
  { id: "AR-H", nombre: "Chaco" },
  { id: "AR-U", nombre: "Chubut" },
  { id: "AR-W", nombre: "Corrientes" },
  { id: "AR-X", nombre: "Córdoba" },
  { id: "AR-E", nombre: "Entre Ríos" },
  { id: "AR-P", nombre: "Formosa" },
  { id: "AR-Y", nombre: "Jujuy" },
  { id: "AR-L", nombre: "La Pampa" },
  { id: "AR-F", nombre: "La Rioja" },
  { id: "AR-M", nombre: "Mendoza" },
  { id: "AR-N", nombre: "Misiones" },
  { id: "AR-Q", nombre: "Neuquén" },
  { id: "AR-R", nombre: "Río Negro" },
  { id: "AR-A", nombre: "Salta" },
  { id: "AR-J", nombre: "San Juan" },
  { id: "AR-D", nombre: "San Luis" },
  { id: "AR-Z", nombre: "Santa Cruz" },
  { id: "AR-S", nombre: "Santa Fe" },
  { id: "AR-G", nombre: "Santiago del Estero" },
  { id: "AR-V", nombre: "Tierra del Fuego" },
  { id: "AR-T", nombre: "Tucumán" },
] as const;
