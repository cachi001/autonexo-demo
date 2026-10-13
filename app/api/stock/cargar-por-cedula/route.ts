import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Proxy server-side hacia el backend Python real (OpenCV + RapidOCR),
// desplegado aparte en Render porque ese modelo no entra en una función
// serverless de Vercel (pesa cientos de MB). Vercel solo reenvía el archivo;
// el OCR corre de verdad en el otro servicio.
const OCR_BACKEND_URL = process.env.OCR_BACKEND_URL || "https://autoclick-ocr-backend.onrender.com";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  if (!formData.get("frente")) {
    return NextResponse.json({ error: "Falta la foto del frente de la cédula." }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${OCR_BACKEND_URL}/stock/cargar-por-cedula`, {
      method: "POST",
      body: formData,
      // El free tier de Render "duerme" tras 15 min sin tráfico: la primera
      // request después de eso puede tardar 50s+ en despertar el contenedor.
      signal: AbortSignal.timeout(90_000),
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return NextResponse.json(
      {
        error: timedOut
          ? "El backend de OCR no respondió a tiempo (puede estar 'despertando' tras inactividad — probá de nuevo en un minuto)."
          : "No se pudo conectar con el backend de OCR real.",
      },
      { status: 502 },
    );
  }

  if (!backendRes.ok) {
    return NextResponse.json({ error: `El backend de OCR devolvió un error (${backendRes.status}).` }, { status: 502 });
  }

  const data = await backendRes.json();
  return NextResponse.json(data);
}
