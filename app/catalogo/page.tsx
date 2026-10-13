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
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 px-8 py-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Catálogo — Prototipo (lado comprador)</h1>
          <p className="max-w-xl text-sm text-zinc-500">
            Al abrir una ficha se registra una vista real; al consultar, se crea un interés que la agencia ve en su panel — nada se confirma automáticamente.
          </p>
        </div>
        <Link href="/stock" className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50">
          Panel de agencia →
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-8 py-8">
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscá por marca, modelo o dominio…"
          className="mb-5 w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {filtrados.map((v) => (
            <button key={v.dominio} onClick={() => abrirFicha(v)} className="overflow-hidden rounded-lg border border-zinc-200 text-left transition hover:shadow-md">
              <div className="relative flex h-28 items-center justify-center bg-zinc-50 text-xs text-zinc-400">
                📷 (próximamente)
                {v.documentacion_validada && (
                  <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
                    ✓ Papeles OK
                  </span>
                )}
              </div>
              <div className="p-3">
                <div className="font-mono text-[11px] text-zinc-400">{v.dominio}</div>
                <div className="text-sm font-semibold">{v.marca} {v.modelo}</div>
                <div className="text-sm font-bold text-blue-600">{formatoPrecio(v.precio)}</div>
                <div className="mt-1 flex justify-between text-[11px] text-zinc-500"><span>{v.anio}</span><span>{v.km ? `${v.km} km` : "—"}</span><span>{v.color || "—"}</span></div>
              </div>
            </button>
          ))}
        </div>
        {filtrados.length === 0 && <p className="text-sm text-zinc-400">Todavía no hay vehículos cargados.</p>}
      </main>

      {abierto && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/45 p-5" onClick={() => setAbierto(null)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-start justify-between">
              <h2 className="text-lg font-bold">{abierto.marca} {abierto.modelo}</h2>
              <button onClick={() => setAbierto(null)} className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-500">✕</button>
            </div>
            <div className="mb-3 text-lg font-bold text-blue-600">{formatoPrecio(abierto.precio)}</div>
            <div className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500">
              <span>Año: {abierto.anio}</span><span>Km: {abierto.km || "—"}</span>
              <span>Color: {abierto.color || "—"}</span><span>Dominio: {abierto.dominio}</span>
            </div>
            {abierto.descripcion && <p className="mb-3 text-sm text-zinc-600">{abierto.descripcion}</p>}

            {confirmado ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm leading-relaxed text-green-700">
                ✓ Tu consulta fue enviada a la agencia. Todavía no está confirmada ni respondida — un vendedor la va a revisar y te va a contactar directamente. Autoclick no vende el auto ni confirma nada en tu nombre.
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-xs font-semibold">Tu nombre
                  <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
                </label>
                <label className="mb-2 block text-xs font-semibold">Teléfono (opcional)
                  <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
                </label>
                <label className="mb-3 block text-xs font-semibold">Tu consulta
                  <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Ej: ¿Está disponible? ¿Acepta permuta?" className="mt-1 min-h-[70px] w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" />
                </label>
                <button onClick={enviarConsulta} disabled={enviando} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
                  {enviando ? "Enviando…" : "Enviar consulta a la agencia"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
