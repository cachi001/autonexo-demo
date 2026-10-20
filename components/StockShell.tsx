"use client";

import { useState } from "react";
import { X } from "lucide-react";
import SidebarContent from "@/components/Sidebar";
import MobileTabBar from "@/components/MobileTabBar";

export default function StockShell({ children, conError = 0 }: { children: React.ReactNode; conError?: number }) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-zinc-900 lg:flex">
        <SidebarContent conError={conError} />
      </aside>

      {menuAbierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuAbierto(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-zinc-900 shadow-2xl">
            <button
              onClick={() => setMenuAbierto(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
            <SidebarContent conError={conError} onNavigate={() => setMenuAbierto(false)} />
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1 pb-16 lg:pb-0 lg:pl-64">{children}</div>

      <MobileTabBar onMore={() => setMenuAbierto(true)} conError={conError} />
    </div>
  );
}
