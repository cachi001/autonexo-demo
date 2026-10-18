import { NextRequest, NextResponse } from "next/server";
import { intercambiarCodigo, obtenerUsuario } from "@/lib/mercadolibre";
import { guardarCanalConectado } from "@/lib/data";

// Segundo paso del OAuth: ML vuelve acá con el código, lo cambiamos por un
// access_token real y lo guardamos contra la agencia (viajó en "state").
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const agenciaId = req.nextUrl.searchParams.get("state");
  const errorMl = req.nextUrl.searchParams.get("error");

  if (errorMl) {
    return NextResponse.redirect(`${req.nextUrl.origin}/stock/canales?error=${encodeURIComponent(errorMl)}`);
  }
  if (!code || !agenciaId) {
    return NextResponse.redirect(`${req.nextUrl.origin}/stock/canales?error=Falta%20code%20o%20agencia`);
  }

  try {
    const redirectUri = `${req.nextUrl.origin}/api/canales/mercadolibre/callback`;
    const token = await intercambiarCodigo(code, redirectUri);
    const usuario = await obtenerUsuario(token.access_token);
    await guardarCanalConectado({
      agencia_id: agenciaId,
      canal: "mercadolibre",
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
      cuenta_externa_id: String(usuario.id),
      cuenta_externa_nombre: usuario.nickname,
    });
    return NextResponse.redirect(`${req.nextUrl.origin}/stock/canales?conectado=mercadolibre`);
  } catch (e) {
    return NextResponse.redirect(`${req.nextUrl.origin}/stock/canales?error=${encodeURIComponent(String(e))}`);
  }
}
