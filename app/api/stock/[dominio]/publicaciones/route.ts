import { NextRequest, NextResponse } from "next/server";
import { listarPublicaciones } from "@/lib/data";
import { agenciaDesdeRequest } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { dominio } = await params;
  const publicaciones = await listarPublicaciones(decodeURIComponent(dominio));
  return NextResponse.json({ publicaciones });
}
