"use client";

import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

// Antes ninguna foto del vehículo se podía ver más grande -ni en el panel
// de la agencia ni en el catálogo del comprador, solo la miniatura fija de
// la galería. Este modal simple (una sola imagen, fondo oscuro, flechas si
// hay más de una foto) es lo mínimo para poder mirar el auto en detalle.
type Props = {
  fotos: string[];
  indice: number;
  onCerrar: () => void;
  onCambiar: (indice: number) => void;
};

export default function Lightbox({ fotos, indice, onCerrar, onCambiar }: Props) {
  useEffect(() => {
    function alTecla(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
      if (e.key === "ArrowRight") onCambiar((indice + 1) % fotos.length);
      if (e.key === "ArrowLeft") onCambiar((indice - 1 + fotos.length) % fotos.length);
    }
    document.addEventListener("keydown", alTecla);
    return () => document.removeEventListener("keydown", alTecla);
  }, [indice, fotos.length, onCerrar, onCambiar]);

  if (fotos.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/90 p-4"
      onClick={onCerrar}
    >
      <button
        onClick={onCerrar}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="Cerrar"
      >
        <X className="h-5 w-5" strokeWidth={2} />
      </button>

      {fotos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onCambiar((indice - 1 + fotos.length) % fotos.length); }}
          className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-4"
          aria-label="Foto anterior"
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={2} />
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fotos[indice]}
        alt=""
        className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {fotos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onCambiar((indice + 1) % fotos.length); }}
          className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-4"
          aria-label="Foto siguiente"
        >
          <ChevronRight className="h-6 w-6" strokeWidth={2} />
        </button>
      )}

      {fotos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white">
          {indice + 1} / {fotos.length}
        </div>
      )}
    </div>
  );
}
