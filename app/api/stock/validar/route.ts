import { NextRequest, NextResponse } from "next/server";
import { validarFila, COLUMNAS_OBLIGATORIAS } from "@/lib/data";

function parseCsv(texto: string): Record<string, string>[] {
  const lineas = texto.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim());
  if (lineas.length === 0) return [];
  const headers = lineas[0].split(",").map((h) => h.trim().toLowerCase().replace(/^﻿/, ""));
  return lineas.slice(1).map((linea) => {
    const valores = linea.split(",");
    const fila: Record<string, string> = {};
    headers.forEach((h, i) => (fila[h] = (valores[i] || "").trim()));
    return fila;
  });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Falta el archivo" });

  const texto = await file.text();
  const filasCrudas = parseCsv(texto);
  if (filasCrudas.length === 0) {
    return NextResponse.json({ error: "El archivo está vacío" });
  }

  const headers = Object.keys(filasCrudas[0]);
  const faltantes = COLUMNAS_OBLIGATORIAS.filter((c) => !headers.includes(c));
  if (faltantes.length > 0) {
    return NextResponse.json({ error: `Al archivo le faltan columnas obligatorias: ${faltantes.join(", ")}` });
  }

  const filas = filasCrudas.map((f, i) => validarFila(f, i + 2));
  const validas = filas.filter((f) => f.valida).length;
  return NextResponse.json({ filas, total: filas.length, validas, con_error: filas.length - validas });
}
