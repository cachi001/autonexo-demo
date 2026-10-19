import { NextRequest, NextResponse } from "next/server";
import { agregarFotos, quitarFoto } from "@/lib/data";
import { agenciaDesdeRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { dominio } = await params;
  const form = await req.formData();
  const archivos = form.getAll("fotos") as File[];
  if (!archivos.length) return NextResponse.json({ error: "No se mandaron fotos" }, { status: 400 });

  const base64s: string[] = [];
  for (const archivo of archivos) {
    const buffer = Buffer.from(await archivo.arrayBuffer());
    base64s.push(`data:${archivo.type};base64,${buffer.toString("base64")}`);
  }

  const vehiculo = await agregarFotos(dominio, agencia.id, base64s);
  if (!vehiculo) return NextResponse.json({ error: `No se encontró el dominio '${dominio}'` }, { status: 404 });
  return NextResponse.json({ fotos: vehiculo.fotos });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { dominio } = await params;
  const { indice } = await req.json();
  const vehiculo = await quitarFoto(dominio, agencia.id, indice);
  if (!vehiculo) return NextResponse.json({ error: `No se encontró el dominio '${dominio}'` }, { status: 404 });
  return NextResponse.json({ fotos: vehiculo.fotos });
}
