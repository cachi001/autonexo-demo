"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ArrowRight, ArrowLeft } from "lucide-react";

export default function RegistroPage() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [cuit, setCuit] = useState("");
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoEmail, setContactoEmail] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");

  const faltanDatos = !razonSocial.trim() || !cuit.trim() || !contactoNombre.trim() || !contactoEmail.trim();

  async function activar() {
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/agencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razon_social: razonSocial,
          cuit,
          contacto_nombre: contactoNombre,
          contacto_email: contactoEmail,
          contacto_telefono: contactoTelefono,
        }),
      });
      if (!res.ok) throw new Error();
      router.push("/stock");
    } catch {
      setError("No pudimos activar la cuenta. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-700">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Volver
        </Link>

        <div className="mb-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600">Plan único — todo incluido</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight">$90.000</span>
            <span className="text-sm text-zinc-500">ARS / mes, sin límite de stock ni de usuarios</span>
          </div>
          <ul className="mt-4 grid gap-1.5 text-sm text-zinc-700 sm:grid-cols-2">
            {[
              "Primeros 30 días gratis",
              "Stock y usuarios ilimitados",
              "Carga por cédula (OCR real)",
              "Multi-sucursal incluido",
              "WhatsApp directo con el comprador",
              "Asistente de IA (staff y comprador)",
              "Compliance ARCA / DNRPA / UIF",
              "Catálogo público indexable",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 flex-shrink-0 text-blue-600" strokeWidth={2.5} /> {f}
              </li>
            ))}
          </ul>
        </div>

        <h1 className="mb-1 text-xl font-bold">Activá tu cuenta</h1>
        <p className="mb-6 text-sm text-zinc-500">No se cobra nada durante los primeros 30 días.</p>

        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Razón social *</label>
            <input
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              placeholder="Ej: AutoMadero S.R.L."
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">CUIT *</label>
            <input
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              placeholder="30-12345678-9"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Tu nombre *</label>
              <input
                value={contactoNombre}
                onChange={(e) => setContactoNombre(e.target.value)}
                placeholder="Nombre y apellido"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Email *</label>
              <input
                type="email"
                value={contactoEmail}
                onChange={(e) => setContactoEmail(e.target.value)}
                placeholder="tu@agencia.com"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-zinc-600">Teléfono / WhatsApp</label>
            <input
              value={contactoTelefono}
              onChange={(e) => setContactoTelefono(e.target.value)}
              placeholder="+54 9 261..."
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={activar}
            disabled={faltanDatos || enviando}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {enviando ? "Activando..." : "Empezar prueba gratis de 30 días"} <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
