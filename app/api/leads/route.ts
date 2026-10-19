import { NextRequest, NextResponse } from "next/server";
import { listarLeads, listarStock } from "@/lib/data";
import { agenciaDesdeRequest } from "@/lib/auth";

export const dynamic = "force-dynamic"; // ver nota en app/api/stock/route.ts

// La tabla leads no tiene columna agencia_id propia -> se filtra por
// pertenencia del dominio, que listarStock(agencia.id) ya devuelve scopeado.
// Antes esto devolvía TODOS los leads de TODAS las agencias sin filtrar.
export async function GET(req: NextRequest) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const vehiculosPropios = await listarStock(agencia.id);
  const vehiculos = Object.fromEntries(vehiculosPropios.map((v) => [v.dominio, v]));
  const leads = (await listarLeads())
    .filter((l) => l.dominio in vehiculos)
    .map((l) => ({ ...l, vehiculo_titulo: `${vehiculos[l.dominio].marca} ${vehiculos[l.dominio].modelo}` }));
  return NextResponse.json({ leads });
}
