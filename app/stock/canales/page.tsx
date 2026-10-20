"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import CanalLogo from "@/components/CanalLogo";
import { useToast } from "@/components/Toast";

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
  const router = useRouter();
  const { mostrar } = useToast();
  const [agencia, setAgencia] = useState<Agencia | null>(null);
  const [conectados, setConectados] = useState<CanalConectado[]>([]);
  const [cargando, setCargando] = useState(true);
  const yaMostrado = useRef(false);

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

  // Antes el resultado de la conexión (éxito o error) se leía directo de la
  // URL y quedaba mostrado como un banner fijo para siempre, incluso
  // refrescando la página o volviendo más tarde, porque el query param
  // nunca se borraba. Ahora se muestra una sola vez como toast y se limpia
  // la URL enseguida (router.replace sin query), para que no quede un error
  // viejo pegado en pantalla indefinidamente.
  useEffect(() => {
    if (yaMostrado.current) return;
    const error = params.get("error");
    const conectadoAhora = params.get("conectado");
    if (!error && !conectadoAhora) return;
    yaMostrado.current = true;
    if (error) mostrar("error", error);
    if (conectadoAhora) mostrar("exito", `${conectadoAhora} conectado correctamente.`);
    router.replace("/stock/canales");
  }, [params, mostrar, router]);

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
