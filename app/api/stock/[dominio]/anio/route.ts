import { NextRequest, NextResponse } from "next/server";
import { actualizarAnio } from "@/lib/data";
import { agenciaDesdeRequest } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { dominio } = await params;
  const { anio } = (await req.json()) as { anio: string };
  const n = parseInt(anio, 10);
  if (!anio || isNaN(n) || n < 1960 || n > new Date().getFullYear() + 1) {
    return NextResponse.json({ error: "Año inválido." }, { status: 400 });
  }
  const v = await actualizarAnio(decodeURIComponent(dominio), agencia.id, String(n));
  if (!v) return NextResponse.json({ error: `No se encontró el dominio '${dominio}'` }, { status: 404 });
  return NextResponse.json(v);
}
