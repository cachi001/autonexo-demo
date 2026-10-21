import { NextRequest, NextResponse } from "next/server";
import { eliminarVehiculo } from "@/lib/data";
import { agenciaDesdeRequest } from "@/lib/auth";

// Eliminar el vehículo completo del stock -antes no existía (solo había
// DELETE para fotos y documentos sueltos, nunca para el vehículo en sí). Ver
// lib/data.ts#eliminarVehiculo para la decisión de bloquear en vez de
// desactivar en cascada.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { dominio } = await params;
  const resultado = await eliminarVehiculo(decodeURIComponent(dominio), agencia.id);
  if (!resultado.ok) return NextResponse.json({ error: resultado.error }, { status: 422 });
  return NextResponse.json({ ok: true });
}
