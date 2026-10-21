import { NextResponse } from "next/server";
import { listarPublicacionesPublicas } from "@/lib/data";

export const dynamic = "force-dynamic";

// Público, sin sesión -versión en bloque de app/api/catalogo/[dominio]/publicaciones
// para que la lista de tarjetas del catálogo (/catalogo) muestre "publicado
// en" sin tener que pedir la ficha de cada vehículo uno por uno.
export async function GET() {
  const publicaciones = await listarPublicacionesPublicas();
  return NextResponse.json({ publicaciones });
}
