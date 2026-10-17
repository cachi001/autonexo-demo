"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Upload, ArrowLeft, ArrowRight, Loader2, AlertTriangle, CheckCircle2, User, X, ZoomIn,
  ShieldCheck, RefreshCw, FileText,
} from "lucide-react";

type DiagnosticoCedula = {
  frente_documento_detectado: boolean;
  frente_original_b64: string | null;
  frente_procesada_b64: string | null;
  dorso_documento_detectado: boolean;
  dorso_original_b64: string | null;
  dorso_procesada_b64: string | null;
};
type Titular = { nombre: string | null; domicilio: string | null; dni: string | null };

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

type Paso = "frente" | "dorso" | "procesando" | "resultado";

const OCR_BACKEND_URL = process.env.NEXT_PUBLIC_OCR_BACKEND_URL || "https://autoclick-ocr-backend.onrender.com";

// El "año modelo" casi nunca viene impreso en la cédula verde (ver nota en
// vision.py) -> no se muestra como "leído del documento", se pide en la
// sección que completa la agencia, junto con los demás datos que tampoco
// están en la cédula.
const CAMPOS_CEDULA = [
  { key: "dominio", label: "Dominio" },
  { key: "marca", label: "Marca" },
  { key: "modelo", label: "Modelo" },
];
const CAMPOS_COMPLETAR = [
  { key: "anio", label: "Año", placeholder: "Ej: 2019" },
  { key: "tipo", label: "Tipo", placeholder: "Ej: SEDAN" },
  { key: "precio", label: "Precio", placeholder: "Ej: 8500000" },
  { key: "km", label: "Km", placeholder: "Ej: 65000" },
  { key: "color", label: "Color", placeholder: "Ej: BLANCO" },
];

function ImagenDiagnostico({ src, alt, caption, onAmpliar }: { src: string; alt: string; caption: string; onAmpliar: (src: string) => void }) {
  return (
    <figure>
      <button type="button" onClick={() => onAmpliar(src)} className="group relative block w-full overflow-hidden rounded-md border border-zinc-200">
        <img src={src} alt={alt} className="w-full" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
          <ZoomIn className="h-5 w-5 text-white" strokeWidth={2} />
        </span>
      </button>
      <figcaption className="mt-1 text-[10px] text-zinc-400">{caption}</figcaption>
    </figure>
  );
}

function StepChip({ n, label, estado }: { n: number; label: string; estado: "pendiente" | "activo" | "hecho" }) {
  return (
    <div className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold ${
      estado === "activo" ? "border-zinc-900 bg-zinc-900 text-white"
      : estado === "hecho" ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-zinc-200 bg-zinc-50 text-zinc-400"
    }`}>
      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
        estado === "activo" ? "bg-white text-zinc-900" : estado === "hecho" ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-500"
      }`}>{estado === "hecho" ? "✓" : n}</span>
      {label}
    </div>
  );
}

export default function CargarPorCedulaPage() {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>("frente");
  const [fileFrente, setFileFrente] = useState<File | null>(null);
  const [fileDorso, setFileDorso] = useState<File | null>(null);
  const [previewFrente, setPreviewFrente] = useState<string | null>(null);
  const [previewDorso, setPreviewDorso] = useState<string | null>(null);
  const [estadoProceso, setEstadoProceso] = useState("");
  const [error, setError] = useState("");

  const [formCedula, setFormCedula] = useState<Record<string, string> | null>(null);
  const [chasisDetectado, setChasisDetectado] = useState<string | null>(null);
  const [titular, setTitular] = useState<Titular>({ nombre: "", domicilio: "", dni: "" });
  const [advertencias, setAdvertencias] = useState<string[]>([]);
  const [diagnostico, setDiagnostico] = useState<DiagnosticoCedula | null>(null);
  const [completar, setCompletar] = useState<Record<string, string>>({ anio: "", tipo: "", precio: "", km: "", color: "", descripcion: "" });
  const [guardando, setGuardando] = useState(false);
  const [imagenAmpliada, setImagenAmpliada] = useState<string | null>(null);

  // --- Validación DNRPA (Radicación por Patente, semi-asistida por captcha) ---
  const [captchaImagen, setCaptchaImagen] = useState<string | null>(null);
  const [codigoVerificador, setCodigoVerificador] = useState("");
  const [cargandoCaptcha, setCargandoCaptcha] = useState(false);
  const [consultandoDnrpa, setConsultandoDnrpa] = useState(false);
  const [errorDnrpa, setErrorDnrpa] = useState("");
  const [resultadoDnrpa, setResultadoDnrpa] = useState<ResultadoDNRPA | null>(null);

  // --- Libre deuda ATM (sube el vendedor, solo evidencia, sin validar) ---
  const [libreDeudaAtm, setLibreDeudaAtm] = useState<string | null>(null);
  const [nombreLibreDeuda, setNombreLibreDeuda] = useState<string | null>(null);

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
    if (!formCedula?.dominio || !codigoVerificador.trim()) return;
    setConsultandoDnrpa(true);
    setErrorDnrpa("");
    try {
      const res = await fetch("/api/dnrpa/consultar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dominio: formCedula.dominio, codigoVerificador: codigoVerificador.trim() }),
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

  function elegirLibreDeuda(f: File) {
    setNombreLibreDeuda(f.name);
    const reader = new FileReader();
    reader.onload = () => setLibreDeudaAtm(reader.result as string);
    reader.readAsDataURL(f);
  }

  function normalizar(s: string) {
    return s.trim().toUpperCase();
  }
  function coincide(declarado: string, dnrpa: string) {
    if (!declarado || !dnrpa) return null;
    return normalizar(declarado) === normalizar(dnrpa);
  }

  function elegirFrente(f: File) {
    setFileFrente(f);
    setPreviewFrente(URL.createObjectURL(f));
  }
  function elegirDorso(f: File) {
    setFileDorso(f);
    setPreviewDorso(URL.createObjectURL(f));
  }

  async function procesar() {
    if (!fileFrente) return;
    setPaso("procesando");
    setError("");
    setEstadoProceso("Conectando con el backend real (OpenCV + RapidOCR)...");

    const fd = new FormData();
    fd.append("frente", fileFrente);
    if (fileDorso) fd.append("dorso", fileDorso);

    const timer = setTimeout(() => setEstadoProceso("El servidor está en el plan gratuito — puede tardar 1-2 minutos en procesar."), 4000);

    try {
      // Va DIRECTO al backend de Render desde el navegador (no por una función
      // serverless de Vercel): el procesamiento real tarda 60-90s+ en el plan
      // free, más que el límite duro de 60s de las funciones de Vercel Hobby.
      // Yendo directo no hay límite de tiempo de servidor de por medio.
      const res = await fetch(`${OCR_BACKEND_URL}/stock/cargar-por-cedula`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("backend error");
      const data = await res.json();
      clearTimeout(timer);
      if (data.error) { setError(data.error); setPaso("dorso"); return; }
      setFormCedula(data.fila.datos);
      setChasisDetectado(data.chasis_detectado);
      setTitular(data.titular || { nombre: "", domicilio: "", dni: "" });
      setAdvertencias(data.advertencias || []);
      setDiagnostico(data.diagnostico || null);
      setPaso("resultado");
    } catch {
      clearTimeout(timer);
      setError("No se pudo procesar la foto. Puede que el servidor gratuito siga despertando — esperá un momento y probá de nuevo.");
      setPaso("dorso");
    }
  }

  async function confirmar() {
    if (!formCedula) return;
    const datosFinales: Record<string, string> = {
      ...formCedula,
      ...completar,
      chasis: chasisDetectado || "",
      titular_nombre: titular?.nombre || "",
      titular_domicilio: titular?.domicilio || "",
      titular_dni: titular?.dni || "",
      libre_deuda_atm: libreDeudaAtm || "",
    };
    const obligatorios = ["dominio", "marca", "modelo", "anio", "precio"];
    const faltan = obligatorios.filter((c) => !datosFinales[c]);
    if (faltan.length) { setError(`Faltan campos obligatorios: ${faltan.join(", ")}`); return; }
    setGuardando(true);
    setError("");
    const res = await fetch("/api/stock/confirmar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filas: [{ numero_fila: 1, datos: datosFinales, errores: [], valida: true }] }),
    });
    const data = await res.json();
    setGuardando(false);
    if (!data.cantidad) { setError("No se pudo guardar. Revisá los campos."); return; }
    router.push("/stock/listado");
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 pl-12 lg:pl-0">
          <Link href="/stock" className="text-sm text-zinc-400 hover:text-zinc-700">Panel</Link>
          <span className="text-zinc-300">/</span>
          <h1 className="text-base font-semibold tracking-tight">Cargar vehículo por foto de cédula</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex gap-2">
          <StepChip n={1} label="Frente" estado={paso === "frente" ? "activo" : "hecho"} />
          <StepChip n={2} label="Dorso" estado={paso === "dorso" || paso === "procesando" ? "activo" : paso === "resultado" ? "hecho" : "pendiente"} />
          <StepChip n={3} label="Resultado" estado={paso === "resultado" ? "activo" : "pendiente"} />
        </div>

        {paso === "frente" && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-semibold">Paso 1 de 3 — Foto del frente</h2>
            <p className="mt-1 text-sm text-zinc-500">Ahí están dominio, marca, modelo y chasis. Encuadrá el documento completo, sin reflejos, sobre fondo liso.</p>
            <label className="mt-4 flex h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 text-center text-sm text-zinc-400 hover:border-blue-400 hover:text-blue-600">
              {previewFrente ? (
                <img src={previewFrente} alt="Frente" className="h-full w-full rounded-lg object-cover" />
              ) : (
                <>
                  <Upload className="h-7 w-7" strokeWidth={1.5} />
                  Elegí o sacá la foto del frente
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && elegirFrente(e.target.files[0])} />
            </label>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setPaso("dorso")}
                disabled={!fileFrente}
                className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Siguiente: foto del dorso <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

        {paso === "dorso" && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-semibold">Paso 2 de 3 — Foto del dorso (opcional)</h2>
            <p className="mt-1 text-sm text-zinc-500">Ahí están el nombre del titular, domicilio y DNI — confirma quién es el dueño registral. Si no la tenés a mano, podés saltarla.</p>
            <label className="mt-4 flex h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 text-center text-sm text-zinc-400 hover:border-blue-400 hover:text-blue-600">
              {previewDorso ? (
                <img src={previewDorso} alt="Dorso" className="h-full w-full rounded-lg object-cover" />
              ) : (
                <>
                  <Upload className="h-7 w-7" strokeWidth={1.5} />
                  Elegí o sacá la foto del dorso
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && elegirDorso(e.target.files[0])} />
            </label>
            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {error}
              </div>
            )}
            <div className="mt-5 flex items-center justify-between">
              <button onClick={() => setPaso("frente")} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50">
                <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Atrás
              </button>
              <div className="flex items-center gap-3">
                {!fileDorso && (
                  <button onClick={procesar} className="text-sm font-medium text-zinc-500 underline hover:text-zinc-700">
                    Saltar y usar solo el frente
                  </button>
                )}
                <button onClick={procesar} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                  Procesar con OCR real
                </button>
              </div>
            </div>
          </div>
        )}

        {paso === "procesando" && (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" strokeWidth={2} />
            <p className="mt-4 text-sm font-medium text-zinc-700">Procesando con OCR real</p>
            <p className="mt-1 text-sm text-zinc-500">{estadoProceso}</p>
            <div className="mx-auto mt-5 flex max-w-xs justify-center gap-3">
              {previewFrente && <img src={previewFrente} className="h-20 w-28 rounded-md border border-zinc-200 object-cover" alt="Frente" />}
              {previewDorso && <img src={previewDorso} className="h-20 w-28 rounded-md border border-zinc-200 object-cover" alt="Dorso" />}
            </div>
          </div>
        )}

        {paso === "resultado" && formCedula && (
          <div className="space-y-5">
            {advertencias.length > 0 && (
              <div className="space-y-1.5">
                {advertencias.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {a}
                  </div>
                ))}
              </div>
            )}

            {diagnostico && (diagnostico.frente_original_b64 || diagnostico.dorso_original_b64) && (
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Evidencia del pipeline (OpenCV)</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {diagnostico.frente_original_b64 && (
                    <>
                      <ImagenDiagnostico src={`data:image/jpeg;base64,${diagnostico.frente_original_b64}`} alt="Frente original" caption="Frente original" onAmpliar={setImagenAmpliada} />
                      <ImagenDiagnostico src={`data:image/jpeg;base64,${diagnostico.frente_procesada_b64}`} alt="Frente procesada" caption={diagnostico.frente_documento_detectado ? "Enderezada" : "Borde no detectado"} onAmpliar={setImagenAmpliada} />
                    </>
                  )}
                  {diagnostico.dorso_original_b64 && (
                    <>
                      <ImagenDiagnostico src={`data:image/jpeg;base64,${diagnostico.dorso_original_b64}`} alt="Dorso original" caption="Dorso original" onAmpliar={setImagenAmpliada} />
                      <ImagenDiagnostico src={`data:image/jpeg;base64,${diagnostico.dorso_procesada_b64}`} alt="Dorso procesada" caption={diagnostico.dorso_documento_detectado ? "Enderezada" : "Borde no detectado"} onAmpliar={setImagenAmpliada} />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Lo que vino de la cédula — prioridad visual */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-700" strokeWidth={2} />
                <h2 className="text-sm font-semibold text-blue-900">Leído de la cédula verde</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {CAMPOS_CEDULA.map((c) => (
                  <label key={c.key} className="text-xs font-semibold text-zinc-600">
                    {c.label}
                    <input
                      value={formCedula[c.key] || ""}
                      onChange={(e) => setFormCedula({ ...formCedula, [c.key]: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-blue-200 bg-white px-2.5 py-2 text-sm text-zinc-900"
                    />
                  </label>
                ))}
              </div>
              <label className="mt-3 block text-xs font-semibold text-zinc-600">
                Chasis
                <input
                  value={chasisDetectado || ""}
                  onChange={(e) => setChasisDetectado(e.target.value)}
                  placeholder="No se leyó — completalo a mano"
                  className="mt-1 block w-full rounded-md border border-blue-200 bg-white px-2.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
                />
              </label>

              <div className="mt-4 border-t border-blue-200 pt-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-800">
                  <User className="h-3.5 w-3.5" strokeWidth={2} /> Titular registral (del dorso) — revisá y corregí si el OCR no leyó bien
                </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <label className="text-xs font-semibold text-zinc-600">
                      Nombre
                      <input
                        value={titular.nombre || ""}
                        onChange={(e) => setTitular({ ...titular, nombre: e.target.value })}
                        placeholder="No se leyó — completalo a mano"
                        className="mt-1 block w-full rounded-md border border-blue-200 bg-white px-2.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
                      />
                    </label>
                    <label className="text-xs font-semibold text-zinc-600">
                      Domicilio
                      <input
                        value={titular.domicilio || ""}
                        onChange={(e) => setTitular({ ...titular, domicilio: e.target.value })}
                        placeholder="No se leyó — completalo a mano"
                        className="mt-1 block w-full rounded-md border border-blue-200 bg-white px-2.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
                      />
                    </label>
                    <label className="text-xs font-semibold text-zinc-600">
                      DNI
                      <input
                        value={titular.dni || ""}
                        onChange={(e) => setTitular({ ...titular, dni: e.target.value })}
                        placeholder="No se leyó — completalo a mano"
                        className="mt-1 block w-full rounded-md border border-blue-200 bg-white px-2.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
                      />
                    </label>
                  </div>
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
                        ["Dominio", formCedula.dominio || "", resultadoDnrpa.dominio],
                        ["Tipo de vehículo", completar.tipo || "", resultadoDnrpa.tipoVehiculo],
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

            {/* Lo que completa la agencia — secundario, va después */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="mb-1 text-sm font-semibold">Completá para publicar</h2>
              <p className="mb-3 text-xs text-zinc-500">Estos datos no están en la cédula — los carga la agencia.</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {CAMPOS_COMPLETAR.map((c) => (
                  <label key={c.key} className="text-xs font-semibold text-zinc-600">
                    {c.label}
                    <input
                      value={completar[c.key] || ""}
                      onChange={(e) => setCompletar({ ...completar, [c.key]: e.target.value })}
                      placeholder={c.placeholder}
                      className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-sm text-zinc-900"
                    />
                  </label>
                ))}
                <label className="col-span-2 text-xs font-semibold text-zinc-600 sm:col-span-4">
                  Descripción (opcional)
                  <input
                    value={completar.descripcion}
                    onChange={(e) => setCompletar({ ...completar, descripcion: e.target.value })}
                    placeholder="Ej: único dueño, service oficial"
                    className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-sm text-zinc-900"
                  />
                </label>
              </div>

              <div className="mt-4 border-t border-zinc-200 pt-4">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <FileText className="h-3.5 w-3.5" strokeWidth={2} /> Libre deuda de patente (ATM Mendoza) — opcional
                </div>
                <p className="mb-2 text-xs text-zinc-500">
                  Lo descarga el vendedor desde su propia cuenta en atm.mendoza.gov.ar (necesita su CUIT y
                  clave personal, por eso no lo puede pedir la agencia). Solo se guarda como respaldo —no
                  se valida automáticamente.
                </p>
                <label className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-sm ${
                  libreDeudaAtm ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-zinc-300 text-zinc-500 hover:border-blue-400 hover:text-blue-600"
                }`}>
                  {libreDeudaAtm ? <CheckCircle2 className="h-4 w-4" strokeWidth={2} /> : <Upload className="h-4 w-4" strokeWidth={2} />}
                  {libreDeudaAtm ? `Cargado — ${nombreLibreDeuda}` : "Pendiente — subir PDF o foto del libre deuda"}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && elegirLibreDeuda(e.target.files[0])}
                  />
                </label>
              </div>

              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {error}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <button onClick={() => setPaso("frente")} className="text-sm font-medium text-zinc-500 underline hover:text-zinc-700">
                  Volver a sacar las fotos
                </button>
                <button
                  onClick={confirmar}
                  disabled={guardando}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {guardando && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
                  Agregar al stock
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {imagenAmpliada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setImagenAmpliada(null)}>
          <button onClick={() => setImagenAmpliada(null)} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
          <img src={imagenAmpliada} alt="Imagen ampliada" className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
