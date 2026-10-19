import { listarAgencias, listarStock, listarCanalesConectados } from "@/lib/data";
import { Building2, ChevronRight } from "lucide-react";
import Link from "next/link";

const CANAL_LABEL: Record<string, string> = {
  mercadolibre: "Mercado Libre",
  facebook: "Facebook",
  instagram: "Instagram",
};

// Listado de agencias -el auth-gate (admin-only) vive en app/admin/layout.tsx.
export default async function AdminPage() {
  const agencias = await listarAgencias();
  const filas = await Promise.all(
    agencias.map(async (a) => {
      const [stock, canales] = await Promise.all([listarStock(a.id), listarCanalesConectados(a.id)]);
      return { agencia: a, cantidadVehiculos: stock.length, canales };
    })
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p className="mb-5 text-sm text-zinc-500">
        {agencias.length} {agencias.length === 1 ? "agencia dada de alta" : "agencias dadas de alta"}.
      </p>

      {filas.length === 0 && (
        <p className="text-sm text-zinc-400">Todavía no hay ninguna agencia registrada.</p>
      )}

      <div className="space-y-3">
        {filas.map(({ agencia, cantidadVehiculos, canales }) => (
          <Link
            key={agencia.id}
            href={`/admin/agencias/${agencia.id}`}
            className="block rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Building2 className="h-5 w-5" strokeWidth={2} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-800">{agencia.razon_social}</div>
                  <div className="text-xs text-zinc-400">
                    CUIT {agencia.cuit} · Alta {agencia.fecha_alta} · {agencia.contacto_nombre} {agencia.contacto_apellido}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right text-xs text-zinc-500">
                  <div className="font-semibold text-zinc-800">{cantidadVehiculos}</div>
                  <div>vehículos</div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300" strokeWidth={2} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
              {(["mercadolibre", "facebook", "instagram"] as const).map((c) => {
                const conectado = canales.find((x) => x.canal === c);
                return (
                  <span
                    key={c}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      conectado ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-400"
                    }`}
                  >
                    {CANAL_LABEL[c]} {conectado ? `— ${conectado.cuenta_externa_nombre}` : "— sin conectar"}
                  </span>
                );
              })}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
