import { NextRequest, NextResponse } from "next/server";
import { conectarPrimeraPagina } from "@/lib/meta";
import { guardarCanalConectado } from "@/lib/data";

// Una sola conexión con Meta guarda los DOS canales (facebook + instagram,
// si la Página tiene una cuenta de Instagram profesional vinculada) -no
// existe conectar Instagram sin pasar por Facebook en la API real.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const agenciaId = req.nextUrl.searchParams.get("state");
  const errorMeta = req.nextUrl.searchParams.get("error_message") || req.nextUrl.searchParams.get("error");

  if (errorMeta) {
    return NextResponse.redirect(`${req.nextUrl.origin}/stock/canales?error=${encodeURIComponent(errorMeta)}`);
  }
  if (!code || !agenciaId) {
    return NextResponse.redirect(`${req.nextUrl.origin}/stock/canales?error=Falta%20code%20o%20agencia`);
  }

  try {
    const redirectUri = `${req.nextUrl.origin}/api/canales/meta/callback`;
    const conexion = await conectarPrimeraPagina(code, redirectUri);

    await guardarCanalConectado({
      agencia_id: agenciaId,
      canal: "facebook",
      access_token: conexion.pageAccessToken,
      refresh_token: "",
      expires_at: conexion.expiresAt,
      cuenta_externa_id: conexion.pageId,
      cuenta_externa_nombre: conexion.pageNombre,
    });

    if (conexion.igUserId) {
      await guardarCanalConectado({
        agencia_id: agenciaId,
        canal: "instagram",
        access_token: conexion.pageAccessToken,
        refresh_token: "",
        expires_at: conexion.expiresAt,
        cuenta_externa_id: conexion.igUserId,
        cuenta_externa_nombre: conexion.pageNombre,
      });
    }

    return NextResponse.redirect(
      `${req.nextUrl.origin}/stock/canales?conectado=${conexion.igUserId ? "Facebook e Instagram" : "Facebook (sin Instagram vinculado)"}`
    );
  } catch (e) {
    return NextResponse.redirect(`${req.nextUrl.origin}/stock/canales?error=${encodeURIComponent(String(e))}`);
  }
}
