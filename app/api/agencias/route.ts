import { NextRequest, NextResponse } from "next/server";
import { crearAgencia, listarAgencias } from "@/lib/data";

export async function GET() {
  const agencias = await listarAgencias();
  return NextResponse.json({ agencias });
}

export async function POST(req: NextRequest) {
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
    !razon_social?.trim() ||
    !cuit?.trim() ||
    !contacto_nombre?.trim() ||
    !contacto_apellido?.trim() ||
    !contacto_email?.trim() ||
    !celular_codigo_area?.trim() ||
    !celular_numero?.trim() ||
    !celular_operador?.trim()
  ) {
    return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
  }
  const agencia = await crearAgencia({
    razon_social,
    cuit,
    contacto_nombre,
    contacto_apellido,
    contacto_email,
    celular_codigo_area,
    celular_numero,
    celular_operador,
    telefono_fijo_codigo_area: telefono_fijo_codigo_area || "",
    telefono_fijo_numero: telefono_fijo_numero || "",
  });
  return NextResponse.json(agencia, { status: 201 });
}
