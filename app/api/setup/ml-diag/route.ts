import { NextRequest, NextResponse } from "next/server";
import { listarAgencias, obtenerCanalConectado, guardarCanalConectado } from "@/lib/data";
import { refrescarToken } from "@/lib/mercadolibre";

// Ruta temporal de diagnóstico -borrar junto con SETUP_SECRET después de usarla.
async function tokenVigente() {
  const agencias = await listarAgencias();
  const agencia = agencias[0];
  let conectado = await obtenerCanalConectado(agencia.id, "mercadolibre");
  if (!conectado) throw new Error("Mercado Libre no conectado.");
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
  return conectado.access_token;
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const accessToken = await tokenVigente();
  const modRes = await fetch(
    `https://api.mercadolibre.com/moderations/last_moderation/MLA2211864243-ITM`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const moderacion = await modRes.json();
  return NextResponse.json({ moderacion });
}

export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get("secret") !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const accessToken = await tokenVigente();
  const { id, status } = (await req.json()) as { id: string; status: string };
  const res = await fetch(`https://api.mercadolibre.com/items/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  return NextResponse.json({ httpStatus: res.status, data });
}
