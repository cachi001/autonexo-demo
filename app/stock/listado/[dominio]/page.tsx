"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Camera, CheckCircle2, Upload, X, Loader2, ShieldCheck, RefreshCw, AlertTriangle, ClipboardList, FileText } from "lucide-react";
import { categorizarVehiculo, DOCUMENTOS_POR_CATEGORIA, LABEL_CATEGORIA } from "@/lib/documentos";

type DocumentoVehiculo = { nombre: string; dataUrl: string };

type Vehiculo = {
  dominio: string; marca: string; modelo: string; anio: string; tipo: string;
  precio: string; km: string; color: string; descripcion: string;
  documentos: Record<string, DocumentoVehiculo | undefined>;
  documentacion_validada: boolean; documentacion_validada_fecha: string | null;
  vistas_reales: number; consultas_reales: number; fotos: string[];
};

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

type Agencia = {
  id: string;
  cuit: string;
  contacto_nombre: string;
  contacto_apellido: string;
  contacto_email: string;
  celular_codigo_area: string;
  celular_numero: string;
  celular_operador: string;
};

type DesafioCaptcha = { prompt: string; imagen_b64: string; celdas: number };
type ResultadoMarcaModelo = { dominio: string; marca: string; modelo: string; anio: string; registro: string };

const OCR_BACKEND_URL = process.env.NEXT_PUBLIC_OCR_BACKEND_URL || "https://autoclick-ocr-backend.onrender.com";

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
  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(null);
  const [fotoActiva, setFotoActiva] = useState(0);
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

  // --- Marca/modelo/año reales (DNRPA "Obtener Informe Web", captcha visual) ---
  const [agencia, setAgencia] = useState<Agencia | null>(null);
  const [mmSessionId, setMmSessionId] = useState<string | null>(null);
  const [mmDesafio, setMmDesafio] = useState<DesafioCaptcha | null>(null);
  const [mmSeleccion, setMmSeleccion] = useState<Set<number>>(new Set());
  const [mmCargando, setMmCargando] = useState(false);
  const [mmError, setMmError] = useState("");
  const [mmResultado, setMmResultado] = useState<ResultadoMarcaModelo | null>(null);
  const [mmAplicando, setMmAplicando] = useState(false);
  const [mmAplicado, setMmAplicado] = useState(false);

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
  }
  useEffect(() => { cargar(); }, [dominio]);
  useEffect(() => {
    fetch("/api/agencias").then((r) => r.json()).then((d) => setAgencia((d.agencias || [])[0] || null));
  }, []);

  function resetMarcaModelo() {
    setMmSessionId(null);
    setMmDesafio(null);
    setMmSeleccion(new Set());
    setMmError("");
    setMmResultado(null);
    setMmAplicado(false);
  }

  async function iniciarValidacionMarcaModelo() {
    if (!vehiculo || !agencia) return;
    resetMarcaModelo();
    setMmCargando(true);
    try {
      const res = await fetch(`${OCR_BACKEND_URL}/dnrpa/informe/iniciar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cuit: agencia.cuit,
          dominio: vehiculo.dominio,
          alta: {
            apellido: agencia.contacto_apellido,
            nombre: agencia.contacto_nombre,
            email: agencia.contacto_email,
            celular_codigo_area: agencia.celular_codigo_area,
            celular_numero: agencia.celular_numero,
            celular_operador: agencia.celular_operador,
          },
        }),
      });
      const data = await res.json();
      if (data.error) { setMmError(data.error); return; }
      if (data.resultado) { setMmResultado(data.resultado); return; }
      setMmSessionId(data.session_id);
      setMmDesafio(data.desafio);
    } catch {
      setMmError("No se pudo conectar con el servicio de validación. Probá de nuevo.");
    } finally {
      setMmCargando(false);
    }
  }

  async function marcarCelda(i: number) {
    // Click local e instantáneo, sin red -se manda todo junto recién al
    // tocar Verificar, para no esperar una respuesta del servidor por cada
    // toque individual (eso era lo que lo hacía lento y tosco).
    if (mmCargando) return;
    setMmSeleccion((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(i)) nuevo.delete(i); else nuevo.add(i);
      return nuevo;
    });
  }

  async function verificarCaptcha() {
    if (!mmSessionId) return;
    setMmCargando(true);
    setMmError("");
    try {
      for (const i of mmSeleccion) {
        const res = await fetch(`${OCR_BACKEND_URL}/dnrpa/informe/captcha/marcar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: mmSessionId, indice: i }),
        });
        const data = await res.json();
        if (data.error) { setMmError(data.error); setMmSessionId(null); setMmDesafio(null); setMmSeleccion(new Set()); return; }
      }
      setMmSeleccion(new Set());
      const res = await fetch(`${OCR_BACKEND_URL}/dnrpa/informe/captcha/verificar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: mmSessionId }),
      });
      const data = await res.json();
      if (data.error) { setMmError(data.error); setMmSessionId(null); setMmDesafio(null); return; }
      if (data.resultado) { setMmResultado(data.resultado); setMmSessionId(null); setMmDesafio(null); return; }
      setMmSessionId(data.session_id);
      setMmDesafio(data.desafio);
    } catch {
      setMmError("No se pudo conectar con el servicio de validación. Probá de nuevo.");
      setMmSeleccion(new Set());
    } finally {
      setMmCargando(false);
    }
  }

  async function aplicarMarcaModelo() {
    if (!vehiculo || !mmResultado) return;
    setMmAplicando(true);
    try {
      await fetch(`/api/stock/${encodeURIComponent(dominio)}/dnrpa-marca-modelo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marca: mmResultado.marca, modelo: mmResultado.modelo, anio: mmResultado.anio }),
      });
      setMmAplicado(true);
      cargar();
    } finally {
      setMmAplicando(false);
    }
  }

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
        <div className="flex items-center gap-3 pl-12 lg:pl-0">
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
                  <img src={fotos[fotoActiva]} alt={`${vehiculo.marca} ${vehiculo.modelo}`} className="h-full w-full object-cover" />
                  <button onClick={() => quitarFoto(fotoActiva)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow">
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
                <div className="text-xl font-bold text-emerald-700">{formatoPrecio(vehiculo.precio)}</div>
              </div>
              {vehiculo.documentacion_validada && (
                <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} /> Papeles OK
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-zinc-50 p-3 text-sm">
              <div><span className="text-xs text-zinc-400">Año</span><div className="font-medium">{vehiculo.anio || "—"}</div></div>
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

        {/* Marca/modelo/año reales contra la DNRPA ("Obtener Informe Web") — a diferencia
            del bloque de arriba, este SÍ trae marca/modelo/año, gratis. El captcha acá es
            visual (reCAPTCHA de Google), así que en vez de un código se le pide al empleado
            que toque las imágenes correctas, igual que haría en el sitio de la DNRPA. */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-1 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-zinc-700" strokeWidth={2} />
            <h2 className="text-sm font-semibold">Marca, modelo y año reales (DNRPA)</h2>
          </div>
          <p className="mb-3 text-xs text-zinc-500">
            Trae marca/modelo/año directo de la DNRPA ("Obtener Informe Web"), gratis. Usa los
            datos de contacto de <Link href="/stock/agencia" className="underline">Datos de la agencia</Link> como
            solicitante. Tiene un captcha visual: alguien de la agencia tiene que tocar las
            imágenes correctas una vez por consulta.
          </p>

          {!agencia && <p className="text-xs text-amber-600">Cargá primero los datos de la agencia para poder validar.</p>}

          {agencia && !mmDesafio && !mmResultado && (
            <button
              onClick={iniciarValidacionMarcaModelo}
              disabled={mmCargando}
              className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {mmCargando ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <ShieldCheck className="h-4 w-4" strokeWidth={2} />}
              {mmCargando ? "Conectando con la DNRPA..." : "Validar marca/modelo/año"}
            </button>
          )}

          {mmDesafio && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="mb-2 text-sm font-medium text-zinc-700">{mmDesafio.prompt}</p>
              <div className="relative w-full max-w-sm">
                <img
                  src={`data:image/png;base64,${mmDesafio.imagen_b64}`}
                  alt="Captcha visual de la DNRPA"
                  className="w-full rounded border border-zinc-300"
                />
                <div className={`absolute inset-0 grid ${mmDesafio.celdas === 16 ? "grid-cols-4 grid-rows-4" : "grid-cols-3 grid-rows-3"}`}>
                  {Array.from({ length: mmDesafio.celdas }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => marcarCelda(i)}
                      disabled={mmCargando}
                      aria-label={`Recuadro ${i + 1}`}
                      className={`border border-white/40 transition-colors ${
                        mmSeleccion.has(i) ? "bg-emerald-500/50" : "hover:bg-white/20"
                      }`}
                    />
                  ))}
                </div>
                {mmCargando && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded bg-black/60 text-white">
                    <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2} />
                    <span className="text-xs font-medium">Verificando con la DNRPA...</span>
                  </div>
                )}
              </div>
              <p className="mt-2 text-[11px] text-zinc-400">
                Tocá los recuadros que correspondan (se resaltan al toque, sin esperar nada) y después tocá Verificar.
                Si no hay ninguno, tocá Verificar igual.
              </p>
              <button
                onClick={verificarCaptcha}
                disabled={mmCargando}
                className="mt-3 flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {mmCargando && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
                Verificar
              </button>
            </div>
          )}

          {mmError && (
            <div className="mt-3 flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <div>
                <div className="font-semibold">No se pudo validar</div>
                <div className="text-xs">{mmError}</div>
              </div>
            </div>
          )}

          {mmResultado && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} /> Captcha resuelto — la DNRPA devolvió estos datos
              </div>
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
                    ["Marca", vehiculo.marca || "", mmResultado.marca],
                    ["Modelo", vehiculo.modelo || "", mmResultado.modelo],
                    ["Año", vehiculo.anio || "", mmResultado.anio],
                  ] as [string, string, string][]).map(([label, declarado, real]) => {
                    const ok = coincide(declarado, real);
                    return (
                      <tr key={label}>
                        <td className="py-1.5 pr-2 font-semibold text-zinc-600">{label}</td>
                        <td className="py-1.5 pr-2 text-zinc-800">{declarado || "—"}</td>
                        <td className="py-1.5 pr-2 text-zinc-800">{real || "—"}</td>
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
              <p className="text-xs text-zinc-500">Registro: {mmResultado.registro || "—"}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={aplicarMarcaModelo}
                  disabled={mmAplicando || mmAplicado}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {mmAplicado ? "✓ Aplicado a la ficha" : mmAplicando ? "Aplicando..." : "Aplicar estos datos a la ficha"}
                </button>
                <button onClick={resetMarcaModelo} className="text-xs font-medium text-zinc-500 underline hover:text-zinc-700">
                  Volver a consultar
                </button>
              </div>
            </div>
          )}
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
    </>
  );
}
