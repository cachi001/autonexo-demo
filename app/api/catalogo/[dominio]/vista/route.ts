import { NextRequest, NextResponse } from "next/server";
import { registrarVista } from "@/lib/data";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const { dominio } = await params;
  const v = registrarVista(decodeURIComponent(dominio));
  if (!v) return NextResponse.json({ error: `No se encontró el dominio '${dominio}'` });
  return NextResponse.json({ dominio: v.dominio, vistas_reales: v.vistas_reales });
}
