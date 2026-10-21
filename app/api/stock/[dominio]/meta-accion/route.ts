import { NextRequest, NextResponse } from "next/server";
import { buscarVehiculo, listarPublicaciones, obtenerCanalConectado, setPublicacion, Canal } from "@/lib/data";
import { eliminarPublicacionFacebook, eliminarPublicacionInstagram } from "@/lib/meta";
import { agenciaDesdeRequest } from "@/lib/auth";

// Gestión real sobre un posteo YA publicado en Facebook o Instagram -antes
// no existía ninguna acción equivalente a la de Mercado Libre
// (mercadolibre-accion/route.ts), así que un posteo real quedaba colgado
// para siempre sin forma de deshacerlo desde AutoNexo (testeo end-to-end
// 2026-10-21, bug 4).
//
// A diferencia de Mercado Libre, acá solo existe "eliminar": la API de Meta
// no tiene un estado "pausado" reversible para un post de Página ni para un
// media de Instagram (ver lib/meta.ts). Por eso la acción es siempre
// definitiva, nunca se llama "Pausar" en la UI para no insinuar que se puede
// volver atrás.
const NOMBRE_CANAL: Record<"facebook" | "instagram", string> = { facebook: "Facebook", instagram: "Instagram" };

export async function POST(req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { dominio } = await params;
  const { canal, accion } = (await req.json()) as { canal: Canal; accion: "eliminar" };

  if (canal !== "facebook" && canal !== "instagram") {
    return NextResponse.json({ error: `Este canal no soporta esta acción.` }, { status: 400 });
  }
  if (accion !== "eliminar") {
    return NextResponse.json({ error: `Acción '${accion}' no reconocida.` }, { status: 400 });
  }

  const vehiculo = await buscarVehiculo(decodeURIComponent(dominio), agencia.id);
  if (!vehiculo) return NextResponse.json({ error: `No se encontró el dominio '${dominio}'` }, { status: 404 });

  const publicaciones = await listarPublicaciones(vehiculo.dominio);
  const previa = publicaciones.find((p) => p.canal === canal && p.external_id);
  if (!previa) {
    return NextResponse.json(
      { error: `Este vehículo no tiene ninguna publicación de ${NOMBRE_CANAL[canal]} para eliminar.` },
      { status: 422 }
    );
  }

  const conectado = await obtenerCanalConectado(agencia.id, canal);
  if (!conectado) {
    return NextResponse.json({ error: `${NOMBRE_CANAL[canal]} no está conectado.` }, { status: 400 });
  }

  const resultado =
    canal === "facebook"
      ? await eliminarPublicacionFacebook(previa.external_id, conectado.access_token)
      : await eliminarPublicacionInstagram(previa.external_id, conectado.access_token);

  if (!resultado.ok) {
    // 422: rechazo de negocio con mensaje de la plataforma, no una falla de
    // infraestructura -mismo criterio que /publicar y mercadolibre-accion.
    return NextResponse.json({ error: resultado.error }, { status: 422 });
  }

  const pub = await setPublicacion({
    dominio: vehiculo.dominio,
    canal,
    estado: "sin_publicar",
    external_id: null,
    permalink: null,
    error_msg: "",
  });
  return NextResponse.json({ ok: true, publicacion: pub });
}
