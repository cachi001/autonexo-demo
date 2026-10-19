import { NextRequest, NextResponse } from "next/server";
import { actualizarEstadoLead, obtenerLead, buscarVehiculo } from "@/lib/data";
import { agenciaDesdeRequest } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const estado = body.estado;
  if (!["pendiente", "respondido", "cerrado"].includes(estado)) {
    return NextResponse.json({ error: `Estado inválido: ${estado}` }, { status: 400 });
  }

  const leadActual = await obtenerLead(id);
  if (!leadActual) return NextResponse.json({ error: `No se encontró el lead '${id}'` }, { status: 404 });
  // El lead es de un vehículo -> solo la agencia dueña de ese vehículo
  // puede cambiarle el estado (ver buscarVehiculo, ya scopeado por agencia).
  if (!(await buscarVehiculo(leadActual.dominio, agencia.id))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const lead = await actualizarEstadoLead(id, estado);
  return NextResponse.json(lead);
}
