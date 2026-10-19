"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";

// Antes había un botón de texto por acción posible, pegado uno al lado del
// otro en la tabla de Canales externos, con 2 o 3 acciones por fila (Pausar,
// Eliminar, Verificar) quedaba desordenado. Ahora es un solo ícono de tres
// puntos con un menú desplegable, como cualquier tabla de gestión real.
//
// El bug más importante que esto corrige: antes, si una acción fallaba
// (token vencido, error real de Mercado Libre, lo que sea), el fetch
// simplemente no mostraba nada, la agencia hacía clic y no pasaba
// absolutamente nada visible, sin ningún indicio de qué había fallado. Ahora
// cualquier resultado (éxito o error) de la llamada se muestra como una
// notificación flotante (toast), no como texto chico fácil de pasar por
// alto. Pausar y Eliminar, además, piden confirmación explícita antes de
// ejecutarse, porque tienen efecto real sobre un aviso que existe de verdad
// en la cuenta de Mercado Libre de la agencia.
type Props = { dominio: string; estado: string; tieneExternalId: boolean };

type AccionPendiente =
  | { tipo: "publicar" }
  | { tipo: "ml"; accion: "pausar" | "reanudar" | "eliminar" | "cancelar" }
  | { tipo: "verificar" };

export default function MlAccionesMenu({ dominio, estado, tieneExternalId }: Props) {
  const router = useRouter();
  const { mostrar } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [confirmando, setConfirmando] = useState<AccionPendiente | null>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function alHacerClicAfuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", alHacerClicAfuera);
    return () => document.removeEventListener("mousedown", alHacerClicAfuera);
  }, []);

  async function ejecutar(fn: () => Promise<Response>, mensajeExito: string) {
    setCargando(true);
    setAbierto(false);
    setConfirmando(null);
    try {
      const res = await fn();
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        mostrar("error", (data && data.error) || "No se pudo completar la acción. Probá de nuevo.");
        return;
      }
      mostrar("exito", mensajeExito);
      router.refresh();
    } catch {
      mostrar("error", "No se pudo conectar con el servicio. Revisá tu conexión y probá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  function publicar() {
    return ejecutar(
      () =>
        fetch(`/api/stock/${encodeURIComponent(dominio)}/publicar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ canal: "mercadolibre" }),
        }),
      "Publicado en Mercado Libre."
    );
  }

  function accionMl(accion: "pausar" | "reanudar" | "eliminar" | "cancelar") {
    const mensajes: Record<typeof accion, string> = {
      pausar: "Aviso pausado en Mercado Libre.",
      reanudar: "Aviso reanudado en Mercado Libre.",
      eliminar: "Aviso eliminado de Mercado Libre.",
      cancelar: "Publicación cancelada.",
    };
    return ejecutar(
      () =>
        fetch(`/api/stock/${encodeURIComponent(dominio)}/mercadolibre-accion`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion }),
        }),
      mensajes[accion]
    );
  }

  function verificar() {
    return ejecutar(
      () => fetch(`/api/stock/${encodeURIComponent(dominio)}/verificar-publicacion`, { method: "POST" }),
      "Estado actualizado con lo real de Mercado Libre."
    );
  }

  function confirmarYEjecutar(pendiente: AccionPendiente) {
    if (pendiente.tipo === "ml" && (pendiente.accion === "pausar" || pendiente.accion === "eliminar")) {
      setAbierto(false);
      setConfirmando(pendiente);
      return;
    }
    if (pendiente.tipo === "publicar") publicar();
    else if (pendiente.tipo === "verificar") verificar();
    else if (pendiente.tipo === "ml") accionMl(pendiente.accion);
  }

  const opciones: { label: string; pendiente: AccionPendiente }[] = [];
  if (estado === "sin_publicar") opciones.push({ label: "Publicar", pendiente: { tipo: "publicar" } });
  if (estado === "error" || estado === "en_revision") opciones.push({ label: "Reintentar", pendiente: { tipo: "publicar" } });
  if (estado === "error" && !tieneExternalId) {
    opciones.push({ label: "Cancelar", pendiente: { tipo: "ml", accion: "cancelar" } });
  }
  if (estado === "publicado") opciones.push({ label: "Pausar", pendiente: { tipo: "ml", accion: "pausar" } });
  if (estado === "pausado") opciones.push({ label: "Reanudar", pendiente: { tipo: "ml", accion: "reanudar" } });
  if ((estado === "publicado" || estado === "pausado" || estado === "en_revision") && tieneExternalId) {
    opciones.push({ label: "Eliminar", pendiente: { tipo: "ml", accion: "eliminar" } });
  }
  if (tieneExternalId && estado !== "sin_publicar") {
    opciones.push({ label: "Verificar estado real", pendiente: { tipo: "verificar" } });
  }

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
              onClick={() => confirmarYEjecutar(o.pendiente)}
              className="block w-full px-3 py-1.5 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {confirmando && confirmando.tipo === "ml" && confirmando.accion === "pausar" && (
        <ConfirmModal
          titulo="¿Pausar este aviso?"
          mensaje="El vehículo deja de verse para compradores en Mercado Libre hasta que lo reanudes. Podés reanudarlo cuando quieras."
          textoConfirmar="Pausar"
          onConfirmar={() => accionMl("pausar")}
          onCancelar={() => setConfirmando(null)}
        />
      )}
      {confirmando && confirmando.tipo === "ml" && confirmando.accion === "eliminar" && (
        <ConfirmModal
          titulo="¿Eliminar este aviso?"
          mensaje="Esto cierra el aviso de forma permanente en Mercado Libre. Si querés venderlo de nuevo ahí, vas a tener que publicarlo otra vez como un aviso nuevo."
          textoConfirmar="Eliminar"
          onConfirmar={() => accionMl("eliminar")}
          onCancelar={() => setConfirmando(null)}
        />
      )}
    </div>
  );
}
