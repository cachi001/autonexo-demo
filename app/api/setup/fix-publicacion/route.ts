import { NextRequest, NextResponse } from "next/server";
import { setPublicacion } from "@/lib/data";

// Ruta temporal -borrar junto con SETUP_SECRET después de usarla. Corrige el
// registro de publicaciones del Ford Fiesta (AC456EF): estaba guardado como
// "publicado" cuando en realidad ML lo puso en revisión por precio por
// debajo del mínimo de mercado -no visible al público. Esto deja la tabla de
// Canales externos reflejando la verdad real de Mercado Libre.
export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const pub = await setPublicacion({
    dominio: "AC456EF",
    canal: "mercadolibre",
    estado: "error",
    error_msg:
      "El precio no es acorde al mercado. (El precio del vehículo usado $7200000.00 es irrisorio (límite: $10527487.05))",
  });
  return NextResponse.json({ ok: true, pub });
}
