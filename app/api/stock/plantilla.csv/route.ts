import { NextResponse } from "next/server";

const CSV = `dominio,marca,modelo,anio,tipo,precio,km,color,descripcion
AB123CD,VOLKSWAGEN,GOL TREND,2019,SEDAN,8500000,65000,BLANCO,Único dueño
`;

export async function GET() {
  return new NextResponse(CSV, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=plantilla_stock.csv",
    },
  });
}
