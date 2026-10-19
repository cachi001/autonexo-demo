import { NextRequest, NextResponse } from "next/server";
import { listarPublicacionesDeAgencia } from "@/lib/data";
import { agenciaDesdeRequest } from "@/lib/auth";

// Agencia-wide, no por vehículo -alimenta el aviso del Resumen y el badge
// del menú, para que la agencia se entere de un rechazo de ML sin tener que
// entrar a Canales externos por las dudas.
export async function GET(req: NextRequest) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const publicaciones = await listarPublicacionesDeAgencia(agencia.id);
  const errores = publicaciones.filter((p) => p.estado === "error");
  return NextResponse.json({ errores });
}
