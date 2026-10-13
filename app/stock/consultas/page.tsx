"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, MessageSquareReply, CheckCircle2 } from "lucide-react";

type Lead = { id: string; dominio: string; nombre: string; telefono: string | null; mensaje: string; fecha: string; estado: string; vehiculo_titulo: string };

const COLUMNAS: { estado: string; titulo: string; Icon: typeof Clock; color: string }[] = [
  { estado: "pendiente", titulo: "Sin contestar", Icon: Clock, color: "amber" },
  { estado: "respondido", titulo: "Atendidas", Icon: MessageSquareReply, color: "blue" },
  { estado: "cerrado", titulo: "Cerradas", Icon: CheckCircle2, color: "emerald" },
];

const COLOR_CLASSES: Record<string, { chip: string; badge: string }> = {
  amber: { chip: "bg-amber-600", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  blue: { chip: "bg-blue-600", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  emerald: { chip: "bg-emerald-600", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export default function ConsultasPage() {
  const [leads, setLeads] = useState<Lead[]>([]);

  async function cargarLeads() {
    const res = await fetch("/api/leads");
    const data = await res.json();
    setLeads(data.leads || []);
  }
  useEffect(() => { cargarLeads(); }, []);

  async function actualizarEstadoLead(id: string, estado: string) {
    await fetch(`/api/leads/${encodeURIComponent(id)}/estado`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    cargarLeads();
  }

  const pendientes = leads.filter((l) => l.estado === "pendiente").length;

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 pl-12 lg:pl-0">
          <Link href="/stock" className="text-sm text-zinc-400 hover:text-zinc-700">Panel</Link>
          <span className="text-zinc-300">/</span>
          <h1 className="text-base font-semibold tracking-tight">Consultas de compradores</h1>
          {pendientes > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">{pendientes} sin contestar</span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <p className="mb-5 text-sm text-zinc-500">
          Vienen del catálogo público (<Link href="/catalogo" className="text-blue-600 underline">/catalogo</Link>) — nunca se confirma nada solo, la agencia responde y cierra a mano.
        </p>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {COLUMNAS.map((col) => {
            const items = leads.filter((l) => l.estado === col.estado);
            const c = COLOR_CLASSES[col.color];
            return (
              <div key={col.estado} className="rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className={`flex items-center gap-2 rounded-t-xl ${c.chip} px-4 py-3 text-white`}>
                  <col.Icon className="h-4 w-4" strokeWidth={2} />
                  <span className="text-sm font-semibold">{col.titulo}</span>
                  <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">{items.length}</span>
                </div>
                <div className="space-y-2 p-3">
                  {items.map((l) => (
                    <div key={l.id} className={`rounded-lg border p-3 text-sm ${c.badge}`}>
                      <div className="font-semibold text-zinc-900">{l.vehiculo_titulo} <span className="font-normal text-zinc-400">({l.dominio})</span></div>
                      <div className="mt-1 text-zinc-700">{l.nombre}{l.telefono ? ` · ${l.telefono}` : ""}</div>
                      <div className="mt-0.5 text-zinc-600">{l.mensaje}</div>
                      <div className="mt-1 text-[10px] text-zinc-400">{l.fecha}</div>
                      <div className="mt-2 flex gap-2">
                        {col.estado !== "respondido" && <button onClick={() => actualizarEstadoLead(l.id, "respondido")} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50">Marcar respondido</button>}
                        {col.estado !== "cerrado" && <button onClick={() => actualizarEstadoLead(l.id, "cerrado")} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50">Cerrar</button>}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <p className="p-2 text-xs text-zinc-400">Nada acá.</p>}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
