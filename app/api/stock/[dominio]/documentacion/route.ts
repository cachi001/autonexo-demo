import { NextRequest, NextResponse } from "next/server";
import { setDocumentacionValidada } from "@/lib/data";

export async function POST(req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const { dominio } = await params;
  const body = await req.json();
  const v = setDocumentacionValidada(decodeURIComponent(dominio), !!body.validada);
  if (!v) return NextResponse.json({ error: `No se encontró el dominio '${dominio}'` });
  return NextResponse.json(v);
}
