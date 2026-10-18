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

export async function obtenerUsuario(accessToken: string) {
  const res = await fetch(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`No se pudo obtener el usuario de Mercado Libre: ${await res.text()}`);
  return (await res.json()) as { id: number; nickname: string };
}

// La categoría correcta (Autos, Camionetas y Suvs vs. Motos vs. Camiones,
// etc.) depende del tipo de vehículo -se la pedimos al predictor de
// categorías de ML en vez de harcodear un ID que podría estar mal para
// motos/camiones/acoplados.
export async function predecirCategoria(titulo: string): Promise<string | null> {
  const res = await fetch(
    `${API_URL}/sites/${SITE}/category_predictor/predict?title=${encodeURIComponent(titulo)}`
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { id?: string };
  return data.id || null;
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
  fotosBase64: string[];
};

export async function publicarItem(input: PublicarItemInput) {
  const categoryId = await predecirCategoria(input.titulo);
  if (!categoryId) {
    return { ok: false as const, error: "No se pudo determinar la categoría de Mercado Libre para este vehículo." };
  }

  const pictures = input.fotosBase64.slice(0, 10).map((dataUrl) => ({ source: dataUrl }));

  const body = {
    title: input.titulo.slice(0, 60),
    category_id: categoryId,
    price: input.precio,
    currency_id: "ARS",
    buying_mode: "classified",
    listing_type_id: "silver",
    condition: "used",
    available_quantity: 1,
    description: { plain_text: input.descripcion || input.titulo },
    pictures,
    attributes: [
      { id: "BRAND", value_name: input.marca },
      { id: "MODEL", value_name: input.modelo },
      { id: "VEHICLE_YEAR", value_name: input.anio },
      { id: "KILOMETERS", value_name: input.km },
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
  if (!res.ok) {
    // ML devuelve el detalle exacto de qué atributo falta o está mal -se lo
    // mostramos a la agencia tal cual, no lo tapamos con un mensaje genérico.
    const detalle = data?.cause?.map((c: { message?: string }) => c.message).join("; ") || data?.message || JSON.stringify(data);
    return { ok: false as const, error: `Mercado Libre rechazó la publicación: ${detalle}` };
  }
  return { ok: true as const, externalId: data.id as string, permalink: data.permalink as string };
}
