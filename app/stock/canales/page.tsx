"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import CanalLogo from "@/components/CanalLogo";

type CanalConectado = {
  canal: "mercadolibre" | "instagram" | "facebook";
  cuenta_externa_nombre: string;
  conectado_en: string;
};

type Agencia = { id: string; razon_social: string };

const CANALES: { id: "mercadolibre" | "instagram" | "facebook"; nombre: string; conectarVia: string }[] = [
  { id: "mercadolibre", nombre: "Mercado Libre", conectarVia: "mercadolibre" },
  { id: "facebook", nombre: "Facebook", conectarVia: "meta" },
  { id: "instagram", nombre: "Instagram", conectarVia: "meta" },
];

export default function CanalesPage() {
  return (
    <Suspense fallback={null}>
      <CanalesPageInterna />
    </Suspense>
  );
}

function CanalesPageInterna() {
  const params = useSearchParams();
  const [agencia, setAgencia] = useState<Agencia | null>(null);
  const [conectados, setConectados] = useState<CanalConectado[]>([]);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    const resMe = await fetch("/api/auth/me");
    const dataMe = await resMe.json();
    const a = dataMe.rol === "agencia" ? dataMe.agencia : null;
    setAgencia(a);
    if (a) {
      const resC = await fetch("/api/canales");
      const dataC = await resC.json();
      setConectados(dataC.canales || []);
    }
    setCargando(false);
  }
  useEffect(() => { cargar(); }, []);

  async function desconectar(canal: string) {
    if (!agencia) return;
    await fetch("/api/canales", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canal }),
    });
    cargar();
  }

  const error = params.get("error");
  const conectadoAhora = params.get("conectado");

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/stock" className="text-sm text-zinc-400 hover:text-zinc-700">Panel</Link>
          <span className="text-zinc-300">/</span>
          <h1 className="text-base font-semibold tracking-tight">Conexiones</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <p className="mb-5 text-sm text-zinc-500">
          Conectá tus cuentas una vez acá. Después, desde cada vehículo del stock, publicás con un botón
          (siempre con aprobación explícita — nada se publica solo). Para ver qué está publicado y hacerle
          seguimiento, andá a <Link href="/stock/canales-externos" className="underline">Canales externos</Link>.
        </p>

        {conectadoAhora && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} /> {conectadoAhora} conectado correctamente.
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} /> {error}
          </div>
        )}

        {cargando && <p className="text-sm text-zinc-400">Cargando...</p>}

        {!cargando && !agencia && (
          <p className="text-sm text-amber-600">
            Cargá primero los <Link href="/stock/agencia" className="underline">datos de la agencia</Link> para poder conectar canales.
          </p>
        )}

        {!cargando && agencia && (
          <div className="space-y-3">
            {CANALES.map((c) => {
              const conectado = conectados.find((x) => x.canal === c.id);
              return (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <CanalLogo canal={c.id} />
                    <div>
                      <div className="text-sm font-semibold text-zinc-800">{c.nombre}</div>
                      {conectado ? (
                        <div className="text-xs text-emerald-700">Conectado — {conectado.cuenta_externa_nombre}</div>
                      ) : (
                        <div className="text-xs text-zinc-400">No conectado</div>
                      )}
                    </div>
                  </div>
                  {conectado ? (
                    <button
                      onClick={() => desconectar(c.id)}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                    >
                      Desconectar
                    </button>
                  ) : (
                    <a
                      href={`/api/canales/${c.conectarVia}/conectar`}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
                    >
                      Conectar
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
