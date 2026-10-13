"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Vehiculo = {
  dominio: string; marca: string; modelo: string; anio: string; tipo: string;
  precio: string; km: string; color: string; descripcion: string;
  documentacion_validada: boolean; documentacion_validada_fecha: string | null;
  vistas_reales: number; consultas_reales: number;
};
type FilaValidada = { numero_fila: number; datos: Record<string, string>; errores: string[]; valida: boolean };
type Lead = { id: string; dominio: string; nombre: string; telefono: string | null; mensaje: string; fecha: string; estado: string; vehiculo_titulo: string };

const CAMPO_LABELS: Record<string, string> = {
  dominio: "Dominio", marca: "Marca", modelo: "Modelo", anio: "Año",
  tipo: "Tipo", precio: "Precio", km: "Km", color: "Color",
};

const NAV = [
  { href: "#resumen", icon: "📊", label: "Resumen" },
  { href: "#cedula", icon: "📷", label: "Cargar por cédula" },
  { href: "#csv", icon: "📄", label: "Cargar por planilla" },
  { href: "#stock", icon: "🚗", label: "Stock" },
  { href: "#consultas", icon: "💬", label: "Consultas" },
];

function formatoPrecio(p: string) {
  const n = parseFloat(p);
  return isNaN(n) ? p : "$" + n.toLocaleString("es-AR");
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-white/10 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-bold text-blue-700">A</div>
        <div>
          <div className="text-sm font-bold tracking-tight text-white">Autos<span className="text-sky-300">click</span></div>
          <div className="text-[10px] text-blue-200">Panel de agencia</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => (
          <a key={item.href} href={item.href} onClick={onNavigate} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-blue-100 transition hover:bg-white/10 hover:text-white">
            <span className="text-base">{item.icon}</span>{item.label}
          </a>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link href="/catalogo" className="flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/20">
          🛒 Ver como comprador
        </Link>
      </div>
    </>
  );
}

export default function StockPage() {
  const [stock, setStock] = useState<Vehiculo[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [cedulaStatus, setCedulaStatus] = useState("");
  const [formCedula, setFormCedula] = useState<Record<string, string> | null>(null);
  const [chasisDetectado, setChasisDetectado] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<{ filas: FilaValidada[]; total: number; validas: number; con_error: number } | null>(null);
  const [csvStatus, setCsvStatus] = useState("");
  const [menuAbierto, setMenuAbierto] = useState(false);

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

  async function procesarCedula() {
    setCedulaStatus("Procesando foto...");
    setFormCedula(null);
    const res = await fetch("/api/stock/cargar-por-cedula", { method: "POST" });
    const data = await res.json();
    setCedulaStatus("");
    setFormCedula(data.fila.datos);
    setChasisDetectado(data.chasis_detectado);
  }

  async function confirmarVehiculoCedula() {
    if (!formCedula) return;
    const obligatorios = ["dominio", "marca", "modelo", "anio", "precio"];
    const faltan = obligatorios.filter((c) => !formCedula[c]);
    if (faltan.length) { setCedulaStatus(`Faltan campos: ${faltan.join(", ")}`); return; }
    setCedulaStatus("Guardando...");
    const res = await fetch("/api/stock/confirmar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filas: [{ numero_fila: 1, datos: formCedula, errores: [], valida: true }] }),
    });
    const data = await res.json();
    setCedulaStatus(`${data.cantidad} vehículo(s) agregado(s).`);
    setFormCedula(null);
    cargarStock();
  }

  async function subirCsv(file: File) {
    setCsvStatus("Validando filas...");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/stock/validar", { method: "POST", body: fd });
    const data = await res.json();
    if (data.error) { setCsvStatus("Error: " + data.error); return; }
    setCsvPreview(data);
    setCsvStatus("");
  }

  async function confirmarCsv() {
    if (!csvPreview) return;
    setCsvStatus("Guardando...");
    const res = await fetch("/api/stock/confirmar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filas: csvPreview.filas }),
    });
    const data = await res.json();
    setCsvStatus(`${data.cantidad} vehículo(s) agregado(s) al stock.`);
    setCsvPreview(null);
    cargarStock();
  }

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
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-violet-50/40 text-zinc-900">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-gradient-to-b from-blue-700 to-indigo-800 lg:flex">
        <SidebarContent />
      </aside>

      {/* Sidebar — mobile drawer */}
      {menuAbierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuAbierto(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-gradient-to-b from-blue-700 to-indigo-800 shadow-2xl">
            <SidebarContent onNavigate={() => setMenuAbierto(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setMenuAbierto(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-lg lg:hidden" aria-label="Abrir menú">
                ☰
              </button>
              <div>
                <h1 className="text-base font-semibold tracking-tight">Panel de agencia</h1>
                <p className="hidden text-xs text-zinc-500 sm:block">Carga de stock, validación de papeles y consultas de compradores.</p>
              </div>
            </div>
            <Link href="/catalogo" className="shrink-0 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 lg:hidden">
              Ver catálogo →
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 lg:px-8">
          {/* Stat cards */}
          <section id="resumen" className="grid scroll-mt-20 grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 p-4 text-white shadow-lg shadow-blue-200">
              <span className="absolute -right-2 -top-2 text-5xl opacity-20">🚗</span>
              <div className="relative text-[11px] font-medium uppercase tracking-wide text-blue-100">En stock</div>
              <div className="relative mt-1 text-3xl font-bold">{stock.length}</div>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 p-4 text-white shadow-lg shadow-violet-200">
              <span className="absolute -right-2 -top-2 text-5xl opacity-20">👁</span>
              <div className="relative text-[11px] font-medium uppercase tracking-wide text-violet-100">Vistas totales</div>
              <div className="relative mt-1 text-3xl font-bold">{totalVistas}</div>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-4 text-white shadow-lg shadow-amber-200">
              <span className="absolute -right-2 -top-2 text-5xl opacity-20">💬</span>
              <div className="relative text-[11px] font-medium uppercase tracking-wide text-amber-100">Consultas pendientes</div>
              <div className="relative mt-1 text-3xl font-bold">{pendientes}</div>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-lg shadow-emerald-200">
              <span className="absolute -right-2 -top-2 text-5xl opacity-20">✓</span>
              <div className="relative text-[11px] font-medium uppercase tracking-wide text-emerald-100">Papeles validados</div>
              <div className="relative mt-1 text-3xl font-bold">{validados}/{stock.length}</div>
            </div>
          </section>

          <section id="cedula" className="scroll-mt-20 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="p-4 sm:p-5">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-sm shadow-sm shadow-blue-200">📷</span>
                <h2 className="text-sm font-semibold">Cargar 1 vehículo por foto de cédula</h2>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">simulado en esta demo</span>
              </div>
              <p className="mb-3 text-sm text-zinc-500 sm:ml-9">
                En el prototipo local corre PaddleOCR de verdad contra la foto. Acá, como Vercel no puede correr ese modelo, se reproduce un resultado real ya obtenido antes — el formato de los campos es el mismo.
              </p>
              <div className="flex flex-wrap items-center gap-3 sm:ml-9">
                <button onClick={procesarCedula} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-200 hover:bg-blue-700">
                  Simular foto de cédula
                </button>
                <span className="text-sm text-zinc-500">{cedulaStatus}</span>
              </div>
              {formCedula && (
                <div className="mt-4 rounded-lg bg-blue-50/60 p-4 sm:ml-9">
                  <p className="mb-3 text-sm text-zinc-600">
                    Leído de la cédula — revisá y completá lo que falte. Chasis detectado: <code className="rounded bg-blue-100 px-1">{chasisDetectado}</code>
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {["dominio", "marca", "modelo", "anio", "tipo", "precio", "km", "color"].map((campo) => (
                      <label key={campo} className="text-xs font-semibold text-zinc-600">
                        {CAMPO_LABELS[campo] || campo}
                        <input
                          value={formCedula[campo] || ""}
                          onChange={(e) => setFormCedula({ ...formCedula, [campo]: e.target.value })}
                          className="mt-1 block w-32 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 sm:w-36"
                        />
                      </label>
                    ))}
                  </div>
                  <button onClick={confirmarVehiculoCedula} className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
                    Agregar este vehículo al stock
                  </button>
                </div>
              )}
            </div>
          </section>

          <section id="csv" className="scroll-mt-20 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="p-4 sm:p-5">
              <div className="mb-1 flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 text-sm shadow-sm shadow-violet-200">📄</span>
                <h2 className="text-sm font-semibold">Cargar stock por planilla (CSV)</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:ml-9">
                <label className="cursor-pointer rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100">
                  Elegir archivo CSV
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && subirCsv(e.target.files[0])} />
                </label>
                <span className="text-sm text-zinc-500">{csvStatus}</span>
              </div>
              <p className="mt-2 text-xs text-zinc-400 sm:ml-9">Columnas: dominio,marca,modelo,anio,tipo,precio,km,color,descripcion</p>
              {csvPreview && (
                <div className="mt-4 sm:ml-9">
                  <div className="mb-3 flex gap-6 text-sm">
                    <div><b className="block text-xl">{csvPreview.total}</b>filas leídas</div>
                    <div><b className="block text-xl text-emerald-600">{csvPreview.validas}</b>listas</div>
                    <div><b className="block text-xl text-red-600">{csvPreview.con_error}</b>con error</div>
                  </div>
                  <div className="max-h-56 overflow-auto rounded-lg border border-zinc-200">
                    <table className="w-full text-xs">
                      <thead className="bg-zinc-50 text-zinc-500"><tr><th className="p-2 text-left">Fila</th><th className="p-2 text-left">Dominio</th><th className="p-2 text-left">Marca</th><th className="p-2 text-left">Estado</th></tr></thead>
                      <tbody>
                        {csvPreview.filas.map((f) => (
                          <tr key={f.numero_fila} className={f.valida ? "" : "bg-red-50"}>
                            <td className="p-2">{f.numero_fila}</td>
                            <td className="p-2">{f.datos.dominio || "—"}</td>
                            <td className="p-2">{f.datos.marca || "—"}</td>
                            <td className="p-2">{f.valida ? <span className="text-emerald-600">✓ lista</span> : <span className="text-red-600">✗ {f.errores.join("; ")}</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button onClick={confirmarCsv} className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
                    Confirmar carga de las filas válidas
                  </button>
                </div>
              )}
            </div>
          </section>

          <section id="stock" className="scroll-mt-20 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-sm shadow-sm shadow-emerald-200">🚗</span>
                <h2 className="text-sm font-semibold">Stock actual</h2>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">{stock.length} vehículo(s)</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:ml-9 sm:grid-cols-2 md:grid-cols-3">
                {stock.map((v) => (
                  <div key={v.dominio} className="overflow-hidden rounded-xl border border-zinc-200 transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="relative flex h-24 items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 text-xs text-zinc-400">
                      📷 (próximamente)
                      {v.documentacion_validada && (
                        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          ✓ Papeles OK
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="font-mono text-[11px] text-zinc-400">{v.dominio}</div>
                      <div className="text-sm font-semibold">{v.marca} {v.modelo}</div>
                      <div className="text-sm font-bold text-emerald-700">{formatoPrecio(v.precio)}</div>
                      <div className="mt-1 text-[10px] text-zinc-500">👁 {v.vistas_reales} vistas · 💬 {v.consultas_reales} consultas</div>
                      <button
                        onClick={() => toggleDocumentacion(v.dominio, !v.documentacion_validada)}
                        className={`mt-2 w-full rounded-md border px-2 py-1.5 text-[11px] ${v.documentacion_validada ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"}`}
                      >
                        {v.documentacion_validada ? "✓ Papeles validados — quitar" : "Marcar papeles como validados"}
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
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-sm shadow-sm shadow-amber-200">💬</span>
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
      </div>
    </div>
  );
}
