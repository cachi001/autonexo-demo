"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Camera, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";

type Vehiculo = {
  dominio: string; marca: string; modelo: string; anio: string; tipo: string;
  precio: string; km: string; color: string; descripcion: string;
  documentacion_validada: boolean; fotos: string[];
};

function formatoPrecio(p: string) {
  const n = parseFloat(p);
  return isNaN(n) ? p : "$" + n.toLocaleString("es-AR");
}

function accentFicha(v: Vehiculo) {
  return v.tipo?.toLowerCase().includes("moto") ? "bg-violet-50" : "bg-blue-50";
}

export default function FichaVehiculoPage({ params }: { params: Promise<{ dominio: string }> }) {
  const { dominio } = use(params);
  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [fotoActiva, setFotoActiva] = useState(0);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [confirmado, setConfirmado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch("/api/catalogo/stock").then((r) => r.json()).then((d) => {
      const v = (d.vehiculos || []).find((x: Vehiculo) => x.dominio === dominio);
      if (!v) { setNotFound(true); return; }
      setVehiculo(v);
      fetch(`/api/catalogo/${encodeURIComponent(dominio)}/vista`, { method: "POST" }).catch(() => {});
    });
  }, [dominio]);

  async function enviarConsulta() {
    if (!nombre || !mensaje) { alert("Completá tu nombre y la consulta."); return; }
    setEnviando(true);
    const res = await fetch(`/api/catalogo/${encodeURIComponent(dominio)}/consulta`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, telefono, mensaje }),
    });
    const data = await res.json();
    setEnviando(false);
    if (data.error) { alert("Error: " + data.error); return; }
    setConfirmado(true);
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6">
        <p className="text-sm text-zinc-500">No se encontró el vehículo. <Link href="/catalogo" className="text-blue-600 underline">Volver al catálogo</Link></p>
      </div>
    );
  }
  if (!vehiculo) return null;

  const fotos = vehiculo.fotos || [];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4 sm:px-6">
          <Link href="/catalogo" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800">
            <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Catálogo
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Galería */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className={`relative flex h-72 items-center justify-center overflow-hidden rounded-lg ${accentFicha(vehiculo)}`}>
              {fotos.length > 0 ? (
                <img src={fotos[fotoActiva]} alt={`${vehiculo.marca} ${vehiculo.modelo}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-400">
                  <Camera className="h-8 w-8" strokeWidth={1.5} />
                  <span className="text-xs">Foto próximamente</span>
                </div>
              )}
              {vehiculo.documentacion_validada && (
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 shadow-sm">
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} /> Papeles OK
                </span>
              )}
            </div>
            {fotos.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {fotos.map((f, i) => (
                  <button key={i} onClick={() => setFotoActiva(i)} className={`h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 ${i === fotoActiva ? "border-blue-500" : "border-transparent"}`}>
                    <img src={f} className="h-full w-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Datos + consulta */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="font-mono text-xs text-zinc-400">{vehiculo.dominio}</div>
            <h1 className="text-lg font-bold">{vehiculo.marca} {vehiculo.modelo}</h1>
            <div className="mb-3 text-xl font-bold text-blue-600">{formatoPrecio(vehiculo.precio)}</div>
            <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500">
              <span>Año: {vehiculo.anio || "—"}</span><span>Km: {vehiculo.km || "—"}</span>
              <span>Color: {vehiculo.color || "—"}</span><span>Tipo: {vehiculo.tipo || "—"}</span>
            </div>
            {vehiculo.descripcion && <p className="mb-4 text-sm text-zinc-600">{vehiculo.descripcion}</p>}

            {confirmado ? (
              <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                <span>Tu consulta fue enviada a la agencia. Todavía no está confirmada ni respondida — un vendedor la va a revisar y te va a contactar directamente. AutoNexo no vende el auto ni confirma nada en tu nombre.</span>
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-xs font-semibold">Tu nombre
                  <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900" />
                </label>
                <label className="mb-2 block text-xs font-semibold">Teléfono (opcional)
                  <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900" />
                </label>
                <label className="mb-3 block text-xs font-semibold">Tu consulta
                  <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Ej: ¿Está disponible? ¿Acepta permuta?" className="mt-1 min-h-[70px] w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900" />
                </label>
                <button onClick={enviarConsulta} disabled={enviando} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {enviando && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
                  {enviando ? "Enviando…" : "Enviar consulta a la agencia"}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
