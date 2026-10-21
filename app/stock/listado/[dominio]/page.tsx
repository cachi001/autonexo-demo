"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Camera, CheckCircle2, Upload, X, Loader2, ShieldCheck, RefreshCw, AlertTriangle, ClipboardList, FileText, Share2, ExternalLink } from "lucide-react";
import { categorizarVehiculo, DOCUMENTOS_POR_CATEGORIA, LABEL_CATEGORIA } from "@/lib/documentos";
import CanalLogo from "@/components/CanalLogo";
import CanalAccionesMenu from "@/components/CanalAccionesMenu";
import type { Canal } from "@/lib/data";
import { humanizarError } from "@/lib/errores";
import { useToast } from "@/components/Toast";
import Lightbox from "@/components/Lightbox";

type DocumentoVehiculo = { nombre: string; dataUrl: string };

type Vehiculo = {
  dominio: string; marca: string; modelo: string; anio: string; tipo: string;
  precio: string; km: string; color: string; descripcion: string;
  version: string; combustible: string; puertas: string; chasis: string;
  documentos: Record<string, DocumentoVehiculo | undefined>;
  documentacion_validada: boolean; documentacion_validada_fecha: string | null;
  vistas_reales: number; consultas_reales: number; fotos: string[];
  titular_nombre: string; titular_domicilio: string; titular_dni: string;
};

const OPCIONES_COMBUSTIBLE = ["Nafta", "GNC", "Nafta/GNC", "Diésel", "Híbrido", "Eléctrico"];
const OPCIONES_PUERTAS = ["2", "3", "4", "5"];

type ResultadoDNRPA = {
  dominio: string;
  tipoVehiculo: string;
  registroSeccional: string;
  direccion: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
  telefono: string;
  fechaConsulta: string;
};

type Publicacion = { canal: string; estado: string; external_id: string; permalink: string; error_msg: string };

const CANALES: { id: Canal; nombre: string }[] = [
  { id: "mercadolibre", nombre: "Mercado Libre" },
  { id: "instagram", nombre: "Instagram" },
  { id: "facebook", nombre: "Facebook" },
];

const ESTADO_LABEL: Record<string, { texto: string; clase: string }> = {
  sin_publicar: { texto: "Sin publicar", clase: "bg-zinc-100 text-zinc-500" },
  pendiente_aprobacion: { texto: "Publicando...", clase: "bg-amber-50 text-amber-700" },
  publicado: { texto: "Publicado", clase: "bg-emerald-50 text-emerald-700" },
  rechazado: { texto: "Rechazado", clase: "bg-red-50 text-red-700" },
  pausado: { texto: "Pausado", clase: "bg-zinc-100 text-zinc-600" },
  // "nunca se creó nada en Mercado Libre" -rechazo total.
  error: { texto: "No se pudo publicar", clase: "bg-red-50 text-red-700" },
  // Distinto de "error": ML sí creó el aviso (hay link real) pero lo
  // esconde hasta corregir algo -ej. precio por debajo del piso de mercado.
  en_revision: { texto: "Publicado, oculto en revisión", clase: "bg-amber-50 text-amber-700" },
};

function normalizar(s: string) {
  return s.trim().toUpperCase();
}
function coincide(declarado: string, dnrpa: string) {
  if (!declarado || !dnrpa) return null;
  return normalizar(declarado) === normalizar(dnrpa);
}

function formatoPrecio(p: string) {
  const n = parseFloat(p);
  return isNaN(n) ? p : "$" + n.toLocaleString("es-AR");
}

export default function DetalleVehiculoPage({ params }: { params: Promise<{ dominio: string }> }) {
  const { dominio } = use(params);
  const { mostrar } = useToast();
  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(null);
  const [fotoActiva, setFotoActiva] = useState(0);
  const [lightboxAbierto, setLightboxAbierto] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // --- Validación DNRPA (Radicación por Patente, semi-asistida por captcha) ---
  const [captchaImagen, setCaptchaImagen] = useState<string | null>(null);
  const [codigoVerificador, setCodigoVerificador] = useState("");
  const [cargandoCaptcha, setCargandoCaptcha] = useState(false);
  const [consultandoDnrpa, setConsultandoDnrpa] = useState(false);
  const [errorDnrpa, setErrorDnrpa] = useState("");
  const [resultadoDnrpa, setResultadoDnrpa] = useState<ResultadoDNRPA | null>(null);

  // --- Documentación requerida por tipo de vehículo (solo evidencia, sin OCR) ---
  const [subiendoDoc, setSubiendoDoc] = useState<string | null>(null);

  // --- Publicación a canales externos (Mercado Libre, Instagram, Facebook) ---
  const [canalesConectados, setCanalesConectados] = useState<string[]>([]);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  // --- Ficha técnica (version/combustible/puertas) -alineada con AutoClick,
  // la exige Mercado Libre para publicar en "Autos y Camionetas". Chasis se
  // suma acá también: ML exige desde oct-2024 patente + últimos 6 del
  // chasis para publicar, y hasta ahora no había forma de completarlo si el
  // vehículo se cargó por planilla o el OCR de la cédula no lo leyó bien. ---
  const [editandoFicha, setEditandoFicha] = useState(false);
  const [version, setVersion] = useState("");
  const [combustible, setCombustible] = useState("");
  const [puertas, setPuertas] = useState("");
  const [chasisEdit, setChasisEdit] = useState("");
  const [guardandoFicha, setGuardandoFicha] = useState(false);

  // --- Editar precio -antes no se podía corregir el precio después de
  // cargado, ni siquiera cuando Mercado Libre lo rechazaba por estar debajo
  // de su piso de mercado (encontrado en vivo con el Ford Fiesta). ---
  const [editandoPrecio, setEditandoPrecio] = useState(false);
  const [precioEdit, setPrecioEdit] = useState("");
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);

  // --- Editar año -antes solo entraba por OCR de cédula o planilla, sin
  // forma de corregirlo a mano si quedaba vacío (bloqueaba publicar en ML). ---
  const [editandoAnio, setEditandoAnio] = useState(false);
  const [anioEdit, setAnioEdit] = useState("");
  const [guardandoAnio, setGuardandoAnio] = useState(false);

  async function pedirCaptchaDnrpa() {
    setCargandoCaptcha(true);
    setErrorDnrpa("");
    setResultadoDnrpa(null);
    setCodigoVerificador("");
    try {
      const res = await fetch("/api/dnrpa/captcha");
      const data = await res.json();
      if (data.error) { setErrorDnrpa(data.error); setCaptchaImagen(null); }
      else setCaptchaImagen(data.captchaImage);
    } catch {
      setErrorDnrpa("No se pudo conectar con la DNRPA. Probá de nuevo.");
    } finally {
      setCargandoCaptcha(false);
    }
  }

  async function consultarDnrpa() {
    if (!vehiculo?.dominio || !codigoVerificador.trim()) return;
    setConsultandoDnrpa(true);
    setErrorDnrpa("");
    try {
      const res = await fetch("/api/dnrpa/consultar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dominio: vehiculo.dominio, codigoVerificador: codigoVerificador.trim() }),
      });
      const data = await res.json();
      if (data.error) { setErrorDnrpa(data.error); setResultadoDnrpa(null); }
      else { setResultadoDnrpa(data); setCaptchaImagen(null); }
    } catch {
      setErrorDnrpa("No se pudo conectar con la DNRPA. Probá de nuevo.");
    } finally {
      setConsultandoDnrpa(false);
    }
  }

  async function cargar() {
    const res = await fetch("/api/stock");
    const data = await res.json();
    const v = (data.vehiculos || []).find((x: Vehiculo) => x.dominio === dominio);
    if (!v) { setNotFound(true); return; }
    setVehiculo(v);
    setVersion(v.version || "");
    setCombustible(v.combustible || "");
    setPuertas(v.puertas || "");
    setChasisEdit(v.chasis || "");
    setPrecioEdit(v.precio || "");
    setAnioEdit(v.anio || "");
  }
  useEffect(() => { cargar(); }, [dominio]);

  async function guardarPrecio() {
    setGuardandoPrecio(true);
    try {
      await fetch(`/api/stock/${encodeURIComponent(dominio)}/precio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ precio: precioEdit }),
      });
      setEditandoPrecio(false);
      await cargar();
    } finally {
      setGuardandoPrecio(false);
    }
  }

  async function guardarAnio() {
    setGuardandoAnio(true);
    try {
      const res = await fetch(`/api/stock/${encodeURIComponent(dominio)}/anio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anio: anioEdit }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        mostrar("error", (data && data.error) || "No se pudo guardar el año.");
        return;
      }
      setEditandoAnio(false);
      await cargar();
    } finally {
      setGuardandoAnio(false);
    }
  }

  async function guardarFicha() {
    setGuardandoFicha(true);
    try {
      await fetch(`/api/stock/${encodeURIComponent(dominio)}/ficha-tecnica`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version, combustible, puertas, chasis: chasisEdit }),
      });
      setEditandoFicha(false);
      await cargar();
    } finally {
      setGuardandoFicha(false);
    }
  }

  async function cargarCanalesYPublicaciones() {
    const resC = await fetch("/api/canales");
    if (resC.ok) {
      const dataC = await resC.json();
      setCanalesConectados((dataC.canales || []).map((c: { canal: string }) => c.canal));
    }
    const resP = await fetch(`/api/stock/${encodeURIComponent(dominio)}/publicaciones`);
    const dataP = await resP.json();
    setPublicaciones(dataP.publicaciones || []);
  }
  useEffect(() => { cargarCanalesYPublicaciones(); }, [dominio]);

  async function subirFotos(files: FileList) {
    setSubiendo(true);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("fotos", f));
    await fetch(`/api/stock/${encodeURIComponent(dominio)}/fotos`, { method: "POST", body: fd });
    setSubiendo(false);
    cargar();
  }

  async function quitarFoto(indice: number) {
    await fetch(`/api/stock/${encodeURIComponent(dominio)}/fotos`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ indice }),
    });
    setFotoActiva(0);
    cargar();
  }

  async function toggleDocumentacion() {
    if (!vehiculo) return;
    await fetch(`/api/stock/${encodeURIComponent(dominio)}/documentacion`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validada: !vehiculo.documentacion_validada }),
    });
    cargar();
  }

  async function subirDocumento(clave: string, file: File) {
    setSubiendoDoc(clave);
    const fd = new FormData();
    fd.append("clave", clave);
    fd.append("archivo", file);
    await fetch(`/api/stock/${encodeURIComponent(dominio)}/documentos`, { method: "POST", body: fd });
    setSubiendoDoc(null);
    cargar();
  }

  async function quitarDocumento(clave: string) {
    await fetch(`/api/stock/${encodeURIComponent(dominio)}/documentos`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clave }),
    });
    cargar();
  }

  if (notFound) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm text-zinc-500">No se encontró el vehículo {dominio}. <Link href="/stock/listado" className="text-blue-600 underline">Volver al stock</Link></p>
      </main>
    );
  }
  if (!vehiculo) return null;

  const fotos = vehiculo.fotos || [];
  const categoria = categorizarVehiculo(vehiculo.tipo);
  const docsRequeridos = DOCUMENTOS_POR_CATEGORIA[categoria];
  const documentos = vehiculo.documentos || {};
  const docsCargados = docsRequeridos.filter((d) => documentos[d.key]).length;

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/stock" className="text-sm text-zinc-400 hover:text-zinc-700">Panel</Link>
          <span className="text-zinc-300">/</span>
          <Link href="/stock/listado" className="text-sm text-zinc-400 hover:text-zinc-700">Stock</Link>
          <span className="text-zinc-300">/</span>
          <h1 className="text-base font-semibold tracking-tight">{vehiculo.marca} {vehiculo.modelo}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Galería */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="relative flex h-64 items-center justify-center overflow-hidden rounded-lg bg-zinc-50">
              {fotos.length > 0 ? (
                <>
                  <button onClick={() => setLightboxAbierto(true)} className="h-full w-full cursor-zoom-in" aria-label="Ver foto en grande">
                    <img src={fotos[fotoActiva]} alt={`${vehiculo.marca} ${vehiculo.modelo}`} className="h-full w-full object-cover" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); quitarFoto(fotoActiva); }}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow"
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-400">
                  <Camera className="h-8 w-8" strokeWidth={1.5} />
                  <span className="text-xs">Sin fotos todavía</span>
                </div>
              )}
            </div>
            {fotos.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {fotos.map((f, i) => (
                  <button key={i} onClick={() => setFotoActiva(i)} className={`h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 ${i === fotoActiva ? "border-emerald-500" : "border-transparent"}`}>
                    <img src={f} className="h-full w-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            )}
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 py-2.5 text-sm text-zinc-500 hover:border-emerald-400 hover:text-emerald-600">
              {subiendo ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Upload className="h-4 w-4" strokeWidth={2} />}
              {subiendo ? "Subiendo..." : "Agregar fotos"}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && subirFotos(e.target.files)} />
            </label>
          </div>

          {/* Datos */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-xs text-zinc-400">{vehiculo.dominio}</div>
                <h2 className="text-lg font-bold">{vehiculo.marca} {vehiculo.modelo}</h2>
                {editandoPrecio ? (
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      value={precioEdit}
                      onChange={(e) => setPrecioEdit(e.target.value)}
                      className="w-36 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                      autoFocus
                    />
                    <button onClick={guardarPrecio} disabled={guardandoPrecio} className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">
                      {guardandoPrecio ? "..." : "Guardar"}
                    </button>
                    <button onClick={() => { setEditandoPrecio(false); setPrecioEdit(vehiculo.precio); }} className="text-xs text-zinc-400 hover:text-zinc-600">Cancelar</button>
                  </div>
                ) : (
                  <button onClick={() => setEditandoPrecio(true)} className="flex items-center gap-1.5 text-xl font-bold text-emerald-700 hover:underline">
                    {formatoPrecio(vehiculo.precio)}
                    <span className="text-xs font-normal text-zinc-400">(editar)</span>
                  </button>
                )}
              </div>
              {vehiculo.documentacion_validada && (
                <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} /> Papeles OK
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-zinc-50 p-3 text-sm">
              <div>
                <span className="text-xs text-zinc-400">Año</span>
                {editandoAnio ? (
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <input
                      type="number"
                      value={anioEdit}
                      onChange={(e) => setAnioEdit(e.target.value)}
                      className="w-20 rounded-md border border-zinc-300 px-1.5 py-0.5 text-sm"
                      autoFocus
                    />
                    <button onClick={guardarAnio} disabled={guardandoAnio} className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-[11px] font-semibold text-white disabled:opacity-50">
                      {guardandoAnio ? "..." : "OK"}
                    </button>
                    <button onClick={() => { setEditandoAnio(false); setAnioEdit(vehiculo.anio); }} className="text-[11px] text-zinc-400 hover:text-zinc-600">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setEditandoAnio(true)} className="flex items-center gap-1 font-medium hover:underline">
                    {vehiculo.anio || "—"}
                    <span className="text-[10px] font-normal text-zinc-400">(editar)</span>
                  </button>
                )}
              </div>
              <div><span className="text-xs text-zinc-400">Km</span><div className="font-medium">{vehiculo.km || "—"}</div></div>
              <div><span className="text-xs text-zinc-400">Color</span><div className="font-medium">{vehiculo.color || "—"}</div></div>
              <div><span className="text-xs text-zinc-400">Tipo</span><div className="font-medium">{vehiculo.tipo || "—"}</div></div>
            </div>

            {vehiculo.descripcion && <p className="mt-3 text-sm text-zinc-600">{vehiculo.descripcion}</p>}

            <div className="mt-4 flex gap-6 text-xs text-zinc-500">
              <span>👁 {vehiculo.vistas_reales} vistas reales</span>
              <span>💬 {vehiculo.consultas_reales} consultas</span>
            </div>

            <button
              onClick={toggleDocumentacion}
              className={`mt-4 w-full rounded-lg border px-4 py-2.5 text-sm font-semibold ${vehiculo.documentacion_validada ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"}`}
            >
              {vehiculo.documentacion_validada ? "✓ Papeles validados — quitar validación" : "Marcar papeles como validados"}
            </button>
          </div>
        </div>

        {/* Validación cruzada con la fuente oficial y gratuita de la DNRPA */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-1 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-zinc-700" strokeWidth={2} />
            <h2 className="text-sm font-semibold">Validar con la DNRPA (oficial y gratis)</h2>
          </div>
          <p className="mb-3 text-xs text-zinc-500">
            Consulta el mismo formulario público de "Radicación por Patente" de dnrpa.gov.ar que
            usaría cualquiera a mano. No es automático: tiene un captcha, así que alguien de la
            agencia tiene que leerlo y escribirlo una vez por consulta.
          </p>

          {!resultadoDnrpa && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              {!captchaImagen && !cargandoCaptcha && (
                <button
                  onClick={pedirCaptchaDnrpa}
                  className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  <ShieldCheck className="h-4 w-4" strokeWidth={2} /> Pedir captcha de la DNRPA
                </button>
              )}

              {cargandoCaptcha && (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> Conectando con dnrpa.gov.ar...
                </div>
              )}

              {captchaImagen && !cargandoCaptcha && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <img src={captchaImagen} alt="Captcha de la DNRPA" className="h-11 w-auto rounded border border-zinc-300 bg-white" />
                  <button
                    onClick={pedirCaptchaDnrpa}
                    title="Pedir otro código"
                    className="flex w-fit items-center gap-1 text-xs font-medium text-zinc-500 underline hover:text-zinc-700"
                  >
                    <RefreshCw className="h-3 w-3" strokeWidth={2} /> Pedir otro código
                  </button>
                  <input
                    value={codigoVerificador}
                    onChange={(e) => setCodigoVerificador(e.target.value)}
                    placeholder="Código verificador"
                    className="w-40 rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-sm text-zinc-900"
                  />
                  <button
                    onClick={consultarDnrpa}
                    disabled={!codigoVerificador.trim() || consultandoDnrpa}
                    className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {consultandoDnrpa && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
                    Consultar
                  </button>
                </div>
              )}

              {errorDnrpa && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {errorDnrpa}
                </div>
              )}
            </div>
          )}

          {resultadoDnrpa && (
            <div className="space-y-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-400">
                    <th className="pb-1 font-semibold">Campo</th>
                    <th className="pb-1 font-semibold">Declarado</th>
                    <th className="pb-1 font-semibold">DNRPA</th>
                    <th className="pb-1 font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {([
                    ["Dominio", vehiculo.dominio || "", resultadoDnrpa.dominio],
                    ["Tipo de vehículo", vehiculo.tipo || "", resultadoDnrpa.tipoVehiculo],
                  ] as [string, string, string][]).map(([label, declarado, dnrpa]) => {
                    const ok = coincide(declarado, dnrpa);
                    return (
                      <tr key={label}>
                        <td className="py-1.5 pr-2 font-semibold text-zinc-600">{label}</td>
                        <td className="py-1.5 pr-2 text-zinc-800">{declarado || "—"}</td>
                        <td className="py-1.5 pr-2 text-zinc-800">{dnrpa || "—"}</td>
                        <td className="py-1.5">
                          {ok === null ? (
                            <span className="text-xs text-zinc-400">sin dato</span>
                          ) : ok ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} /> Coincide
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
                              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} /> No coincide
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600 sm:grid-cols-3">
                <div><span className="text-zinc-400">Registro Seccional</span><div className="font-medium text-zinc-800">{resultadoDnrpa.registroSeccional || "—"}</div></div>
                <div><span className="text-zinc-400">Localidad</span><div className="font-medium text-zinc-800">{resultadoDnrpa.localidad || "—"}</div></div>
                <div><span className="text-zinc-400">Provincia</span><div className="font-medium text-zinc-800">{resultadoDnrpa.provincia || "—"}</div></div>
                <div className="col-span-2 sm:col-span-3"><span className="text-zinc-400">Dirección</span><div className="font-medium text-zinc-800">{resultadoDnrpa.direccion || "—"}</div></div>
                <div><span className="text-zinc-400">Código Postal</span><div className="font-medium text-zinc-800">{resultadoDnrpa.codigoPostal || "—"}</div></div>
                <div><span className="text-zinc-400">Teléfono del registro</span><div className="font-medium text-zinc-800">{resultadoDnrpa.telefono || "—"}</div></div>
                <div><span className="text-zinc-400">Consultado</span><div className="font-medium text-zinc-800">{resultadoDnrpa.fechaConsulta || "—"}</div></div>
              </div>
              <button
                onClick={() => { setResultadoDnrpa(null); pedirCaptchaDnrpa(); }}
                className="text-xs font-medium text-zinc-500 underline hover:text-zinc-700"
              >
                Volver a consultar
              </button>
            </div>
          )}
        </div>

        {/* Ficha técnica -alineada con AutoClick (version/combustible ya
            existen ahí; puertas es nuevo en los dos). Mercado Libre la exige
            para publicar en "Autos y Camionetas" (TRIM/FUEL_TYPE/DOORS). */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Ficha técnica</h2>
            {!editandoFicha && (
              <button onClick={() => setEditandoFicha(true)} className="text-xs font-medium text-blue-600 hover:underline">
                {vehiculo.version || vehiculo.combustible || vehiculo.puertas || vehiculo.chasis ? "Editar" : "Completar"}
              </button>
            )}
          </div>
          <p className="mb-3 text-xs text-zinc-500">
            Versión, combustible, puertas y chasis — obligatorios para publicar en Mercado Libre (el chasis desde oct-2024).
          </p>
          {editandoFicha ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Versión</label>
                  <input
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="Ej: 1.6 Trendline MT"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Combustible</label>
                  <select
                    value={combustible}
                    onChange={(e) => setCombustible(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Elegí uno</option>
                    {OPCIONES_COMBUSTIBLE.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Puertas</label>
                  <select
                    value={puertas}
                    onChange={(e) => setPuertas(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Elegí una</option>
                    {OPCIONES_PUERTAS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Chasis</label>
                  <input
                    value={chasisEdit}
                    onChange={(e) => setChasisEdit(e.target.value)}
                    placeholder="Viene de la cédula, o completalo a mano"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={guardarFicha}
                  disabled={guardandoFicha}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  {guardandoFicha ? "Guardando..." : "Guardar"}
                </button>
                <button onClick={() => setEditandoFicha(false)} className="text-xs font-medium text-zinc-500 hover:text-zinc-700">Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3 text-xs">
              <div><span className="text-zinc-400">Versión</span><div className="font-medium text-zinc-800">{vehiculo.version || "—"}</div></div>
              <div><span className="text-zinc-400">Combustible</span><div className="font-medium text-zinc-800">{vehiculo.combustible || "—"}</div></div>
              <div><span className="text-zinc-400">Puertas</span><div className="font-medium text-zinc-800">{vehiculo.puertas || "—"}</div></div>
              <div><span className="text-zinc-400">Chasis</span><div className="font-medium text-zinc-800">{vehiculo.chasis || "—"}</div></div>
            </div>
          )}
        </div>

        {/* Datos del titular -vienen del OCR de la cédula verde pero antes
            no se mostraban en ningún lado de la ficha, aunque se guardan
            (lib/data.ts, titular_nombre/titular_domicilio/titular_dni). Solo
            lectura por ahora: no hay flujo de edición pedido para esto. */}
        {(vehiculo.titular_nombre || vehiculo.titular_domicilio || vehiculo.titular_dni) && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-1 text-sm font-semibold">Datos del titular (cédula)</h2>
            <p className="mb-3 text-xs text-zinc-500">Leídos de la cédula verde al cargar el vehículo.</p>
            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
              <div><span className="text-zinc-400">Nombre</span><div className="font-medium text-zinc-800">{vehiculo.titular_nombre || "—"}</div></div>
              <div><span className="text-zinc-400">DNI</span><div className="font-medium text-zinc-800">{vehiculo.titular_dni || "—"}</div></div>
              <div><span className="text-zinc-400">Domicilio</span><div className="font-medium text-zinc-800">{vehiculo.titular_domicilio || "—"}</div></div>
            </div>
          </div>
        )}

        {/* Publicación a canales externos -nunca automática: botón explícito por
            canal (principio P7, "la IA propone, la persona aprueba"). */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-1 flex items-center gap-2">
            <Share2 className="h-4 w-4 text-zinc-700" strokeWidth={2} />
            <h2 className="text-sm font-semibold">Publicar en redes</h2>
          </div>
          <p className="mb-3 text-xs text-zinc-500">
            Cada canal se publica por separado, con un botón explícito — nunca automático. Las cuentas se
            conectan desde <Link href="/stock/canales" className="underline">Conexiones</Link>.
          </p>
          <div className="space-y-2">
            {CANALES.map((c) => {
              const pub = publicaciones.find((p) => p.canal === c.id);
              const estado = pub?.estado || "sin_publicar";
              const conectado = canalesConectados.includes(c.id);
              const label = ESTADO_LABEL[estado] || ESTADO_LABEL.sin_publicar;
              return (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
                  <div className="flex items-center gap-2.5">
                    <CanalLogo canal={c.id} size={28} />
                    <div>
                      <div className="text-sm font-semibold text-zinc-800">{c.nombre}</div>
                      <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${label.clase}`}>
                        {label.texto}
                      </span>
                      {(estado === "error" || estado === "en_revision") && pub?.error_msg && (() => {
                        const { mensaje, detalleTecnico } = humanizarError(pub.error_msg);
                        return (
                          <div
                            title={detalleTecnico || undefined}
                            className={`mt-1 line-clamp-2 max-w-xs text-xs leading-snug font-medium ${
                              estado === "en_revision" ? "text-amber-700" : "text-red-600"
                            } ${detalleTecnico ? "cursor-help underline decoration-dotted" : ""}`}
                          >
                            {mensaje}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pub?.permalink && (
                      <a
                        href={pub.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                      >
                        Ver aviso <ExternalLink className="h-3 w-3" strokeWidth={2} />
                      </a>
                    )}
                    {!conectado ? (
                      <span className="text-xs font-medium text-zinc-400">No conectado</span>
                    ) : estado === "publicado" ? (
                      <button disabled className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white opacity-50">
                        ✓ Publicado
                      </button>
                    ) : (
                      // Mismo componente que usa /stock/canales-externos -antes
                      // esta página tenía su propio mini-formulario de ML
                      // duplicado, sin tipo de publicación, ubicación ni tipo
                      // de moto (quedó desactualizado cuando se mejoró el
                      // modal compartido). Un solo formulario, no dos.
                      <CanalAccionesMenu
                        dominio={dominio}
                        canal={c.id}
                        estado={estado}
                        tieneExternalId={Boolean(pub?.external_id)}
                        vehiculo={{
                          marca: vehiculo.marca,
                          modelo: vehiculo.modelo,
                          anio: vehiculo.anio,
                          precio: vehiculo.precio,
                          descripcion: vehiculo.descripcion,
                          fotos: vehiculo.fotos,
                          tipo: vehiculo.tipo,
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Documentación requerida según el tipo de vehículo — solo evidencia cargada, sin OCR ni validación automática */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <ClipboardList className="h-4 w-4 text-zinc-700" strokeWidth={2} />
            <h2 className="text-sm font-semibold">Documentación del vehículo</h2>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
              {LABEL_CATEGORIA[categoria]}
            </span>
            <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${
              docsCargados === docsRequeridos.length ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}>
              {docsCargados}/{docsRequeridos.length} cargados
            </span>
          </div>
          <p className="mb-3 text-xs text-zinc-500">
            Checklist según el tipo de vehículo. Cada documento es solo evidencia de respaldo —
            sin OCR ni validación automática del contenido.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {docsRequeridos.map((d) => {
              const doc = documentos[d.key];
              const subiendo = subiendoDoc === d.key;
              return (
                <div key={d.key} className="flex flex-col justify-between rounded-lg border border-zinc-200 p-3">
                  <div className="flex items-start gap-2">
                    {doc ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2} />
                    ) : (
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" strokeWidth={2} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-zinc-800">{d.label}</div>
                      {d.ayuda && <div className="mt-0.5 text-[11px] leading-snug text-zinc-400">{d.ayuda}</div>}
                      <div className={`mt-1 truncate text-xs font-medium ${doc ? "text-emerald-700" : "text-zinc-400"}`}>
                        {doc ? `Cargado — ${doc.nombre}` : "Pendiente — subir PDF o foto"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <label className={`flex cursor-pointer items-center gap-1.5 text-xs font-semibold ${subiendo ? "text-zinc-400" : "text-blue-600 hover:text-blue-700"}`}>
                      {subiendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} /> : <Upload className="h-3.5 w-3.5" strokeWidth={2} />}
                      {doc ? "Reemplazar" : "Subir archivo"}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        disabled={subiendo}
                        onChange={(e) => e.target.files?.[0] && subirDocumento(d.key, e.target.files[0])}
                      />
                    </label>
                    {doc && (
                      <button onClick={() => quitarDocumento(d.key)} className="text-xs font-medium text-zinc-400 underline hover:text-red-600">
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {lightboxAbierto && (
        <Lightbox fotos={fotos} indice={fotoActiva} onCerrar={() => setLightboxAbierto(false)} onCambiar={setFotoActiva} />
      )}
    </>
  );
}
