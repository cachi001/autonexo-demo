import { NextRequest, NextResponse } from "next/server";
import { urlAutorizacion } from "@/lib/meta";

export async function GET(req: NextRequest) {
  const agenciaId = req.nextUrl.searchParams.get("agenciaId");
  if (!agenciaId) return NextResponse.json({ error: "Falta agenciaId." }, { status: 400 });
  const redirectUri = `${req.nextUrl.origin}/api/canales/meta/callback`;
  try {
    return NextResponse.redirect(urlAutorizacion(redirectUri, agenciaId));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
