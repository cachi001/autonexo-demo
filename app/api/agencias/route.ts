import { NextRequest, NextResponse } from "next/server";
import { crearAgencia } from "@/lib/data";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { razon_social, cuit, contacto_nombre, contacto_email, contacto_telefono } = body;
  if (!razon_social?.trim() || !cuit?.trim() || !contacto_nombre?.trim() || !contacto_email?.trim()) {
    return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
  }
  const agencia = await crearAgencia({
    razon_social,
    cuit,
    contacto_nombre,
    contacto_email,
    contacto_telefono: contacto_telefono || "",
  });
  return NextResponse.json(agencia, { status: 201 });
}
