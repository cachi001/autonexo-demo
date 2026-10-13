import { NextResponse } from "next/server";
import { listarStock } from "@/lib/data";

export const dynamic = "force-dynamic"; // ver nota en app/api/stock/route.ts

export async function GET() {
  // lado comprador: sin métricas internas de la agencia
  const vehiculos = listarStock().map(({ vistas_reales, ...resto }) => resto);
  return NextResponse.json({ vehiculos });
}
