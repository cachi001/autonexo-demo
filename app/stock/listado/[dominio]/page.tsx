"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Camera, CheckCircle2, Upload, X, Loader2 } from "lucide-react";

type Vehiculo = {
  dominio: string; marca: string; modelo: string; anio: string; tipo: string;
  precio: string; km: string; color: string; descripcion: string;
  documentacion_validada: boolean; documentacion_validada_fecha: string | null;
  vistas_reales: number; consultas_reales: number; fotos: string[];
};

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

  async function cargar() {
    const res = await fetch("/api/stock");
    const data = await res.json();
    const v = (data.vehiculos || []).find((x: Vehiculo) => x.dominio === dominio);
    if (!v) { setNotFound(true); return; }
    setVehiculo(v);
  }
  useEffect(() => { cargar(); }, [dominio]);

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

  if (notFound) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm text-zinc-500">No se encontró el vehículo {dominio}. <Link href="/stock/listado" className="text-blue-600 underline">Volver al stock</Link></p>
      </main>
    );
  }
  if (!vehiculo) return null;

  const fotos = vehiculo.fotos || [];

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
      </main>
    </>
  );
}
