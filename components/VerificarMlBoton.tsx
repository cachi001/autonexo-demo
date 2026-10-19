"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";

// Botón reusable para forzar la bidireccionalidad manual con Mercado Libre
// desde cualquier listado (no solo desde la ficha del vehículo). Si la agencia
// canceló o eliminó el aviso directamente en la cuenta real de ML, esto es lo
// único que hace que AutoNexo se entere y deje de mostrarlo como vigente.
export default function VerificarMlBoton({ dominio }: { dominio: string }) {
  const router = useRouter();
  const [verificando, setVerificando] = useState(false);

  async function verificar() {
    setVerificando(true);
    try {
      await fetch(`/api/stock/${encodeURIComponent(dominio)}/verificar-publicacion`, { method: "POST" });
      router.refresh();
    } finally {
      setVerificando(false);
    }
  }

  return (
    <button
      onClick={verificar}
      disabled={verificando}
      className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-800 disabled:opacity-50"
      title="Trae el estado real desde Mercado Libre (por si se canceló o se eliminó desde la cuenta real)"
    >
      {verificando ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} /> : <RefreshCw className="h-3 w-3" strokeWidth={2} />}
      Verificar
    </button>
  );
}
