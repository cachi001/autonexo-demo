"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { PROVINCIAS_AR } from "@/lib/provincias";

const OPERADORES = ["Claro", "Movistar", "Personal"];

type Agencia = {
  id: string;
  razon_social: string;
  cuit: string;
  contacto_nombre: string;
  contacto_apellido: string;
  contacto_email: string;
  celular_codigo_area: string;
  celular_numero: string;
  celular_operador: string;
  telefono_fijo_codigo_area: string;
  telefono_fijo_numero: string;
  ciudad: string;
  provincia_id: string;
  provincia_nombre: string;
  fecha_alta: string;
};

export default function AgenciaPage() {
  const [agencia, setAgencia] = useState<Agencia | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me) => {
        if (me.rol !== "agencia") return null;
        return fetch(`/api/agencias/${encodeURIComponent(me.agencia.id)}`).then((r) => r.json());
      })
      .then((a) => setAgencia(a || null))
      .finally(() => setCargando(false));
  }, []);

  function set<K extends keyof Agencia>(campo: K, valor: Agencia[K]) {
    setAgencia((a) => (a ? { ...a, [campo]: valor } : a));
    setGuardado(false);
  }

  const faltanDatos =
    !agencia ||
    !agencia.razon_social.trim() ||
    !agencia.cuit.trim() ||
    !agencia.contacto_nombre.trim() ||
    !agencia.contacto_apellido.trim() ||
    !agencia.contacto_email.trim() ||
    !agencia.celular_codigo_area.trim() ||
    !agencia.celular_numero.trim() ||
    !agencia.celular_operador ||
    !agencia.ciudad.trim() ||
    !agencia.provincia_id;

  async function guardar() {
    if (!agencia) return;
    setGuardando(true);
    setError("");
    setGuardado(false);
    try {
      const res = await fetch(`/api/agencias/${encodeURIComponent(agencia.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razon_social: agencia.razon_social,
          cuit: agencia.cuit,
          contacto_nombre: agencia.contacto_nombre,
          contacto_apellido: agencia.contacto_apellido,
          contacto_email: agencia.contacto_email,
          celular_codigo_area: agencia.celular_codigo_area,
          celular_numero: agencia.celular_numero,
          celular_operador: agencia.celular_operador,
          telefono_fijo_codigo_area: agencia.telefono_fijo_codigo_area,
          telefono_fijo_numero: agencia.telefono_fijo_numero,
          ciudad: agencia.ciudad,
          provincia_id: agencia.provincia_id,
          provincia_nombre: agencia.provincia_nombre,
        }),
      });
      if (!res.ok) throw new Error();
      setGuardado(true);
    } catch {
      setError("No pudimos guardar los cambios. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/stock" className="text-sm text-zinc-400 hover:text-zinc-700">Panel</Link>
          <span className="text-zinc-300">/</span>
          <h1 className="text-base font-semibold tracking-tight">Datos de la agencia</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <p className="mb-5 text-sm text-zinc-500">
          Mismos campos que pide el formulario oficial de &quot;Obtener Informe Web&quot; de la DNRPA. Se guardan en AutoNexo para
          completarlos automáticamente el día que ese trámite se automatice — nada se envía a la DNRPA desde esta pantalla.
        </p>

        {cargando && <p className="text-sm text-zinc-400">Cargando...</p>}

        {!cargando && !agencia && <p className="text-sm text-zinc-400">No hay ninguna agencia dada de alta todavía.</p>}

        {agencia && (
          <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Razón social *</label>
                <input
                  value={agencia.razon_social}
                  onChange={(e) => set("razon_social", e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">CUIT *</label>
                <input
                  value={agencia.cuit}
                  onChange={(e) => set("cuit", e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Datos del solicitante</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Nombre *</label>
                  <input
                    value={agencia.contacto_nombre}
                    onChange={(e) => set("contacto_nombre", e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Apellido *</label>
                  <input
                    value={agencia.contacto_apellido}
                    onChange={(e) => set("contacto_apellido", e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Email *</label>
                  <input
                    type="email"
                    value={agencia.contacto_email}
                    onChange={(e) => set("contacto_email", e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Teléfono celular *</div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Código de área</label>
                  <input
                    value={agencia.celular_codigo_area}
                    onChange={(e) => set("celular_codigo_area", e.target.value)}
                    placeholder="0261"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Número</label>
                  <input
                    value={agencia.celular_numero}
                    onChange={(e) => set("celular_numero", e.target.value)}
                    placeholder="15123456"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Operador</label>
                  <select
                    value={agencia.celular_operador}
                    onChange={(e) => set("celular_operador", e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Elegí uno</option>
                    {OPERADORES.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Teléfono fijo (opcional)</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Código de área</label>
                  <input
                    value={agencia.telefono_fijo_codigo_area}
                    onChange={(e) => set("telefono_fijo_codigo_area", e.target.value)}
                    placeholder="0261"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Número</label>
                  <input
                    value={agencia.telefono_fijo_numero}
                    onChange={(e) => set("telefono_fijo_numero", e.target.value)}
                    placeholder="4123456"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Ubicación *</div>
              <p className="mb-3 text-xs text-zinc-400">
                Mercado Libre exige la ubicación real de la agencia para publicar un aviso. Antes AutoNexo mandaba siempre
                &quot;Mendoza, Mendoza&quot; fijo, no importaba dónde estuviera la agencia — ahora usa lo que completes acá.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Provincia</label>
                  <select
                    value={agencia.provincia_id}
                    onChange={(e) => {
                      const prov = PROVINCIAS_AR.find((p) => p.id === e.target.value);
                      setAgencia((a) =>
                        a ? { ...a, provincia_id: prov?.id || "", provincia_nombre: prov?.nombre || "" } : a
                      );
                      setGuardado(false);
                    }}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Elegí una</option>
                    {PROVINCIAS_AR.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-600">Ciudad</label>
                  <input
                    value={agencia.ciudad}
                    onChange={(e) => set("ciudad", e.target.value)}
                    placeholder="Ciudad de Mendoza"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center gap-3">
              <button
                onClick={guardar}
                disabled={faltanDatos || guardando}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
              {guardado && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                  <Check className="h-4 w-4" strokeWidth={2.5} /> Guardado
                </span>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
