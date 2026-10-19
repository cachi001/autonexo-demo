import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/data";
import { agenciaDesdeRequest, COOKIE_SESION } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_SESION)?.value;
  if (!token) return NextResponse.json({ autenticado: false }, { status: 401 });
  const sesion = await obtenerSesion(token);
  if (!sesion) return NextResponse.json({ autenticado: false }, { status: 401 });

  if (sesion.rol === "admin") {
    return NextResponse.json({ autenticado: true, rol: "admin" });
  }

  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ autenticado: false }, { status: 401 });
  return NextResponse.json({
    autenticado: true,
    rol: "agencia",
    agencia: { id: agencia.id, razon_social: agencia.razon_social },
  });
}
