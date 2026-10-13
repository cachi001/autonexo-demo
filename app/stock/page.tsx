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

function formatoPrecio(p: string) {
  const n = parseFloat(p);
  return isNaN(n) ? p : "$" + n.toLocaleString("es-AR");
}

export default function StockPage() {
  const [stock, setStock] = useState<Vehiculo[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [cedulaStatus, setCedulaStatus] = useState("");
  const [formCedula, setFormCedula] = useState<Record<string, string> | null>(null);
  const [chasisDetectado, setChasisDetectado] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<{ filas: FilaValidada[]; total: number; validas: number; con_error: number } | null>(null);
  const [csvStatus, setCsvStatus] = useState("");

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
    cerrado: "bg-green-50 text-green-700 border-green-200",
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 px-8 py-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Panel de agencia — Prototipo</h1>
          <p className="max-w-xl text-sm text-zinc-500">
            Carga por cédula (simulada, ver nota), carga masiva, stock, y las consultas reales de compradores.
          </p>
        </div>
        <Link href="/catalogo" className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50">
          Ver como comprador →
        </Link>
      </header>

      <main className="mx-auto grid max-w-4xl gap-5 px-8 py-8">
        <section className="rounded-lg border border-zinc-200 p-5">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            1. Cargar 1 vehículo por foto de cédula <span className="ml-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-normal normal-case text-zinc-500">simulado en esta demo</span>
          </h2>
          <p className="mb-3 text-sm text-zinc-500">
            En el prototipo local corre PaddleOCR de verdad contra la foto. Acá, como Vercel no puede correr ese modelo, se reproduce un resultado real ya obtenido antes — el formato de los campos es el mismo.
          </p>
          <div className="flex items-center gap-3">
            <button onClick={procesarCedula} className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              📷 Simular foto de cédula
            </button>
            <span className="text-sm text-zinc-500">{cedulaStatus}</span>
          </div>
          {formCedula && (
            <div className="mt-4 rounded-md bg-zinc-50 p-4">
              <p className="mb-3 text-sm text-zinc-600">
                Leído de la cédula — revisá y completá lo que falte. Chasis detectado: <code className="rounded bg-zinc-200 px-1">{chasisDetectado}</code>
              </p>
              <div className="flex flex-wrap gap-3">
                {["dominio", "marca", "modelo", "anio", "tipo", "precio", "km", "color"].map((campo) => (
                  <label key={campo} className="text-xs font-semibold text-zinc-600">
                    {CAMPO_LABELS[campo] || campo}
                    <input
                      value={formCedula[campo] || ""}
                      onChange={(e) => setFormCedula({ ...formCedula, [campo]: e.target.value })}
                      className="mt-1 block w-36 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                ))}
              </div>
              <button onClick={confirmarVehiculoCedula} className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                Agregar este vehículo al stock
              </button>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-zinc-200 p-5">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">2. Cargar stock por planilla (CSV)</h2>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50">
              Elegir archivo CSV
              <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && subirCsv(e.target.files[0])} />
            </label>
            <span className="text-sm text-zinc-500">{csvStatus}</span>
          </div>
          <p className="mt-2 text-xs text-zinc-400">Columnas: dominio,marca,modelo,anio,tipo,precio,km,color,descripcion</p>
          {csvPreview && (
            <div className="mt-4">
              <div className="mb-3 flex gap-6 text-sm">
                <div><b className="block text-xl">{csvPreview.total}</b>filas leídas</div>
                <div><b className="block text-xl text-green-600">{csvPreview.validas}</b>listas</div>
                <div><b className="block text-xl text-red-600">{csvPreview.con_error}</b>con error</div>
              </div>
              <div className="max-h-56 overflow-auto rounded-md border border-zinc-200">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-50 text-zinc-500"><tr><th className="p-2 text-left">Fila</th><th className="p-2 text-left">Dominio</th><th className="p-2 text-left">Marca</th><th className="p-2 text-left">Estado</th></tr></thead>
                  <tbody>
                    {csvPreview.filas.map((f) => (
                      <tr key={f.numero_fila} className={f.valida ? "" : "bg-red-50"}>
                        <td className="p-2">{f.numero_fila}</td>
                        <td className="p-2">{f.datos.dominio || "—"}</td>
                        <td className="p-2">{f.datos.marca || "—"}</td>
                        <td className="p-2">{f.valida ? <span className="text-green-600">✓ lista</span> : <span className="text-red-600">✗ {f.errores.join("; ")}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={confirmarCsv} className="mt-3 rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                Confirmar carga de las filas válidas
              </button>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-zinc-200 p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            3. Stock actual <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-normal normal-case">{stock.length} vehículo(s)</span>
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {stock.map((v) => (
              <div key={v.dominio} className="overflow-hidden rounded-lg border border-zinc-200">
                <div className="relative flex h-24 items-center justify-center bg-zinc-50 text-xs text-zinc-400">
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
                  <div className="text-sm font-bold">{formatoPrecio(v.precio)}</div>
                  <div className="mt-1 text-[10px] text-zinc-500">👁 {v.vistas_reales} vistas · 💬 {v.consultas_reales} consultas</div>
                  <button
                    onClick={() => toggleDocumentacion(v.dominio, !v.documentacion_validada)}
                    className={`mt-2 w-full rounded-md border px-2 py-1.5 text-[11px] ${v.documentacion_validada ? "border-green-200 bg-green-50 text-green-700" : "border-zinc-200 text-zinc-500 hover:bg-zinc-50"}`}
                  >
                    {v.documentacion_validada ? "✓ Papeles validados — quitar" : "Marcar papeles como validados"}
                  </button>
                </div>
              </div>
            ))}
            {stock.length === 0 && <p className="text-sm text-zinc-400">Todavía no hay vehículos cargados.</p>}
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 p-5">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            4. Consultas de compradores <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-normal normal-case">{leads.length} consulta(s)</span>
          </h2>
          <p className="mb-3 text-sm text-zinc-500">
            Vienen del catálogo público (<Link href="/catalogo" className="text-blue-600 underline">/catalogo</Link>) — nunca se confirma nada solo, la agencia responde y cierra a mano.
          </p>
          <div className="space-y-2">
            {leads.map((l) => (
              <div key={l.id} className="rounded-md border border-zinc-200 p-3 text-sm">
                <div className="flex items-center justify-between">
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
        </section>
      </main>
    </div>
  );
}
