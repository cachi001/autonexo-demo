import { NextRequest, NextResponse } from "next/server";
import { obtenerAgenciaPorEmailConHash, crearSesion } from "@/lib/data";
import { compararPassword, COOKIE_SESION } from "@/lib/auth";

// Login único para agencia y para el admin de AutoNexo: si el email/clave
// coinciden con ADMIN_EMAIL/ADMIN_PASSWORD_HASH (vars de entorno, un solo
// admin -vos-, no hay tabla de admins), se crea sesión de rol "admin" y se
// redirige al panel; si no, se busca como agencia normal.
export async function POST(req: NextRequest) {
  const { email, password } = (await req.json()) as { email?: string; password?: string };
  if (!email?.trim() || !password) {
    return NextResponse.json({ error: "Faltan email y contraseña." }, { status: 400 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  if (adminEmail && adminHash && email.trim().toLowerCase() === adminEmail.toLowerCase()) {
    const ok = await compararPassword(password, adminHash);
    if (!ok) return NextResponse.json({ error: "Email o contraseña incorrectos." }, { status: 401 });
    const token = await crearSesion(null, "admin");
    const res = NextResponse.json({ ok: true, rol: "admin" });
    res.cookies.set(COOKIE_SESION, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }

  const agencia = await obtenerAgenciaPorEmailConHash(email.trim());
  if (!agencia) return NextResponse.json({ error: "Email o contraseña incorrectos." }, { status: 401 });
  const ok = await compararPassword(password, agencia.password_hash);
  if (!ok) return NextResponse.json({ error: "Email o contraseña incorrectos." }, { status: 401 });

  const token = await crearSesion(agencia.id, "agencia");
  const res = NextResponse.json({ ok: true, rol: "agencia" });
  res.cookies.set(COOKIE_SESION, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
