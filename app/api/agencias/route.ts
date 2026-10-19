import { NextRequest, NextResponse } from "next/server";
import { crearAgencia, listarAgencias, crearSesion } from "@/lib/data";
import { hashPassword, esAdminDesdeRequest, COOKIE_SESION } from "@/lib/auth";

// Listado completo de agencias: solo lo usa el panel /admin (ver lib/auth.ts
// esAdminDesdeRequest). Antes esto era público -cualquiera podía pedir los
// datos de contacto de todas las agencias dadas de alta-, quedó cerrado acá.
export async function GET(req: NextRequest) {
  if (!(await esAdminDesdeRequest(req))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
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
    password,
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
    !password ||
    password.length < 8 ||
    !celular_codigo_area?.trim() ||
    !celular_numero?.trim() ||
    !celular_operador?.trim()
  ) {
    return NextResponse.json({ error: "Faltan datos obligatorios o la contraseña es muy corta." }, { status: 400 });
  }
  const password_hash = await hashPassword(password);
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
    password_hash,
  });

  const token = await crearSesion(agencia.id, "agencia");
  const res = NextResponse.json(agencia, { status: 201 });
  res.cookies.set(COOKIE_SESION, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
