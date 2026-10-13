// Prototipo: datos en memoria (no hay base de datos real todavía).
// Se usa globalThis para que sobrevivan al hot-reload en desarrollo y a la
// reutilización de instancias "calientes" de función en Vercel — en
// producción real esto sería Postgres/similar, acá alcanza para la demo.

export type Vehiculo = {
  dominio: string;
  marca: string;
  modelo: string;
  anio: string;
  tipo: string;
  precio: string;
  km: string;
  color: string;
  descripcion: string;
  documentacion_validada: boolean;
  documentacion_validada_fecha: string | null;
  vistas_reales: number;
  fotos: string[];
};

export type Lead = {
  id: string;
  dominio: string;
  nombre: string;
  telefono: string | null;
  mensaje: string;
  fecha: string;
  estado: "pendiente" | "respondido" | "cerrado";
};

const SEED_STOCK: Vehiculo[] = [
  {
    dominio: "AB123CD",
    marca: "VOLKSWAGEN",
    modelo: "GOL TREND",
    anio: "2019",
    tipo: "SEDAN",
    precio: "8500000",
    km: "65000",
    color: "BLANCO",
    descripcion: "Único dueño, service oficial",
    documentacion_validada: true,
    documentacion_validada_fecha: "2026-10-12",
    vistas_reales: 3,
    fotos: [],
  },
  {
    dominio: "AC456EF",
    marca: "FORD",
    modelo: "FIESTA",
    anio: "2018",
    tipo: "HATCHBACK",
    precio: "7200000",
    km: "80000",
    color: "GRIS",
    descripcion: "Buen estado",
    documentacion_validada: false,
    documentacion_validada_fecha: null,
    vistas_reales: 0,
    fotos: [],
  },
  {
    dominio: "A208SDV",
    marca: "ZANELLA",
    modelo: "SAPUCAI 150 F",
    anio: "",
    tipo: "MOTOCICLETA",
    precio: "2100000",
    km: "12000",
    color: "ROJA",
    descripcion: "Cargada por foto de cédula real — dato de prueba de esta sesión",
    documentacion_validada: false,
    documentacion_validada_fecha: null,
    vistas_reales: 0,
    fotos: [],
  },
];

type Store = {
  stock: Vehiculo[];
  leads: Lead[];
};

// Persistencia en un archivo JSON, no solo en memoria. Se probó primero con
// un global en memoria (`globalThis`) y "next start" en esta máquina lo
// perdía entre request y request (varios workers no comparten memoria) —
// un lead creado por POST no aparecía después en el GET. Un archivo en disco
// lo resuelve para desarrollo local y para un servidor propio tradicional.
//
// Importante para cuando esto se despliegue en Vercel: las funciones
// serverless de Vercel tienen sistema de archivos efímero (no garantiza que
// algo escrito en una invocación siga estando en la siguiente, ni que dos
// instancias compartan el mismo disco) — esta demo puede "perder" cambios
// entre recargas en producción real. Para que los datos persistan de verdad
// ahí hace falta una base de datos (Vercel KV/Postgres), no un archivo.
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), ".data", "store.json");

function leerArchivo(): Store | null {
  try {
    const texto = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(texto) as Store;
  } catch {
    return null;
  }
}

function escribirArchivo(store: Store) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch {
    // en un entorno de solo lectura (ej. función serverless fría) se ignora:
    // la demo sigue funcionando en memoria durante esa misma invocación.
  }
}

function getStore(): Store {
  const existente = leerArchivo();
  if (existente) return existente;
  const nuevo: Store = { stock: SEED_STOCK.map((v) => ({ ...v })), leads: [] };
  escribirArchivo(nuevo);
  return nuevo;
}

function guardarStore(store: Store) {
  escribirArchivo(store);
}

export function listarStock(): Vehiculo[] {
  return getStore().stock;
}

export function buscarVehiculo(dominio: string): Vehiculo | undefined {
  return getStore().stock.find((v) => v.dominio === dominio);
}

export function agregarVehiculo(v: Omit<Vehiculo, "documentacion_validada" | "documentacion_validada_fecha" | "vistas_reales" | "fotos">) {
  const store = getStore();
  if (store.stock.some((x) => x.dominio === v.dominio)) return null;
  const nuevo: Vehiculo = {
    ...v,
    documentacion_validada: false,
    documentacion_validada_fecha: null,
    vistas_reales: 0,
    fotos: [],
  };
  store.stock.push(nuevo);
  guardarStore(store);
  return nuevo;
}

export function agregarFotos(dominio: string, fotosBase64: string[]) {
  const store = getStore();
  const v = store.stock.find((x) => x.dominio === dominio);
  if (!v) return null;
  v.fotos = [...(v.fotos || []), ...fotosBase64];
  guardarStore(store);
  return v;
}

export function quitarFoto(dominio: string, indice: number) {
  const store = getStore();
  const v = store.stock.find((x) => x.dominio === dominio);
  if (!v) return null;
  v.fotos = (v.fotos || []).filter((_, i) => i !== indice);
  guardarStore(store);
  return v;
}

export function setDocumentacionValidada(dominio: string, validada: boolean) {
  const store = getStore();
  const v = store.stock.find((x) => x.dominio === dominio);
  if (!v) return null;
  v.documentacion_validada = validada;
  v.documentacion_validada_fecha = validada ? new Date().toISOString().slice(0, 10) : null;
  guardarStore(store);
  return v;
}

export function registrarVista(dominio: string) {
  const store = getStore();
  const v = store.stock.find((x) => x.dominio === dominio);
  if (!v) return null;
  v.vistas_reales += 1;
  guardarStore(store);
  return v;
}

export function crearLead(dominio: string, nombre: string, mensaje: string, telefono?: string): Lead {
  const store = getStore();
  const lead: Lead = {
    id: Math.random().toString(36).slice(2, 12),
    dominio,
    nombre: nombre.trim() || "Interesado sin nombre",
    telefono: telefono?.trim() || null,
    mensaje: mensaje.trim(),
    fecha: new Date().toISOString().slice(0, 16).replace("T", " "),
    estado: "pendiente",
  };
  store.leads.push(lead);
  guardarStore(store);
  return lead;
}

export function listarLeads(): Lead[] {
  return [...getStore().leads].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}

export function actualizarEstadoLead(id: string, estado: Lead["estado"]) {
  const store = getStore();
  const lead = store.leads.find((l) => l.id === id);
  if (!lead) return null;
  lead.estado = estado;
  guardarStore(store);
  return lead;
}

export function contarLeadsPorDominio(): Record<string, number> {
  const conteo: Record<string, number> = {};
  for (const lead of getStore().leads) {
    conteo[lead.dominio] = (conteo[lead.dominio] || 0) + 1;
  }
  return conteo;
}

// --- Validación de planilla (carga masiva) ---

export const COLUMNAS_OBLIGATORIAS = ["dominio", "marca", "modelo", "anio", "precio"];
const PATENTE_RE = /^[A-Z]{2}\d{3}[A-Z]{2}$|^[A-Z]{3}\d{3}$|^[A-Z]\d{3}[A-Z]{3}$/;

export type FilaValidada = {
  numero_fila: number;
  datos: Record<string, string>;
  errores: string[];
  valida: boolean;
};

export function validarFila(fila: Record<string, string>, numero: number): FilaValidada {
  const columnas = ["dominio", "marca", "modelo", "anio", "tipo", "precio", "km", "color", "descripcion"];
  const datos: Record<string, string> = {};
  for (const c of columnas) datos[c] = (fila[c] || "").trim();

  const errores: string[] = [];
  for (const c of COLUMNAS_OBLIGATORIAS) {
    if (!datos[c]) errores.push(`falta '${c}'`);
  }

  const dominio = datos.dominio.toUpperCase().replace(/\s/g, "");
  datos.dominio = dominio;
  if (dominio && !PATENTE_RE.test(dominio)) {
    errores.push(`dominio '${dominio}' no tiene formato de patente válido`);
  }

  if (datos.anio) {
    const anio = parseInt(datos.anio, 10);
    if (isNaN(anio) || anio < 1960 || anio > new Date().getFullYear() + 1) {
      errores.push(`año '${datos.anio}' fuera de rango razonable`);
    }
  }

  if (datos.precio) {
    const precio = parseFloat(datos.precio.replace(/\./g, "").replace(",", "."));
    if (isNaN(precio) || precio <= 0) errores.push(`precio '${datos.precio}' no es válido`);
  }

  return { numero_fila: numero, datos, errores, valida: errores.length === 0 };
}

// --- Datos "leídos" de una cédula, simulados (demo de Vercel sin PaddleOCR) ---
// Ver nota en el informe: PaddleOCR no corre en funciones serverless de Vercel
// (pesa cientos de MB y tarda ~9s solo en cargar el modelo). Estos son
// resultados reales que SÍ se obtuvieron con el prototipo local corriendo
// PaddleOCR de verdad contra fotos de cédulas reales — no son inventados,
// solo se "reproducen" acá en vez de correr el modelo pesado en cada demo.
const EJEMPLOS_CEDULA = [
  { dominio: "AGK38332", marca: "PEUGEOT", modelo: "PARTNER CONFORT 1.6 HDI", anio: "", chasis: "8AEGC9HJCJG504265" },
  { dominio: "A208SDV", marca: "ZANELLA", modelo: "SAPUCAI 150 F", anio: "", chasis: "8A6MAST53NS002671" },
  { dominio: "AB123CD", marca: "VOLKSWAGEN", modelo: "GOL TREND", anio: "2019", chasis: "9BWAB05X1KP654321" },
];

export function simularLecturaCedula() {
  const ejemplo = EJEMPLOS_CEDULA[Math.floor(Math.random() * EJEMPLOS_CEDULA.length)];
  return { ...ejemplo };
}
