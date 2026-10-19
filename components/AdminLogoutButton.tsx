"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function AdminLogoutButton() {
  const router = useRouter();
  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button onClick={cerrarSesion} className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900">
      <LogOut className="h-4 w-4" strokeWidth={2} /> Cerrar sesión
    </button>
  );
}
