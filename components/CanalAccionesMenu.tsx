"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import PublicarCanalModal from "@/components/PublicarCanalModal";
import type { Canal } from "@/lib/data";

// Antes había un botón de texto por acción posible, pegado uno al lado del
// otro en la tabla de Canales externos, con 2 o 3 acciones por fila (Pausar,
// Eliminar, Verificar) quedaba desordenado. Ahora es un solo ícono de tres
// puntos con un menú desplegable, como cualquier tabla de gestión real.
//
// Las acciones de pausar/reanudar/eliminar/verificar solo existen para
// Mercado Libre, porque son las únicas que el backend soporta hoy (ver
// lib/meta.ts, que solo tiene publicarEnFacebook/publicarEnInstagram, no
// pausar/eliminar). Facebook e Instagram, por ahora, solo tienen
// Publicar/Reintentar, igual que en la ficha de cada vehículo.
//
// El bug más importante que esto corrige: antes, si una acción fallaba
// (token vencido, error real de la plataforma, lo que sea), el fetch
// simplemente no mostraba nada, la agencia hacía clic y no pasaba
// absolutamente nada visible, sin ningún indicio de qué había fallado. Ahora
// cualquier resultado (éxito o error) de la llamada se muestra como una
// notificación flotante (toast). Pausar y Eliminar, además, piden
// confirmación explícita antes de ejecutarse, porque tienen efecto real
// sobre un aviso que existe de verdad en la cuenta de Mercado Libre.
type VehiculoResumen = { marca: string; modelo: string; anio: string; precio: string; descripcion: string; fotos: string[] };
type Props = { dominio: string; canal: Canal; estado: string; tieneExternalId: boolean; vehiculo: VehiculoResumen };

type AccionPendiente =
  | { tipo: "publicar" }
  | { tipo: "ml"; accion: "pausar" | "reanudar" | "eliminar" | "cancelar" }
  | { tipo: "verificar" };

const NOMBRE_CANAL: Record<Canal, string> = { mercadolibre: "Mercado Libre", facebook: "Facebook", instagram: "Instagram" };

export default function CanalAccionesMenu({ dominio, canal, estado, tieneExternalId, vehiculo }: Props) {
  const router = useRouter();
  const { mostrar } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [confirmando, setConfirmando] = useState<AccionPendiente | null>(null);
  const [editando, setEditando] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const esMl = canal === "mercadolibre";

  useEffect(() => {
    function alHacerClicAfuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", alHacerClicAfuera);
    return () => document.removeEventListener("mousedown", alHacerClicAfuera);
  }, []);

  async function ejecutar(fn: () => Promise<Response>, mensajeExito: string): Promise<boolean> {
    setCargando(true);
    setAbierto(false);
    setConfirmando(null);
    try {
      const res = await fn();
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        mostrar("error", (data && data.error) || "No se pudo completar la acción. Probá de nuevo.");
        return false;
      }
      mostrar("exito", mensajeExito);
      router.refresh();
      return true;
    } catch {
      mostrar("error", "No se pudo conectar con el servicio. Revisá tu conexión y probá de nuevo.");
      return false;
    } finally {
      setCargando(false);
    }
  }

  async function publicar(payload: { titulo?: string; descripcion?: string; mensaje?: string; fotoIndice?: number }) {
    const exito = await ejecutar(
      () =>
        fetch(`/api/stock/${encodeURIComponent(dominio)}/publicar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ canal, ...payload }),
        }),
      `Publicado en ${NOMBRE_CANAL[canal]}.`
    );
    if (exito) setEditando(false);
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
    if (pendiente.tipo === "publicar") {
      // Publicar siempre pasa primero por el modal de edición/preview -nunca
      // se publica de verdad con un solo clic sin que la agencia vea qué
      // texto y qué foto se van a usar.
      setAbierto(false);
      setEditando(true);
      return;
    }
    if (pendiente.tipo === "ml" && (pendiente.accion === "pausar" || pendiente.accion === "eliminar")) {
      setAbierto(false);
      setConfirmando(pendiente);
      return;
    }
    if (pendiente.tipo === "verificar") verificar();
    else if (pendiente.tipo === "ml") accionMl(pendiente.accion);
  }

  const opciones: { label: string; pendiente: AccionPendiente }[] = [];
  if (estado === "sin_publicar") opciones.push({ label: "Publicar", pendiente: { tipo: "publicar" } });
  if (estado === "error" || estado === "en_revision") opciones.push({ label: "Reintentar", pendiente: { tipo: "publicar" } });
  if (esMl && estado === "error" && !tieneExternalId) {
    opciones.push({ label: "Cancelar", pendiente: { tipo: "ml", accion: "cancelar" } });
  }
  if (esMl && estado === "publicado") opciones.push({ label: "Pausar", pendiente: { tipo: "ml", accion: "pausar" } });
  if (esMl && estado === "pausado") opciones.push({ label: "Reanudar", pendiente: { tipo: "ml", accion: "reanudar" } });
  if (esMl && (estado === "publicado" || estado === "pausado" || estado === "en_revision") && tieneExternalId) {
    opciones.push({ label: "Eliminar", pendiente: { tipo: "ml", accion: "eliminar" } });
  }
  if (esMl && tieneExternalId && estado !== "sin_publicar") {
    opciones.push({ label: "Verificar estado real", pendiente: { tipo: "verificar" } });
  }

  if (opciones.length === 0) return null;

  return (
    <div ref={contenedorRef} className="relative inline-block">
      <button
        onClick={() => setAbierto((v) => !v)}
        disabled={cargando}
        className="flex h-6 w-6 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-50"
        aria-label={`Acciones de ${NOMBRE_CANAL[canal]}`}
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
      {editando && (
        <PublicarCanalModal
          canal={canal}
          vehiculo={vehiculo}
          cargando={cargando}
          onConfirmar={publicar}
          onCancelar={() => setEditando(false)}
        />
      )}
    </div>
  );
}
