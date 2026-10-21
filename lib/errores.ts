// Las APIs externas (Mercado Libre, Meta) devuelven sus mensajes de rechazo
// técnico EN INGLÉS incluso contra el sitio argentino (confirmado en vivo:
// "Listing type free is not available for category MLA1744..."). Mostrarle
// eso tal cual a quien maneja una agencia de autos no sirve -no tiene por
// qué entender jerga de API. Esta función centraliza la traducción para
// CUALQUIER canal (no solo Mercado Libre), con un fallback que al menos
// enmarca en español lo que todavía no se tradujo puntualmente, en vez de
// dejar pasar inglés crudo sin ningún contexto.
//
// Devuelve siempre {mensaje, detalleTecnico}: "mensaje" es lo único que se
// muestra por defecto (corto, en español, legible), "detalleTecnico" es el
// texto original de la plataforma -se guarda para mostrarlo solo al pasar el
// mouse/tocar (title/tooltip), nunca como párrafo largo suelto en pantalla.
export type ErrorHumanizado = { mensaje: string; detalleTecnico: string | null };

// Atributos de Mercado Libre que aparecen seguido en estos rechazos ->
// nombre real en español que usa la agencia en la Ficha técnica/publicación,
// no el código interno de la API.
const NOMBRE_ATRIBUTO: Record<string, string> = {
  VEHICLE_YEAR: "Año",
  LICENSE_PLATE: "Patente",
  VIN_LAST_DIGITS: "Últimos 6 dígitos del chasis",
  TRIM: "Versión",
  FUEL_TYPE: "Combustible",
  DOORS: "Puertas",
  MOTO_TYPE: "Tipo de moto",
  BRAND: "Marca",
  MODEL: "Modelo",
  KILOMETERS: "Kilómetros",
  ITEM_CONDITION: "Condición",
  WARRANTY_TYPE: "Garantía",
};

function nombreAtributo(codigo: string): string {
  return NOMBRE_ATRIBUTO[codigo] || codigo;
}

const PATRONES: { test: RegExp; texto: string | ((mensajeCompleto: string) => string) }[] = [
  {
    test: /listing type free is not available/i,
    texto: "Esta cuenta no tiene cupo de publicación gratis disponible en Mercado Libre. Revisá el paquete de publicaciones contratado con ML o elegí un tipo de aviso pago.",
  },
  {
    test: /invalid access token|access token|session has expired|token.*expired/i,
    texto: "La conexión con la cuenta venció. Reconectala en Conexiones y volvé a intentar.",
  },
  {
    test: /permission|permiso|not authorized|unauthorized/i,
    texto: "La cuenta conectada no tiene permiso para esta acción. Revisá los permisos al conectarla en Conexiones.",
  },
  {
    test: /rate limit|too many requests/i,
    texto: "La plataforma está limitando la cantidad de intentos por ahora. Esperá un momento y volvé a intentar.",
  },
  // Caso real encontrado en vivo: "Attribute: VEHICLE_YEAR was dropped
  // because its values is empty; The attributes [VEHICLE_YEAR] are required
  // for category MLA1763 and channel marketplace." -ML lista uno o más
  // atributos obligatorios vacíos. Se arma un mensaje que nombra el dato
  // real que falta completar (en español), no el código de la API.
  {
    test: /are required for category/i,
    texto: (mensajeCompleto) => {
      const lista = mensajeCompleto.match(/\[([^\]]+)\]\s+are required/i);
      const codigos = lista ? lista[1].split(",").map((c) => c.trim()).filter(Boolean) : [];
      const nombres = codigos.map(nombreAtributo);
      if (nombres.length === 0) return "Falta completar un dato obligatorio para publicar en Mercado Libre.";
      const campos = nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
      return `Falta completar "${campos}" en la ficha del vehículo — Mercado Libre lo exige para publicar en esta categoría.`;
    },
  },
  {
    test: /was dropped because its values? is empty/i,
    texto: "Uno de los datos obligatorios del vehículo está vacío. Revisá la ficha técnica y completalo antes de volver a publicar.",
  },
  {
    test: /below.*minimum price|price.*too low|PRECIO_PROHIBIDO/i,
    texto: "El precio cargado está por debajo del piso mínimo que exige Mercado Libre para este modelo y año. Subí el precio y volvé a intentar.",
  },
];

// Heurística simple para no re-envolver mensajes que esta misma plataforma
// ya guardó en buen español (ej. el motivo de precio mínimo armado en
// lib/mercadolibre.ts) -si tiene tildes/ñ o palabras típicas en español, se
// asume legible y se deja tal cual. Si no, se asume técnico/inglés.
function pareceEspanol(s: string): boolean {
  return /[áéíóúñÁÉÍÓÚÑ]|precio|publicaci[oó]n|cuenta|vehículo|Mercado Libre|conexi[oó]n/i.test(s);
}

export function humanizarError(mensajeOriginal: string): ErrorHumanizado {
  for (const patron of PATRONES) {
    const m = mensajeOriginal.match(patron.test);
    if (m) {
      const texto = typeof patron.texto === "function" ? patron.texto(mensajeOriginal) : patron.texto;
      return { mensaje: texto, detalleTecnico: mensajeOriginal };
    }
  }
  if (pareceEspanol(mensajeOriginal)) return { mensaje: mensajeOriginal, detalleTecnico: null };
  // No hay traducción puntual para este caso todavía -se enmarca en español
  // en vez de mostrar la jerga técnica como mensaje principal. El texto
  // original queda disponible como detalle técnico (tooltip), no en pantalla.
  return {
    mensaje: "No se pudo completar la publicación por un problema reportado por la plataforma externa.",
    detalleTecnico: mensajeOriginal,
  };
}
