import { NextRequest, NextResponse } from "next/server";
import { urlAutorizacion } from "@/lib/mercadolibre";
import { agenciaDesdeRequest } from "@/lib/auth";

// Primer paso del OAuth real de Mercado Libre: redirige a la pantalla de
// autorización de ML. agenciaId viaja en el "state" para poder guardar el
// token contra la agencia correcta cuando ML vuelva al callback -sale de la
// sesión del server, no de un query param del cliente, así nadie puede
// pedir que el token quede guardado contra una agencia que no es la suya.
export async function GET(req: NextRequest) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const redirectUri = `${req.nextUrl.origin}/api/canales/mercadolibre/callback`;
  try {
    const url = urlAutorizacion(redirectUri, agencia.id);
    return NextResponse.redirect(url);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
