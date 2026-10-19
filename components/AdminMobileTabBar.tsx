"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2 } from "lucide-react";

// Mismo patrón que MobileTabBar (panel de agencia) -el admin hoy solo tiene
// una sección real (Agencias), pero necesita el mismo control fijo abajo en
// mobile para ser consistente con el resto del producto.
export default function AdminMobileTabBar() {
  const pathname = usePathname();
  const active = pathname === "/admin" || pathname.startsWith("/admin/agencias");
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-zinc-800 bg-zinc-900 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <Link
        href="/admin"
        className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
          active ? "text-blue-400" : "text-zinc-500"
        }`}
      >
        <Building2 className="h-5 w-5" strokeWidth={2} />
        Agencias
      </Link>
    </nav>
  );
}
