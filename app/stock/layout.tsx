"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import SidebarContent from "@/components/Sidebar";

export default function StockLayout({ children }: { children: React.ReactNode }) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-zinc-900 lg:flex">
        <SidebarContent />
      </aside>

      {menuAbierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuAbierto(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-zinc-900 shadow-2xl">
            <SidebarContent onNavigate={() => setMenuAbierto(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 lg:pl-64">
        <button
          onClick={() => setMenuAbierto(true)}
          className="fixed left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white shadow-sm lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
        {children}
      </div>
    </div>
  );
}
