import { NextResponse } from "next/server";
import { buscarVehiculoPublico } from "@/lib/data";

// Sirve UNA foto del stock como imagen real en una URL pública -las fotos se
// guardan como data URL (base64) directo en Postgres, que sirve para <img
// src> dentro de la app, pero Instagram exige que la imagen esté en una URL
// pública de verdad (image_url) para poder publicarla -no acepta el archivo
// ni el base64 directo. Esta ruta es ese puente. A propósito SIN sesión: la
// pide el servidor de Meta/Instagram, no el navegador de la agencia -no
// tiene la cookie de sesión, así que no puede pasar por agenciaDesdeRequest.
export async function GET(_req: Request, { params }: { params: Promise<{ dominio: string; indice: string }> }) {
  const { dominio, indice } = await params;
  const vehiculo = await buscarVehiculoPublico(decodeURIComponent(dominio));
  if (!vehiculo) return new NextResponse("No encontrado", { status: 404 });

  const foto = vehiculo.fotos[parseInt(indice, 10)];
  if (!foto) return new NextResponse("No encontrado", { status: 404 });

  const match = foto.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) return new NextResponse("Formato de imagen inválido", { status: 500 });
  const [, contentType, base64] = match;
  const bytes = Buffer.from(base64, "base64");

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
