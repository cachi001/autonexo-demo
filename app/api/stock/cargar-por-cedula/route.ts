import { NextRequest, NextResponse } from "next/server";
import { simularLecturaCedula, validarFila } from "@/lib/data";

// Simula lo que hace el prototipo local con PaddleOCR de verdad: PaddleOCR no
// corre en funciones serverless de Vercel (pesa cientos de MB, ~9s solo para
// cargar el modelo). Los resultados que devuelve esta ruta son datos reales
// ya obtenidos con el prototipo local contra fotos de cédulas reales — no se
// inventan, solo se "reproducen" acá para que la demo muestre el formato
// correcto de los campos sin correr el modelo pesado en cada request.
export async function POST(_req: NextRequest) {
  await new Promise((r) => setTimeout(r, 900)); // simula el tiempo real de lectura
  const leido = simularLecturaCedula();

  const filaCruda = {
    dominio: leido.dominio,
    marca: leido.marca,
    modelo: leido.modelo,
    anio: leido.anio,
    tipo: "",
    precio: "",
    km: "",
    color: "",
    descripcion: "",
  };
  const fila = validarFila(filaCruda, 1);

  return NextResponse.json({
    fila,
    chasis_detectado: leido.chasis,
    tipo_documento: "cedula_verde",
    advertencias: [] as string[],
    demo: true,
  });
}
