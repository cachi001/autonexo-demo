"use client";

import { useEffect, useState } from "react";
import { Camera, Loader2, X, ThumbsUp, MessageCircle, Send, Heart, Bookmark, AlertTriangle } from "lucide-react";
import Link from "next/link";
import CanalLogo from "@/components/CanalLogo";
import type { Canal } from "@/lib/data";
import { TIPOS_MOTO, esVehiculoMoto } from "@/lib/moto";

// Antes era un panel genérico sin identidad: mismo gris para los tres
// canales, sin ningún indicio visual de qué red social es, y la "vista
// previa" era solo texto + foto sueltos, nada que se pareciera a lo que la
// agencia iba a ver de verdad en Mercado Libre, Facebook o Instagram. Ahora
// cada canal tiene su acento de color real, y la vista previa imita la
// estructura real de un post (encabezado de página + foto + caption + barra
// de reacciones) o de un aviso de ML (foto + título + precio + ubicación).
type VehiculoResumen = { marca: string; modelo: string; anio: string; precio: string; descripcion: string; fotos: string[]; tipo?: string };

type Props = {
  canal: Canal;
  vehiculo: VehiculoResumen;
  cargando: boolean;
  // Error de la última publicación fallida, ya humanizado (lib/errores.ts) —
  // antes el modal no mostraba nada acá: al fallar "Confirmar y publicar" el
  // botón volvía a estar disponible sin ningún indicio visible, el único
  // lugar donde aparecía el mensaje era la tabla de canales, después de
  // cerrar el modal (testeo end-to-end 2026-10-21, bug 3).
  error?: string | null;
  onConfirmar: (payload: {
    titulo?: string;
    descripcion?: string;
    mensaje?: string;
    fotoIndice?: number;
    listingTypeId?: string;
    condicion?: "used" | "new";
    garantiaFabrica?: boolean;
    garantiaMecanica?: boolean;
    entregaDomicilio?: boolean;
    tipoMoto?: string;
  }) => void;
  onCancelar: () => void;
};

type ListingType = { id: string; nombre: string; disponibles: number | null };
type OpcionesMl = { listingTypes: ListingType[]; ciudad: string; provinciaNombre: string; ubicacionCompleta: boolean };

const NOMBRE_CANAL: Record<Canal, string> = { mercadolibre: "Mercado Libre", facebook: "Facebook", instagram: "Instagram" };

// Acento real de marca por canal -no el mismo gris genérico para los tres.
const ACENTO: Record<Canal, { anillo: string; boton: string; texto: string; chip: string }> = {
  mercadolibre: {
    anillo: "focus:border-amber-500 focus:ring-amber-500/20",
    boton: "bg-amber-400 text-zinc-900 hover:bg-amber-300",
    texto: "text-amber-700",
    chip: "bg-amber-50 text-amber-700",
  },
  facebook: {
    anillo: "focus:border-blue-500 focus:ring-blue-500/20",
    boton: "bg-blue-600 text-white hover:bg-blue-700",
    texto: "text-blue-700",
    chip: "bg-blue-50 text-blue-700",
  },
  instagram: {
    anillo: "focus:border-pink-500 focus:ring-pink-500/20",
    boton: "bg-gradient-to-r from-amber-500 via-pink-600 to-purple-600 text-white hover:opacity-90",
    texto: "text-pink-700",
    chip: "bg-pink-50 text-pink-700",
  },
};

function formatoPrecio(p: string) {
  const n = parseFloat(p);
  return isNaN(n) ? p : "$" + n.toLocaleString("es-AR");
}

export default function PublicarCanalModal({ canal, vehiculo, cargando, error, onConfirmar, onCancelar }: Props) {
  const esMl = canal === "mercadolibre";
  // Motos piden atributos completamente distintos en Mercado Libre (sin
  // versión/combustible/puertas, con MOTO_TYPE en su lugar) -confirmado en
  // vivo contra /categories/MLA1763/attributes. Se detecta por el tipo ya
  // cargado en el stock, no hace falta pedírselo de nuevo a la agencia.
  // Bug real corregido 2026-10-21: antes era /moto|cuatriciclo/i.test(...),
  // sin límite de palabra -> "automotor" (au-to-MOTO-r) disparaba falso
  // positivo de moto para un auto común. esVehiculoMoto (lib/moto.ts) usa el
  // mismo criterio de tokenización por palabra completa que ya tenía
  // lib/documentos.ts para este mismo problema.
  const esMoto = esVehiculoMoto(vehiculo.tipo || "");
  const acento = ACENTO[canal];
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const [titulo, setTitulo] = useState(() => `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio}`.slice(0, 60));
  const [descripcion, setDescripcion] = useState(vehiculo.descripcion || "");
  const [mensaje, setMensaje] = useState(
    () => `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio} — ${formatoPrecio(vehiculo.precio)}\n\n${vehiculo.descripcion}`
  );
  const [fotoIndice, setFotoIndice] = useState(0);

  // Nada de esto va hardcodeado -la agencia lo elige acá antes de publicar,
  // y la vista previa de la derecha se actualiza en vivo con lo que elija.
  const [opcionesMl, setOpcionesMl] = useState<OpcionesMl | null>(null);
  const [errorOpciones, setErrorOpciones] = useState("");
  const [cargandoOpciones, setCargandoOpciones] = useState(esMl);
  const [listingTypeId, setListingTypeId] = useState("free");
  const [condicion, setCondicion] = useState<"used" | "new">("used");
  const [garantiaFabrica, setGarantiaFabrica] = useState(false);
  const [garantiaMecanica, setGarantiaMecanica] = useState(false);
  const [entregaDomicilio, setEntregaDomicilio] = useState(false);
  const [tipoMoto, setTipoMoto] = useState("");

  useEffect(() => {
    if (!esMl) return;
    let cancelado = false;
    setCargandoOpciones(true);
    fetch("/api/canales/mercadolibre/opciones")
      .then(async (r) => {
        const data = await r.json();
        if (cancelado) return;
        if (!r.ok) {
          setErrorOpciones(data.error || "No se pudieron cargar las opciones de Mercado Libre.");
          return;
        }
        setOpcionesMl(data);
        if (data.listingTypes?.[0]) setListingTypeId(data.listingTypes[0].id);
      })
      .catch(() => {
        if (!cancelado) setErrorOpciones("No se pudo conectar con Mercado Libre para traer las opciones de publicación.");
      })
      .finally(() => {
        if (!cancelado) setCargandoOpciones(false);
      });
    return () => {
      cancelado = true;
    };
  }, [esMl]);

  const fotoPreview = vehiculo.fotos[esMl ? 0 : fotoIndice];
  const sinFotos = vehiculo.fotos.length === 0;
  const ubicacionFalta = esMl && opcionesMl !== null && !opcionesMl.ubicacionCompleta;
  const deshabilitado =
    cargando ||
    sinFotos ||
    (esMl
      ? !titulo.trim() ||
        cargandoOpciones ||
        !opcionesMl ||
        ubicacionFalta ||
        Boolean(errorOpciones) ||
        (esMoto && !tipoMoto)
      : !mensaje.trim());

  function confirmar() {
    if (esMl) {
      onConfirmar({
        titulo,
        descripcion,
        listingTypeId,
        condicion,
        ...(esMoto
          ? { tipoMoto }
          : { garantiaFabrica, garantiaMecanica, entregaDomicilio }),
      });
    } else onConfirmar({ mensaje, fotoIndice });
  }

  function cerrar() {
    setVisible(false);
    setTimeout(onCancelar, 120);
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4 backdrop-blur-sm transition-opacity duration-150 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={cerrar}
    >
      <div
        className={`flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-150 ${
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-zinc-100 px-6 py-5">
          <CanalLogo canal={canal} size={40} />
          <div className="flex-1">
            <h3 className="text-base font-semibold text-zinc-900">Publicar en {NOMBRE_CANAL[canal]}</h3>
            <p className="text-sm text-zinc-400">Revisá cómo va a quedar antes de confirmar</p>
          </div>
          <button
            onClick={cerrar}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* Dos columnas con scroll INDEPENDIENTE -antes todo el grid era un
            solo contenedor con scroll, así que bajar el formulario (largo,
            con muchos campos) arrastraba la vista previa de la derecha con
            él, aunque la preview entrara entera en pantalla. Ahora cada
            columna tiene su propio overflow-y-auto y su propia altura. */}
        <div className="grid min-h-0 flex-1 gap-8 overflow-hidden p-6 sm:grid-cols-2">
          <div className="min-h-0 space-y-5 overflow-y-auto pr-1">
            {esMl ? (
              <>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-semibold text-zinc-600">Título</label>
                    <span className="text-xs text-zinc-400">{titulo.length}/60</span>
                  </div>
                  <input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value.slice(0, 60))}
                    className={`w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm outline-none ring-4 ring-transparent transition ${acento.anillo}`}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-zinc-600">Descripción</label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={6}
                    className={`w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm leading-relaxed outline-none ring-4 ring-transparent transition ${acento.anillo}`}
                  />
                </div>

                {cargandoOpciones && (
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> Cargando opciones reales de tu cuenta de Mercado Libre...
                  </div>
                )}

                {!cargandoOpciones && errorOpciones && (
                  <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">{errorOpciones}</div>
                )}

                {!cargandoOpciones && opcionesMl && ubicacionFalta && (
                  <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                    <span>
                      Falta la ubicación de tu agencia, obligatoria para publicar.{" "}
                      <Link href="/stock/agencia" className="font-semibold underline">
                        Completala en Datos de la agencia
                      </Link>
                      .
                    </span>
                  </div>
                )}

                {!cargandoOpciones && opcionesMl && !ubicacionFalta && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-zinc-600">Tipo de publicación</label>
                        <select
                          value={listingTypeId}
                          onChange={(e) => setListingTypeId(e.target.value)}
                          className={`w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm outline-none ring-4 ring-transparent transition ${acento.anillo}`}
                        >
                          {opcionesMl.listingTypes.map((lt) => (
                            <option key={lt.id} value={lt.id}>
                              {lt.nombre}
                              {lt.disponibles !== null ? ` (${lt.disponibles} disponibles)` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-zinc-600">Condición</label>
                        <select
                          value={condicion}
                          onChange={(e) => setCondicion(e.target.value as "used" | "new")}
                          className={`w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm outline-none ring-4 ring-transparent transition ${acento.anillo}`}
                        >
                          <option value="used">Usado</option>
                          <option value="new">Nuevo</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-zinc-600">Ubicación</label>
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-600">
                        {opcionesMl.ciudad}, {opcionesMl.provinciaNombre}
                      </div>
                    </div>

                    {esMoto ? (
                      // Motos no tienen garantía de fábrica/mecánica ni
                      // entrega a domicilio como atributos en ML -en cambio
                      // piden el tipo de moto (único atributo realmente
                      // obligatorio además de marca/modelo/año/km).
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-zinc-600">Tipo de moto</label>
                        <select
                          value={tipoMoto}
                          onChange={(e) => setTipoMoto(e.target.value)}
                          className={`w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm outline-none ring-4 ring-transparent transition ${acento.anillo}`}
                        >
                          <option value="">Elegí uno</option>
                          {TIPOS_MOTO.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <label className="flex items-center gap-2.5 text-sm text-zinc-700">
                          <input type="checkbox" checked={garantiaFabrica} onChange={(e) => setGarantiaFabrica(e.target.checked)} className="h-4 w-4 rounded border-zinc-300" />
                          Con garantía de fábrica
                        </label>
                        <label className="flex items-center gap-2.5 text-sm text-zinc-700">
                          <input type="checkbox" checked={garantiaMecanica} onChange={(e) => setGarantiaMecanica(e.target.checked)} className="h-4 w-4 rounded border-zinc-300" />
                          Con garantía mecánica
                        </label>
                        <label className="flex items-center gap-2.5 text-sm text-zinc-700">
                          <input type="checkbox" checked={entregaDomicilio} onChange={(e) => setEntregaDomicilio(e.target.checked)} className="h-4 w-4 rounded border-zinc-300" />
                          Entrega a domicilio
                        </label>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-semibold text-zinc-600">Texto de la publicación</label>
                    <span className="text-xs text-zinc-400">{mensaje.length} caracteres</span>
                  </div>
                  <textarea
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    rows={11}
                    className={`w-full rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm leading-relaxed outline-none ring-4 ring-transparent transition ${acento.anillo}`}
                  />
                </div>
                {vehiculo.fotos.length > 1 && (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-zinc-600">Elegir foto</label>
                    <div className="flex flex-wrap gap-2.5">
                      {vehiculo.fotos.map((foto, i) => (
                        <button
                          key={i}
                          onClick={() => setFotoIndice(i)}
                          className={`h-20 w-28 overflow-hidden rounded-lg ring-2 transition ${
                            fotoIndice === i ? "ring-zinc-900" : "ring-transparent hover:ring-zinc-300"
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

          <div className="min-h-0 overflow-y-auto pr-1">
            <label className="mb-1.5 block text-sm font-semibold text-zinc-600">Vista previa</label>

            {esMl ? (
              <div className="overflow-hidden rounded-xl border border-zinc-200 shadow-sm">
                <div className="flex h-56 items-center justify-center bg-zinc-100">
                  {fotoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fotoPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-10 w-10 text-zinc-300" strokeWidth={1.5} />
                  )}
                </div>
                <div className="p-5">
                  {opcionesMl && !ubicacionFalta && (
                    <div className="mb-2.5 flex flex-wrap gap-1.5">
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${acento.chip}`}>
                        {opcionesMl.listingTypes.find((lt) => lt.id === listingTypeId)?.nombre || listingTypeId}
                      </span>
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
                        {condicion === "new" ? "Nuevo" : "Usado"}
                      </span>
                      {esMoto
                        ? tipoMoto && <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">{tipoMoto}</span>
                        : (
                          <>
                            {garantiaFabrica && <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">Garantía de fábrica</span>}
                            {garantiaMecanica && <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">Garantía mecánica</span>}
                            {entregaDomicilio && <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">Entrega a domicilio</span>}
                          </>
                        )}
                    </div>
                  )}
                  <div className="text-base font-medium leading-snug text-zinc-800">{titulo || "(sin título)"}</div>
                  <div className="mt-2 text-2xl font-bold text-zinc-900">{formatoPrecio(vehiculo.precio)}</div>
                  <div className="mt-1 text-sm text-zinc-400">
                    {opcionesMl && !ubicacionFalta ? `${opcionesMl.ciudad}, ${opcionesMl.provinciaNombre}` : "Ubicación sin completar"}
                  </div>
                  {descripcion && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">{descripcion}</p>}
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-zinc-200 shadow-sm">
                <div className="flex items-center gap-2.5 px-4 pt-4">
                  <CanalLogo canal={canal} size={36} />
                  <div className="leading-tight">
                    <div className="text-sm font-semibold text-zinc-800">Tu agencia</div>
                    <div className="text-xs text-zinc-400">Ahora · 🌐</div>
                  </div>
                </div>
                <p className="whitespace-pre-wrap px-4 pb-3.5 pt-2.5 text-sm leading-relaxed text-zinc-700">{mensaje || "(sin texto)"}</p>
                <div className="flex h-64 items-center justify-center bg-zinc-100">
                  {fotoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fotoPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-10 w-10 text-zinc-300" strokeWidth={1.5} />
                  )}
                </div>
                <div className="flex items-center gap-5 border-t border-zinc-100 px-4 py-3 text-zinc-400">
                  {canal === "facebook" ? (
                    <>
                      <ThumbsUp className="h-5 w-5" strokeWidth={1.75} />
                      <MessageCircle className="h-5 w-5" strokeWidth={1.75} />
                      <Send className="h-5 w-5" strokeWidth={1.75} />
                    </>
                  ) : (
                    <>
                      <Heart className="h-5 w-5" strokeWidth={1.75} />
                      <MessageCircle className="h-5 w-5" strokeWidth={1.75} />
                      <Send className="h-5 w-5" strokeWidth={1.75} />
                      <Bookmark className="ml-auto h-5 w-5" strokeWidth={1.75} />
                    </>
                  )}
                </div>
              </div>
            )}

            {sinFotos && (
              <div className={`mt-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium ${acento.chip}`}>
                Este vehículo no tiene fotos, hace falta al menos una para publicar.
              </div>
            )}
          </div>
        </div>

        {error && (
          // Regla del proyecto: nunca tooltip nativo ni texto truncado -una
          // sola línea, con scroll horizontal del propio contenedor si el
          // mensaje no entra, nunca escondido detrás de un hover.
          <div className="border-t border-zinc-100 bg-red-50 px-6 py-3">
            <div className="overflow-x-auto">
              <p className="whitespace-nowrap text-sm font-medium text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50 px-6 py-4">
          <button onClick={cerrar} className="text-sm font-semibold text-zinc-500 hover:text-zinc-700">
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={deshabilitado}
            className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${acento.boton}`}
          >
            {cargando && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
            {cargando ? "Publicando..." : "Confirmar y publicar"}
          </button>
        </div>
      </div>
    </div>
  );
}
