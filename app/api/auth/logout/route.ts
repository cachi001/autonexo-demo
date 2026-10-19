import { NextRequest, NextResponse } from "next/server";
import { borrarSesion } from "@/lib/data";
import { COOKIE_SESION } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_SESION)?.value;
  if (token) await borrarSesion(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_SESION);
  return res;
}
