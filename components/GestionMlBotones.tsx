"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Gestión real de un aviso de Mercado Libre desde cualquier listado (antes
// Canales externos solo mostraba el estado, sin ninguna acción posible).
// Qué botón aparece depende del estado actual:
//  - sin_publicar / error: "Publicar" o "Reintentar" (mismo endpoint, crea o
//    actualiza el aviso según corresponda)
//  - en_revision: "Reintentar" (vuelve a mandar precio/título, por si la
//    agencia ya corrigió lo que causaba el rechazo)
//  - publicado: "Pausar" y "Eliminar"
//  - pausado: "Reanudar" y "Eliminar"
// Un aviso "payment_required" (pendiente de pago) no tiene botón de eliminar
// acá: Mercado Libre no deja cancelar eso por API, solo desde la cuenta real.
export default function GestionMlBotones({ dominio, estado }: { dominio: string; estado: string }) {
  const router = useRouter();
  const [cargando, setCargando] = useState<string | null>(null);

  async function publicar() {
    setCargando("publicar");
    try {
      await fetch(`/api/stock/${encodeURIComponent(dominio)}/publicar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canal: "mercadolibre" }),
      });
      router.refresh();
    } finally {
      setCargando(null);
    }
  }

  async function accion(a: "pausar" | "reanudar" | "eliminar") {
    setCargando(a);
    try {
      await fetch(`/api/stock/${encodeURIComponent(dominio)}/mercadolibre-accion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: a }),
      });
      router.refresh();
    } finally {
      setCargando(null);
    }
  }

  const botonClase = "flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-800 disabled:opacity-50";

  function Boton({ label, onClick, clave }: { label: string; onClick: () => void; clave: string }) {
    return (
      <button onClick={onClick} disabled={cargando !== null} className={botonClase}>
        {cargando === clave && <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />}
        {label}
      </button>
    );
  }

  if (estado === "sin_publicar") return <Boton label="Publicar" onClick={publicar} clave="publicar" />;
  if (estado === "error" || estado === "en_revision") return <Boton label="Reintentar" onClick={publicar} clave="publicar" />;
  if (estado === "publicado") {
    return (
      <div className="flex items-center gap-2">
        <Boton label="Pausar" onClick={() => accion("pausar")} clave="pausar" />
        <Boton label="Eliminar" onClick={() => accion("eliminar")} clave="eliminar" />
      </div>
    );
  }
  if (estado === "pausado") {
    return (
      <div className="flex items-center gap-2">
        <Boton label="Reanudar" onClick={() => accion("reanudar")} clave="reanudar" />
        <Boton label="Eliminar" onClick={() => accion("eliminar")} clave="eliminar" />
      </div>
    );
  }
  return null;
}
