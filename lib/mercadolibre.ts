// Integración real con la API de Mercado Libre (sitio MLA, Argentina) -no es
// un mock: son las mismas llamadas que haría cualquier integrador real.
// Requiere una app creada en https://developers.mercadolibre.com.ar con
// redirect URI https://autonexo-demo.vercel.app/api/canales/mercadolibre/callback,
// y las variables de entorno ML_CLIENT_ID / ML_CLIENT_SECRET cargadas en Vercel.
//
// Por qué "classified" y no "buy_it_now": los vehículos en ML Argentina se
// venden como aviso clasificado (el comprador contacta al vendedor, no hay
// compra directa con envío) -usar buying_mode="classified" es lo que exige
// la propia API para la categoría de autos, confirmado en su documentación
// pública de categorías de vehículos.
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
// access token" en una conexión de la misma sesión de trabajo) -hace falta
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
// etc.) depende del tipo de vehículo -se la pedimos a ML en vez de
// harcodear un ID que podría estar mal para motos/camiones/acoplados.
// `category_predictor/predict` (lo que usaba este archivo antes) está dado
// de baja -devuelve 404 real, confirmado en vivo esta sesión-, el
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
  // Ficha técnica -alineada con AutoClick (version/combustible ya existen
  // ahí, puertas es nuevo en los dos). ML las exige como atributos
  // obligatorios de la categoría "Autos y Camionetas" (TRIM/FUEL_TYPE/DOORS,
  // confirmado en vivo contra /categories/MLA1744/attributes).
  version: string;
  combustible: string;
  puertas: string;
  // Desde oct-2024, ML Argentina exige patente y los últimos 6 caracteres
  // del chasis/VIN al publicar o actualizar un vehículo -confirmado por
  // fuente oficial (developers.mercadolibre.com, "Publica vehículos").
  // Encontrado como causa real de "under_review / waiting_for_patch" en un
  // aviso publicado esta sesión sin estos dos campos. AutoNexo ya tiene
  // ambos datos (vienen del OCR de cédula o se cargan a mano en la ficha
  // técnica) -no hace falta pedirle nada nuevo a la agencia, solo mandarlos.
  dominio: string;
  chasis: string;
};

export async function publicarItem(input: PublicarItemInput) {
  if (!input.version.trim() || !input.combustible.trim() || !input.puertas.trim()) {
    return {
      ok: false as const,
      error: "Faltan datos de la ficha técnica (versión, combustible o puertas) -obligatorios para publicar en Mercado Libre. Completalos en la ficha del vehículo.",
    };
  }
  if (input.chasis.trim().length < 6) {
    return {
      ok: false as const,
      error: "Falta el chasis (o tiene menos de 6 caracteres) -obligatorio para publicar en Mercado Libre desde oct-2024. Completalo en la ficha del vehículo.",
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
    // "free" (Gratuita) en vez de "silver" (Plata, $69.000) -confirmado en
    // vivo contra /sites/MLA/listing_prices que existe una opción sin costo
    // para la categoría de vehículos (menor exposición en los resultados,
    // pero publicación real y gratis). No se le había preguntado a la
    // agencia qué tipo de aviso quería pagar -usar la gratis por default es
    // lo correcto hasta que haya una decisión explícita de pagar más
    // exposición.
    listing_type_id: "free",
    condition: "used",
    available_quantity: 1,
    description: { plain_text: input.descripcion || input.titulo },
    pictures,
    // ML exige ubicación hasta nivel ciudad (confirmado en vivo: "Field
    // 'location' requires up to city level") -AutoNexo hoy no pide domicilio
    // físico de la agencia (solo CUIT/contacto), así que por ahora se manda
    // un default fijo de Mendoza capital -el mercado al que apunta AutoNexo-
    // en vez de dejar la publicación rota. Si se suma domicilio real de la
    // agencia (ver AutoNexo/CLAUDE.md pendientes), esto debería leer de ahí.
    location: {
      country: { id: "AR" },
      state: { id: "AR-M", name: "Mendoza" },
      city: { name: "Mendoza" },
    },
    attributes: [
      { id: "BRAND", value_name: input.marca },
      { id: "MODEL", value_name: input.modelo },
      { id: "VEHICLE_YEAR", value_name: input.anio },
      // KILOMETERS es un atributo de tipo "number_unit" en ML -rechaza un
      // número pelado, exige la unidad pegada al valor (confirmado en vivo:
      // "The provided unit is not valid... [km]").
      { id: "KILOMETERS", value_name: `${input.km} km` },
      { id: "TRIM", value_name: input.version },
      { id: "FUEL_TYPE", value_name: input.combustible },
      { id: "DOORS", value_name: input.puertas },
      // Patente y últimos 6 del chasis -obligatorios en MLA desde oct-2024
      // (ver comentario en PublicarItemInput). LICENSE_PLATE va sin
      // guión/espacios, como se guarda el dominio en el stock.
      { id: "LICENSE_PLATE", value_name: input.dominio.toUpperCase().replace(/[\s-]/g, "") },
      { id: "VIN_LAST_DIGITS", value_name: input.chasis.trim().slice(-6).toUpperCase() },
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
    return { ok: true as const, externalId: data.id as string, permalink: data.permalink as string };
  }
  // ML devuelve el detalle exacto de qué atributo falta o está mal -se lo
  // mostramos a la agencia tal cual, no lo tapamos con un mensaje genérico.
  const detalle = data?.cause?.map((c: { message?: string }) => c.message).join("; ") || data?.message || JSON.stringify(data);
  return { ok: false as const, error: `Mercado Libre rechazó la publicación: ${detalle}` };
}
