import { NextRequest, NextResponse } from "next/server";
import { crearLead, buscarVehiculo } from "@/lib/data";

export async function POST(req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const { dominio } = await params;
  const dom = decodeURIComponent(dominio);
  if (!buscarVehiculo(dom)) {
    return NextResponse.json({ error: `No se encontró el dominio '${dom}'` });
  }
  const body = await req.json();
  // Nunca confirma ni promete nada por sí sola: solo registra el interés como
  // pendiente, igual que el prototipo original.
  const lead = crearLead(dom, body.nombre, body.mensaje, body.telefono);
  return NextResponse.json({ ok: true, lead });
}
