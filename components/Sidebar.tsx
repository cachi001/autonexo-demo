"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Camera, FileText, Car, MessageCircle, ShoppingCart, Building2, Link2, Radio, LogOut,
} from "lucide-react";

const NAV = [
  { href: "/stock", Icon: LayoutDashboard, label: "Resumen" },
  { href: "/stock/cedula", Icon: Camera, label: "Cargar por cédula" },
  { href: "/stock/csv", Icon: FileText, label: "Cargar por planilla" },
  { href: "/stock/listado", Icon: Car, label: "Stock" },
  { href: "/stock/canales", Icon: Link2, label: "Conexiones" },
  { href: "/stock/canales-externos", Icon: Radio, label: "Canales externos" },
  { href: "/stock/consultas", Icon: MessageCircle, label: "Consultas" },
  { href: "/stock/agencia", Icon: Building2, label: "Datos de la agencia" },
];

export default function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-2 border-b border-white/10 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-bold text-zinc-900">A</div>
        <div>
          <div className="text-sm font-bold tracking-tight text-white">Auto<span className="text-blue-400">Nexo</span></div>
          <div className="text-[10px] text-zinc-400">Panel de agencia</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const isAnchor = item.href.includes("#");
          const active = !isAnchor && pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.Icon className="h-4 w-4" strokeWidth={2} />{item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link href="/catalogo" className="flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/20">
          <ShoppingCart className="h-4 w-4" strokeWidth={2} /> Ver como comprador
        </Link>
        <button
          onClick={cerrarSesion}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} /> Cerrar sesión
        </button>
      </div>
    </>
  );
}
