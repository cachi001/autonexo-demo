import { NextRequest, NextResponse } from "next/server";

// Segundo paso del proxy a "Radicación por Patente" de la DNRPA. Reproduce
// el POST que hace el formulario real (ver radicacion2.php, campo
// name="dominio" / name="verificador") contra la URL de resultado.
const DNRPA_RESULT_URL = "https://www.dnrpa.gov.ar/portal_dnrpa/radicacion/consinve_amq.php";

export type ResultadoDNRPA = {
  dominio: string;
  tipoVehiculo: string;
  registroSeccional: string;
  direccion: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
  telefono: string;
  fechaConsulta: string;
};

// El HTML real de la DNRPA trae las tildes como entidades (&oacute;, etc.),
// no como UTF-8 -> se decodifican los textos fijos (etiquetas, mensajes de
// error) y también los valores ya extraídos.
function decodeEntities(s: string): string {
  return s
    .replace(/&oacute;/gi, "ó")
    .replace(/&aacute;/gi, "á")
    .replace(/&eacute;/gi, "é")
    .replace(/&iacute;/gi, "í")
    .replace(/&uacute;/gi, "ú")
    .replace(/&ntilde;/gi, "ñ")
    .replace(/&deg;/gi, "°")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Equivalente de "ó" que matchea tanto la entidad HTML real (&oacute;) como
// el caracter ya decodificado, por si la fuente cambia de encoding.
const O_ACENTUADA = "(?:ó|&oacute;)";
const I_ACENTUADA = "(?:í|&iacute;)";

function extraerCampo(html: string, etiquetaRe: string): string {
  // Los campos del resultado real vienen como:
  //   <b>Etiqueta</b>. <font ...>VALOR</font>   (Dominio / Tipo de Vehículo)
  //   Etiqueta. </font><font ...>VALOR</font>   (el resto)
  //   Etiqueta. <font ...>VALOR...               (Fecha, en el encabezado)
  const reConB = new RegExp(`<b>${etiquetaRe}<\\/b>\\.\\s*<font[^>]*>([^<]*)`, "i");
  // El HTML real no siempre cierra el <font> del valor con </font> antes de
  // la siguiente etiqueta de tabla (</tr>, </td>, hasta algún </b> suelto en
  // "Teléfono") -> se corta en el próximo "<" sea cual sea el tag.
  const reSinB = new RegExp(`${etiquetaRe}\\.\\s*<\\/font>\\s*<font[^>]*>([^<]*)`, "i");
  // "Fecha." en el encabezado: etiqueta seguida directo de <font>, sin </font>
  // previo ni <b> alrededor.
  const reDirecto = new RegExp(`${etiquetaRe}\\.\\s*<font[^>]*>([^<]*)`, "i");
  const m = html.match(reConB) || html.match(reSinB) || html.match(reDirecto);
  return m ? decodeEntities(m[1]) : "";
}

export async function POST(req: NextRequest) {
  let body: { dominio?: string; codigoVerificador?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const dominio = (body.dominio || "").trim().toUpperCase();
  const codigoVerificador = (body.codigoVerificador || "").trim();
  if (!dominio || !codigoVerificador) {
    return NextResponse.json({ error: "Faltan el dominio o el código verificador." }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(DNRPA_RESULT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (compatible; AutoNexo/1.0)",
      },
      body: new URLSearchParams({ dominio, verificador: codigoVerificador }).toString(),
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: "No se pudo conectar con la DNRPA. Probá de nuevo." }, { status: 502 });
    }
    html = await res.text();
  } catch {
    return NextResponse.json({ error: "No se pudo conectar con la DNRPA. Probá de nuevo." }, { status: 502 });
  }

  if (new RegExp(`C${O_ACENTUADA}digo verificador incorrecto`, "i").test(html)) {
    return NextResponse.json(
      { error: "El código verificador no es correcto (o ya se usó). Pedí uno nuevo y escribilo con cuidado." },
      { status: 422 }
    );
  }
  if (new RegExp(`No se encontr${O_ACENTUADA} informaci${O_ACENTUADA}n para el dominio`, "i").test(html)) {
    return NextResponse.json({ error: `La DNRPA no tiene información registrada para el dominio ${dominio}.` }, { status: 404 });
  }

  const resultado: ResultadoDNRPA = {
    dominio: extraerCampo(html, "Dominio") || dominio,
    tipoVehiculo: extraerCampo(html, `Tipo de Veh${I_ACENTUADA}culo`),
    registroSeccional: extraerCampo(html, "Registro Seccional"),
    direccion: extraerCampo(html, `Direcci${O_ACENTUADA}n`),
    localidad: extraerCampo(html, "Localidad"),
    provincia: extraerCampo(html, "Provincia"),
    codigoPostal: extraerCampo(html, `C${O_ACENTUADA}digo Postal`),
    telefono: extraerCampo(html, `Tel${O_ACENTUADA}fono`),
    fechaConsulta: extraerCampo(html, "Fecha"),
  };

  if (!resultado.tipoVehiculo && !resultado.registroSeccional) {
    return NextResponse.json(
      { error: "La DNRPA respondió pero no se pudo interpretar el resultado. Probá de nuevo o verificalo a mano en dnrpa.gov.ar." },
      { status: 502 }
    );
  }

  return NextResponse.json(resultado);
}
