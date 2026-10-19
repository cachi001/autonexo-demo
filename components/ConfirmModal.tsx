"use client";

// Modal de confirmación genérico, pedido para que acciones con efecto real
// (pausar o eliminar un aviso de Mercado Libre) nunca se ejecuten con un solo
// clic accidental. "Eliminar" en particular cierra el aviso en ML de forma
// permanente (no se puede reabrir el mismo id), por eso necesita confirmación
// explícita antes de llamar a la API.
export default function ConfirmModal({
  titulo,
  mensaje,
  textoConfirmar,
  onConfirmar,
  onCancelar,
}: {
  titulo: string;
  mensaje: string;
  textoConfirmar: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancelar}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-zinc-900">{titulo}</h3>
        <p className="mt-2 text-sm text-zinc-600">{mensaje}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancelar}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
