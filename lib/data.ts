// Persistencia real en Postgres (Neon). Antes esto escribía un archivo JSON
// en disco, pero el filesystem de las funciones serverless de Vercel es
// efímero y no se comparte entre invocaciones — un POST que agregaba stock
// podía "perderse" antes del siguiente GET. Con una base de datos de verdad
// esto queda resuelto.
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.POSTGRES_URL!);

export type Vehiculo = {
  dominio: string;
  agencia_id: string;
  marca: string;
  modelo: string;
  anio: string;
  tipo: string;
  precio: string;
  km: string;
  color: string;
  descripcion: string;
  // Ficha técnica -alineada con los campos que ya tiene AutoClick
  // (version/combustible, ver AutoClick/autoclick-app/app/page.tsx
  // componente Publish) más "puertas", que falta en los dos. Mercado Libre
  // exige los tres como atributos obligatorios de la categoría "Autos y
  // Camionetas" (TRIM/FUEL_TYPE/DOORS, confirmado en vivo contra la API
  // real) -ver lib/mercadolibre.ts.
  version: string;
  combustible: string;
  puertas: string;
  // Chasis y datos del titular vienen de la cédula pero el OCR no siempre
  // los lee bien (ej. DNI tapado/parcial) -> la agencia tiene que poder
  // escribirlos o corregirlos a mano, así que se guardan como el resto.
  chasis: string;
  titular_nombre: string;
  titular_domicilio: string;
  titular_dni: string;
  // Comprobante de "libre deuda de patente" que el VENDEDOR descarga de su
  // propia cuenta en atm.mendoza.gov.ar (requiere su CUIT y clave, por eso
  // lo sube él, la agencia no puede consultarlo) -> es solo evidencia
  // cargada, igual que una foto, sin OCR ni validación automática.
  libre_deuda_atm: string;
  // Checklist de documentación por tipo de vehículo (ver lib/documentos.ts):
  // cada clave es un DocumentoKey, el valor es solo evidencia cargada (sin
  // OCR ni validación automática), igual que libre_deuda_atm de arriba.
  // libre_deuda_atm (la columna TEXT vieja) se migra acá automáticamente la
  // primera vez que se lee el vehículo -> esta es la fuente de verdad nueva.
  documentos: Record<string, { nombre: string; dataUrl: string } | undefined>;
  documentacion_validada: boolean;
  documentacion_validada_fecha: string | null;
  vistas_reales: number;
  fotos: string[];
};

export type DocumentoVehiculo = { nombre: string; dataUrl: string };

export type Agencia = {
  id: string;
  razon_social: string;
  cuit: string;
  // contacto_nombre es solo el nombre de pila; el apellido va aparte.
  contacto_nombre: string;
  contacto_apellido: string;
  contacto_email: string;
  // Campo viejo, se mantiene por compatibilidad hacia atrás (no se borra),
  // pero ya no se pide en el alta -> los datos reales del celular/fijo
  // viven en las columnas de abajo, que son las que pide el formulario
  // real "Obtener Informe Web" de la DNRPA (sección "Datos del solicitante").
  contacto_telefono: string;
  celular_codigo_area: string;
  celular_numero: string;
  celular_operador: string;
  telefono_fijo_codigo_area: string;
  telefono_fijo_numero: string;
  // Ubicación real de la agencia -ML exige location hasta nivel ciudad para
  // publicar un vehículo ("Field 'location' requires up to city level",
  // confirmado en vivo); antes se mandaba siempre Mendoza capital fija sin
  // preguntarle nada a la agencia. provincia_id es el id que usa la propia
  // API de ML (ej. "AR-M"), no un nombre libre -ver lib/provincias.ts.
  ciudad: string;
  provincia_id: string;
  provincia_nombre: string;
  fecha_alta: string;
};

// Publicación del stock a redes externas (syndication) -ver AutoNexo/discovery/
// Contraste_AutoFlow_vs_AutoNexo.md §1: el hueco real frente a la competencia
// era justo esto, con dos reglas no negociables (P7, "la IA propone, la
// persona aprueba"): nunca se publica solo -siempre hay un botón explícito
// por canal-, y el estado de cada canal es independiente (un vehículo puede
// estar publicado en ML y pendiente en Instagram a la vez).
export type Canal = "mercadolibre" | "instagram" | "facebook";

export type CanalConectado = {
  id: string;
  agencia_id: string;
  canal: Canal;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  cuenta_externa_id: string;
  cuenta_externa_nombre: string;
  conectado_en: string;
};

// "en_revision" es distinto de "error": en_revision significa que ML SÍ creó
// el aviso (hay external_id/permalink reales) pero lo tiene oculto hasta que
// se corrija algo -ej. precio por debajo del piso de mercado. "error" es un
// rechazo total, nunca se creó nada en ML. Antes los dos se guardaban como
// "error" por igual y la agencia no podía distinguir "nunca se publicó" de
// "se publicó pero está escondido" -encontrado en vivo con el Ford Fiesta.
export type EstadoPublicacion = "sin_publicar" | "pendiente_aprobacion" | "publicado" | "rechazado" | "pausado" | "error" | "en_revision";

export type Publicacion = {
  dominio: string;
  canal: Canal;
  estado: EstadoPublicacion;
  external_id: string;
  permalink: string;
  error_msg: string;
  actualizado_en: string;
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
    agencia_id: "",
    marca: "VOLKSWAGEN",
    modelo: "GOL TREND",
    anio: "2019",
    tipo: "SEDAN",
    precio: "8500000",
    km: "65000",
    color: "BLANCO",
    descripcion: "Único dueño, service oficial",
    version: "",
    combustible: "",
    puertas: "",
    chasis: "",
    titular_nombre: "",
    titular_domicilio: "",
    titular_dni: "",
    libre_deuda_atm: "",
    documentos: {},
    documentacion_validada: true,
    documentacion_validada_fecha: "2026-10-12",
    vistas_reales: 3,
    fotos: [],
  },
  {
    dominio: "AC456EF",
    agencia_id: "",
    marca: "FORD",
    modelo: "FIESTA",
    anio: "2018",
    tipo: "HATCHBACK",
    precio: "7200000",
    km: "80000",
    color: "GRIS",
    descripcion: "Buen estado",
    version: "",
    combustible: "",
    puertas: "",
    chasis: "",
    titular_nombre: "",
    titular_domicilio: "",
    titular_dni: "",
    libre_deuda_atm: "",
    documentos: {},
    documentacion_validada: false,
    documentacion_validada_fecha: null,
    vistas_reales: 0,
    fotos: [],
  },
  {
    dominio: "A208SDV",
    agencia_id: "",
    marca: "ZANELLA",
    modelo: "SAPUCAI 150 F",
    anio: "",
    tipo: "MOTOCICLETA",
    precio: "2100000",
    km: "12000",
    color: "ROJA",
    descripcion: "Cargada por foto de cédula real — dato de prueba de esta sesión",
    version: "",
    combustible: "",
    puertas: "",
    chasis: "",
    titular_nombre: "",
    titular_domicilio: "",
    titular_dni: "",
    libre_deuda_atm: "",
    documentos: {},
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
          libre_deuda_atm TEXT NOT NULL DEFAULT '',
          documentos JSONB NOT NULL DEFAULT '{}'::jsonb,
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
      await sql`ALTER TABLE stock ADD COLUMN IF NOT EXISTS libre_deuda_atm TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE stock ADD COLUMN IF NOT EXISTS documentos JSONB NOT NULL DEFAULT '{}'::jsonb`;
      // Multi-tenant: antes TODO el stock era una sola bolsa global visible
      // para cualquier agencia (sin columna de dueño). Se agrega agencia_id
      // y se completa con la primera agencia existente (la única que había
      // en producción hasta esta migración) para no perder el stock ya
      // cargado -> de acá en más toda lectura/escritura de /api/stock/* se
      // filtra por la agencia de la sesión (ver lib/auth.ts).
      await sql`ALTER TABLE stock ADD COLUMN IF NOT EXISTS agencia_id TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE stock ADD COLUMN IF NOT EXISTS version TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE stock ADD COLUMN IF NOT EXISTS combustible TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE stock ADD COLUMN IF NOT EXISTS puertas TEXT NOT NULL DEFAULT ''`;
      // La ficha del stock ahora muestra el libre deuda ATM como un
      // documento más de la checklist (en vez de un campo aparte cargado
      // desde el wizard de cédula) -> se migra una sola vez lo que ya
      // hubiera en la columna vieja a la columna documentos nueva. El
      // WHERE hace que sea un no-op en las corridas siguientes.
      await sql`
        UPDATE stock
        SET documentos = jsonb_set(
          documentos, '{libre_deuda_atm}',
          jsonb_build_object('nombre', 'Libre deuda (migrado del wizard de cédula)', 'dataUrl', libre_deuda_atm)
        )
        WHERE libre_deuda_atm <> '' AND (documentos -> 'libre_deuda_atm') IS NULL
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS agencias (
          id TEXT PRIMARY KEY,
          razon_social TEXT NOT NULL,
          cuit TEXT NOT NULL,
          contacto_nombre TEXT NOT NULL,
          contacto_email TEXT NOT NULL,
          contacto_telefono TEXT NOT NULL DEFAULT '',
          fecha_alta TEXT NOT NULL
        )
      `;
      // Mismos campos que pide el formulario real "Obtener Informe Web" de
      // la DNRPA (sección "Datos del solicitante") -> se agregan acá para
      // que el día que se automatice ese trámite, el perfil de la agencia
      // ya tenga los datos cargados. La tabla agencias ya existe en
      // producción desde antes -> hace falta ALTER TABLE explícito.
      await sql`ALTER TABLE agencias ADD COLUMN IF NOT EXISTS contacto_apellido TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE agencias ADD COLUMN IF NOT EXISTS celular_codigo_area TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE agencias ADD COLUMN IF NOT EXISTS celular_numero TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE agencias ADD COLUMN IF NOT EXISTS celular_operador TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE agencias ADD COLUMN IF NOT EXISTS telefono_fijo_codigo_area TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE agencias ADD COLUMN IF NOT EXISTS telefono_fijo_numero TEXT NOT NULL DEFAULT ''`;
      // Login real por agencia (antes no existía ningún control de acceso:
      // cualquiera que entraba a /stock veía los datos de la única agencia
      // que hubiera). Hash con bcrypt, nunca se guarda ni se devuelve la
      // contraseña en texto plano.
      await sql`ALTER TABLE agencias ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT ''`;
      // Ubicación real -antes no existía ningún campo de domicilio, Mercado
      // Libre recibía siempre "Mendoza, Mendoza" fijo sin importar dónde
      // estuviera la agencia de verdad.
      await sql`ALTER TABLE agencias ADD COLUMN IF NOT EXISTS ciudad TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE agencias ADD COLUMN IF NOT EXISTS provincia_id TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE agencias ADD COLUMN IF NOT EXISTS provincia_nombre TEXT NOT NULL DEFAULT ''`;
      await sql`
        CREATE TABLE IF NOT EXISTS sesiones (
          token TEXT PRIMARY KEY,
          agencia_id TEXT,
          rol TEXT NOT NULL DEFAULT 'agencia',
          creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
          expira_en TIMESTAMPTZ NOT NULL
        )
      `;
      // Backfill de agencia_id en stock: la primera agencia dada de alta se
      // queda con todo el stock que ya existía antes de que hubiera más de
      // una agencia posible. Es un no-op en las corridas siguientes (WHERE
      // agencia_id = '' deja de matchear nada una vez corrido).
      const [{ id: primeraAgenciaId } = { id: null }] = (await sql`
        SELECT id FROM agencias ORDER BY fecha_alta ASC LIMIT 1
      `) as { id: string | null }[];
      if (primeraAgenciaId) {
        await sql`UPDATE stock SET agencia_id = ${primeraAgenciaId} WHERE agencia_id = ''`;
      }
      await sql`
        CREATE TABLE IF NOT EXISTS canales_conectados (
          id TEXT PRIMARY KEY,
          agencia_id TEXT NOT NULL,
          canal TEXT NOT NULL,
          access_token TEXT NOT NULL DEFAULT '',
          refresh_token TEXT NOT NULL DEFAULT '',
          expires_at TEXT NOT NULL DEFAULT '',
          cuenta_externa_id TEXT NOT NULL DEFAULT '',
          cuenta_externa_nombre TEXT NOT NULL DEFAULT '',
          conectado_en TEXT NOT NULL,
          UNIQUE (agencia_id, canal)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS publicaciones (
          dominio TEXT NOT NULL,
          canal TEXT NOT NULL,
          estado TEXT NOT NULL DEFAULT 'sin_publicar',
          external_id TEXT NOT NULL DEFAULT '',
          error_msg TEXT NOT NULL DEFAULT '',
          actualizado_en TEXT NOT NULL,
          PRIMARY KEY (dominio, canal)
        )
      `;
      await sql`ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS permalink TEXT NOT NULL DEFAULT ''`;
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
      if (count === 0 && primeraAgenciaId) {
        for (const v of SEED_STOCK) {
          await sql`
            INSERT INTO stock (dominio, agencia_id, marca, modelo, anio, tipo, precio, km, color, descripcion, chasis, titular_nombre, titular_domicilio, titular_dni, libre_deuda_atm, documentos, documentacion_validada, documentacion_validada_fecha, vistas_reales, fotos)
            VALUES (${v.dominio}, ${primeraAgenciaId}, ${v.marca}, ${v.modelo}, ${v.anio}, ${v.tipo}, ${v.precio}, ${v.km}, ${v.color}, ${v.descripcion}, ${v.chasis}, ${v.titular_nombre}, ${v.titular_domicilio}, ${v.titular_dni}, ${v.libre_deuda_atm}, ${JSON.stringify(v.documentos)}::jsonb, ${v.documentacion_validada}, ${v.documentacion_validada_fecha}, ${v.vistas_reales}, ${JSON.stringify(v.fotos)})
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
    agencia_id: r.agencia_id as string,
    marca: r.marca as string,
    modelo: r.modelo as string,
    anio: r.anio as string,
    tipo: r.tipo as string,
    precio: r.precio as string,
    km: r.km as string,
    color: r.color as string,
    descripcion: r.descripcion as string,
    version: (r.version as string) || "",
    combustible: (r.combustible as string) || "",
    puertas: (r.puertas as string) || "",
    chasis: (r.chasis as string) || "",
    titular_nombre: (r.titular_nombre as string) || "",
    titular_domicilio: (r.titular_domicilio as string) || "",
    titular_dni: (r.titular_dni as string) || "",
    libre_deuda_atm: (r.libre_deuda_atm as string) || "",
    documentos: (r.documentos as Record<string, { nombre: string; dataUrl: string } | undefined>) || {},
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

// Multi-tenant: el stock privado de cada agencia (panel /stock) SIEMPRE se
// lee/escribe filtrado por agencia_id de la sesión. El catálogo público
// (/catalogo) es la única excepción con intención real -> usa
// listarStockPublico() (sin filtro) más abajo, no esta función.
export async function listarStock(agenciaId: string): Promise<Vehiculo[]> {
  await asegurarTablas();
  const filas = await sql`SELECT * FROM stock WHERE agencia_id = ${agenciaId}`;
  return filas.map(filaAVehiculo);
}

export async function listarStockPublico(): Promise<Vehiculo[]> {
  await asegurarTablas();
  const filas = await sql`SELECT * FROM stock`;
  return filas.map(filaAVehiculo);
}

export async function buscarVehiculo(dominio: string, agenciaId: string): Promise<Vehiculo | undefined> {
  await asegurarTablas();
  const filas = await sql`SELECT * FROM stock WHERE dominio = ${dominio} AND agencia_id = ${agenciaId}`;
  return filas[0] ? filaAVehiculo(filas[0]) : undefined;
}

// Para el catálogo público y la publicación a canales externos (que ya
// resuelve la agencia dueña por su cuenta) -> sin filtro de agencia.
export async function buscarVehiculoPublico(dominio: string): Promise<Vehiculo | undefined> {
  await asegurarTablas();
  const filas = await sql`SELECT * FROM stock WHERE dominio = ${dominio}`;
  return filas[0] ? filaAVehiculo(filas[0]) : undefined;
}

export async function agregarVehiculo(
  v: Omit<Vehiculo, "documentos" | "documentacion_validada" | "documentacion_validada_fecha" | "vistas_reales" | "fotos">
): Promise<Vehiculo | null> {
  await asegurarTablas();
  const existente = await sql`SELECT dominio FROM stock WHERE dominio = ${v.dominio}`;
  if (existente.length > 0) return null;
  await sql`
    INSERT INTO stock (dominio, agencia_id, marca, modelo, anio, tipo, precio, km, color, descripcion, chasis, titular_nombre, titular_domicilio, titular_dni, libre_deuda_atm, documentos, documentacion_validada, documentacion_validada_fecha, vistas_reales, fotos)
    VALUES (${v.dominio}, ${v.agencia_id}, ${v.marca}, ${v.modelo}, ${v.anio}, ${v.tipo}, ${v.precio}, ${v.km}, ${v.color}, ${v.descripcion}, ${v.chasis}, ${v.titular_nombre}, ${v.titular_domicilio}, ${v.titular_dni}, ${v.libre_deuda_atm}, '{}'::jsonb, FALSE, NULL, 0, '[]'::jsonb)
  `;
  return {
    ...v,
    documentos: {},
    documentacion_validada: false,
    documentacion_validada_fecha: null,
    vistas_reales: 0,
    fotos: [],
  };
}

// Sube o reemplaza un documento de la checklist (ver lib/documentos.ts).
// documento = null borra el slot. Igual que agregarFotos/quitarFoto: solo
// evidencia cargada, sin OCR ni validación automática del contenido.
export async function setDocumentoVehiculo(
  dominio: string,
  agenciaId: string,
  clave: string,
  documento: DocumentoVehiculo | null
): Promise<Vehiculo | null> {
  await asegurarTablas();
  const actual = await buscarVehiculo(dominio, agenciaId);
  if (!actual) return null;
  const documentos = { ...actual.documentos };
  if (documento) documentos[clave] = documento;
  else delete documentos[clave];
  const filas = await sql`
    UPDATE stock SET documentos = ${JSON.stringify(documentos)}::jsonb
    WHERE dominio = ${dominio} AND agencia_id = ${agenciaId} RETURNING *
  `;
  return filas[0] ? filaAVehiculo(filas[0]) : null;
}

export async function agregarFotos(dominio: string, agenciaId: string, fotosBase64: string[]): Promise<Vehiculo | null> {
  await asegurarTablas();
  const actual = await buscarVehiculo(dominio, agenciaId);
  if (!actual) return null;
  const fotos = [...actual.fotos, ...fotosBase64];
  await sql`UPDATE stock SET fotos = ${JSON.stringify(fotos)}::jsonb WHERE dominio = ${dominio} AND agencia_id = ${agenciaId}`;
  return { ...actual, fotos };
}

export async function quitarFoto(dominio: string, agenciaId: string, indice: number): Promise<Vehiculo | null> {
  await asegurarTablas();
  const actual = await buscarVehiculo(dominio, agenciaId);
  if (!actual) return null;
  const fotos = actual.fotos.filter((_, i) => i !== indice);
  await sql`UPDATE stock SET fotos = ${JSON.stringify(fotos)}::jsonb WHERE dominio = ${dominio} AND agencia_id = ${agenciaId}`;
  return { ...actual, fotos };
}

export async function actualizarPrecio(dominio: string, agenciaId: string, precio: string): Promise<Vehiculo | null> {
  await asegurarTablas();
  const filas = await sql`
    UPDATE stock SET precio = ${precio} WHERE dominio = ${dominio} AND agencia_id = ${agenciaId} RETURNING *
  `;
  return filas[0] ? filaAVehiculo(filas[0]) : null;
}

export async function setFichaTecnica(
  dominio: string,
  agenciaId: string,
  // chasis es opcional acá -ya existía la columna (viene del OCR de
  // cédula), esto solo agrega una forma de completarlo/corregirlo a mano
  // cuando el vehículo se cargó por planilla o el OCR no lo leyó bien.
  // Mercado Libre lo exige desde oct-2024 (ver lib/mercadolibre.ts).
  datos: { version: string; combustible: string; puertas: string; chasis?: string }
): Promise<Vehiculo | null> {
  await asegurarTablas();
  const actual = await sql`SELECT chasis FROM stock WHERE dominio = ${dominio} AND agencia_id = ${agenciaId}`;
  const chasis = datos.chasis !== undefined ? datos.chasis : ((actual[0]?.chasis as string) || "");
  const filas = await sql`
    UPDATE stock SET version = ${datos.version}, combustible = ${datos.combustible}, puertas = ${datos.puertas}, chasis = ${chasis}
    WHERE dominio = ${dominio} AND agencia_id = ${agenciaId} RETURNING *
  `;
  return filas[0] ? filaAVehiculo(filas[0]) : null;
}

export async function setDocumentacionValidada(dominio: string, agenciaId: string, validada: boolean): Promise<Vehiculo | null> {
  await asegurarTablas();
  const fecha = validada ? new Date().toISOString().slice(0, 10) : null;
  const filas = await sql`
    UPDATE stock SET documentacion_validada = ${validada}, documentacion_validada_fecha = ${fecha}
    WHERE dominio = ${dominio} AND agencia_id = ${agenciaId} RETURNING *
  `;
  return filas[0] ? filaAVehiculo(filas[0]) : null;
}

export async function aplicarDatosDnrpa(
  dominio: string,
  agenciaId: string,
  datos: { marca: string; modelo: string; anio: string }
): Promise<Vehiculo | null> {
  await asegurarTablas();
  const filas = await sql`
    UPDATE stock SET marca = ${datos.marca}, modelo = ${datos.modelo}, anio = ${datos.anio}
    WHERE dominio = ${dominio} AND agencia_id = ${agenciaId} RETURNING *
  `;
  return filas[0] ? filaAVehiculo(filas[0]) : null;
}

// Sin filtro de agencia a propósito: la vista la incrementa un comprador
// anónimo navegando el catálogo público, no la agencia dueña.
export async function registrarVista(dominio: string): Promise<Vehiculo | null> {
  await asegurarTablas();
  const filas = await sql`
    UPDATE stock SET vistas_reales = vistas_reales + 1 WHERE dominio = ${dominio} RETURNING *
  `;
  return filas[0] ? filaAVehiculo(filas[0]) : null;
}

function filaAAgencia(r: Record<string, unknown>): Agencia {
  return {
    id: r.id as string,
    razon_social: r.razon_social as string,
    cuit: r.cuit as string,
    contacto_nombre: r.contacto_nombre as string,
    contacto_apellido: (r.contacto_apellido as string) || "",
    contacto_email: r.contacto_email as string,
    contacto_telefono: (r.contacto_telefono as string) || "",
    celular_codigo_area: (r.celular_codigo_area as string) || "",
    celular_numero: (r.celular_numero as string) || "",
    celular_operador: (r.celular_operador as string) || "",
    telefono_fijo_codigo_area: (r.telefono_fijo_codigo_area as string) || "",
    telefono_fijo_numero: (r.telefono_fijo_numero as string) || "",
    ciudad: (r.ciudad as string) || "",
    provincia_id: (r.provincia_id as string) || "",
    provincia_nombre: (r.provincia_nombre as string) || "",
    fecha_alta: r.fecha_alta as string,
  };
}

export async function crearAgencia(datos: {
  razon_social: string;
  cuit: string;
  contacto_nombre: string;
  contacto_apellido?: string;
  contacto_email: string;
  contacto_telefono?: string;
  celular_codigo_area?: string;
  celular_numero?: string;
  celular_operador?: string;
  telefono_fijo_codigo_area?: string;
  telefono_fijo_numero?: string;
  password_hash: string;
}): Promise<Agencia> {
  await asegurarTablas();
  const celularCodigoArea = (datos.celular_codigo_area || "").trim();
  const celularNumero = (datos.celular_numero || "").trim();
  const agencia: Agencia = {
    id: Math.random().toString(36).slice(2, 12),
    razon_social: datos.razon_social.trim(),
    cuit: datos.cuit.trim(),
    contacto_nombre: datos.contacto_nombre.trim(),
    contacto_apellido: (datos.contacto_apellido || "").trim(),
    contacto_email: datos.contacto_email.trim(),
    // Si no viene un teléfono "viejo" explícito, se deriva del celular
    // nuevo para no dejar el campo de compatibilidad vacío.
    contacto_telefono: (datos.contacto_telefono || `${celularCodigoArea} ${celularNumero}`).trim(),
    celular_codigo_area: celularCodigoArea,
    celular_numero: celularNumero,
    celular_operador: (datos.celular_operador || "").trim(),
    telefono_fijo_codigo_area: (datos.telefono_fijo_codigo_area || "").trim(),
    telefono_fijo_numero: (datos.telefono_fijo_numero || "").trim(),
    fecha_alta: new Date().toISOString().slice(0, 10),
  };
  await sql`
    INSERT INTO agencias (
      id, razon_social, cuit, contacto_nombre, contacto_apellido, contacto_email, contacto_telefono,
      celular_codigo_area, celular_numero, celular_operador, telefono_fijo_codigo_area, telefono_fijo_numero, fecha_alta, password_hash
    )
    VALUES (
      ${agencia.id}, ${agencia.razon_social}, ${agencia.cuit}, ${agencia.contacto_nombre}, ${agencia.contacto_apellido}, ${agencia.contacto_email}, ${agencia.contacto_telefono},
      ${agencia.celular_codigo_area}, ${agencia.celular_numero}, ${agencia.celular_operador}, ${agencia.telefono_fijo_codigo_area}, ${agencia.telefono_fijo_numero}, ${agencia.fecha_alta}, ${datos.password_hash}
    )
  `;
  return agencia;
}

// --- Autenticación (sesiones propias, sin Clerk/NextAuth por ahora -ver
// AutoNexo/CLAUDE.md "Auth: propio"- un token opaco guardado en Postgres,
// no un JWT: así una sesión se puede invalidar de verdad borrando la fila,
// en vez de esperar a que expire un token firmado que ya está afuera). ---

export async function obtenerAgenciaPorEmailConHash(
  email: string
): Promise<(Agencia & { password_hash: string }) | undefined> {
  await asegurarTablas();
  const filas = await sql`SELECT * FROM agencias WHERE lower(contacto_email) = lower(${email})`;
  if (!filas[0]) return undefined;
  return { ...filaAAgencia(filas[0]), password_hash: filas[0].password_hash as string };
}

export type Sesion = { token: string; agenciaId: string | null; rol: "agencia" | "admin" };

export async function crearSesion(agenciaId: string | null, rol: "agencia" | "admin"): Promise<string> {
  await asegurarTablas();
  const token = crypto.randomUUID() + crypto.randomUUID();
  const expiraEn = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 días
  await sql`
    INSERT INTO sesiones (token, agencia_id, rol, expira_en)
    VALUES (${token}, ${agenciaId}, ${rol}, ${expiraEn.toISOString()})
  `;
  return token;
}

export async function obtenerSesion(token: string): Promise<Sesion | null> {
  await asegurarTablas();
  const filas = await sql`
    SELECT token, agencia_id, rol FROM sesiones WHERE token = ${token} AND expira_en > now()
  `;
  if (!filas[0]) return null;
  return { token: filas[0].token as string, agenciaId: filas[0].agencia_id as string | null, rol: filas[0].rol as "agencia" | "admin" };
}

export async function borrarSesion(token: string): Promise<void> {
  await asegurarTablas();
  await sql`DELETE FROM sesiones WHERE token = ${token}`;
}

export async function listarAgencias(): Promise<Agencia[]> {
  await asegurarTablas();
  const filas = await sql`SELECT * FROM agencias ORDER BY fecha_alta DESC`;
  return filas.map(filaAAgencia);
}

export async function obtenerAgencia(id: string): Promise<Agencia | undefined> {
  await asegurarTablas();
  const filas = await sql`SELECT * FROM agencias WHERE id = ${id}`;
  return filas[0] ? filaAAgencia(filas[0]) : undefined;
}

export async function actualizarAgencia(
  id: string,
  datos: Partial<{
    razon_social: string;
    cuit: string;
    contacto_nombre: string;
    contacto_apellido: string;
    contacto_email: string;
    celular_codigo_area: string;
    celular_numero: string;
    celular_operador: string;
    telefono_fijo_codigo_area: string;
    telefono_fijo_numero: string;
    ciudad: string;
    provincia_id: string;
    provincia_nombre: string;
  }>
): Promise<Agencia | null> {
  await asegurarTablas();
  const actual = await obtenerAgencia(id);
  if (!actual) return null;
  const nueva: Agencia = {
    ...actual,
    razon_social: datos.razon_social?.trim() ?? actual.razon_social,
    cuit: datos.cuit?.trim() ?? actual.cuit,
    contacto_nombre: datos.contacto_nombre?.trim() ?? actual.contacto_nombre,
    contacto_apellido: datos.contacto_apellido?.trim() ?? actual.contacto_apellido,
    contacto_email: datos.contacto_email?.trim() ?? actual.contacto_email,
    celular_codigo_area: datos.celular_codigo_area?.trim() ?? actual.celular_codigo_area,
    celular_numero: datos.celular_numero?.trim() ?? actual.celular_numero,
    celular_operador: datos.celular_operador?.trim() ?? actual.celular_operador,
    telefono_fijo_codigo_area: datos.telefono_fijo_codigo_area?.trim() ?? actual.telefono_fijo_codigo_area,
    telefono_fijo_numero: datos.telefono_fijo_numero?.trim() ?? actual.telefono_fijo_numero,
    ciudad: datos.ciudad?.trim() ?? actual.ciudad,
    provincia_id: datos.provincia_id?.trim() ?? actual.provincia_id,
    provincia_nombre: datos.provincia_nombre?.trim() ?? actual.provincia_nombre,
  };
  const filas = await sql`
    UPDATE agencias SET
      razon_social = ${nueva.razon_social},
      cuit = ${nueva.cuit},
      contacto_nombre = ${nueva.contacto_nombre},
      contacto_apellido = ${nueva.contacto_apellido},
      contacto_email = ${nueva.contacto_email},
      celular_codigo_area = ${nueva.celular_codigo_area},
      celular_numero = ${nueva.celular_numero},
      celular_operador = ${nueva.celular_operador},
      telefono_fijo_codigo_area = ${nueva.telefono_fijo_codigo_area},
      telefono_fijo_numero = ${nueva.telefono_fijo_numero},
      ciudad = ${nueva.ciudad},
      provincia_id = ${nueva.provincia_id},
      provincia_nombre = ${nueva.provincia_nombre}
    WHERE id = ${id}
    RETURNING *
  `;
  return filas[0] ? filaAAgencia(filas[0]) : null;
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

export async function obtenerLead(id: string): Promise<Lead | undefined> {
  await asegurarTablas();
  const filas = await sql`SELECT * FROM leads WHERE id = ${id}`;
  return filas[0] ? filaALead(filas[0]) : undefined;
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

// --- Canales externos (Mercado Libre, Instagram, Facebook) ---

function filaACanalConectado(r: Record<string, unknown>): CanalConectado {
  return {
    id: r.id as string,
    agencia_id: r.agencia_id as string,
    canal: r.canal as Canal,
    access_token: r.access_token as string,
    refresh_token: r.refresh_token as string,
    expires_at: r.expires_at as string,
    cuenta_externa_id: r.cuenta_externa_id as string,
    cuenta_externa_nombre: r.cuenta_externa_nombre as string,
    conectado_en: r.conectado_en as string,
  };
}

export async function listarCanalesConectados(agenciaId: string): Promise<CanalConectado[]> {
  await asegurarTablas();
  const filas = await sql`SELECT * FROM canales_conectados WHERE agencia_id = ${agenciaId}`;
  return filas.map(filaACanalConectado);
}

export async function obtenerCanalConectado(agenciaId: string, canal: Canal): Promise<CanalConectado | undefined> {
  await asegurarTablas();
  const filas = await sql`SELECT * FROM canales_conectados WHERE agencia_id = ${agenciaId} AND canal = ${canal}`;
  return filas[0] ? filaACanalConectado(filas[0]) : undefined;
}

export async function guardarCanalConectado(datos: {
  agencia_id: string;
  canal: Canal;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  cuenta_externa_id: string;
  cuenta_externa_nombre: string;
}): Promise<CanalConectado> {
  await asegurarTablas();
  const filas = await sql`
    INSERT INTO canales_conectados (id, agencia_id, canal, access_token, refresh_token, expires_at, cuenta_externa_id, cuenta_externa_nombre, conectado_en)
    VALUES (${datos.agencia_id + ":" + datos.canal}, ${datos.agencia_id}, ${datos.canal}, ${datos.access_token}, ${datos.refresh_token}, ${datos.expires_at}, ${datos.cuenta_externa_id}, ${datos.cuenta_externa_nombre}, ${new Date().toISOString()})
    ON CONFLICT (agencia_id, canal) DO UPDATE SET
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      expires_at = EXCLUDED.expires_at,
      cuenta_externa_id = EXCLUDED.cuenta_externa_id,
      cuenta_externa_nombre = EXCLUDED.cuenta_externa_nombre,
      conectado_en = EXCLUDED.conectado_en
    RETURNING *
  `;
  return filaACanalConectado(filas[0]);
}

export async function desconectarCanal(agenciaId: string, canal: Canal): Promise<void> {
  await asegurarTablas();
  await sql`DELETE FROM canales_conectados WHERE agencia_id = ${agenciaId} AND canal = ${canal}`;
}

function filaAPublicacion(r: Record<string, unknown>): Publicacion {
  return {
    dominio: r.dominio as string,
    canal: r.canal as Canal,
    estado: r.estado as EstadoPublicacion,
    external_id: r.external_id as string,
    permalink: (r.permalink as string) || "",
    error_msg: r.error_msg as string,
    actualizado_en: r.actualizado_en as string,
  };
}

export async function listarPublicaciones(dominio: string): Promise<Publicacion[]> {
  await asegurarTablas();
  const filas = await sql`SELECT * FROM publicaciones WHERE dominio = ${dominio}`;
  return filas.map(filaAPublicacion);
}

// Para la pantalla "Canales externos": TODO lo publicado por la agencia en
// cualquier plataforma, con el título del vehículo, para poder hacer
// seguimiento sin tener que entrar vehículo por vehículo.
export type PublicacionConVehiculo = Publicacion & { marca: string; modelo: string };

export async function listarPublicacionesDeAgencia(agenciaId: string): Promise<PublicacionConVehiculo[]> {
  await asegurarTablas();
  const filas = await sql`
    SELECT p.*, s.marca, s.modelo
    FROM publicaciones p
    JOIN stock s ON s.dominio = p.dominio
    WHERE s.agencia_id = ${agenciaId}
    ORDER BY p.actualizado_en DESC
  `;
  return filas.map((r) => ({ ...filaAPublicacion(r), marca: r.marca as string, modelo: r.modelo as string }));
}

export async function setPublicacion(datos: {
  dominio: string;
  canal: Canal;
  estado: EstadoPublicacion;
  // undefined = no tocar (conserva lo que ya había, ver el CASE WHEN de
  // abajo); null = borrar explícitamente -se usa cuando "Verificar estado
  // real" confirma que el aviso ya no existe en ML (lo cerraron/eliminaron
  // desde la cuenta real), así no queda un external_id viejo apuntando a un
  // ítem que ya no está.
  external_id?: string | null;
  permalink?: string | null;
  error_msg?: string;
}): Promise<Publicacion> {
  await asegurarTablas();
  const borrarExternalId = datos.external_id === null;
  const borrarPermalink = datos.permalink === null;
  const filas = await sql`
    INSERT INTO publicaciones (dominio, canal, estado, external_id, permalink, error_msg, actualizado_en)
    VALUES (${datos.dominio}, ${datos.canal}, ${datos.estado}, ${datos.external_id || ""}, ${datos.permalink || ""}, ${datos.error_msg || ""}, ${new Date().toISOString()})
    ON CONFLICT (dominio, canal) DO UPDATE SET
      estado = EXCLUDED.estado,
      -- Si no se pasó external_id (undefined), se conserva el que ya
      -- había -si no, la escritura de transición "pendiente_aprobacion"
      -- (antes de llamar a ML) lo pisaba con "" y el siguiente intento ya
      -- no podía saber que el aviso ya existía en ML, creando un duplicado
      -- en vez de actualizar el mismo ítem (encontrado en vivo). null SÍ
      -- borra -ver comentario del parámetro arriba.
      external_id = CASE WHEN ${borrarExternalId} THEN '' WHEN EXCLUDED.external_id = '' THEN publicaciones.external_id ELSE EXCLUDED.external_id END,
      permalink = CASE WHEN ${borrarPermalink} THEN '' WHEN EXCLUDED.permalink = '' THEN publicaciones.permalink ELSE EXCLUDED.permalink END,
      error_msg = EXCLUDED.error_msg,
      actualizado_en = EXCLUDED.actualizado_en
    RETURNING *
  `;
  return filaAPublicacion(filas[0]);
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
