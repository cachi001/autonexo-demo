import { NextResponse } from "next/server";
import { listarLeads, listarStock } from "@/lib/data";

export const dynamic = "force-dynamic"; // ver nota en app/api/stock/route.ts

export async function GET() {
  const vehiculos = Object.fromEntries(listarStock().map((v) => [v.dominio, v]));
  const leads = listarLeads().map((l) => {
    const veh = vehiculos[l.dominio];
    return { ...l, vehiculo_titulo: veh ? `${veh.marca} ${veh.modelo}` : "(vehículo eliminado)" };
  });
  return NextResponse.json({ leads });
}
