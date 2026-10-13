import { NextRequest, NextResponse } from "next/server";
import { agregarFotos, quitarFoto } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const { dominio } = await params;
  const form = await req.formData();
  const archivos = form.getAll("fotos") as File[];
  if (!archivos.length) return NextResponse.json({ error: "No se mandaron fotos" }, { status: 400 });

  const base64s: string[] = [];
  for (const archivo of archivos) {
    const buffer = Buffer.from(await archivo.arrayBuffer());
    base64s.push(`data:${archivo.type};base64,${buffer.toString("base64")}`);
  }

  const vehiculo = await agregarFotos(dominio, base64s);
  if (!vehiculo) return NextResponse.json({ error: `No se encontró el dominio '${dominio}'` }, { status: 404 });
  return NextResponse.json({ fotos: vehiculo.fotos });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const { dominio } = await params;
  const { indice } = await req.json();
  const vehiculo = await quitarFoto(dominio, indice);
  if (!vehiculo) return NextResponse.json({ error: `No se encontró el dominio '${dominio}'` }, { status: 404 });
  return NextResponse.json({ fotos: vehiculo.fotos });
}
