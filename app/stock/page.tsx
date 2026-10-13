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

export default function StockPage() {
  const [stock, setStock] = useState<Vehiculo[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    fetch("/api/stock").then((r) => r.json()).then((d) => setStock(d.vehiculos || []));
    fetch("/api/leads").then((r) => r.json()).then((d) => setLeads(d.leads || []));
  }, []);

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
              <div className="text-xs text-zinc-500">CSV o Excel, con vista previa antes de confirmar.</div>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-zinc-300" strokeWidth={2} />
          </Link>
          <Link href="/stock/listado" className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md sm:p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Car className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="flex-1">
              <div className="text-sm font-semibold">Ver stock actual</div>
              <div className="text-xs text-zinc-500">{stock.length} vehículo(s) — vista de tabla o tarjetas.</div>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-zinc-300" strokeWidth={2} />
          </Link>
          <Link href="/stock/consultas" className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md sm:p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white">
              <MessageCircle className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="flex-1">
              <div className="text-sm font-semibold">Consultas de compradores</div>
              <div className="text-xs text-zinc-500">{pendientes} sin contestar · {leads.length} en total.</div>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-zinc-300" strokeWidth={2} />
          </Link>
        </section>
      </main>
    </>
  );
}
