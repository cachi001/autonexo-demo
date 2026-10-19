"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Loader2 } from "lucide-react";

// Antes había un botón de texto por acción posible, pegado uno al lado del
// otro en la tabla de Canales externos -con 2-3 acciones por fila (Pausar,
// Eliminar, Verificar) quedaba desordenado. Ahora es un solo ícono de tres
// puntos con un menú desplegable, como cualquier tabla de gestión real.
//
// El bug más importante que esto corrige: antes, si una acción fallaba
// (token vencido, error real de Mercado Libre, lo que sea), el fetch
// simplemente no mostraba nada -la agencia hacía clic y no pasaba
// absolutamente nada visible, sin ningún indicio de qué había fallado. Ahora
// cualquier error de la llamada se muestra debajo del menú, en rojo, hasta
// la próxima acción.
type Props = { dominio: string; estado: string; tieneExternalId: boolean };

export default function MlAccionesMenu({ dominio, estado, tieneExternalId }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function alHacerClicAfuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", alHacerClicAfuera);
    return () => document.removeEventListener("mousedown", alHacerClicAfuera);
  }, []);

  async function ejecutar(fn: () => Promise<Response>) {
    setCargando(true);
    setError(null);
    setAbierto(false);
    try {
      const res = await fn();
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data && data.error) || "No se pudo completar la acción. Probá de nuevo.");
        return;
      }
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servicio. Revisá tu conexión y probá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  function publicar() {
    return ejecutar(() =>
      fetch(`/api/stock/${encodeURIComponent(dominio)}/publicar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canal: "mercadolibre" }),
      })
    );
  }

  function accionMl(accion: "pausar" | "reanudar" | "eliminar" | "cancelar") {
    return ejecutar(() =>
      fetch(`/api/stock/${encodeURIComponent(dominio)}/mercadolibre-accion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      })
    );
  }

  function verificar() {
    return ejecutar(() => fetch(`/api/stock/${encodeURIComponent(dominio)}/verificar-publicacion`, { method: "POST" }));
  }

  const opciones: { label: string; onClick: () => void }[] = [];
  if (estado === "sin_publicar") opciones.push({ label: "Publicar", onClick: publicar });
  if (estado === "error" || estado === "en_revision") opciones.push({ label: "Reintentar", onClick: publicar });
  if (estado === "error" && !tieneExternalId) opciones.push({ label: "Cancelar", onClick: () => accionMl("cancelar") });
  if (estado === "publicado") opciones.push({ label: "Pausar", onClick: () => accionMl("pausar") });
  if (estado === "pausado") opciones.push({ label: "Reanudar", onClick: () => accionMl("reanudar") });
  if ((estado === "publicado" || estado === "pausado" || estado === "en_revision") && tieneExternalId) {
    opciones.push({ label: "Eliminar", onClick: () => accionMl("eliminar") });
  }
  if (tieneExternalId && estado !== "sin_publicar") opciones.push({ label: "Verificar estado real", onClick: verificar });

  if (opciones.length === 0) return null;

  return (
    <div ref={contenedorRef} className="relative inline-block">
      <button
        onClick={() => setAbierto((v) => !v)}
        disabled={cargando}
        className="flex h-6 w-6 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-50"
        aria-label="Acciones de Mercado Libre"
      >
        {cargando ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} /> : <MoreVertical className="h-3.5 w-3.5" strokeWidth={2} />}
      </button>
      {abierto && (
        <div className="absolute left-0 top-7 z-20 w-44 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          {opciones.map((o) => (
            <button
              key={o.label}
              onClick={o.onClick}
              className="block w-full px-3 py-1.5 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {error && <div className="mt-1 max-w-[220px] text-xs font-medium leading-snug text-red-700">{error}</div>}
    </div>
  );
}
