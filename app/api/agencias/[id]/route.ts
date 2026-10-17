import { NextRequest, NextResponse } from "next/server";
import { actualizarAgencia, obtenerAgencia } from "@/lib/data";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agencia = await obtenerAgencia(id);
  if (!agencia) return NextResponse.json({ error: `No se encontró la agencia '${id}'` }, { status: 404 });
  return NextResponse.json(agencia);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const {
    razon_social,
    cuit,
    contacto_nombre,
    contacto_apellido,
    contacto_email,
    celular_codigo_area,
    celular_numero,
    celular_operador,
    telefono_fijo_codigo_area,
    telefono_fijo_numero,
  } = body;

  if (
    razon_social !== undefined && !razon_social?.trim() ||
    cuit !== undefined && !cuit?.trim() ||
    contacto_nombre !== undefined && !contacto_nombre?.trim() ||
    contacto_apellido !== undefined && !contacto_apellido?.trim() ||
    contacto_email !== undefined && !contacto_email?.trim() ||
    celular_codigo_area !== undefined && !celular_codigo_area?.trim() ||
    celular_numero !== undefined && !celular_numero?.trim() ||
    celular_operador !== undefined && !celular_operador?.trim()
  ) {
    return NextResponse.json({ error: "Los campos obligatorios no pueden quedar vacíos" }, { status: 400 });
  }

  const agencia = await actualizarAgencia(id, {
    razon_social,
    cuit,
    contacto_nombre,
    contacto_apellido,
    contacto_email,
    celular_codigo_area,
    celular_numero,
    celular_operador,
    telefono_fijo_codigo_area,
    telefono_fijo_numero,
  });
  if (!agencia) return NextResponse.json({ error: `No se encontró la agencia '${id}'` }, { status: 404 });
  return NextResponse.json(agencia);
}
