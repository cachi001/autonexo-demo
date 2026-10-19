// Las APIs externas (Mercado Libre, Meta) devuelven sus mensajes de rechazo
// técnico EN INGLÉS incluso contra el sitio argentino (confirmado en vivo:
// "Listing type free is not available for category MLA1744..."). Mostrarle
// eso tal cual a quien maneja una agencia de autos no sirve -no tiene por
// qué entender jerga de API. Esta función centraliza la traducción para
// CUALQUIER canal (no solo Mercado Libre), con un fallback que al menos
// enmarca en español lo que todavía no se tradujo puntualmente, en vez de
// dejar pasar inglés crudo sin ningún contexto.
const PATRONES: { test: RegExp; texto: string }[] = [
  {
    test: /listing type free is not available/i,
    texto:
      "Ya usaste la publicación gratuita de Mercado Libre para vehículos este año (es 1 por cuenta cada 365 días). Para publicar este vehículo hay que elegir un plan pago: Plata ($69.000), Oro ($79.000) o Oro Premium ($99.000).",
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
];

export function humanizarError(mensajeOriginal: string): string {
  const encontrado = PATRONES.find((p) => p.test.test(mensajeOriginal));
  if (encontrado) return encontrado.texto;
  // No hay traducción puntual para este caso todavía -se enmarca en español
  // en vez de mostrar la jerga técnica sola, sin perder el detalle real por
  // si hace falta para soporte.
  return `No se pudo completar la publicación. Detalle técnico: ${mensajeOriginal}`;
}
