import { NextRequest, NextResponse } from "next/server";
import { actualizarPrecio } from "@/lib/data";
import { agenciaDesdeRequest } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { dominio } = await params;
  const { precio } = (await req.json()) as { precio: string };
  const n = parseFloat(precio);
  if (!precio || isNaN(n) || n <= 0) {
    return NextResponse.json({ error: "Precio inválido." }, { status: 400 });
  }
  const v = await actualizarPrecio(decodeURIComponent(dominio), agencia.id, String(n));
  if (!v) return NextResponse.json({ error: `No se encontró el dominio '${dominio}'` }, { status: 404 });
  return NextResponse.json(v);
}
