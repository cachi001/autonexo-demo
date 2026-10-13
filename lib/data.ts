// Persistencia real en Postgres (Neon). Antes esto escribía un archivo JSON
// en disco, pero el filesystem de las funciones serverless de Vercel es
// efímero y no se comparte entre invocaciones — un POST que agregaba stock
// podía "perderse" antes del siguiente GET. Con una base de datos de verdad
// esto queda resuelto.
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.POSTGRES_URL!);

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
  // Chasis y datos del titular vienen de la cédula pero el OCR no siempre
  // los lee bien (ej. DNI tapado/parcial) -> la agencia tiene que poder
  // escribirlos o corregirlos a mano, así que se guardan como el resto.
  chasis: string;
  titular_nombre: string;
  titular_domicilio: string;
  titular_dni: string;
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
    chasis: "",
    titular_nombre: "",
    titular_domicilio: "",
    titular_dni: "",
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
    chasis: "",
    titular_nombre: "",
    titular_domicilio: "",
    titular_dni: "",
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
    chasis: "",
    titular_nombre: "",
    titular_domicilio: "",
    titular_dni: "",
    documentacion_validada: false,
    documentacion_validada_fecha: null,
    vistas_reales: 0,
    fotos: [],
  },
];

// Se corre una sola vez por instancia "caliente" (no en cada query) — el
// flag vive a nivel de módulo.
let inicializado: Promise<void> | null = null;

function asegurarTablas(): Promise<void> {
  if (!inicializado) {
    inicializado = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS stock (
          dominio TEXT PRIMARY KEY,
          marca TEXT NOT NULL,
          modelo TEXT NOT NULL,
          anio TEXT NOT NULL DEFAULT '',
          tipo TEXT NOT NULL DEFAULT '',
          precio TEXT NOT NULL DEFAULT '',
          km TEXT NOT NULL DEFAULT '',
          color TEXT NOT NULL DEFAULT '',
          descripcion TEXT NOT NULL DEFAULT '',
          chasis TEXT NOT NULL DEFAULT '',
          titular_nombre TEXT NOT NULL DEFAULT '',
          titular_domicilio TEXT NOT NULL DEFAULT '',
          titular_dni TEXT NOT NULL DEFAULT '',
          documentacion_validada BOOLEAN NOT NULL DEFAULT FALSE,
          documentacion_validada_fecha TEXT,
          vistas_reales INTEGER NOT NULL DEFAULT 0,
          fotos JSONB NOT NULL DEFAULT '[]'::jsonb
        )
      `;
      // La tabla stock ya existe en producción desde antes de agregar estas
      // columnas -> CREATE TABLE IF NOT EXISTS no las agrega a una tabla ya
      // creada, hace falta ALTER TABLE explícito.
      await sql`ALTER TABLE stock ADD COLUMN IF NOT EXISTS chasis TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE stock ADD COLUMN IF NOT EXISTS titular_nombre TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE stock ADD COLUMN IF NOT EXISTS titular_domicilio TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE stock ADD COLUMN IF NOT EXISTS titular_dni TEXT NOT NULL DEFAULT ''`;
      await sql`
        CREATE TABLE IF NOT EXISTS leads (
          id TEXT PRIMARY KEY,
          dominio TEXT NOT NULL,
          nombre TEXT NOT NULL,
          telefono TEXT,
          mensaje TEXT NOT NULL,
          fecha TEXT NOT NULL,
          estado TEXT NOT NULL
        )
      `;
      const [{ count }] = (await sql`SELECT COUNT(*)::int AS count FROM stock`) as { count: number }[];
      if (count === 0) {
        for (const v of SEED_STOCK) {
          await sql`
            INSERT INTO stock (dominio, marca, modelo, anio, tipo, precio, km, color, descripcion, chasis, titular_nombre, titular_domicilio, titular_dni, documentacion_validada, documentacion_validada_fecha, vistas_reales, fotos)
            VALUES (${v.dominio}, ${v.marca}, ${v.modelo}, ${v.anio}, ${v.tipo}, ${v.precio}, ${v.km}, ${v.color}, ${v.descripcion}, ${v.chasis}, ${v.titular_nombre}, ${v.titular_domicilio}, ${v.titular_dni}, ${v.documentacion_validada}, ${v.documentacion_validada_fecha}, ${v.vistas_reales}, ${JSON.stringify(v.fotos)})
          `;
        }
      }
    })();
  }
  return inicializado;
}

function filaAVehiculo(r: Record<string, unknown>): Vehiculo {
  return {
    dominio: r.dominio as string,
    marca: r.marca as string,
    modelo: r.modelo as string,
    anio: r.anio as string,
    tipo: r.tipo as string,
    precio: r.precio as string,
    km: r.km as string,
    color: r.color as string,
    descripcion: r.descripcion as string,
    chasis: (r.chasis as string) || "",
    titular_nombre: (r.titular_nombre as string) || "",
    titular_domicilio: (r.titular_domicilio as string) || "",
    titular_dni: (r.titular_dni as string) || "",
    documentacion_validada: r.documentacion_validada as boolean,
    documentacion_validada_fecha: r.documentacion_validada_fecha as string | null,
    vistas_reales: r.vistas_reales as number,
    fotos: (r.fotos as string[]) || [],
  };
}

function filaALead(r: Record<string, unknown>): Lead {
  return {
    id: r.id as string,
    dominio: r.dominio as string,
    nombre: r.nombre as string,
    telefono: r.telefono as string | null,
    mensaje: r.mensaje as string,
    fecha: r.fecha as string,
    estado: r.estado as Lead["estado"],
  };
}

export async function listarStock(): Promise<Vehiculo[]> {
  await asegurarTablas();
  const filas = await sql`SELECT * FROM stock`;
  return filas.map(filaAVehiculo);
}

export async function buscarVehiculo(dominio: string): Promise<Vehiculo | undefined> {
  await asegurarTablas();
  const filas = await sql`SELECT * FROM stock WHERE dominio = ${dominio}`;
  return filas[0] ? filaAVehiculo(filas[0]) : undefined;
}

export async function agregarVehiculo(
  v: Omit<Vehiculo, "documentacion_validada" | "documentacion_validada_fecha" | "vistas_reales" | "fotos">
): Promise<Vehiculo | null> {
  await asegurarTablas();
  const existente = await sql`SELECT dominio FROM stock WHERE dominio = ${v.dominio}`;
  if (existente.length > 0) return null;
  await sql`
    INSERT INTO stock (dominio, marca, modelo, anio, tipo, precio, km, color, descripcion, chasis, titular_nombre, titular_domicilio, titular_dni, documentacion_validada, documentacion_validada_fecha, vistas_reales, fotos)
    VALUES (${v.dominio}, ${v.marca}, ${v.modelo}, ${v.anio}, ${v.tipo}, ${v.precio}, ${v.km}, ${v.color}, ${v.descripcion}, ${v.chasis}, ${v.titular_nombre}, ${v.titular_domicilio}, ${v.titular_dni}, FALSE, NULL, 0, '[]'::jsonb)
  `;
  return {
    ...v,
    documentacion_validada: false,
    documentacion_validada_fecha: null,
    vistas_reales: 0,
    fotos: [],
  };
}

export async function agregarFotos(dominio: string, fotosBase64: string[]): Promise<Vehiculo | null> {
  await asegurarTablas();
  const actual = await buscarVehiculo(dominio);
  if (!actual) return null;
  const fotos = [...actual.fotos, ...fotosBase64];
  await sql`UPDATE stock SET fotos = ${JSON.stringify(fotos)}::jsonb WHERE dominio = ${dominio}`;
  return { ...actual, fotos };
}

export async function quitarFoto(dominio: string, indice: number): Promise<Vehiculo | null> {
  await asegurarTablas();
  const actual = await buscarVehiculo(dominio);
  if (!actual) return null;
  const fotos = actual.fotos.filter((_, i) => i !== indice);
  await sql`UPDATE stock SET fotos = ${JSON.stringify(fotos)}::jsonb WHERE dominio = ${dominio}`;
  return { ...actual, fotos };
}

export async function setDocumentacionValidada(dominio: string, validada: boolean): Promise<Vehiculo | null> {
  await asegurarTablas();
  const fecha = validada ? new Date().toISOString().slice(0, 10) : null;
  const filas = await sql`
    UPDATE stock SET documentacion_validada = ${validada}, documentacion_validada_fecha = ${fecha}
    WHERE dominio = ${dominio} RETURNING *
  `;
  return filas[0] ? filaAVehiculo(filas[0]) : null;
}

export async function registrarVista(dominio: string): Promise<Vehiculo | null> {
  await asegurarTablas();
  const filas = await sql`
    UPDATE stock SET vistas_reales = vistas_reales + 1 WHERE dominio = ${dominio} RETURNING *
  `;
  return filas[0] ? filaAVehiculo(filas[0]) : null;
}

export async function crearLead(dominio: string, nombre: string, mensaje: string, telefono?: string): Promise<Lead> {
  await asegurarTablas();
  const lead: Lead = {
    id: Math.random().toString(36).slice(2, 12),
    dominio,
    nombre: nombre.trim() || "Interesado sin nombre",
    telefono: telefono?.trim() || null,
    mensaje: mensaje.trim(),
    fecha: new Date().toISOString().slice(0, 16).replace("T", " "),
    estado: "pendiente",
  };
  await sql`
    INSERT INTO leads (id, dominio, nombre, telefono, mensaje, fecha, estado)
    VALUES (${lead.id}, ${lead.dominio}, ${lead.nombre}, ${lead.telefono}, ${lead.mensaje}, ${lead.fecha}, ${lead.estado})
  `;
  return lead;
}

export async function listarLeads(): Promise<Lead[]> {
  await asegurarTablas();
  const filas = await sql`SELECT * FROM leads ORDER BY fecha DESC`;
  return filas.map(filaALead);
}

export async function actualizarEstadoLead(id: string, estado: Lead["estado"]): Promise<Lead | null> {
  await asegurarTablas();
  const filas = await sql`UPDATE leads SET estado = ${estado} WHERE id = ${id} RETURNING *`;
  return filas[0] ? filaALead(filas[0]) : null;
}

export async function contarLeadsPorDominio(): Promise<Record<string, number>> {
  await asegurarTablas();
  const filas = await sql`SELECT dominio, COUNT(*)::int AS cantidad FROM leads GROUP BY dominio`;
  const conteo: Record<string, number> = {};
  for (const f of filas) conteo[f.dominio as string] = f.cantidad as number;
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
