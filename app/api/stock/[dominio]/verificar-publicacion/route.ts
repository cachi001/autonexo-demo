import { NextRequest, NextResponse } from "next/server";
import { buscarVehiculo, listarPublicaciones, obtenerCanalConectado, guardarCanalConectado, setPublicacion } from "@/lib/data";
import { obtenerEstadoItem, refrescarToken } from "@/lib/mercadolibre";
import { agenciaDesdeRequest } from "@/lib/auth";

// Bidireccionalidad manual: la agencia puede pedir "verificar estado real"
// para traer lo que diga Mercado Libre AHORA mismo -ej. si canceló/eliminó
// el aviso desde la cuenta real de ML, acá AutoNexo deja de mostrarlo como
// "Publicado". No hay webhook de ML configurado todavía para que esto sea
// automático, así que por ahora es una acción explícita, no un poll en
// segundo plano.
export async function POST(req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { dominio } = await params;

  const vehiculo = await buscarVehiculo(decodeURIComponent(dominio), agencia.id);
  if (!vehiculo) return NextResponse.json({ error: `No se encontró el dominio '${dominio}'` }, { status: 404 });

  const publicaciones = await listarPublicaciones(vehiculo.dominio);
  const previaMl = publicaciones.find((p) => p.canal === "mercadolibre" && p.external_id);
  if (!previaMl) {
    return NextResponse.json({ error: "Este vehículo no tiene ningún aviso de Mercado Libre para verificar." }, { status: 400 });
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

  const real = await obtenerEstadoItem(previaMl.external_id, conectado.access_token);

  if (!real.existe) {
    const pub = await setPublicacion({
      dominio: vehiculo.dominio,
      canal: "mercadolibre",
      estado: "sin_publicar",
      external_id: null,
      permalink: null,
      error_msg: "",
    });
    return NextResponse.json({ ok: true, publicacion: pub });
  }

  if (real.status === "closed") {
    const pub = await setPublicacion({
      dominio: vehiculo.dominio,
      canal: "mercadolibre",
      estado: "sin_publicar",
      external_id: null,
      permalink: null,
      error_msg: "",
    });
    return NextResponse.json({ ok: true, publicacion: pub });
  }

  if (real.status === "paused") {
    const pub = await setPublicacion({ dominio: vehiculo.dominio, canal: "mercadolibre", estado: "pausado", error_msg: "" });
    return NextResponse.json({ ok: true, publicacion: pub });
  }

  if (real.status === "payment_required") {
    const pub = await setPublicacion({
      dominio: vehiculo.dominio,
      canal: "mercadolibre",
      estado: "en_revision",
      error_msg: "Pendiente de pago en Mercado Libre -no es visible hasta pagarlo o cancelarlo desde la cuenta de ML.",
    });
    return NextResponse.json({ ok: true, publicacion: pub });
  }

  if (real.status === "under_review") {
    const pub = await setPublicacion({
      dominio: vehiculo.dominio,
      canal: "mercadolibre",
      estado: "en_revision",
      error_msg: "Mercado Libre tiene este aviso oculto en revisión.",
    });
    return NextResponse.json({ ok: true, publicacion: pub });
  }

  // "active" -el estado real que ML llama "visible al público".
  const pub = await setPublicacion({
    dominio: vehiculo.dominio,
    canal: "mercadolibre",
    estado: "publicado",
    permalink: real.permalink,
    error_msg: "",
  });
  return NextResponse.json({ ok: true, publicacion: pub });
}
