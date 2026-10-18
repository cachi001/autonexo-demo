import { NextResponse } from "next/server";
import { listarPublicaciones } from "@/lib/data";

export async function GET(_req: Request, { params }: { params: Promise<{ dominio: string }> }) {
  const { dominio } = await params;
  const publicaciones = await listarPublicaciones(decodeURIComponent(dominio));
  return NextResponse.json({ publicaciones });
}
