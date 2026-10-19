import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { obtenerSesion, obtenerAgencia, Agencia } from "./data";

export const COOKIE_SESION = "anexo_session";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function compararPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

// Lee la cookie de sesión de un route handler (app/api/**/route.ts) y
// devuelve la agencia dueña de esa sesión, o null si no hay sesión válida
// o la sesión es de un admin (rol distinto de "agencia"). Todas las rutas
// privadas de /api/stock/* y /api/canales/* usan esto en vez de confiar en
// un agenciaId que venga del cliente (eso se podía falsificar).
export async function agenciaDesdeRequest(req: NextRequest): Promise<Agencia | null> {
  const token = req.cookies.get(COOKIE_SESION)?.value;
  if (!token) return null;
  const sesion = await obtenerSesion(token);
  if (!sesion || sesion.rol !== "agencia" || !sesion.agenciaId) return null;
  const agencia = await obtenerAgencia(sesion.agenciaId);
  return agencia ?? null;
}

export async function esAdminDesdeRequest(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_SESION)?.value;
  if (!token) return false;
  const sesion = await obtenerSesion(token);
  return !!sesion && sesion.rol === "admin";
}
