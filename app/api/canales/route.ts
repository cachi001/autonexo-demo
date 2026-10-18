import { NextRequest, NextResponse } from "next/server";
import { listarCanalesConectados, desconectarCanal, Canal } from "@/lib/data";

export async function GET(req: NextRequest) {
  const agenciaId = req.nextUrl.searchParams.get("agenciaId");
  if (!agenciaId) return NextResponse.json({ error: "Falta agenciaId." }, { status: 400 });
  const canales = await listarCanalesConectados(agenciaId);
  return NextResponse.json({ canales });
}

export async function DELETE(req: NextRequest) {
  const { agenciaId, canal } = (await req.json()) as { agenciaId: string; canal: Canal };
  if (!agenciaId || !canal) return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
  await desconectarCanal(agenciaId, canal);
  return NextResponse.json({ ok: true });
}
