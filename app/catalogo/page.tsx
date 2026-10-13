"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Vehiculo = {
  dominio: string; marca: string; modelo: string; anio: string; tipo: string;
  precio: string; km: string; color: string; descripcion: string;
  documentacion_validada: boolean;
};

function formatoPrecio(p: string) {
  const n = parseFloat(p);
  return isNaN(n) ? p : "$" + n.toLocaleString("es-AR");
}

function accentFicha(v: Vehiculo) {
  return v.tipo?.toLowerCase().includes("moto")
    ? "from-violet-100 to-fuchsia-100"
    : "from-blue-100 to-sky-100";
}

export default function CatalogoPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [query, setQuery] = useState("");
  const [abierto, setAbierto] = useState<Vehiculo | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [confirmado, setConfirmado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch("/api/catalogo/stock").then((r) => r.json()).then((d) => setVehiculos(d.vehiculos || []));
  }, []);

  const filtrados = vehiculos.filter((v) => {
    const q = query.toLowerCase().trim();
    return !q || [v.marca, v.modelo, v.dominio].some((c) => c.toLowerCase().includes(q));
  });

  function abrirFicha(v: Vehiculo) {
    fetch(`/api/catalogo/${encodeURIComponent(v.dominio)}/vista`, { method: "POST" }).catch(() => {});
    setAbierto(v);
    setConfirmado(false);
    setNombre(""); setTelefono(""); setMensaje("");
  }

  async function enviarConsulta() {
    if (!abierto || !nombre || !mensaje) { alert("Completá tu nombre y la consulta."); return; }
    setEnviando(true);
    const res = await fetch(`/api/catalogo/${encodeURIComponent(abierto.dominio)}/consulta`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, telefono, mensaje }),
    });
    const data = await res.json();
    setEnviando(false);
    if (data.error) { alert("Error: " + data.error); return; }
    setConfirmado(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/30 text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white">A</div>
            <div className="text-sm font-bold tracking-tight">Autos<span className="text-blue-600">click</span></div>
          </div>
          <Link href="/stock" className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 sm:text-sm">
            Panel de agencia →
          </Link>
        </div>
      </header>

      <section className="border-b border-zinc-200 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 px-4 py-8 text-white sm:px-6 sm:py-10">
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
        <div className="mb-4 text-sm text-zinc-500">{filtrados.length} vehículo(s) disponible(s)</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((v) => (
            <button key={v.dominio} onClick={() => abrirFicha(v)} className="overflow-hidden rounded-xl border border-zinc-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-2 hover:ring-blue-200">
              <div className={`relative flex h-32 items-center justify-center bg-gradient-to-br text-xs text-zinc-500 sm:h-36 ${accentFicha(v)}`}>
                📷 foto próximamente
                {v.documentacion_validada && (
                  <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 shadow-sm">
                    ✓ Papeles OK
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
              </div>
            </button>
          ))}
        </div>
        {filtrados.length === 0 && <p className="text-sm text-zinc-400">Todavía no hay vehículos cargados.</p>}
      </main>

      {abierto && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-3 sm:p-5" onClick={() => setAbierto(null)}>
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br text-sm text-zinc-500 sm:h-40 ${accentFicha(abierto)}`}>
              📷 foto próximamente
              <button onClick={() => setAbierto(null)} className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm shadow">✕</button>
            </div>
            <div className="p-5 sm:p-6">
              <h2 className="text-lg font-bold">{abierto.marca} {abierto.modelo}</h2>
              <div className="mb-3 text-xl font-bold text-blue-600">{formatoPrecio(abierto.precio)}</div>
              <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500">
                <span>Año: {abierto.anio}</span><span>Km: {abierto.km || "—"}</span>
                <span>Color: {abierto.color || "—"}</span><span>Dominio: {abierto.dominio}</span>
              </div>
              {abierto.descripcion && <p className="mb-3 text-sm text-zinc-600">{abierto.descripcion}</p>}

              {confirmado ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-700">
                  ✓ Tu consulta fue enviada a la agencia. Todavía no está confirmada ni respondida — un vendedor la va a revisar y te va a contactar directamente. Autoclick no vende el auto ni confirma nada en tu nombre.
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
                  <button onClick={enviarConsulta} disabled={enviando} className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50">
                    {enviando ? "Enviando…" : "Enviar consulta a la agencia"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
