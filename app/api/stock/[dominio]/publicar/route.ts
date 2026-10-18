import { NextRequest, NextResponse } from "next/server";
import { buscarVehiculo, listarAgencias, obtenerCanalConectado, setPublicacion, Canal } from "@/lib/data";
import { publicarItem } from "@/lib/mercadolibre";

// Publicación explícita a un canal externo -nunca automática (principio P7:
// "la IA propone, la persona aprueba" para irreversibles, extendido acá a
// syndication igual que al asistente de WhatsApp). Este endpoint solo se
// llama cuando la agencia tocó el botón "Publicar" de un canal puntual.
export async function POST(req: NextRequest, { params }: { params: Promise<{ dominio: string }> }) {
  const { dominio } = await params;
  const { canal } = (await req.json()) as { canal: Canal };

  const vehiculo = await buscarVehiculo(decodeURIComponent(dominio));
  if (!vehiculo) return NextResponse.json({ error: `No se encontró el dominio '${dominio}'` }, { status: 404 });

  // Prototipo de una sola agencia (ver /api/agencias): se usa la primera.
  const agencias = await listarAgencias();
  const agencia = agencias[0];
  if (!agencia) return NextResponse.json({ error: "No hay una agencia cargada." }, { status: 400 });

  if (canal === "mercadolibre") {
    const conectado = await obtenerCanalConectado(agencia.id, "mercadolibre");
    if (!conectado) {
      return NextResponse.json({ error: "Mercado Libre no está conectado. Conectalo en Canales externos." }, { status: 400 });
    }
    await setPublicacion({ dominio: vehiculo.dominio, canal, estado: "pendiente_aprobacion" });
    const resultado = await publicarItem({
      accessToken: conectado.access_token,
      titulo: `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio}`,
      precio: parseFloat(vehiculo.precio) || 0,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      anio: vehiculo.anio,
      km: vehiculo.km,
      descripcion: vehiculo.descripcion,
      fotosBase64: vehiculo.fotos,
    });
    if (!resultado.ok) {
      const pub = await setPublicacion({ dominio: vehiculo.dominio, canal, estado: "error", error_msg: resultado.error });
      return NextResponse.json({ error: resultado.error, publicacion: pub }, { status: 502 });
    }
    const pub = await setPublicacion({
      dominio: vehiculo.dominio,
      canal,
      estado: "publicado",
      external_id: resultado.externalId,
    });
    return NextResponse.json({ ok: true, publicacion: pub, permalink: resultado.permalink });
  }

  // Instagram/Facebook: arquitectura lista (tabla, estados, UI), falta la
  // integración real con Meta (Graph API + Catálogo de Commerce) -no se
  // simula un resultado falso, se avisa explícitamente que falta conectar.
  return NextResponse.json({ error: `${canal} todavía no está conectado -falta la integración con Meta.` }, { status: 501 });
}
