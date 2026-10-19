import { NextRequest, NextResponse } from "next/server";
import { buscarVehiculo, listarPublicaciones, obtenerCanalConectado, guardarCanalConectado, setPublicacion } from "@/lib/data";
import { actualizarItem, refrescarToken } from "@/lib/mercadolibre";
import { agenciaDesdeRequest } from "@/lib/auth";

// Gestión real sobre un aviso YA creado en Mercado Libre, pedida porque
// Canales externos solo mostraba el estado sin dar ninguna acción posible.
// "pausar" y "reanudar" son reversibles (ML permite volver atrás). "eliminar"
// cierra el aviso de forma permanente en ML (status "closed"); si la agencia
// quiere venderlo de nuevo ahí, hay que publicarlo otra vez como un ítem
// nuevo, no se puede reabrir el mismo id.
//
// Un aviso en estado "payment_required" (pendiente de pago, sin pagar
// todavía) NO se puede cancelar por esta vía: la API de Mercado Libre
// devuelve error para esos casos, solo se cancela desde la cuenta real de ML
// (confirmado en vivo, ver AutoNexo/CLAUDE.md, sección Compliance).
export async function POST(req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { dominio } = await params;
  const { accion } = (await req.json()) as { accion: "pausar" | "reanudar" | "eliminar" | "cancelar" };

  const vehiculo = await buscarVehiculo(decodeURIComponent(dominio), agencia.id);
  if (!vehiculo) return NextResponse.json({ error: `No se encontró el dominio '${dominio}'` }, { status: 404 });

  const publicaciones = await listarPublicaciones(vehiculo.dominio);
  const publicacionMl = publicaciones.find((p) => p.canal === "mercadolibre");

  // "cancelar" es solo para un estado "error" puro, donde nunca se creó nada
  // en ML (no hay external_id) -ahí no hace falta ninguna llamada a la API,
  // alcanza con borrar el error local para que la agencia pueda reintentar
  // desde cero. Si ya existe un aviso real (en_revision/pausado/publicado),
  // esto se rechaza a propósito -esos casos van por "Eliminar", que sí llama
  // a ML, porque cancelar sin avisarle a ML dejaría un aviso real huérfano.
  if (accion === "cancelar") {
    if (publicacionMl?.external_id) {
      return NextResponse.json(
        { error: "Este aviso ya existe en Mercado Libre, no se puede cancelar sin eliminarlo ahí. Usá Eliminar." },
        { status: 400 }
      );
    }
    const pub = await setPublicacion({ dominio: vehiculo.dominio, canal: "mercadolibre", estado: "sin_publicar", error_msg: "" });
    return NextResponse.json({ ok: true, publicacion: pub });
  }

  const previaMl = publicaciones.find((p) => p.canal === "mercadolibre" && p.external_id);
  if (!previaMl) {
    return NextResponse.json({ error: "Este vehículo no tiene ningún aviso de Mercado Libre para gestionar." }, { status: 400 });
  }

  let conectado = await obtenerCanalConectado(agencia.id, "mercadolibre");
  if (!conectado) return NextResponse.json({ error: "Mercado Libre no está conectado." }, { status: 400 });
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

  const status = accion === "pausar" ? "paused" : accion === "reanudar" ? "active" : "closed";
  const resultado = await actualizarItem(previaMl.external_id, conectado.access_token, { status });

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 502 });
  }

  const nuevoEstado = accion === "pausar" ? "pausado" : accion === "reanudar" ? "publicado" : "sin_publicar";
  const pub = await setPublicacion({
    dominio: vehiculo.dominio,
    canal: "mercadolibre",
    estado: nuevoEstado,
    external_id: accion === "eliminar" ? null : undefined,
    permalink: accion === "eliminar" ? null : resultado.permalink,
    error_msg: "",
  });
  return NextResponse.json({ ok: true, publicacion: pub });
}
