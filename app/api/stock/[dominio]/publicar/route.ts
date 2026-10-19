import { NextRequest, NextResponse } from "next/server";
import { buscarVehiculo, obtenerCanalConectado, guardarCanalConectado, listarPublicaciones, setPublicacion, Canal } from "@/lib/data";
import { publicarItem, actualizarItem, refrescarToken } from "@/lib/mercadolibre";
import { publicarEnFacebook, publicarEnInstagram } from "@/lib/meta";
import { agenciaDesdeRequest } from "@/lib/auth";

// Publicación explícita a un canal externo, nunca automática (principio P7:
// "la IA propone, la persona aprueba" para irreversibles, extendido acá a
// syndication igual que al asistente de WhatsApp). Este endpoint solo se
// llama cuando la agencia tocó el botón "Publicar" de un canal puntual.
//
// Multi-tenant: antes usaba "la primera agencia" fija (listarAgencias()[0]),
// un bug real: con una sola agencia no se notaba, pero con dos, publicar el
// vehículo de una agencia hubiera usado la conexión de ML de otra. Ahora la
// agencia sale de la sesión, y buscarVehiculo ya filtra por agencia_id ->
// si el dominio no es de esta agencia, "no se encontró" (ni pistas de que
// existe en otra agencia).
export async function POST(req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { dominio } = await params;
  const { canal, titulo: tituloPersonalizado, descripcion: descripcionPersonalizada } = (await req.json()) as {
    canal: Canal;
    titulo?: string;
    descripcion?: string;
  };

  const vehiculo = await buscarVehiculo(decodeURIComponent(dominio), agencia.id);
  if (!vehiculo) return NextResponse.json({ error: `No se encontró el dominio '${dominio}'` }, { status: 404 });

  if (canal === "mercadolibre") {
    let conectado = await obtenerCanalConectado(agencia.id, "mercadolibre");
    if (!conectado) {
      return NextResponse.json({ error: "Mercado Libre no está conectado. Conectalo en Conexiones." }, { status: 400 });
    }
    if (vehiculo.fotos.length === 0) {
      return NextResponse.json({ error: "El vehículo no tiene fotos cargadas, hace falta al menos una para publicar." }, { status: 400 });
    }

    // El access_token de ML dura pocas horas (confirmado en vivo: "invalid
    // access token"), se renueva proactivamente con el refresh_token si ya
    // venció o está por vencer, antes de intentar publicar. ML rota el
    // refresh_token en cada uso, por eso hay que persistir el nuevo par.
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
        // El motivo real de por qué falló el refresh (String(e)) puede venir
        // en inglés o ser jerga técnica de la API, se guarda el mismo
        // mensaje en español tanto en la publicación como en la respuesta,
        // nunca la excepción cruda (ver lib/errores.ts, mismo criterio para
        // cualquier canal).
        const mensaje = "La conexión con Mercado Libre venció y no se pudo renovar, reconectá la cuenta en Conexiones.";
        const pub = await setPublicacion({ dominio: vehiculo.dominio, canal, estado: "error", error_msg: mensaje });
        return NextResponse.json({ error: mensaje, publicacion: pub }, { status: 502 });
      }
    }

    await setPublicacion({ dominio: vehiculo.dominio, canal, estado: "pendiente_aprobacion" });
    const fotosUrls = vehiculo.fotos.map(
      (_, i) => `${req.nextUrl.origin}/api/stock/${encodeURIComponent(vehiculo.dominio)}/fotos/${i}`
    );
    const datosItem = {
      // La agencia puede editar título y descripción específicos para este
      // canal antes de publicar (ver preview en la ficha del vehículo); si
      // no mandó nada, se usa lo que ya hay cargado, como antes.
      titulo: tituloPersonalizado?.trim() || `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio}`,
      precio: parseFloat(vehiculo.precio) || 0,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      anio: vehiculo.anio,
      km: vehiculo.km,
      descripcion: descripcionPersonalizada?.trim() || vehiculo.descripcion,
      fotosUrls,
      version: vehiculo.version,
      combustible: vehiculo.combustible,
      puertas: vehiculo.puertas,
      dominio: vehiculo.dominio,
      chasis: vehiculo.chasis,
    };
    // Si ya existe un aviso real de este vehículo en ML (quedó "en revisión"
    // o con un error pero SÍ tiene external_id), se actualiza ESE mismo
    // ítem en vez de crear uno nuevo, crear de nuevo duplicaría el auto en
    // la cuenta real de la agencia. Solo se crea un ítem nuevo la primera
    // vez o si el intento anterior nunca llegó a crear nada en ML.
    const publicacionesPrevias = await listarPublicaciones(vehiculo.dominio);
    const previaMl = publicacionesPrevias.find((p) => p.canal === "mercadolibre" && p.external_id);

    let resultado = previaMl
      ? await actualizarItem(previaMl.external_id, conectado.access_token, {
          price: datosItem.precio,
          title: datosItem.titulo,
        })
      : await publicarItem({ accessToken: conectado.access_token, ...datosItem });
    // Red de seguridad además del chequeo de expires_at de arriba: si ML
    // igual rechaza el token (puede invalidarlo antes de la fecha que él
    // mismo dio), se renueva una vez más y se reintenta, nunca más de una
    // vez, para no loopear si el problema es otro.
    if (!resultado.ok && /access token|invalid_token/i.test(resultado.error)) {
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
        resultado = previaMl
          ? await actualizarItem(previaMl.external_id, conectado.access_token, {
              price: datosItem.precio,
              title: datosItem.titulo,
            })
          : await publicarItem({ accessToken: conectado.access_token, ...datosItem });
      } catch {
        // Si la renovación en sí falla, se informa el error original de ML.
      }
    }
    if (!resultado.ok) {
      // "en_revision": ML sí creó/actualizó el aviso (hay external_id/
      // permalink reales) pero lo tiene oculto, distinto de un rechazo
      // total donde nunca se creó nada.
      const pub = await setPublicacion({
        dominio: vehiculo.dominio,
        canal,
        estado: resultado.enRevision ? "en_revision" : "error",
        external_id: resultado.enRevision ? resultado.externalId : undefined,
        permalink: resultado.enRevision ? resultado.permalink : undefined,
        error_msg: resultado.error,
      });
      return NextResponse.json({ error: resultado.error, publicacion: pub }, { status: 502 });
    }
    const pub = await setPublicacion({
      dominio: vehiculo.dominio,
      canal,
      estado: "publicado",
      external_id: resultado.externalId,
      permalink: resultado.permalink,
      error_msg: "",
    });
    return NextResponse.json({ ok: true, publicacion: pub });
  }

  if (canal === "facebook" || canal === "instagram") {
    const conectado = await obtenerCanalConectado(agencia.id, canal);
    if (!conectado) {
      return NextResponse.json({ error: `${canal} no está conectado. Conectalo en Conexiones.` }, { status: 400 });
    }
    if (vehiculo.fotos.length === 0) {
      return NextResponse.json({ error: "El vehículo no tiene fotos cargadas, hace falta al menos una para publicar." }, { status: 400 });
    }
    await setPublicacion({ dominio: vehiculo.dominio, canal, estado: "pendiente_aprobacion" });
    const imagenUrl = `${req.nextUrl.origin}/api/stock/${encodeURIComponent(vehiculo.dominio)}/fotos/0`;
    const mensaje = `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio} — $${vehiculo.precio}\n\n${vehiculo.descripcion}`;

    const resultado =
      canal === "facebook"
        ? await publicarEnFacebook(conectado.cuenta_externa_id, conectado.access_token, imagenUrl, mensaje)
        : await publicarEnInstagram(conectado.cuenta_externa_id, conectado.access_token, imagenUrl, mensaje);

    if (!resultado.ok) {
      const pub = await setPublicacion({ dominio: vehiculo.dominio, canal, estado: "error", error_msg: resultado.error });
      return NextResponse.json({ error: resultado.error, publicacion: pub }, { status: 502 });
    }
    const pub = await setPublicacion({
      dominio: vehiculo.dominio,
      canal,
      estado: "publicado",
      external_id: resultado.externalId,
      permalink: resultado.permalink,
    });
    return NextResponse.json({ ok: true, publicacion: pub });
  }

  return NextResponse.json({ error: `Canal '${canal}' no reconocido.` }, { status: 400 });
}
