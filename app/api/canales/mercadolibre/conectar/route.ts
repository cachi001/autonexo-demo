import { NextRequest, NextResponse } from "next/server";
import { urlAutorizacion } from "@/lib/mercadolibre";

// Primer paso del OAuth real de Mercado Libre: redirige a la pantalla de
// autorización de ML. agenciaId viaja en el "state" para poder guardar el
// token contra la agencia correcta cuando ML vuelva al callback.
export async function GET(req: NextRequest) {
  const agenciaId = req.nextUrl.searchParams.get("agenciaId");
  if (!agenciaId) {
    return NextResponse.json({ error: "Falta agenciaId." }, { status: 400 });
  }
  const redirectUri = `${req.nextUrl.origin}/api/canales/mercadolibre/callback`;
  try {
    const url = urlAutorizacion(redirectUri, agenciaId);
    return NextResponse.redirect(url);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
