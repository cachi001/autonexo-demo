"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, LayoutGrid, Table2, Eye, MessageCircle } from "lucide-react";
import CanalLogo from "@/components/CanalLogo";
import type { Canal } from "@/lib/data";

type Vehiculo = {
  dominio: string; marca: string; modelo: string; anio: string; tipo: string;
  precio: string; km: string; color: string; descripcion: string;
  documentacion_validada: boolean; documentacion_validada_fecha: string | null;
  vistas_reales: number; consultas_reales: number; fotos: string[];
};
type Publicacion = { dominio: string; canal: Canal; estado: string };

function formatoPrecio(p: string) {
  const n = parseFloat(p);
  return isNaN(n) ? p : "$" + n.toLocaleString("es-AR");
}

export default function StockListadoPage() {
  const router = useRouter();
  const [stock, setStock] = useState<Vehiculo[]>([]);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [vista, setVista] = useState<"tabla" | "cards">("tabla");
  const [filtro, setFiltro] = useState("");
  // Mismo problema que /catalogo: sin esto, apenas se entra a la página se
  // ve "Sin resultados" mientras /api/stock todavía está trayendo las fotos
  // en base64 (puede tardar varios segundos), antes de saber si hay stock o no.
  const [cargando, setCargando] = useState(true);

  async function cargarStock() {
    const res = await fetch("/api/stock");
    const data = await res.json();
    setStock(data.vehiculos || []);
    setCargando(false);
  }
  useEffect(() => {
    cargarStock();
    fetch("/api/publicaciones").then((r) => r.json()).then((d) => setPublicaciones(d.publicaciones || []));
  }, []);

  // El logo se muestra para cualquier intento real con el canal (publicado,
  // en revisión o pausado), no solo "publicado" -la agencia necesita ver que
  // el vehículo tiene una conexión con Mercado Libre aunque todavía no sea
  // visible al público. El estado exacto (y si de verdad está a la vista de
  // un comprador) se ve en detalle en Canales externos, acá es solo un
  // indicador de que existe algo.
  function canalesConIntento(dominio: string): { canal: Canal; publicado: boolean }[] {
    return publicaciones
      .filter((p) => p.dominio === dominio && ["publicado", "en_revision", "pausado"].includes(p.estado))
      .map((p) => ({ canal: p.canal, publicado: p.estado === "publicado" }));
  }

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
          <span className="ml-3 shrink-0 text-xs text-zinc-400">
            {cargando ? "Cargando…" : `${filtrado.length} de ${stock.length} vehículo(s)`}
          </span>
        </div>

        {vista === "tabla" ? (
          <div className="overflow-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              {/* Antes el encabezado tenía la misma altura visual que una
                  fila de datos y el mismo gris apagado -no se distinguía de
                  un renglón más. Ahora es notoriamente más alto, con texto
                  negro en negrita y un fondo más oscuro que el resto de la
                  tabla, para que se lea de entrada como encabezado. */}
              <thead className="bg-zinc-100 text-xs font-bold uppercase tracking-wide text-zinc-900">
                <tr>
                  <th className="h-14 p-3 text-left">Dominio</th>
                  <th className="h-14 p-3 text-left">Marca / Modelo</th>
                  <th className="h-14 p-3 text-left">Año</th>
                  <th className="h-14 p-3 text-left">Precio</th>
                  <th className="h-14 p-3 text-left">Km</th>
                  <th className="h-14 p-3 text-left">Color</th>
                  <th className="h-14 p-3 text-left">Vistas</th>
                  <th className="h-14 p-3 text-left">Consultas</th>
                  <th className="h-14 p-3 text-left">Canales</th>
                  <th className="h-14 p-3 text-left">Papeles</th>
                </tr>
              </thead>
              <tbody>
                {filtrado.map((v) => (
                  // Toda la fila navega al detalle -antes solo el texto de
                  // dominio y marca/modelo eran clickeables, el resto de la
                  // fila (precio, km, color, vistas...) no reaccionaba a
                  // nada, aunque parecía una fila de una tabla de gestión
                  // normal. El botón de "Validar" frena la navegación con
                  // stopPropagation, porque tiene su propia acción.
                  <tr
                    key={v.dominio}
                    onClick={() => router.push(`/stock/listado/${encodeURIComponent(v.dominio)}`)}
                    className="cursor-pointer border-t border-zinc-100 transition hover:bg-blue-50/60"
                  >
                    <td className="p-3 font-mono text-xs text-blue-600">{v.dominio}</td>
                    <td className="p-3 font-medium">{v.marca} {v.modelo}</td>
                    <td className="p-3">{v.anio || "—"}</td>
                    <td className="p-3 font-semibold text-emerald-700">{formatoPrecio(v.precio)}</td>
                    <td className="p-3">{v.km || "—"}</td>
                    <td className="p-3">{v.color || "—"}</td>
                    <td className="p-3">{v.vistas_reales}</td>
                    <td className="p-3">{v.consultas_reales}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {canalesConIntento(v.dominio).map(({ canal, publicado }) => (
                          <span key={canal} className={publicado ? "" : "opacity-40"}>
                            <CanalLogo canal={canal} size={16} />
                          </span>
                        ))}
                        {canalesConIntento(v.dominio).length === 0 && <span className="text-xs text-zinc-300">—</span>}
                      </div>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleDocumentacion(v.dominio, !v.documentacion_validada); }}
                        className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] ${v.documentacion_validada ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"}`}
                      >
                        {v.documentacion_validada && <CheckCircle2 className="h-3 w-3" strokeWidth={2} />}
                        {v.documentacion_validada ? "Validado" : "Validar"}
                      </button>
                    </td>
                  </tr>
                ))}
                {cargando && (
                  <tr><td colSpan={10} className="p-6 text-center text-sm text-zinc-400">Cargando stock…</td></tr>
                )}
                {!cargando && filtrado.length === 0 && (
                  <tr><td colSpan={10} className="p-6 text-center text-sm text-zinc-400">Sin resultados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {filtrado.map((v) => (
              <div key={v.dominio} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                {/* Bug real: esta vista siempre mostraba el placeholder
                    "(próximamente)" aunque el vehículo ya tuviera fotos
                    cargadas -nunca leía v.fotos. */}
                <div className="relative flex h-28 items-center justify-center gap-1.5 bg-zinc-50 text-xs text-zinc-400">
                  {v.fotos && v.fotos.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.fotos[0]} alt={`${v.marca} ${v.modelo}`} className="h-full w-full object-cover" />
                  ) : (
                    <><Camera className="h-4 w-4" strokeWidth={1.75} /> Sin fotos</>
                  )}
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
                  {canalesConIntento(v.dominio).length > 0 && (
                    <div className="mt-1.5 flex items-center gap-1">
                      {canalesConIntento(v.dominio).map(({ canal, publicado }) => (
                        <span key={canal} className={publicado ? "" : "opacity-40"}>
                          <CanalLogo canal={canal} size={16} />
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => toggleDocumentacion(v.dominio, !v.documentacion_validada)}
                    className={`mt-2 flex w-full items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-[11px] ${v.documentacion_validada ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"}`}
                  >
                    {v.documentacion_validada ? (<><CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} /> Papeles validados — quitar</>) : "Marcar papeles como validados"}
                  </button>
                </div>
              </div>
            ))}
            {cargando && <p className="text-sm text-zinc-400">Cargando stock…</p>}
            {!cargando && filtrado.length === 0 && <p className="text-sm text-zinc-400">Sin resultados.</p>}
          </div>
        )}
      </main>
    </>
  );
}
