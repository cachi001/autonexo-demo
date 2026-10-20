"use client";

import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import type { Canal } from "@/lib/data";

// Antes, en Canales externos, tocar "Publicar" o "Reintentar" publicaba
// directo en la Página/cuenta real de la agencia, sin que nadie viera qué
// texto o qué foto se iba a usar. Este modal es la misma revisión que ya
// existía en la ficha del vehículo, ahora reusable desde cualquier lugar.
type VehiculoResumen = { marca: string; modelo: string; anio: string; precio: string; descripcion: string; fotos: string[] };

type Props = {
  canal: Canal;
  vehiculo: VehiculoResumen;
  cargando: boolean;
  onConfirmar: (payload: { titulo?: string; descripcion?: string; mensaje?: string; fotoIndice?: number }) => void;
  onCancelar: () => void;
};

const NOMBRE_CANAL: Record<Canal, string> = { mercadolibre: "Mercado Libre", facebook: "Facebook", instagram: "Instagram" };

function formatoPrecio(p: string) {
  const n = parseFloat(p);
  return isNaN(n) ? p : "$" + n.toLocaleString("es-AR");
}

export default function PublicarCanalModal({ canal, vehiculo, cargando, onConfirmar, onCancelar }: Props) {
  const esMl = canal === "mercadolibre";
  const [titulo, setTitulo] = useState(() => `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio}`.slice(0, 60));
  const [descripcion, setDescripcion] = useState(vehiculo.descripcion || "");
  const [mensaje, setMensaje] = useState(
    () => `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio} — ${formatoPrecio(vehiculo.precio)}\n\n${vehiculo.descripcion}`
  );
  const [fotoIndice, setFotoIndice] = useState(0);

  const fotoPreview = vehiculo.fotos[esMl ? 0 : fotoIndice];
  const sinFotos = vehiculo.fotos.length === 0;
  const deshabilitado = cargando || sinFotos || (esMl ? !titulo.trim() : !mensaje.trim());

  function confirmar() {
    if (esMl) onConfirmar({ titulo, descripcion });
    else onConfirmar({ mensaje, fotoIndice });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancelar}>
      <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-sm font-semibold text-zinc-900">Editar antes de publicar en {NOMBRE_CANAL[canal]}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            {esMl ? (
              <>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Título (máx. 60 caracteres)</label>
                  <input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value.slice(0, 60))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <div className="mt-0.5 text-right text-[11px] text-zinc-400">{titulo.length}/60</div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Descripción</label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={5}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Texto de la publicación</label>
                  <textarea
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    rows={6}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                {vehiculo.fotos.length > 1 && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-600">Elegir foto</label>
                    <div className="flex flex-wrap gap-2">
                      {vehiculo.fotos.map((foto, i) => (
                        <button
                          key={i}
                          onClick={() => setFotoIndice(i)}
                          className={`h-14 w-20 overflow-hidden rounded-md border-2 ${
                            fotoIndice === i ? "border-blue-500" : "border-transparent"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={foto} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Vista previa</label>
            <div className="overflow-hidden rounded-lg border border-zinc-300">
              <div className="flex h-36 items-center justify-center bg-zinc-100">
                {fotoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fotoPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-8 w-8 text-zinc-300" strokeWidth={1.5} />
                )}
              </div>
              <div className="p-3">
                {esMl ? (
                  <>
                    <div className="text-sm font-medium text-zinc-800">{titulo || "(sin título)"}</div>
                    <div className="mt-1 text-lg font-bold text-zinc-900">{formatoPrecio(vehiculo.precio)}</div>
                    <div className="mt-0.5 text-xs text-zinc-400">Mendoza, Mendoza</div>
                    {descripcion && <p className="mt-2 whitespace-pre-wrap text-xs text-zinc-600">{descripcion}</p>}
                  </>
                ) : (
                  <p className="whitespace-pre-wrap text-xs text-zinc-700">{mensaje || "(sin texto)"}</p>
                )}
              </div>
            </div>
            {sinFotos && (
              <p className="mt-1 text-[11px] text-amber-600">Este vehículo no tiene fotos, hace falta al menos una para publicar.</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={confirmar}
            disabled={deshabilitado}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {cargando && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />}
            {cargando ? "Publicando..." : "Confirmar y publicar"}
          </button>
          <button onClick={onCancelar} className="text-xs font-medium text-zinc-500 hover:text-zinc-700">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
