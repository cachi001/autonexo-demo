"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Camera, FileText, Car, MessageCircle, ArrowRight, AlertTriangle,
} from "lucide-react";
import { humanizarError } from "@/lib/errores";

type Vehiculo = {
  dominio: string; marca: string; modelo: string; anio: string; tipo: string;
  precio: string; km: string; color: string; descripcion: string;
  documentacion_validada: boolean; documentacion_validada_fecha: string | null;
  vistas_reales: number; consultas_reales: number;
};
type Lead = { id: string; dominio: string; nombre: string; telefono: string | null; mensaje: string; fecha: string; estado: string; vehiculo_titulo: string };
type PublicacionError = { dominio: string; canal: string; marca: string; modelo: string; error_msg: string };

export default function StockPage() {
  const [stock, setStock] = useState<Vehiculo[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [erroresPublicacion, setErroresPublicacion] = useState<PublicacionError[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/stock").then((r) => r.json()).then((d) => setStock(d.vehiculos || [])).finally(() => setCargando(false));
    fetch("/api/leads").then((r) => r.json()).then((d) => setLeads(d.leads || []));
    fetch("/api/publicaciones/errores").then((r) => r.json()).then((d) => setErroresPublicacion(d.errores || []));
  }, []);

  const totalVistas = stock.reduce((acc, v) => acc + (v.vistas_reales || 0), 0);
  const pendientes = leads.filter((l) => l.estado === "pendiente").length;
  const validados = stock.filter((v) => v.documentacion_validada).length;

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="">
          <h1 className="text-base font-semibold tracking-tight">Panel de agencia</h1>
          <p className="hidden text-xs text-zinc-500 sm:block">Resumen general del stock, validación de papeles y consultas de compradores.</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 lg:px-8">
        {erroresPublicacion.length > 0 && (
          <Link
            href="/stock/canales-externos"
            className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 transition hover:border-red-300"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" strokeWidth={2} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-red-800">
                {erroresPublicacion.length === 1
                  ? "1 publicación necesita tu atención"
                  : `${erroresPublicacion.length} publicaciones necesitan tu atención`}
              </div>
              <div className="truncate text-xs text-red-600">
                {erroresPublicacion[0].marca} {erroresPublicacion[0].modelo} — {humanizarError(erroresPublicacion[0].error_msg).mensaje}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-red-400" strokeWidth={2} />
          </Link>
        )}

        {/* Antes: 4 tarjetas blancas con ícono + borde de color a la
            izquierda -el "stat card" por defecto de cualquier dashboard
            generado por IA, sin relación con lo que hace esta agencia en el
            día a día. En su lugar: una ficha de resumen con la misma lógica
            visual que un informe de dominio o una planilla de stock real
            -una sola franja con separadores finos (no cuatro cajas con
            sombra), números en tipografía monoespaciada tabular (así se ven
            los datos en un registro/informe, no en un panel de SaaS
            genérico), con un punto de color en vez de un ícono para
            mantener la referencia visual rápida sin el cliché del "icon
            chip". */}
        <section className="grid grid-cols-2 divide-x divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white sm:grid-cols-4 sm:divide-y-0">
          {[
            { label: "En stock", valor: stock.length, punto: "bg-blue-500" },
            { label: "Vistas totales", valor: totalVistas, punto: "bg-violet-500" },
            { label: "Consultas pendientes", valor: pendientes, punto: "bg-amber-500" },
            { label: "Papeles validados", valor: `${validados}/${stock.length}`, punto: "bg-emerald-500" },
          ].map((m) => (
            <div key={m.label} className="p-4 sm:p-5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                <span className={`h-1.5 w-1.5 rounded-full ${m.punto}`} />
                {m.label}
              </div>
              <div className="mt-1.5 font-mono text-3xl font-bold tabular-nums text-zinc-900">
                {cargando ? <span className="inline-block h-8 w-12 animate-pulse rounded bg-zinc-100 align-middle" /> : m.valor}
              </div>
            </div>
          ))}
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
