import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/data";
import { COOKIE_SESION } from "@/lib/auth";
import Link from "next/link";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import AdminMobileTabBar from "@/components/AdminMobileTabBar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_SESION)?.value;
  const sesion = token ? await obtenerSesion(token) : null;
  if (!sesion || sesion.rol !== "admin") redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-50 pb-16 text-zinc-900 lg:pb-0">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold text-white">A</div>
          <h1 className="text-sm font-semibold tracking-tight sm:text-base">AutoNexo — Administración</h1>
        </Link>
        <AdminLogoutButton />
      </header>
      {children}
      <AdminMobileTabBar />
    </div>
  );
}
