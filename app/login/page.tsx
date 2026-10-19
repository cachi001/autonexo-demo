"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  async function entrarCon(emailValor: string, passwordValor: string) {
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValor, password: passwordValor }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No pudimos iniciar sesión.");
        return;
      }
      router.push(data.rol === "admin" ? "/admin" : "/stock");
      router.refresh();
    } catch {
      setError("No pudimos iniciar sesión. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  async function entrar() {
    await entrarCon(email, password);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-900">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-700">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Volver
        </Link>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h1 className="mb-1 text-xl font-bold">Ingresar</h1>
          <p className="mb-6 text-sm text-zinc-500">Entrá con el email y la contraseña de tu agencia.</p>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && entrar()}
                placeholder="tu@agencia.com"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && entrar()}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={entrar}
              disabled={!email.trim() || !password || enviando}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {enviando ? "Entrando..." : "Entrar"} <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
          <p className="mt-5 text-center text-sm text-zinc-500">
            ¿No tenés cuenta? <Link href="/registro" className="font-semibold text-blue-600 hover:underline">Activar agencia</Link>
          </p>

          <div className="mt-6 border-t border-zinc-100 pt-5">
            <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-400">Acceso rápido</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => entrarCon("emilianito528@gmail.com", "m45qnfv2pv3R")}
                disabled={enviando}
                className="rounded-lg border border-zinc-300 px-3 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
              >
                Entrar como agencia
              </button>
              <button
                onClick={() => entrarCon("emicaceres42@gmail.com", "RJCRv07H2bA")}
                disabled={enviando}
                className="rounded-lg border border-zinc-300 px-3 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
              >
                Entrar como admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
