import { NextRequest, NextResponse } from "next/server";
import { urlAutorizacion } from "@/lib/meta";
import { agenciaDesdeRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const redirectUri = `${req.nextUrl.origin}/api/canales/meta/callback`;
  try {
    return NextResponse.redirect(urlAutorizacion(redirectUri, agencia.id));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
