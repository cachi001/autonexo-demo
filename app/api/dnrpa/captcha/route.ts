import { NextResponse } from "next/server";

// Proxy al formulario oficial y gratuito de "Radicación por Patente" de la
// DNRPA (https://www.dnrpa.gov.ar/portal_dnrpa/radicacion2.php). No hay API
// pública — esto reproduce exactamente lo que ve cualquier ciudadano que
// entra a esa URL a mano: un dominio, una imagen de captcha embebida como
// base64 directamente en el HTML, y un código verificador.
//
// Probado en vivo (curl, 2026-10-17): el captcha NO está atado a una cookie
// de sesión — el servidor no manda ningún Set-Cookie. El código mostrado en
// la imagen es válido para cualquiera que lo mande en el siguiente POST,
// hasta que se usa una vez ("Código verificador incorrecto o ya utilizado").
// Por eso este endpoint no necesita devolver ni manejar ningún token de
// sesión: alcanza con mostrar la imagen y mandar el código que el empleado
// tipeó junto con el dominio en /api/dnrpa/consultar.
const DNRPA_FORM_URL = "https://www.dnrpa.gov.ar/portal_dnrpa/radicacion2.php";

export async function GET() {
  try {
    const res = await fetch(DNRPA_FORM_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AutoNexo/1.0)" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: "No se pudo conectar con la DNRPA. Probá de nuevo en unos segundos." }, { status: 502 });
    }
    const html = await res.text();
    const match = html.match(/src="data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=]+)"/i);
    if (!match) {
      return NextResponse.json({ error: "La DNRPA cambió el formulario y no se pudo leer el captcha. Avisá a soporte." }, { status: 502 });
    }
    const captchaImage = `data:image/${match[1]};base64,${match[2]}`;
    return NextResponse.json({ captchaImage });
  } catch {
    return NextResponse.json({ error: "No se pudo conectar con la DNRPA. Probá de nuevo en unos segundos." }, { status: 502 });
  }
}
