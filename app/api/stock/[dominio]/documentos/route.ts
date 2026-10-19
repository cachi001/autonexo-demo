import { NextRequest, NextResponse } from "next/server";
import { setDocumentoVehiculo } from "@/lib/data";
import { agenciaDesdeRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Sube o reemplaza un documento individual de la checklist (cédula, título,
// libre deuda ATM, seguro, VTV/RTO, verificación de chasis) sin tener que
// re-cargar todo el vehículo. Mismo patrón que /fotos: solo evidencia, sin
// OCR ni validación automática.
export async function POST(req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { dominio } = await params;
  const form = await req.formData();
  const clave = form.get("clave") as string | null;
  const archivo = form.get("archivo") as File | null;
  if (!clave) return NextResponse.json({ error: "Falta la clave del documento" }, { status: 400 });
  if (!archivo) return NextResponse.json({ error: "No se mandó archivo" }, { status: 400 });

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const dataUrl = `data:${archivo.type};base64,${buffer.toString("base64")}`;

  const vehiculo = await setDocumentoVehiculo(decodeURIComponent(dominio), agencia.id, clave, { nombre: archivo.name, dataUrl });
  if (!vehiculo) return NextResponse.json({ error: `No se encontró el dominio '${dominio}'` }, { status: 404 });
  return NextResponse.json({ documentos: vehiculo.documentos });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { dominio } = await params;
  const { clave } = await req.json();
  if (!clave) return NextResponse.json({ error: "Falta la clave del documento" }, { status: 400 });

  const vehiculo = await setDocumentoVehiculo(decodeURIComponent(dominio), agencia.id, clave, null);
  if (!vehiculo) return NextResponse.json({ error: `No se encontró el dominio '${dominio}'` }, { status: 404 });
  return NextResponse.json({ documentos: vehiculo.documentos });
}
