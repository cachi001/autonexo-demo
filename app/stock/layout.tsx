import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { obtenerSesion, listarPublicacionesDeAgencia } from "@/lib/data";
import { COOKIE_SESION } from "@/lib/auth";
import StockShell from "@/components/StockShell";

// Gate de sesión real para todo /stock/* -antes esta carpeta era pública
// para cualquiera que supiera la URL, no había ningún login. Server
// Component a propósito (no "use client"): el chequeo corre antes de
// mandar cualquier HTML al navegador, así una sesión inválida nunca llega
// a ver ni un parpadeo de los datos de la agencia.
export default async function StockLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_SESION)?.value;
  const sesion = token ? await obtenerSesion(token) : null;
  if (!sesion || sesion.rol !== "agencia") {
    redirect("/login");
  }

  // Bidireccionalidad real: antes la agencia solo se enteraba de un error de
  // publicación (ej. precio rechazado por ML) si entraba por su cuenta a
  // Canales externos -nada se lo avisaba. Este conteo se calcula acá (layout
  // que envuelve TODO /stock/*) para que el aviso se vea entre en la página
  // que entre, no solo en Canales externos.
  const publicaciones = await listarPublicacionesDeAgencia(sesion.agenciaId!);
  const conError = publicaciones.filter((p) => p.estado === "error").length;

  return <StockShell conError={conError}>{children}</StockShell>;
}
