"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Upload, ArrowLeft, ArrowRight, Loader2, AlertTriangle, CheckCircle2, User, X, ZoomIn,
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
  const [titular, setTitular] = useState<Titular | null>(null);
  const [advertencias, setAdvertencias] = useState<string[]>([]);
  const [diagnostico, setDiagnostico] = useState<DiagnosticoCedula | null>(null);
  const [completar, setCompletar] = useState<Record<string, string>>({ anio: "", tipo: "", precio: "", km: "", color: "", descripcion: "" });
  const [guardando, setGuardando] = useState(false);
  const [imagenAmpliada, setImagenAmpliada] = useState<string | null>(null);

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
      setTitular(data.titular || null);
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
    const datosFinales = { ...formCedula, ...completar };
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
              <div className="mt-3 text-xs text-zinc-600">
                Chasis: <code className="rounded bg-blue-100 px-1.5 py-0.5">{chasisDetectado || "no leído"}</code>
              </div>

              {titular && (
                <div className="mt-4 border-t border-blue-200 pt-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-800">
                    <User className="h-3.5 w-3.5" strokeWidth={2} /> Titular registral (del dorso)
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded-md border border-blue-200 bg-white px-2.5 py-2 text-sm">
                      <div className="text-[10px] uppercase text-zinc-400">Nombre</div>
                      {titular.nombre || <span className="text-zinc-400">— no leído —</span>}
                    </div>
                    <div className="rounded-md border border-blue-200 bg-white px-2.5 py-2 text-sm">
                      <div className="text-[10px] uppercase text-zinc-400">Domicilio</div>
                      {titular.domicilio || <span className="text-zinc-400">— no leído —</span>}
                    </div>
                    <div className="rounded-md border border-blue-200 bg-white px-2.5 py-2 text-sm">
                      <div className="text-[10px] uppercase text-zinc-400">DNI</div>
                      {titular.dni || <span className="text-zinc-400">— no leído —</span>}
                    </div>
                  </div>
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
