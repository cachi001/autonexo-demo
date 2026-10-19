import { NextResponse } from "next/server";
import { listarStockPublico } from "@/lib/data";

export const dynamic = "force-dynamic"; // ver nota en app/api/stock/route.ts

export async function GET() {
  // lado comprador: catálogo cruza TODAS las agencias a propósito (ver
  // AutoNexo/CLAUDE.md "Storefront solo agencias"), sin métricas internas.
  const vehiculos = (await listarStockPublico()).map(({ vistas_reales, ...resto }) => resto);
  return NextResponse.json({ vehiculos });
}
