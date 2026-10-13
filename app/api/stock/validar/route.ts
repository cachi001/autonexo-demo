import { NextRequest, NextResponse } from "next/server";
import { validarFila, COLUMNAS_OBLIGATORIAS } from "@/lib/data";
import * as XLSX from "xlsx";

// Los campos internos ("anio", "descripcion") van sin tilde/ñ para no
// depender de que el archivo venga bien codificado — pero a un humano hay
// que mostrarle/dejarle escribir "Año" y "Descripción" en la planilla, así
// que acá se sacan los acentos del encabezado antes de comparar.
function normalizarHeader(h: string): string {
  const sinBom = h.trim().toLowerCase().replace(/^﻿/, "");
  const sinAcentos = sinBom.normalize("NFD").replace(/[̀-ͯ]/g, "");
  // "año" sin tilde queda "ano" (3 letras), pero el campo interno es "anio"
  // (4 letras, para no depender de la ñ) — caso especial, no es solo sacar
  // el acento.
  return sinAcentos === "ano" ? "anio" : sinAcentos;
}

function parseCsv(texto: string): Record<string, string>[] {
  const lineas = texto.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim());
  if (lineas.length === 0) return [];
  const headers = lineas[0].split(",").map(normalizarHeader);
  return lineas.slice(1).map((linea) => {
    const valores = linea.split(",");
    const fila: Record<string, string> = {};
    headers.forEach((h, i) => (fila[h] = (valores[i] || "").trim()));
    return fila;
  });
}

function parseExcel(buffer: ArrayBuffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  const filas: Record<string, unknown>[] = XLSX.utils.sheet_to_json(hoja, { defval: "" });
  return filas.map((fila) => {
    const normalizada: Record<string, string> = {};
    for (const [k, v] of Object.entries(fila)) {
      normalizada[normalizarHeader(k)] = String(v ?? "").trim();
    }
    return normalizada;
  });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Falta el archivo" });

  const esExcel = /\.xlsx?$/i.test(file.name);
  const filasCrudas = esExcel ? parseExcel(await file.arrayBuffer()) : parseCsv(await file.text());

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
