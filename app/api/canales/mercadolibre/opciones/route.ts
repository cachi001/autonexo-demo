import { NextRequest, NextResponse } from "next/server";
import { obtenerCanalConectado, obtenerAgencia, guardarCanalConectado } from "@/lib/data";
import { obtenerPaquetesPublicacion, obtenerUsuario, refrescarToken } from "@/lib/mercadolibre";
import { agenciaDesdeRequest } from "@/lib/auth";

// Antes de abrir el modal de "Publicar en Mercado Libre", el frontend
// consulta acá qué tipos de publicación tiene disponibles de verdad la
// cuenta conectada (en vez de ofrecer "free" fijo sin saber si corresponde)
// y si la agencia ya completó su ubicación real (obligatoria para publicar,
// ver Datos de la agencia) -así el modal puede avisar ANTES de que la
// agencia pierda tiempo completando título/descripción si todavía falta.
export async function GET(req: NextRequest) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  let conectado = await obtenerCanalConectado(agencia.id, "mercadolibre");
  if (!conectado) {
    return NextResponse.json({ error: "Mercado Libre no está conectado. Conectalo en Conexiones." }, { status: 400 });
  }

  const yaVencido = new Date(conectado.expires_at).getTime() - Date.now() < 5 * 60 * 1000;
  if (yaVencido) {
    try {
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
    } catch {
      return NextResponse.json(
        { error: "La conexión con Mercado Libre venció y no se pudo renovar, reconectá la cuenta en Conexiones." },
        { status: 502 }
      );
    }
  }

  let listingTypes;
  try {
    const usuario = await obtenerUsuario(conectado.access_token);
    listingTypes = await obtenerPaquetesPublicacion(conectado.access_token, usuario.id);
  } catch {
    listingTypes = [{ id: "free", nombre: "Básico", disponibles: null }];
  }

  const agenciaCompleta = await obtenerAgencia(agencia.id);
  const ubicacionCompleta = Boolean(agenciaCompleta?.ciudad.trim() && agenciaCompleta?.provincia_id.trim());

  return NextResponse.json({
    listingTypes,
    ciudad: agenciaCompleta?.ciudad || "",
    provinciaNombre: agenciaCompleta?.provincia_nombre || "",
    ubicacionCompleta,
  });
}
