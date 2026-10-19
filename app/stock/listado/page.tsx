"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Camera, CheckCircle2, LayoutGrid, Table2, Eye, MessageCircle } from "lucide-react";

type Vehiculo = {
  dominio: string; marca: string; modelo: string; anio: string; tipo: string;
  precio: string; km: string; color: string; descripcion: string;
  documentacion_validada: boolean; documentacion_validada_fecha: string | null;
  vistas_reales: number; consultas_reales: number;
};

function formatoPrecio(p: string) {
  const n = parseFloat(p);
  return isNaN(n) ? p : "$" + n.toLocaleString("es-AR");
}

export default function StockListadoPage() {
  const [stock, setStock] = useState<Vehiculo[]>([]);
  const [vista, setVista] = useState<"tabla" | "cards">("tabla");
  const [filtro, setFiltro] = useState("");

  async function cargarStock() {
    const res = await fetch("/api/stock");
    const data = await res.json();
    setStock(data.vehiculos || []);
  }
  useEffect(() => { cargarStock(); }, []);

  async function toggleDocumentacion(dominio: string, nuevoEstado: boolean) {
    await fetch(`/api/stock/${encodeURIComponent(dominio)}/documentacion`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validada: nuevoEstado }),
    });
    cargarStock();
  }

  const filtrado = stock.filter((v) => {
    const q = filtro.toLowerCase().trim();
    return !q || [v.dominio, v.marca, v.modelo].some((c) => c.toLowerCase().includes(q));
  });

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/stock" className="text-sm text-zinc-400 hover:text-zinc-700">Panel</Link>
            <span className="text-zinc-300">/</span>
            <h1 className="text-base font-semibold tracking-tight">Stock actual</h1>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-zinc-200 p-1">
            <button onClick={() => setVista("tabla")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${vista === "tabla" ? "bg-emerald-600 text-white" : "text-zinc-500 hover:bg-zinc-50"}`}>
              <Table2 className="h-3.5 w-3.5" strokeWidth={2} /> Tabla
            </button>
            <button onClick={() => setVista("cards")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${vista === "cards" ? "bg-emerald-600 text-white" : "text-zinc-500 hover:bg-zinc-50"}`}>
              <LayoutGrid className="h-3.5 w-3.5" strokeWidth={2} /> Tarjetas
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex items-center justify-between">
          <input
            value={filtro} onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar por dominio, marca o modelo…"
            className="w-full max-w-sm rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          />
          <span className="ml-3 shrink-0 text-xs text-zinc-400">{filtrado.length} de {stock.length} vehículo(s)</span>
        </div>

        {vista === "tabla" ? (
          <div className="overflow-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="p-3 text-left">Dominio</th>
                  <th className="p-3 text-left">Marca / Modelo</th>
                  <th className="p-3 text-left">Año</th>
                  <th className="p-3 text-left">Precio</th>
                  <th className="p-3 text-left">Km</th>
                  <th className="p-3 text-left">Color</th>
                  <th className="p-3 text-left">Vistas</th>
                  <th className="p-3 text-left">Consultas</th>
                  <th className="p-3 text-left">Papeles</th>
                </tr>
              </thead>
              <tbody>
                {filtrado.map((v) => (
                  <tr key={v.dominio} className="border-t border-zinc-100">
                    <td className="p-3 font-mono text-xs">
                      <Link href={`/stock/listado/${encodeURIComponent(v.dominio)}`} className="text-blue-600 hover:underline">{v.dominio}</Link>
                    </td>
                    <td className="p-3 font-medium">
                      <Link href={`/stock/listado/${encodeURIComponent(v.dominio)}`} className="hover:underline">{v.marca} {v.modelo}</Link>
                    </td>
                    <td className="p-3">{v.anio || "—"}</td>
                    <td className="p-3 font-semibold text-emerald-700">{formatoPrecio(v.precio)}</td>
                    <td className="p-3">{v.km || "—"}</td>
                    <td className="p-3">{v.color || "—"}</td>
                    <td className="p-3">{v.vistas_reales}</td>
                    <td className="p-3">{v.consultas_reales}</td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleDocumentacion(v.dominio, !v.documentacion_validada)}
                        className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] ${v.documentacion_validada ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"}`}
                      >
                        {v.documentacion_validada && <CheckCircle2 className="h-3 w-3" strokeWidth={2} />}
                        {v.documentacion_validada ? "Validado" : "Validar"}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtrado.length === 0 && (
                  <tr><td colSpan={9} className="p-6 text-center text-sm text-zinc-400">Sin resultados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {filtrado.map((v) => (
              <div key={v.dominio} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative flex h-28 items-center justify-center gap-1.5 bg-zinc-50 text-xs text-zinc-400">
                  <Camera className="h-4 w-4" strokeWidth={1.75} /> (próximamente)
                  {v.documentacion_validada && (
                    <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} /> Papeles OK
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <Link href={`/stock/listado/${encodeURIComponent(v.dominio)}`} className="block hover:underline">
                    <div className="font-mono text-[11px] text-zinc-400">{v.dominio}</div>
                    <div className="text-sm font-semibold">{v.marca} {v.modelo}</div>
                  </Link>
                  <div className="text-sm font-bold text-emerald-700">{formatoPrecio(v.precio)}</div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" strokeWidth={2} /> {v.vistas_reales} vistas</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" strokeWidth={2} /> {v.consultas_reales} consultas</span>
                  </div>
                  <button
                    onClick={() => toggleDocumentacion(v.dominio, !v.documentacion_validada)}
                    className={`mt-2 flex w-full items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-[11px] ${v.documentacion_validada ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"}`}
                  >
                    {v.documentacion_validada ? (<><CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} /> Papeles validados — quitar</>) : "Marcar papeles como validados"}
                  </button>
                </div>
              </div>
            ))}
            {filtrado.length === 0 && <p className="text-sm text-zinc-400">Sin resultados.</p>}
          </div>
        )}
      </main>
    </>
  );
}
