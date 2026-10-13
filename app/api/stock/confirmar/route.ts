import { NextRequest, NextResponse } from "next/server";
import { agregarVehiculo, FilaValidada } from "@/lib/data";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { filas: FilaValidada[] };
  const agregados = [];
  for (const f of body.filas) {
    if (!f.valida) continue;
    const v = await agregarVehiculo({
      dominio: f.datos.dominio,
      marca: f.datos.marca,
      modelo: f.datos.modelo,
      anio: f.datos.anio,
      tipo: f.datos.tipo || "",
      precio: f.datos.precio,
      km: f.datos.km || "",
      color: f.datos.color || "",
      descripcion: f.datos.descripcion || "",
    });
    if (v) agregados.push(v);
  }
  return NextResponse.json({ agregados, cantidad: agregados.length });
}
