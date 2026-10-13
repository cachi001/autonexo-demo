"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Camera, FileText, Car, MessageCircle, Eye, CheckCircle2, ArrowRight,
} from "lucide-react";

type Vehiculo = {
  dominio: string; marca: string; modelo: string; anio: string; tipo: string;
  precio: string; km: string; color: string; descripcion: string;
  documentacion_validada: boolean; documentacion_validada_fecha: string | null;
  vistas_reales: number; consultas_reales: number;
};
type Lead = { id: string; dominio: string; nombre: string; telefono: string | null; mensaje: string; fecha: string; estado: string; vehiculo_titulo: string };

function formatoPrecio(p: string) {
  const n = parseFloat(p);
  return isNaN(n) ? p : "$" + n.toLocaleString("es-AR");
}

export default function StockPage() {
  const [stock, setStock] = useState<Vehiculo[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  async function cargarStock() {
    const res = await fetch("/api/stock");
    const data = await res.json();
    setStock(data.vehiculos || []);
  }
  async function cargarLeads() {
    const res = await fetch("/api/leads");
    const data = await res.json();
    setLeads(data.leads || []);
  }
  useEffect(() => { cargarStock(); cargarLeads(); }, []);

  async function toggleDocumentacion(dominio: string, nuevoEstado: boolean) {
    await fetch(`/api/stock/${encodeURIComponent(dominio)}/documentacion`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validada: nuevoEstado }),
    });
    cargarStock();
  }

  async function actualizarEstadoLead(id: string, estado: string) {
    await fetch(`/api/leads/${encodeURIComponent(id)}/estado`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    cargarLeads();
  }

  const claseEstado: Record<string, string> = {
    pendiente: "bg-amber-50 text-amber-700 border-amber-200",
    respondido: "bg-blue-50 text-blue-700 border-blue-200",
    cerrado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  const totalVistas = stock.reduce((acc, v) => acc + (v.vistas_reales || 0), 0);
  const pendientes = leads.filter((l) => l.estado === "pendiente").length;
  const validados = stock.filter((v) => v.documentacion_validada).length;

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="pl-12 lg:pl-0">
          <h1 className="text-base font-semibold tracking-tight">Panel de agencia</h1>
          <p className="hidden text-xs text-zinc-500 sm:block">Resumen general del stock, validación de papeles y consultas de compradores.</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 lg:px-8">
        {/* Stat cards */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="relative overflow-hidden rounded-xl bg-blue-600 p-4 text-white shadow-sm">
            <Car className="absolute -right-2 -top-2 h-16 w-16 opacity-20" strokeWidth={1.5} />
            <div className="relative text-[11px] font-medium uppercase tracking-wide text-blue-100">En stock</div>
            <div className="relative mt-1 text-3xl font-bold">{stock.length}</div>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-violet-600 p-4 text-white shadow-sm">
            <Eye className="absolute -right-2 -top-2 h-16 w-16 opacity-20" strokeWidth={1.5} />
            <div className="relative text-[11px] font-medium uppercase tracking-wide text-violet-100">Vistas totales</div>
            <div className="relative mt-1 text-3xl font-bold">{totalVistas}</div>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-amber-600 p-4 text-white shadow-sm">
            <MessageCircle className="absolute -right-2 -top-2 h-16 w-16 opacity-20" strokeWidth={1.5} />
            <div className="relative text-[11px] font-medium uppercase tracking-wide text-amber-100">Consultas pendientes</div>
            <div className="relative mt-1 text-3xl font-bold">{pendientes}</div>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-emerald-600 p-4 text-white shadow-sm">
            <CheckCircle2 className="absolute -right-2 -top-2 h-16 w-16 opacity-20" strokeWidth={1.5} />
            <div className="relative text-[11px] font-medium uppercase tracking-wide text-emerald-100">Papeles validados</div>
            <div className="relative mt-1 text-3xl font-bold">{validados}/{stock.length}</div>
          </div>
        </section>

        {/* CTAs a páginas dedicadas */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href="/stock/cedula" className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md sm:p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Camera className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="flex-1">
              <div className="text-sm font-semibold">Cargar 1 vehículo por cédula</div>
              <div className="text-xs text-zinc-500">OCR real — frente, dorso y datos del titular.</div>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-zinc-300" strokeWidth={2} />
          </Link>
          <Link href="/stock/csv" className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-violet-300 hover:shadow-md sm:p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white">
              <FileText className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="flex-1">
              <div className="text-sm font-semibold">Cargar stock por planilla</div>
              <div className="text-xs text-zinc-500">Subí un CSV y revisá la vista previa antes de confirmar.</div>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-zinc-300" strokeWidth={2} />
          </Link>
        </section>

        <section id="stock" className="scroll-mt-20 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Car className="h-4 w-4" strokeWidth={2} />
              </span>
              <h2 className="text-sm font-semibold">Stock actual</h2>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">{stock.length} vehículo(s)</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:ml-9 sm:grid-cols-2 md:grid-cols-3">
              {stock.map((v) => (
                <div key={v.dominio} className="overflow-hidden rounded-xl border border-zinc-200 transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="relative flex h-24 items-center justify-center gap-1.5 bg-zinc-50 text-xs text-zinc-400">
                    <Camera className="h-4 w-4" strokeWidth={1.75} /> (próximamente)
                    {v.documentacion_validada && (
                      <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} /> Papeles OK
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="font-mono text-[11px] text-zinc-400">{v.dominio}</div>
                    <div className="text-sm font-semibold">{v.marca} {v.modelo}</div>
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
              {stock.length === 0 && <p className="text-sm text-zinc-400">Todavía no hay vehículos cargados.</p>}
            </div>
          </div>
        </section>

        <section id="consultas" className="scroll-mt-20 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="p-4 sm:p-5">
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white">
                <MessageCircle className="h-4 w-4" strokeWidth={2} />
              </span>
              <h2 className="text-sm font-semibold">Consultas de compradores</h2>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">{leads.length} consulta(s)</span>
            </div>
            <p className="mb-3 text-sm text-zinc-500 sm:ml-9">
              Vienen del catálogo público (<Link href="/catalogo" className="text-blue-600 underline">/catalogo</Link>) — nunca se confirma nada solo, la agencia responde y cierra a mano.
            </p>
            <div className="space-y-2 sm:ml-9">
              {leads.map((l) => (
                <div key={l.id} className="rounded-lg border border-zinc-200 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <b>{l.vehiculo_titulo}</b> <span className="text-xs text-zinc-400">({l.dominio})</span>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${claseEstado[l.estado]}`}>{l.estado}</span>
                  </div>
                  <div className="mt-1 text-zinc-600">{l.nombre}{l.telefono ? ` · ${l.telefono}` : ""}: {l.mensaje}</div>
                  <div className="mt-1 text-[10px] text-zinc-400">{l.fecha}</div>
                  <div className="mt-2 flex gap-2">
                    {l.estado !== "respondido" && <button onClick={() => actualizarEstadoLead(l.id, "respondido")} className="rounded-md border border-zinc-200 px-2 py-1 text-[11px] hover:bg-zinc-50">Marcar respondido</button>}
                    {l.estado !== "cerrado" && <button onClick={() => actualizarEstadoLead(l.id, "cerrado")} className="rounded-md border border-zinc-200 px-2 py-1 text-[11px] hover:bg-zinc-50">Cerrar</button>}
                  </div>
                </div>
              ))}
              {leads.length === 0 && <p className="text-sm text-zinc-400">Todavía no llegaron consultas desde el catálogo.</p>}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
