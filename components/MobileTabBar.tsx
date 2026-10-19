"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Car, Radio, MessageCircle, Menu } from "lucide-react";

const TABS = [
  { href: "/stock", Icon: LayoutDashboard, label: "Resumen" },
  { href: "/stock/listado", Icon: Car, label: "Stock" },
  { href: "/stock/canales-externos", Icon: Radio, label: "Canales" },
  { href: "/stock/consultas", Icon: MessageCircle, label: "Consultas" },
];

// Barra fija abajo en mobile -antes la única forma de navegar en mobile era
// abrir el menú hamburguesa cada vez; esto deja las secciones más usadas a
// un toque, como cualquier app mobile real. "Más" abre el menú completo
// (cédula, planilla, conexiones, agencia) para lo que no entra acá.
export default function MobileTabBar({ onMore, conError = 0 }: { onMore: () => void; conError?: number }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
              active ? "text-blue-600" : "text-zinc-400"
            }`}
          >
            <span className="relative">
              <t.Icon className="h-5 w-5" strokeWidth={2} />
              {t.href === "/stock/canales-externos" && conError > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {conError}
                </span>
              )}
            </span>
            {t.label}
          </Link>
        );
      })}
      <button
        onClick={onMore}
        className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-zinc-400"
      >
        <Menu className="h-5 w-5" strokeWidth={2} />
        Más
      </button>
    </nav>
  );
}
