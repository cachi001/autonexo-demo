// Valores reales del atributo MOTO_TYPE de Mercado Libre (categoría Motos,
// MLA1763 en Argentina) -confirmado en vivo contra
// GET /categories/MLA1763/attributes, público, sin auth. Es el único
// atributo realmente obligatorio para publicar una moto (a diferencia de
// autos, donde versión/combustible/puertas sí son obligatorios) -ver
// lib/mercadolibre.ts.
// Mismo criterio de tokenización por palabra completa que
// lib/documentos.ts#categorizarVehiculo -> un `includes("MOTO")`/regex sin
// límite de palabra clasifica mal "AUTOMOTOR" como moto, porque esa palabra
// contiene "moto" en el medio (au-to-MOTO-r). Bug real encontrado en vivo
// (testeo end-to-end 2026-10-21): un auto con tipo "automotor" (cargado por
// planilla) terminaba forzado al formulario de moto de Mercado Libre, lo que
// generaba un rechazo real de ML por combinación de categoría/atributos
// inconsistente. "Cuatriciclo" se suma a propósito (no solo "moto"): el
// formulario de ML pide el mismo atributo MOTO_TYPE para cuatriciclos, con
// "Cuatriciclos" como una opción más de TIPOS_MOTO más abajo.
export function esVehiculoMoto(tipo: string): boolean {
  const tokens = (tipo || "").toUpperCase().split(/[^A-ZÁÉÍÓÚÑ]+/).filter(Boolean);
  return tokens.some((t) => t.startsWith("MOTO") || t.startsWith("CUATRICICLO"));
}

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
