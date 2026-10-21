// Integración real con Meta Graph API (Facebook + Instagram) -posteo normal
// a la Página/cuenta de la agencia, no el catálogo de Marketplace de autos
// (ese requiere ser partner aprobado por Meta, no es autoservicio). Requiere
// una app creada en https://developers.facebook.com con redirect URI
// https://autonexo-demo.vercel.app/api/canales/meta/callback, y las
// variables de entorno META_APP_ID / META_APP_SECRET cargadas en Vercel.
//
// Una sola conexión habilita los dos canales: la cuenta de Instagram
// profesional SIEMPRE está vinculada a una Página de Facebook -no existe
// "conectar Instagram" por separado de Facebook en la API real de Meta.
//
// Por qué Instagram necesita una URL pública y Facebook no: la API de
// contenido de Instagram (media container) solo acepta image_url (ellos
// bajan la imagen de esa URL); la de Facebook sí acepta el archivo subido
// directo. Acá se usa image_url para los dos, por simplicidad y porque la
// ruta /api/stock/[dominio]/fotos/[indice] ya la expone igual.
const GRAPH_VERSION = "v21.0";
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;
const AUTH_URL = "https://www.facebook.com/" + GRAPH_VERSION + "/dialog/oauth";

const SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_content_publish",
  // Hace falta para poder borrar un media de Instagram publicado por esta
  // app (DELETE /{ig-media-id}, confirmado contra la documentación oficial
  // de Meta) -sin este scope, Graph devuelve error de permiso aunque el
  // media sea de la propia cuenta. Conexiones hechas ANTES de agregar este
  // scope (2026-10-21) no lo tienen -si "Eliminar" en Instagram falla con un
  // error de permiso, hace falta reconectar la cuenta en Conexiones.
  "instagram_manage_contents",
  "business_management",
];

export function urlAutorizacion(redirectUri: string, state: string): string {
  const appId = process.env.META_APP_ID;
  if (!appId) throw new Error("Falta META_APP_ID en las variables de entorno.");
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: SCOPES.join(","),
    response_type: "code",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function obtenerTokenCortoPlazo(code: string, redirectUri: string): Promise<string> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) throw new Error("Faltan META_APP_ID / META_APP_SECRET en las variables de entorno.");
  const params = new URLSearchParams({ client_id: appId, redirect_uri: redirectUri, client_secret: appSecret, code });
  const res = await fetch(`${GRAPH_URL}/oauth/access_token?${params.toString()}`);
  if (!res.ok) throw new Error(`Meta rechazó el código de autorización: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function obtenerTokenLargoPlazo(tokenCorto: string): Promise<{ access_token: string; expires_in: number }> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId!,
    client_secret: appSecret!,
    fb_exchange_token: tokenCorto,
  });
  const res = await fetch(`${GRAPH_URL}/oauth/access_token?${params.toString()}`);
  if (!res.ok) throw new Error(`No se pudo extender el token de Meta: ${await res.text()}`);
  return (await res.json()) as { access_token: string; expires_in: number };
}

type PaginaMeta = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
};

async function obtenerPaginas(userAccessToken: string): Promise<PaginaMeta[]> {
  const res = await fetch(
    `${GRAPH_URL}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userAccessToken}`
  );
  if (!res.ok) throw new Error(`No se pudieron obtener las Páginas de Facebook: ${await res.text()}`);
  const data = (await res.json()) as { data: PaginaMeta[] };
  return data.data || [];
}

export type ConexionMeta = {
  pageId: string;
  pageNombre: string;
  pageAccessToken: string;
  igUserId: string | null;
  expiresAt: string;
};

// Conecta la PRIMERA Página que devuelva el usuario -prototipo de una sola
// agencia con una sola Página; si la agencia maneja varias, elegir cuál
// conectar queda para cuando haga falta de verdad.
export async function conectarPrimeraPagina(code: string, redirectUri: string): Promise<ConexionMeta> {
  const tokenCorto = await obtenerTokenCortoPlazo(code, redirectUri);
  const { access_token: tokenLargo, expires_in } = await obtenerTokenLargoPlazo(tokenCorto);
  // El intercambio a token de larga duración (fb_exchange_token) puede
  // devolver un token que ya no trae consigo las Páginas que la agencia
  // seleccionó explícitamente en el picker de Facebook Login for Business
  // (confirmado en vivo: la Página aparecía marcada en el picker, pero
  // /me/accounts con el token largo devolvía 0 resultados). Por eso se
  // reintenta con el token corto, que sí conserva ese alcance, antes de
  // darla por perdida.
  let paginas = await obtenerPaginas(tokenLargo);
  let pageTokenEsDeCortaDuracion = false;
  if (paginas.length === 0) {
    paginas = await obtenerPaginas(tokenCorto);
    pageTokenEsDeCortaDuracion = true;
  }
  if (paginas.length === 0) {
    throw new Error("Tu cuenta de Meta no tiene ninguna Página de Facebook asociada. Creá una Página antes de conectar.");
  }
  const pagina = paginas[0];
  // Si la Página se encontró con el token corto, su access_token hereda esa
  // misma corta duración (horas, no 60 días) -se extiende también, para que
  // no quede guardada una conexión que en los hechos vence casi enseguida.
  if (pageTokenEsDeCortaDuracion) {
    try {
      const { access_token: pageTokenLargo } = await obtenerTokenLargoPlazo(pagina.access_token);
      pagina.access_token = pageTokenLargo;
    } catch {
      // Si falla, se guarda igual con el token corto -mejor eso que no
      // conectar nada; la agencia va a notar la desconexión y reconectar.
    }
  }
  // Meta a veces no devuelve expires_in en el intercambio a token de larga
  // duración (confirmado en vivo: provocaba "RangeError: Invalid time value"
  // al armar la fecha). Cuando falta, se asume la duración estándar de un
  // token de usuario de larga duración de Meta (60 días), documentada en
  // developers.facebook.com.
  const segundosValidez = expires_in && expires_in > 0 ? expires_in : 60 * 24 * 60 * 60;
  return {
    pageId: pagina.id,
    pageNombre: pagina.name,
    pageAccessToken: pagina.access_token,
    igUserId: pagina.instagram_business_account?.id || null,
    expiresAt: new Date(Date.now() + segundosValidez * 1000).toISOString(),
  };
}

export async function publicarEnFacebook(pageId: string, pageAccessToken: string, imagenUrl: string, mensaje: string) {
  const res = await fetch(`${GRAPH_URL}/${pageId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: imagenUrl, caption: mensaje, access_token: pageAccessToken }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false as const, error: data?.error?.message || JSON.stringify(data) };
  }
  const externalId = (data.post_id || data.id) as string;
  const permalink = await permalinkFacebook(externalId, pageAccessToken);
  return { ok: true as const, externalId, permalink };
}

// Mejor esfuerzo: si esta consulta extra falla, no se cae la publicación en
// sí (ya se publicó) -simplemente no se guarda el link directo al aviso.
async function permalinkFacebook(postId: string, accessToken: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${GRAPH_URL}/${postId}?fields=permalink_url&access_token=${accessToken}`);
    if (!res.ok) return undefined;
    const data = (await res.json()) as { permalink_url?: string };
    return data.permalink_url;
  } catch {
    return undefined;
  }
}

async function permalinkInstagram(mediaId: string, accessToken: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${GRAPH_URL}/${mediaId}?fields=permalink&access_token=${accessToken}`);
    if (!res.ok) return undefined;
    const data = (await res.json()) as { permalink?: string };
    return data.permalink;
  } catch {
    return undefined;
  }
}

export async function publicarEnInstagram(igUserId: string, pageAccessToken: string, imagenUrl: string, mensaje: string) {
  const resContenedor = await fetch(`${GRAPH_URL}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imagenUrl, caption: mensaje, access_token: pageAccessToken }),
  });
  const contenedor = await resContenedor.json();
  if (!resContenedor.ok) {
    return { ok: false as const, error: contenedor?.error?.message || JSON.stringify(contenedor) };
  }
  const resPublicar = await fetch(`${GRAPH_URL}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: contenedor.id, access_token: pageAccessToken }),
  });
  const publicado = await resPublicar.json();
  if (!resPublicar.ok) {
    return { ok: false as const, error: publicado?.error?.message || JSON.stringify(publicado) };
  }
  const externalId = publicado.id as string;
  const permalink = await permalinkInstagram(externalId, pageAccessToken);
  return { ok: true as const, externalId, permalink };
}

// A diferencia de Mercado Libre, Meta no tiene un estado "pausado"
// intermedio para un post de Página ni para un media de Instagram -la única
// acción real posible sobre algo ya publicado es borrarlo, definitivo.
// Confirmado contra la documentación oficial de Meta: Facebook borra
// cualquier objeto propio (post o foto) con DELETE /{id} + pages_manage_posts;
// Instagram borra un media propio con DELETE /{ig-media-id} +
// instagram_basic + instagram_manage_contents. Ambos devuelven
// {"success": true} si funcionó.
export async function eliminarPublicacionFacebook(postId: string, pageAccessToken: string) {
  const res = await fetch(`${GRAPH_URL}/${postId}?access_token=${pageAccessToken}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    return { ok: false as const, error: data?.error?.message || JSON.stringify(data) };
  }
  return { ok: true as const };
}

export async function eliminarPublicacionInstagram(mediaId: string, pageAccessToken: string) {
  const res = await fetch(`${GRAPH_URL}/${mediaId}?access_token=${pageAccessToken}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    return { ok: false as const, error: data?.error?.message || JSON.stringify(data) };
  }
  return { ok: true as const };
}
