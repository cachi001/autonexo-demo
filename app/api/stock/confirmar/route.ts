import { NextRequest, NextResponse } from "next/server";
import { agregarVehiculo, FilaValidada } from "@/lib/data";
import { agenciaDesdeRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const agencia = await agenciaDesdeRequest(req);
  if (!agencia) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = (await req.json()) as { filas: FilaValidada[] };
  const agregados = [];
  const errores: string[] = [];
  for (const f of body.filas) {
    if (!f.valida) continue;
    const resultado = await agregarVehiculo({
      dominio: f.datos.dominio,
      agencia_id: agencia.id,
      marca: f.datos.marca,
      modelo: f.datos.modelo,
      anio: f.datos.anio,
      tipo: f.datos.tipo || "",
      precio: f.datos.precio,
      km: f.datos.km || "",
      color: f.datos.color || "",
      descripcion: f.datos.descripcion || "",
      version: "",
      combustible: "",
      puertas: "",
      chasis: f.datos.chasis || "",
      titular_nombre: f.datos.titular_nombre || "",
      titular_domicilio: f.datos.titular_domicilio || "",
      titular_dni: f.datos.titular_dni || "",
      libre_deuda_atm: f.datos.libre_deuda_atm || "",
    });
    if (resultado.vehiculo) agregados.push(resultado.vehiculo);
    else errores.push(resultado.error);
  }
  // "error" solo cuando NINGUNA fila se guardó -con una planilla de varias
  // filas, puede haber una patente repetida y el resto cargarse bien, eso no
  // es un fracaso total (antes "No se pudo guardar. Revisá los campos." no
  // decía nada de esto, encontrado en vivo 2026-10-21).
  return NextResponse.json({
    agregados,
    cantidad: agregados.length,
    error: agregados.length === 0 ? errores[0] : undefined,
    errores: errores.length ? errores : undefined,
  });
}
