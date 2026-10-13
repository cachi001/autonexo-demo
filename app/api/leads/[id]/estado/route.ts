import { NextRequest, NextResponse } from "next/server";
import { actualizarEstadoLead } from "@/lib/data";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const estado = body.estado;
  if (!["pendiente", "respondido", "cerrado"].includes(estado)) {
    return NextResponse.json({ error: `Estado inválido: ${estado}` });
  }
  const lead = await actualizarEstadoLead(id, estado);
  if (!lead) return NextResponse.json({ error: `No se encontró el lead '${id}'` });
  return NextResponse.json(lead);
}
