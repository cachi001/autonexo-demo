import { NextRequest, NextResponse } from "next/server";
import { actualizarAgencia, obtenerAgencia } from "@/lib/data";
import { agenciaDesdeRequest, esAdminDesdeRequest } from "@/lib/auth";

// Una agencia solo puede ver/editar su propia ficha (ver lib/auth.ts); el
// admin de AutoNexo puede ver cualquiera (no editar, eso es exclusivo de la
// agencia). Antes esto era público para cualquier id -> cualquiera con el
// id de otra agencia (que ni siquiera hace falta adivinar, viaja en la URL
// de /stock/canales) podía leer y pisar sus datos de contacto.
async function autorizado(req: NextRequest, id: string): Promise<boolean> {
  const agencia = await agenciaDesdeRequest(req);
  if (agencia && agencia.id === id) return true;
  return esAdminDesdeRequest(req);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await autorizado(req, id))) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const agencia = await obtenerAgencia(id);
  if (!agencia) return NextResponse.json({ error: `No se encontró la agencia '${id}'` }, { status: 404 });
  return NextResponse.json(agencia);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agenciaSesion = await agenciaDesdeRequest(req);
  if (!agenciaSesion || agenciaSesion.id !== id) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
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
