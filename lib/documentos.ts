// Checklist de documentación requerida por tipo de vehículo. Sin lógica de
// base de datos a propósito -> este archivo lo importa tanto la ficha del
// stock (client component) como, si hiciera falta, el backend, sin arrastrar
// la conexión a Postgres de lib/data.ts al bundle del navegador.

export type CategoriaVehiculo = "automotor" | "moto" | "acoplado" | "camion";

// El campo `tipo` del vehículo es texto libre (lo escribe la agencia o lo
// trae un CSV) -> se normaliza por palabra completa, NO por substring: un
// `includes("MOTO")` ingenuo clasificaría mal "AUTOMOTOR" como motovehículo,
// porque esa palabra contiene "moto" en el medio (au-to-MOTO-r). Por eso acá
// se parte el tipo en tokens alfabéticos y se compara por prefijo de token,
// así "AUTOMOTOR" no matchea pero "MOTOCICLETA"/"MOTOVEHICULO"/"MOTO" sí.
// "Automotor" es el default si no matchea ninguna otra categoría (el caso
// más común: auto, camioneta, SUV, etc.).
export function categorizarVehiculo(tipo: string): CategoriaVehiculo {
  const tokens = (tipo || "").toUpperCase().split(/[^A-ZÁÉÍÓÚÑ]+/).filter(Boolean);
  const tieneToken = (prefijo: string) => tokens.some((t) => t.startsWith(prefijo));
  if (tieneToken("MOTO")) return "moto";
  if (tieneToken("ACOPLADO") || tieneToken("SEMI")) return "acoplado";
  if (tieneToken("CAMION") || tieneToken("CAMIÓN")) return "camion";
  return "automotor";
}

export const LABEL_CATEGORIA: Record<CategoriaVehiculo, string> = {
  automotor: "Automotor",
  moto: "Motovehículo",
  acoplado: "Acoplado/Semirremolque",
  camion: "Camión",
};

export type DocumentoKey =
  | "cedula_verde"
  | "titulo_automotor"
  | "libre_deuda_atm"
  | "comprobante_seguro"
  | "vtv_rto"
  | "verificacion_chasis";

export type DocumentoDef = { key: DocumentoKey; label: string; ayuda?: string };

// Comunes a cualquier tipo de vehículo.
const COMUNES: DocumentoDef[] = [
  { key: "cedula_verde", label: "Cédula verde/azul" },
  { key: "titulo_automotor", label: "Título del automotor" },
  {
    key: "libre_deuda_atm",
    label: "Libre deuda de patente (ATM Mendoza)",
    ayuda: "Lo descarga el vendedor desde atm.mendoza.gov.ar (necesita su CUIT y clave).",
  },
  { key: "comprobante_seguro", label: "Comprobante de seguro vigente" },
];

// Mendoza no exige VTV para motos (ya investigado) -> motovehículo se queda
// solo con los comunes. Acoplado/semirremolque no tiene VTV tampoco, pero sí
// un trámite propio de grabado de autopartes.
export const DOCUMENTOS_POR_CATEGORIA: Record<CategoriaVehiculo, DocumentoDef[]> = {
  automotor: [...COMUNES, { key: "vtv_rto", label: "VTV/RTO vigente" }],
  camion: [...COMUNES, { key: "vtv_rto", label: "VTV/RTO vigente" }],
  moto: [...COMUNES],
  acoplado: [...COMUNES, { key: "verificacion_chasis", label: "Verificación física de chasis/motor" }],
};
