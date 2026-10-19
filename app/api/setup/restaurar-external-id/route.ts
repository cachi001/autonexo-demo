import { NextRequest, NextResponse } from "next/server";
import { setPublicacion } from "@/lib/data";

// Ruta temporal -borrar junto con SETUP_SECRET después de usarla. La
// corrección manual anterior del Ford Fiesta pisó external_id/permalink con
// "" (no se pasaron en ese POST) -esto los restaura al ítem real de ML para
// que el próximo "Publicar" actualice ESE aviso en vez de crear uno nuevo.
export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const pub = await setPublicacion({
    dominio: "AC456EF",
    canal: "mercadolibre",
    estado: "en_revision",
    external_id: "MLA2211864243",
    permalink: "http://auto.mercadolibre.com.ar/MLA-2211864243-ford-fiesta-2018-_JM",
    error_msg:
      "El precio no es acorde al mercado. (El precio del vehículo usado $7200000.00 es irrisorio (límite: $10527487.05))",
  });
  return NextResponse.json({ ok: true, pub });
}
