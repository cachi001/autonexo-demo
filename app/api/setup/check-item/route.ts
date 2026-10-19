import { NextRequest, NextResponse } from "next/server";
import { listarAgencias, obtenerCanalConectado, guardarCanalConectado } from "@/lib/data";
import { refrescarToken } from "@/lib/mercadolibre";

// Ruta temporal de solo lectura -borrar junto con SETUP_SECRET después de
// usarla. Chequea el estado real en ML de un item_id pasado por query.
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta ?id=" }, { status: 400 });

  const agencias = await listarAgencias();
  const agencia = agencias[0];
  let conectado = await obtenerCanalConectado(agencia.id, "mercadolibre");
  if (!conectado) return NextResponse.json({ error: "ML no conectado." }, { status: 400 });
  const yaVencido = new Date(conectado.expires_at).getTime() - Date.now() < 5 * 60 * 1000;
  if (yaVencido) {
    const nuevo = await refrescarToken(conectado.refresh_token);
    conectado = await guardarCanalConectado({
      agencia_id: agencia.id,
      canal: "mercadolibre",
      access_token: nuevo.access_token,
      refresh_token: nuevo.refresh_token,
      expires_at: new Date(Date.now() + nuevo.expires_in * 1000).toISOString(),
      cuenta_externa_id: conectado.cuenta_externa_id,
      cuenta_externa_nombre: conectado.cuenta_externa_nombre,
    });
  }
  const res = await fetch(`https://api.mercadolibre.com/items/${id}`, {
    headers: { Authorization: `Bearer ${conectado.access_token}` },
  });
  const data = await res.json();
  return NextResponse.json({ status: data.status, sub_status: data.sub_status, data });
}
