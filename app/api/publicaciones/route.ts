import { NextRequest, NextResponse } from "next/server";
import { listarPublicacionesDeAgencia } from "@/lib/data";
import { agenciaDesdeRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const publicaciones = await listarPublicacionesDeAgencia(agencia.id);
  return NextResponse.json({ publicaciones });
}
