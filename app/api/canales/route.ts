import { NextRequest, NextResponse } from "next/server";
import { listarCanalesConectados, desconectarCanal, Canal } from "@/lib/data";
import { agenciaDesdeRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const canales = await listarCanalesConectados(agencia.id);
  return NextResponse.json({ canales });
}

export async function DELETE(req: NextRequest) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { canal } = (await req.json()) as { canal: Canal };
  if (!canal) return NextResponse.json({ error: "Falta el canal." }, { status: 400 });
  await desconectarCanal(agencia.id, canal);
  return NextResponse.json({ ok: true });
}
