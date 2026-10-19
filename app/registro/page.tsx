"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ArrowRight, ArrowLeft } from "lucide-react";

const OPERADORES = ["Claro", "Movistar", "Personal"];

export default function RegistroPage() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const [razonSocial, setRazonSocial] = useState("");
  const [cuit, setCuit] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [repetirEmail, setRepetirEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repetirPassword, setRepetirPassword] = useState("");
  const [celularCodigoArea, setCelularCodigoArea] = useState("");
  const [celularNumero, setCelularNumero] = useState("");
  const [celularOperador, setCelularOperador] = useState("");
  const [fijoCodigoArea, setFijoCodigoArea] = useState("");
  const [fijoNumero, setFijoNumero] = useState("");

  const emailsNoCoinciden = repetirEmail.trim() !== "" && email.trim() !== repetirEmail.trim();
  const passwordsNoCoinciden = repetirPassword !== "" && password !== repetirPassword;
  const passwordMuyCorta = password.length > 0 && password.length < 8;

  const faltanDatos =
    !razonSocial.trim() ||
    !cuit.trim() ||
    !nombre.trim() ||
    !apellido.trim() ||
    !email.trim() ||
    !repetirEmail.trim() ||
    emailsNoCoinciden ||
    !password ||
    !repetirPassword ||
    passwordsNoCoinciden ||
    passwordMuyCorta ||
    !celularCodigoArea.trim() ||
    !celularNumero.trim() ||
    !celularOperador;

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
          contacto_nombre: nombre,
          contacto_apellido: apellido,
          contacto_email: email,
          password,
          celular_codigo_area: celularCodigoArea,
          celular_numero: celularNumero,
          celular_operador: celularOperador,
          telefono_fijo_codigo_area: fijoCodigoArea,
          telefono_fijo_numero: fijoNumero,
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

        <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="space-y-4">
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
          </div>

          <div className="border-t border-zinc-100 pt-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Datos del solicitante</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Nombre *</label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Apellido *</label>
                <input
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  placeholder="Apellido"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@agencia.com"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Repetir email *</label>
                <input
                  type="email"
                  value={repetirEmail}
                  onChange={(e) => setRepetirEmail(e.target.value)}
                  placeholder="tu@agencia.com"
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500 ${
                    emailsNoCoinciden ? "border-red-400" : "border-zinc-300"
                  }`}
                />
                {emailsNoCoinciden && <p className="mt-1 text-xs text-red-600">Los emails no coinciden.</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Contraseña *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500 ${
                    passwordMuyCorta ? "border-red-400" : "border-zinc-300"
                  }`}
                />
                {passwordMuyCorta && <p className="mt-1 text-xs text-red-600">Tiene que tener al menos 8 caracteres.</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Repetir contraseña *</label>
                <input
                  type="password"
                  value={repetirPassword}
                  onChange={(e) => setRepetirPassword(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500 ${
                    passwordsNoCoinciden ? "border-red-400" : "border-zinc-300"
                  }`}
                />
                {passwordsNoCoinciden && <p className="mt-1 text-xs text-red-600">Las contraseñas no coinciden.</p>}
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-100 pt-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Teléfono celular *</div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Código de área</label>
                <input
                  value={celularCodigoArea}
                  onChange={(e) => setCelularCodigoArea(e.target.value)}
                  placeholder="0261"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Número</label>
                <input
                  value={celularNumero}
                  onChange={(e) => setCelularNumero(e.target.value)}
                  placeholder="15123456"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Operador</label>
                <select
                  value={celularOperador}
                  onChange={(e) => setCelularOperador(e.target.value)}
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
                  value={fijoCodigoArea}
                  onChange={(e) => setFijoCodigoArea(e.target.value)}
                  placeholder="0261"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600">Número</label>
                <input
                  value={fijoNumero}
                  onChange={(e) => setFijoNumero(e.target.value)}
                  placeholder="4123456"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
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
