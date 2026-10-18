import { NextRequest, NextResponse } from "next/server";
import { aplicarDatosDnrpa } from "@/lib/data";

export async function POST(req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const { dominio } = await params;
  const body = await req.json();
  const marca = (body.marca || "").trim();
  const modelo = (body.modelo || "").trim();
  const anio = (body.anio || "").trim();
  if (!marca || !modelo) {
    return NextResponse.json({ error: "Faltan marca o modelo." }, { status: 400 });
  }
  const v = await aplicarDatosDnrpa(decodeURIComponent(dominio), { marca, modelo, anio });
  if (!v) return NextResponse.json({ error: `No se encontró el dominio '${dominio}'` });
  return NextResponse.json(v);
}
