"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, Download, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type FilaValidada = { numero_fila: number; datos: Record<string, string>; errores: string[]; valida: boolean };

const COLUMNAS = ["Dominio", "Marca", "Modelo", "Año", "Tipo", "Precio", "Km", "Color", "Descripción"];

export default function CargarPorCsvPage() {
  const router = useRouter();
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [csvStatus, setCsvStatus] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [preview, setPreview] = useState<{ filas: FilaValidada[]; total: number; validas: number; con_error: number } | null>(null);

  async function subirCsv(file: File) {
    setNombreArchivo(file.name);
    setCargando(true);
    setCsvStatus("");
    setPreview(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/stock/validar", { method: "POST", body: fd });
    const data = await res.json();
    setCargando(false);
    if (data.error) { setCsvStatus("Error: " + data.error); return; }
    setPreview(data);
  }

  async function confirmar() {
    if (!preview) return;
    setGuardando(true);
    const res = await fetch("/api/stock/confirmar", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filas: preview.filas }),
    });
    const data = await res.json();
    setGuardando(false);
    if (!data.cantidad) { setCsvStatus("No se pudo guardar."); return; }
    router.push("/stock/listado");
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/stock" className="text-sm text-zinc-400 hover:text-zinc-700">Panel</Link>
          <span className="text-zinc-300">/</span>
          <h1 className="text-base font-semibold tracking-tight">Cargar stock por planilla (CSV o Excel)</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold">Subí la planilla (.csv, .xlsx o .xls)</h2>
          <p className="mt-1 text-sm text-zinc-500">Columnas esperadas: {COLUMNAS.join(", ")}. Las obligatorias son dominio, marca, modelo, año y precio.</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 hover:bg-violet-100">
              <Upload className="h-4 w-4" strokeWidth={2} /> Elegir archivo (CSV o Excel)
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && subirCsv(e.target.files[0])} />
            </label>
            <a href="/api/stock/plantilla.xlsx" className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-700">
              <Download className="h-4 w-4" strokeWidth={2} /> Descargar plantilla de ejemplo (Excel)
            </a>
          </div>
          {nombreArchivo && <div className="mt-2 text-xs text-zinc-400">{nombreArchivo}</div>}
          {cargando && (
            <div className="mt-3 flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> Validando filas...
            </div>
          )}
          {csvStatus && <div className="mt-3 text-sm text-red-600">{csvStatus}</div>}
        </div>

        {preview && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-wrap gap-6">
              <div><b className="block text-2xl">{preview.total}</b><span className="text-xs text-zinc-500">filas leídas</span></div>
              <div><b className="block text-2xl text-emerald-600">{preview.validas}</b><span className="text-xs text-zinc-500">listas para cargar</span></div>
              <div><b className="block text-2xl text-red-600">{preview.con_error}</b><span className="text-xs text-zinc-500">con error</span></div>
            </div>

            <div className="overflow-auto rounded-lg border border-zinc-200">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="p-2.5 text-left">Fila</th>
                    <th className="p-2.5 text-left">Dominio</th>
                    <th className="p-2.5 text-left">Marca</th>
                    <th className="p-2.5 text-left">Modelo</th>
                    <th className="p-2.5 text-left">Año</th>
                    <th className="p-2.5 text-left">Precio</th>
                    <th className="p-2.5 text-left">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.filas.map((f) => (
                    <tr key={f.numero_fila} className={`border-t border-zinc-100 ${f.valida ? "" : "bg-red-50"}`}>
                      <td className="p-2.5 text-zinc-400">{f.numero_fila}</td>
                      <td className="p-2.5 font-mono text-xs">{f.datos.dominio || "—"}</td>
                      <td className="p-2.5">{f.datos.marca || "—"}</td>
                      <td className="p-2.5">{f.datos.modelo || "—"}</td>
                      <td className="p-2.5">{f.datos.anio || "—"}</td>
                      <td className="p-2.5">{f.datos.precio || "—"}</td>
                      <td className="p-2.5">
                        {f.valida ? (
                          <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} /> lista</span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600" title={f.errores.join("; ")}><XCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /> {f.errores.join("; ")}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={confirmar}
                disabled={preview.validas === 0 || guardando}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {guardando && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
                Confirmar carga de las {preview.validas} fila(s) válida(s)
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
