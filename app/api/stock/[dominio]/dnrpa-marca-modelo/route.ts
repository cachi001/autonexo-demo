import { NextRequest, NextResponse } from "next/server";
import { aplicarDatosDnrpa } from "@/lib/data";
import { agenciaDesdeRequest } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { dominio } = await params;
  const body = await req.json();
  const marca = (body.marca || "").trim();
  const modelo = (body.modelo || "").trim();
  const anio = (body.anio || "").trim();
  if (!marca || !modelo) {
    return NextResponse.json({ error: "Faltan marca o modelo." }, { status: 400 });
  }
  const v = await aplicarDatosDnrpa(decodeURIComponent(dominio), agencia.id, { marca, modelo, anio });
  if (!v) return NextResponse.json({ error: `No se encontró el dominio '${dominio}'` }, { status: 404 });
  return NextResponse.json(v);
}
