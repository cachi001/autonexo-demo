// Integración real con la API de Mercado Libre (sitio MLA, Argentina), no es
// un mock: son las mismas llamadas que haría cualquier integrador real.
// Requiere una app creada en https://developers.mercadolibre.com.ar con
// redirect URI https://autonexo-demo.vercel.app/api/canales/mercadolibre/callback,
// y las variables de entorno ML_CLIENT_ID / ML_CLIENT_SECRET cargadas en Vercel.
//
// Por qué "classified" y no "buy_it_now": los vehículos en ML Argentina se
// venden como aviso clasificado (el comprador contacta al vendedor, no hay
// compra directa con envío), usar buying_mode="classified" es lo que exige
// la propia API para la categoría de autos, confirmado en su documentación
// pública de categorías de vehículos.
import { humanizarError } from "@/lib/errores";

const SITE = "MLA";
const AUTH_URL = "https://auth.mercadolibre.com.ar/authorization";
const API_URL = "https://api.mercadolibre.com";

export function urlAutorizacion(redirectUri: string, state: string): string {
  const clientId = process.env.ML_CLIENT_ID;
  if (!clientId) throw new Error("Falta ML_CLIENT_ID en las variables de entorno.");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function intercambiarCodigo(code: string, redirectUri: string) {
  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Faltan ML_CLIENT_ID / ML_CLIENT_SECRET en las variables de entorno.");
  const res = await fetch(`${API_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Mercado Libre rechazó el código de autorización: ${await res.text()}`);
  return (await res.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    user_id: number;
  };
}

// El access_token de ML dura pocas horas (confirmado en vivo: "invalid
// access token" en una conexión de la misma sesión de trabajo), hace falta
// renovarlo con el refresh_token antes de cada operación, no solo al
// conectar. ML rota el refresh_token en cada uso (de un solo uso), por eso
// se devuelve el nuevo junto con el access_token nuevo.
export async function refrescarToken(refreshToken: string) {
  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Faltan ML_CLIENT_ID / ML_CLIENT_SECRET en las variables de entorno.");
  const res = await fetch(`${API_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Mercado Libre rechazó la renovación del token: ${await res.text()}`);
  return (await res.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
  };
}

export async function obtenerUsuario(accessToken: string) {
  const res = await fetch(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`No se pudo obtener el usuario de Mercado Libre: ${await res.text()}`);
  return (await res.json()) as { id: number; nickname: string };
}

// La categoría correcta (Autos, Camionetas y Suvs vs. Motos vs. Camiones,
// etc.) depende del tipo de vehículo, se la pedimos a ML en vez de
// harcodear un ID que podría estar mal para motos/camiones/acoplados.
// `category_predictor/predict` (lo que usaba este archivo antes) está dado
// de baja (devuelve 404 real, confirmado en vivo esta sesión), el
// reemplazo vigente es `domain_discovery/search`, que devuelve una lista
// de posibles dominios ordenada por relevancia; se toma el primero.
export async function predecirCategoria(titulo: string): Promise<string | null> {
  const res = await fetch(
    `${API_URL}/sites/${SITE}/domain_discovery/search?q=${encodeURIComponent(titulo)}`
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { category_id?: string }[];
  return data?.[0]?.category_id || null;
}

// Confirmado en vivo (GET /categories/MLA1744/attributes, público): estos son
// los únicos atributos reales de garantía/entrega que acepta la categoría de
// autos, no hay un campo "shipping" genérico para vehículos (se venden como
// clasificado, ML no gestiona el envío físico de un auto). CAR_DELIVERY
// ("Entrega a domicilio") es el equivalente real a "envío" para esta
// categoría -confirmado que existe, no inventado.
export type ListingType = { id: string; nombre: string; disponibles: number | null };

// Antes se publicaba siempre con listing_type_id: "free" sin preguntarle
// nada a la agencia. Para una cuenta particular existe de verdad un tier
// gratis; para una cuenta car_dealer NO (confirmado en vivo contra
// mercadolibre.com.ar/ayuda/Costos-para-concesionarias_903, ver AutoNexo/
// CLAUDE.md) -hace falta consultar el cupo real contratado antes de dejar
// elegir, si no la agencia podría intentar publicar con un tipo que no tiene
// pago y romperse en silencio.
// Nombres reales que usa Mercado Libre en su propio flujo de publicar
// (confirmado en vivo el 2026-10-20, no son nombres inventados) -el tier
// gratis se llama "Básico" en la UI de ML, no "Gratuita".
const NOMBRES_LISTING_TYPE: Record<string, string> = {
  free: "Básico",
  silver: "Plata",
  gold_special: "Oro",
  gold_pro: "Oro Premium",
};

export async function obtenerPaquetesPublicacion(accessToken: string, userId: number): Promise<ListingType[]> {
  const res = await fetch(
    `${API_URL}/users/${userId}/classifieds_promotion_packs?package_content=ALL`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    // Cuentas particulares nuevas pueden no tener ningún paquete contratado
    // todavía y este endpoint devuelve error -la gratuita sigue existiendo
    // para ese caso, se ofrece como único disponible.
    return [{ id: "free", nombre: NOMBRES_LISTING_TYPE.free, disponibles: null }];
  }
  const data = (await res.json()) as {
    packs?: { listing_type_id: string; remaining_listings?: number }[];
  };
  const packs = data?.packs || [];
  if (packs.length === 0) return [{ id: "free", nombre: NOMBRES_LISTING_TYPE.free, disponibles: null }];
  return packs.map((p) => ({
    id: p.listing_type_id,
    nombre: NOMBRES_LISTING_TYPE[p.listing_type_id] || p.listing_type_id,
    disponibles: typeof p.remaining_listings === "number" ? p.remaining_listings : null,
  }));
}

export type PublicarItemInput = {
  accessToken: string;
  titulo: string;
  precio: number;
  marca: string;
  modelo: string;
  anio: string;
  km: string;
  descripcion: string;
  fotosUrls: string[];
  // Nada de esto estaba hardcodeado por decisión del usuario -lo completa la
  // agencia antes de publicar, ver PublicarCanalModal.tsx.
  listingTypeId: string;
  condicion: "used" | "new";
  ciudad: string;
  provinciaId: string;
  provinciaNombre: string;
  garantiaFabrica: boolean;
  garantiaMecanica: boolean;
  entregaDomicilio: boolean;
  // Ficha técnica -alineada con AutoClick (version/combustible ya existen
  // ahí, puertas es nuevo en los dos). ML las exige como atributos
  // obligatorios de la categoría "Autos y Camionetas" (TRIM/FUEL_TYPE/DOORS,
  // confirmado en vivo contra /categories/MLA1744/attributes) -SOLO para
  // autos. Confirmado en vivo el 2026-10-20 que la categoría Motos
  // (MLA1763) no tiene estos tres atributos en absoluto, ni como
  // obligatorios ni como opcionales reconocidos -mandarlos para una moto no
  // tiene sentido. Por eso quedan opcionales acá, la validación real está en
  // publicarItem() y depende de input.tipoMoto (si viene, es moto).
  version?: string;
  combustible?: string;
  puertas?: string;
  // Desde oct-2024, ML Argentina exige patente y los últimos 6 caracteres
  // del chasis/VIN al publicar o actualizar un AUTO -confirmado por fuente
  // oficial (developers.mercadolibre.com, "Publica vehículos"). Confirmado
  // en vivo que VIN_LAST_DIGITS no existe como atributo en la categoría
  // Motos, así que esta regla es específica de autos.
  dominio: string;
  chasis?: string;
  // Si viene con valor, el vehículo se publica como MOTO (categoría
  // MLA1763): MOTO_TYPE es el único atributo realmente obligatorio ahí,
  // confirmado en vivo contra /categories/MLA1763/attributes (16 valores
  // reales: On-Off, Scooters, Naked, etc, ver lib/moto.ts). Si viene vacío o
  // undefined, se publica con el esquema de autos (comportamiento previo).
  tipoMoto?: string;
};

// Trae el motivo real de por qué ML puso un ítem en revisión -confirmado en
// vivo contra /moderations/last_moderation/$ITEM_ID-ITM (documentado en
// developers.mercadolibre.com, "Moderaciones con pausado"). El campo
// "evidence[].text_matched" suele traer el número exacto (ej. el precio
// mínimo de mercado) que el mensaje de REASON no siempre repite -se lo
// agregamos a la agencia para que sepa a qué valor corregir, no solo que
// "el precio no es acorde al mercado".
async function obtenerMotivoModeracion(itemId: string, accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/moderations/last_moderation/${itemId}-ITM`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      wordings?: { type: string; value: string }[];
      evidence?: { text_matched: string }[];
    }[];
    const razon = data?.[0]?.wordings?.find((w) => w.type === "REASON")?.value;
    const evidencia = data?.[0]?.evidence?.[0]?.text_matched;
    if (!razon) return null;
    return evidencia ? `${razon} (${evidencia})` : razon;
  } catch {
    return null;
  }
}

export async function publicarItem(input: PublicarItemInput) {
  const esMoto = Boolean(input.tipoMoto?.trim());
  if (esMoto) {
    // Para motos, MOTO_TYPE es el único atributo realmente obligatorio que
    // no sea marca/modelo/año/km -confirmado en vivo, ver lib/moto.ts.
    if (!input.tipoMoto?.trim()) {
      return { ok: false as const, error: "Falta el tipo de moto, obligatorio para publicar en Mercado Libre." };
    }
  } else {
    if (!input.version?.trim() || !input.combustible?.trim() || !input.puertas?.trim()) {
      return {
        ok: false as const,
        error: "Faltan datos de la ficha técnica (versión, combustible o puertas), obligatorios para publicar en Mercado Libre. Completalos en la ficha del vehículo.",
      };
    }
    if (!input.chasis || input.chasis.trim().length < 6) {
      return {
        ok: false as const,
        error: "Falta el chasis (o tiene menos de 6 caracteres), obligatorio para publicar en Mercado Libre desde oct-2024. Completalo en la ficha del vehículo.",
      };
    }
  }
  if (!input.ciudad.trim() || !input.provinciaId.trim()) {
    return {
      ok: false as const,
      error: "Falta la ubicación de la agencia (ciudad y provincia), obligatoria para publicar en Mercado Libre. Completala en Datos de la agencia.",
    };
  }

  const categoryId = await predecirCategoria(input.titulo);
  if (!categoryId) {
    return { ok: false as const, error: "No se pudo determinar la categoría de Mercado Libre para este vehículo." };
  }

  // ML exige una URL pública de imagen en "source", no el archivo embebido
  // -confirmado en vivo: "Invalid value source. Maximum length is 1024"
  // (las fotos se guardan como data URL base64, mucho más largo que eso).
  // Mismo puente que ya se armó para Instagram (ver
  // app/api/stock/[dominio]/fotos/[indice]/route.ts).
  const pictures = input.fotosUrls.slice(0, 10).map((url) => ({ source: url }));

  const body = {
    title: input.titulo.slice(0, 60),
    category_id: categoryId,
    price: input.precio,
    currency_id: "ARS",
    buying_mode: "classified",
    // Elegido por la agencia en el modal de publicación -ya no hardcodeado a
    // "free". Ver obtenerPaquetesPublicacion arriba: las opciones que ve la
    // agencia son las que realmente tiene disponibles en su cuenta de ML.
    listing_type_id: input.listingTypeId,
    condition: input.condicion,
    available_quantity: 1,
    description: { plain_text: input.descripcion || input.titulo },
    pictures,
    // Ubicación real de la agencia (ver Datos de la agencia) -antes mandaba
    // siempre "Mendoza, Mendoza" fijo sin importar dónde estuviera la
    // agencia de verdad. provinciaId es el id que exige la propia API de ML
    // (ej. "AR-M"), confirmado contra GET /countries/AR.
    location: {
      country: { id: "AR" },
      state: { id: input.provinciaId, name: input.provinciaNombre },
      city: { name: input.ciudad },
    },
    attributes: [
      { id: "BRAND", value_name: input.marca },
      { id: "MODEL", value_name: input.modelo },
      { id: "VEHICLE_YEAR", value_name: input.anio },
      // KILOMETERS es un atributo de tipo "number_unit" en ML -rechaza un
      // número pelado, exige la unidad pegada al valor (confirmado en vivo:
      // "The provided unit is not valid... [km]").
      { id: "KILOMETERS", value_name: `${input.km} km` },
      // LICENSE_PLATE existe en ambas categorías (auto y moto), va sin
      // guión/espacios, como se guarda el dominio en el stock.
      { id: "LICENSE_PLATE", value_name: input.dominio.toUpperCase().replace(/[\s-]/g, "") },
      // A partir de acá, todo lo que sigue es específico de cada categoría
      // -confirmado en vivo que TRIM/FUEL_TYPE/DOORS/VIN_LAST_DIGITS no
      // existen en la categoría Motos (MLA1763), y MOTO_TYPE no existe en
      // Autos (MLA1744). Mandar el atributo equivocado para la categoría
      // rechaza la publicación completa, no solo ese campo.
      ...(esMoto
        ? [{ id: "MOTO_TYPE", value_name: input.tipoMoto as string }]
        : [
            { id: "TRIM", value_name: input.version as string },
            { id: "FUEL_TYPE", value_name: input.combustible as string },
            { id: "DOORS", value_name: input.puertas as string },
            // Últimos 6 del chasis -obligatorio en MLA desde oct-2024 para
            // autos (ver comentario en PublicarItemInput).
            { id: "VIN_LAST_DIGITS", value_name: (input.chasis as string).trim().slice(-6).toUpperCase() },
            // Garantía y entrega a domicilio -opcionales, elegidos por la
            // agencia. Confirmado en vivo (GET /categories/MLA1744/attributes)
            // que estos tres existen de verdad para la categoría de autos.
            { id: "WITH_FACTORY_WARRANTY", value_name: input.garantiaFabrica ? "Sí" : "No" },
            { id: "WITH_MECHANICAL_WARRANTY", value_name: input.garantiaMecanica ? "Sí" : "No" },
            { id: "CAR_DELIVERY", value_name: input.entregaDomicilio ? "Sí" : "No" },
          ]),
    ],
  };

  const res = await fetch(`${API_URL}/items`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  // "payment_required" (confirmado en vivo) es un estado válido, no un error:
  // en Argentina publicar un vehículo en ML no es gratis (tipo de aviso
  // "silver"), el aviso queda creado con ID y permalink reales, pendiente de
  // que la agencia complete el pago desde su propia cuenta de ML -eso es
  // entre la agencia y ML, no algo que el software deba evitar. Por eso el
  // éxito se decide por la presencia de un id real, no por res.ok (ML
  // devuelve HTTP fuera de 2xx para este estado aunque el ítem sí se creó).
  if (data?.id) {
    // Pero "under_review" SÍ es un fracaso real para la agencia: el aviso
    // queda creado pero oculto al público hasta corregirlo -mostrarlo como
    // "Publicado" sería mentirle (encontrado en vivo: un Ford Fiesta con
    // status "publicado" en AutoNexo que en mercadolibre.com.ar redirigía a
    // "#redirectedFromVip", invisible). La causa real (ej. precio por debajo
    // del piso de mercado para ese modelo/año, moderación
    // "PRECIO_PROHIBIDO_MIN_MOT") se obtiene de /moderations/last_moderation
    // -no hay endpoint de precio mínimo previo a publicar, así que se
    // reacciona al resultado real en vez de adivinar antes.
    if (data.status === "under_review") {
      const motivo = await obtenerMotivoModeracion(data.id, input.accessToken);
      return {
        ok: false as const,
        enRevision: true as const,
        externalId: data.id as string,
        permalink: data.permalink as string,
        error: motivo || "Mercado Libre puso el aviso en revisión y no es visible para compradores todavía.",
      };
    }
    return { ok: true as const, externalId: data.id as string, permalink: data.permalink as string };
  }
  // ML devuelve el detalle exacto de qué atributo falta o está mal -se lo
  // mostramos a la agencia, pero traducido (ver humanizarErrorML): el
  // detalle crudo de ML viene en inglés incluso en el sitio argentino.
  const detalle = data?.cause?.map((c: { message?: string }) => c.message).join("; ") || data?.message || JSON.stringify(data);
  return { ok: false as const, error: humanizarError(detalle) };
}

// Actualiza precio/título de un ítem YA creado en ML -se usa cuando la
// agencia corrige el precio de un vehículo que había quedado "en revisión"
// (ej. por estar debajo del piso de mercado): había que actualizar el
// mismo aviso, no crear uno nuevo -crear de nuevo hubiera dejado dos
// publicaciones del mismo auto en la cuenta real de ML.
export async function actualizarItem(
  itemId: string,
  accessToken: string,
  cambios: { price?: number; title?: string; status?: "active" | "paused" | "closed" }
) {
  const res = await fetch(`${API_URL}/items/${itemId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(cambios),
  });
  const data = await res.json();
  if (!res.ok) {
    const detalle = data?.cause?.map((c: { message?: string }) => c.message).join("; ") || data?.message || JSON.stringify(data);
    return { ok: false as const, error: humanizarError(detalle) };
  }
  if (data.status === "under_review") {
    const motivo = await obtenerMotivoModeracion(itemId, accessToken);
    return {
      ok: false as const,
      enRevision: true as const,
      externalId: itemId,
      permalink: data.permalink as string,
      error: motivo || "Mercado Libre sigue sin mostrar el aviso, revisalo de nuevo en unos minutos.",
    };
  }
  return { ok: true as const, externalId: itemId, permalink: data.permalink as string };
}

// Consulta el estado REAL de un ítem ya publicado -necesario para la
// bidireccionalidad que pidió la agencia: si alguien cancela/elimina un
// aviso desde la cuenta real de Mercado Libre (no desde AutoNexo), AutoNexo
// no se entera solo -no hay webhook de borrado configurado todavía, así que
// esto es el chequeo manual ("Verificar estado real") hasta que se sume
// notificación push de ML.
export async function obtenerEstadoItem(itemId: string, accessToken: string) {
  const res = await fetch(`${API_URL}/items/${itemId}?attributes=id,status,sub_status,permalink`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 404) {
    return { existe: false as const };
  }
  const data = await res.json();
  if (!res.ok) {
    return { existe: false as const };
  }
  return {
    existe: true as const,
    status: data.status as string,
    sub_status: (data.sub_status || []) as string[],
    permalink: data.permalink as string,
  };
}
