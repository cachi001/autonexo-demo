import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Car } from "lucide-react";
import {
  obtenerSesion,
  obtenerAgencia,
  listarStock,
  listarCanalesConectados,
  listarPublicacionesDeAgencia,
  Canal,
} from "@/lib/data";
import { COOKIE_SESION } from "@/lib/auth";
import CanalLogo from "@/components/CanalLogo";
import CanalAccionesMenu from "@/components/CanalAccionesMenu";
import { humanizarError } from "@/lib/errores";

const TODOS_LOS_CANALES: Canal[] = ["mercadolibre", "facebook", "instagram"];
const NOMBRE_CANAL: Record<Canal, string> = { mercadolibre: "Mercado Libre", facebook: "Facebook", instagram: "Instagram" };

const ESTADO_LABEL: Record<string, { texto: string; clase: string }> = {
  sin_publicar: { texto: "Sin publicar", clase: "bg-zinc-100 text-zinc-400" },
  pendiente_aprobacion: { texto: "Publicando...", clase: "bg-amber-50 text-amber-700" },
  publicado: { texto: "Publicado", clase: "bg-emerald-50 text-emerald-700" },
  rechazado: { texto: "Rechazado", clase: "bg-red-50 text-red-700" },
  pausado: { texto: "Pausado", clase: "bg-zinc-100 text-zinc-600" },
  // "nunca se creó nada en Mercado Libre", rechazo total, distinto de
  // en_revision (sí se creó, pero ML lo tiene oculto hasta corregir algo).
  error: { texto: "No se pudo publicar", clase: "bg-red-50 text-red-700" },
  en_revision: { texto: "Oculto en revisión", clase: "bg-amber-50 text-amber-700" },
};

function formatoPrecio(p: string) {
  const n = parseFloat(p);
  if (isNaN(n)) return p;
  return `$${n.toLocaleString("es-AR")}`;
}

// Tabla real, pensada para escalar a todo el stock de la agencia (no una
// tarjeta por auto -con 2+ plataformas conectadas y stock de verdad eso se
// vuelve ilegible). Una columna por canal CONECTADO únicamente -ninguna
// columna fantasma para canales sin conectar, eso ya lo resuelve Conexiones.
export default async function CanalesExternosPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_SESION)?.value;
  const sesion = token ? await obtenerSesion(token) : null;
  if (!sesion || sesion.rol !== "agencia" || !sesion.agenciaId) redirect("/login");

  const agencia = await obtenerAgencia(sesion.agenciaId);
  if (!agencia) redirect("/login");

  const [vehiculos, conectados, publicaciones] = await Promise.all([
    listarStock(agencia.id),
    listarCanalesConectados(agencia.id),
    listarPublicacionesDeAgencia(agencia.id),
  ]);

  const canalesConectados = TODOS_LOS_CANALES.filter((c) => conectados.some((x) => x.canal === c));
  const canalesSinConectar = TODOS_LOS_CANALES.filter((c) => !canalesConectados.includes(c));

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/stock" className="text-sm text-zinc-400 hover:text-zinc-700">Panel</Link>
          <span className="text-zinc-300">/</span>
          <h1 className="text-base font-semibold tracking-tight">Canales externos</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-zinc-500">
            {vehiculos.length} {vehiculos.length === 1 ? "vehículo en stock" : "vehículos en stock"} · estado de publicación por canal.
          </p>
          {canalesSinConectar.length > 0 && (
            <Link href="/stock/canales" className="text-xs font-medium text-blue-600 hover:underline">
              Conectar {canalesSinConectar.map((c) => NOMBRE_CANAL[c]).join(" / ")} para verlos acá →
            </Link>
          )}
        </div>

        {canalesConectados.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center">
            <Car className="mx-auto mb-2 h-8 w-8 text-zinc-300" strokeWidth={1.5} />
            <p className="text-sm text-zinc-500">Todavía no conectaste ninguna cuenta.</p>
            <Link href="/stock/canales" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline">
              Ir a Conexiones
            </Link>
          </div>
        ) : vehiculos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center">
            <p className="text-sm text-zinc-500">Todavía no cargaste ningún vehículo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-2.5">Vehículo</th>
                  <th className="px-3 py-2.5">Precio</th>
                  {canalesConectados.map((c) => (
                    <th key={c} className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <CanalLogo canal={c} size={18} /> {NOMBRE_CANAL[c]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {vehiculos.map((v) => {
                  const foto = v.fotos?.[0];
                  return (
                    <tr key={v.dominio} className="hover:bg-zinc-50">
                      <td className="px-3 py-2">
                        <Link href={`/stock/listado/${encodeURIComponent(v.dominio)}`} className="flex items-center gap-2.5">
                          <div className="flex h-9 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-100">
                            {foto ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={foto} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Car className="h-4 w-4 text-zinc-300" strokeWidth={1.5} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-zinc-800 hover:underline">{v.marca} {v.modelo}</div>
                            <div className="text-xs text-zinc-400">{v.dominio}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-zinc-600">{formatoPrecio(v.precio)}</td>
                      {canalesConectados.map((c) => {
                        const pub = publicaciones.find((p) => p.dominio === v.dominio && p.canal === c);
                        const estado = pub?.estado || "sin_publicar";
                        const label = ESTADO_LABEL[estado] || ESTADO_LABEL.sin_publicar;
                        return (
                          <td key={c} className="px-3 py-2 align-top">
                            <div className="flex items-center gap-1.5">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${label.clase}`}>{label.texto}</span>
                              {pub?.permalink && (
                                <a
                                  href={pub.permalink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex h-5 w-5 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                                  aria-label="Ver aviso real"
                                >
                                  <ExternalLink className="h-2.5 w-2.5" strokeWidth={2} />
                                </a>
                              )}
                              <CanalAccionesMenu
                                dominio={v.dominio}
                                canal={c}
                                estado={estado}
                                tieneExternalId={Boolean(pub?.external_id)}
                                vehiculo={{
                                  marca: v.marca,
                                  modelo: v.modelo,
                                  anio: v.anio,
                                  precio: v.precio,
                                  descripcion: v.descripcion,
                                  fotos: v.fotos,
                                  tipo: v.tipo,
                                }}
                              />
                            </div>
                            {(estado === "error" || estado === "en_revision") && pub?.error_msg && (
                              <div
                                className={`mt-1 max-w-xs text-xs leading-snug font-medium ${
                                  estado === "en_revision" ? "text-amber-700" : "text-red-700"
                                }`}
                              >
                                {humanizarError(pub.error_msg)}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
