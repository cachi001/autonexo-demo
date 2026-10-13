import { NextResponse } from "next/server";
import { listarStock, contarLeadsPorDominio } from "@/lib/data";

// Sin esto, Next.js la pre-renderiza como estática en el build (congelada
// con los datos de ese momento) en vez de ejecutarla en cada request — bug
// real encontrado esta sesión: /api/leads devolvía siempre [] aunque se
// creara un lead nuevo, porque quedó "cacheada" vacía desde el build.
export const dynamic = "force-dynamic";

export async function GET() {
  const conteo = await contarLeadsPorDominio();
  const vehiculos = (await listarStock()).map((v) => ({
    ...v,
    consultas_reales: conteo[v.dominio] || 0,
  }));
  return NextResponse.json({ vehiculos });
}
