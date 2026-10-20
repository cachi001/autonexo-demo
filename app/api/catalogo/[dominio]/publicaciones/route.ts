import { NextRequest, NextResponse } from "next/server";
import { listarPublicaciones } from "@/lib/data";

// Público, sin sesión -el comprador anónimo que ve la ficha del catálogo
// necesita saber en qué otros canales está este mismo vehículo para poder
// compararlo/contactar por el canal que prefiera. Solo se exponen canal y
// link real, nada del estado interno (tokens, ids de cuenta, errores) que sí
// ve la agencia en /stock/canales-externos.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const { dominio } = await params;
  const publicaciones = await listarPublicaciones(decodeURIComponent(dominio));
  const canales = publicaciones
    .filter((p) => p.estado === "publicado" && p.permalink)
    .map((p) => ({ canal: p.canal, permalink: p.permalink }));
  return NextResponse.json({ canales });
}
