import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

const COLUMNAS = ["Dominio", "Marca", "Modelo", "Año", "Tipo", "Precio", "Km", "Color", "Descripción"];
const FILA_EJEMPLO = ["AB123CD", "VOLKSWAGEN", "GOL TREND", "2019", "SEDAN", "8500000", "65000", "BLANCO", "Único dueño"];

export async function GET() {
  const hoja = XLSX.utils.aoa_to_sheet([COLUMNAS, FILA_EJEMPLO]);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Stock");
  const buffer = XLSX.write(libro, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=plantilla_stock.xlsx",
    },
  });
}
