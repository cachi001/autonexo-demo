import { NextRequest, NextResponse } from "next/server";
import { setFichaTecnica } from "@/lib/data";
import { agenciaDesdeRequest } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { dominio } = await params;
  const body = await req.json();
  const v = await setFichaTecnica(decodeURIComponent(dominio), agencia.id, {
    version: (body.version || "").trim(),
    combustible: (body.combustible || "").trim(),
    puertas: (body.puertas || "").trim(),
    chasis: body.chasis !== undefined ? String(body.chasis).trim() : undefined,
  });
  if (!v) return NextResponse.json({ error: `No se encontró el dominio '${dominio}'` }, { status: 404 });
  return NextResponse.json(v);
}
