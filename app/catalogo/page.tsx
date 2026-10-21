"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Camera, CheckCircle2 } from "lucide-react";
import CanalLogo from "@/components/CanalLogo";
import type { Canal } from "@/lib/data";

type Vehiculo = {
  dominio: string; marca: string; modelo: string; anio: string; tipo: string;
  precio: string; km: string; color: string; descripcion: string;
  documentacion_validada: boolean; fotos: string[];
};

type PublicacionPublica = { dominio: string; canal: Canal; permalink: string };

function formatoPrecio(p: string) {
  const n = parseFloat(p);
  return isNaN(n) ? p : "$" + n.toLocaleString("es-AR");
}

function accentFicha(v: Vehiculo) {
  return v.tipo?.toLowerCase().includes("moto") ? "bg-violet-50" : "bg-blue-50";
}

export default function CatalogoPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [publicaciones, setPublicaciones] = useState<PublicacionPublica[]>([]);
  const [query, setQuery] = useState("");
  // Antes "cargando" y "no hay nada" eran el mismo estado (vehiculos.length
  // === 0) -apenas se entraba al catálogo, mientras todavía no llegaba la
  // respuesta de /api/catalogo/stock (tarda, trae las fotos en base64 adentro
  // del JSON), se veía "0 vehículo(s) disponible(s) / Todavía no hay
  // vehículos cargados" aunque sí hubiera stock real cargándose. Ahora se
  // distingue explícitamente.
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/catalogo/stock")
      .then((r) => r.json())
      .then((d) => setVehiculos(d.vehiculos || []))
      .finally(() => setCargando(false));
    fetch("/api/catalogo/publicaciones").then((r) => r.json()).then((d) => setPublicaciones(d.publicaciones || []));
  }, []);

  function canalesDe(dominio: string): Canal[] {
    return publicaciones.filter((p) => p.dominio === dominio).map((p) => p.canal);
  }

  const filtrados = vehiculos.filter((v) => {
    const q = query.toLowerCase().trim();
    return !q || [v.marca, v.modelo, v.dominio].some((c) => c.toLowerCase().includes(q));
  });

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">A</div>
            <div className="text-sm font-bold tracking-tight">Auto<span className="text-blue-600">Nexo</span></div>
          </div>
          <Link href="/stock" className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 sm:text-sm">
            Panel de agencia →
          </Link>
        </div>
      </header>

      <section className="border-b border-zinc-200 bg-blue-600 px-4 py-8 text-white sm:px-6 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-1 text-xl font-bold tracking-tight sm:text-2xl">Catálogo de vehículos</h1>
          <p className="mb-5 max-w-xl text-sm text-blue-100">
            Al abrir una ficha se registra una vista real; al consultar, se crea un interés que la agencia ve en su panel — nada se confirma automáticamente.
          </p>
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá por marca, modelo o dominio…"
            className="w-full max-w-md rounded-lg border-0 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-white"
          />
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4 text-sm text-zinc-500">
          {cargando ? "Cargando vehículos…" : `${filtrados.length} vehículo(s) disponible(s)`}
        </div>
        {cargando && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="h-32 animate-pulse bg-zinc-100 sm:h-36" />
                <div className="space-y-2 p-4">
                  <div className="h-3 w-16 animate-pulse rounded bg-zinc-100" />
                  <div className="h-4 w-32 animate-pulse rounded bg-zinc-100" />
                  <div className="h-5 w-24 animate-pulse rounded bg-zinc-100" />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {!cargando && filtrados.map((v) => (
            <Link key={v.dominio} href={`/catalogo/${encodeURIComponent(v.dominio)}`} className="overflow-hidden rounded-xl border border-zinc-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-2 hover:ring-blue-200">
              <div className={`relative flex h-32 items-center justify-center gap-1.5 text-xs text-zinc-500 sm:h-36 ${accentFicha(v)}`}>
                {v.fotos && v.fotos.length > 0 ? (
                  <img src={v.fotos[0]} alt={`${v.marca} ${v.modelo}`} className="h-full w-full object-cover" />
                ) : (
                  <><Camera className="h-4 w-4" strokeWidth={1.75} /> foto próximamente</>
                )}
                {v.documentacion_validada && (
                  <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 shadow-sm">
                    <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} /> Papeles OK
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="font-mono text-[11px] text-zinc-400">{v.dominio}</div>
                <div className="text-sm font-semibold">{v.marca} {v.modelo}</div>
                <div className="mt-0.5 text-lg font-bold text-blue-600">{formatoPrecio(v.precio)}</div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-zinc-500">
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5">{v.anio}</span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5">{v.km ? `${v.km} km` : "—"}</span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5">{v.color || "—"}</span>
                </div>
                {/* Antes solo la ficha individual mostraba "también
                    publicado en" -la lista de tarjetas no daba ninguna
                    pista de que el mismo auto ya estuviera en ML/FB/IG. */}
                {canalesDe(v.dominio).length > 0 && (
                  <div className="mt-2 flex items-center gap-1 border-t border-zinc-100 pt-2">
                    <span className="text-[10px] text-zinc-400">También en</span>
                    {canalesDe(v.dominio).map((c) => <CanalLogo key={c} canal={c} size={14} />)}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
        {!cargando && filtrados.length === 0 && (
          <p className="text-sm text-zinc-400">
            {vehiculos.length === 0 ? "Todavía no hay vehículos cargados." : "Ningún vehículo coincide con la búsqueda."}
          </p>
        )}
      </main>
    </div>
  );
}
