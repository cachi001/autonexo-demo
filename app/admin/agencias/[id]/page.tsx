import { obtenerAgencia, listarStock, listarCanalesConectados } from "@/lib/data";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Mail, Phone, CheckCircle2, Car } from "lucide-react";

const CANAL_LABEL: Record<string, string> = {
  mercadolibre: "Mercado Libre",
  facebook: "Facebook",
  instagram: "Instagram",
};

export default async function AdminAgenciaDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agencia = await obtenerAgencia(id);
  if (!agencia) notFound();

  const [stock, canales] = await Promise.all([listarStock(id), listarCanalesConectados(id)]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Link href="/admin" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-700">
        <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Todas las agencias
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Building2 className="h-6 w-6" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">{agencia.razon_social}</h2>
          <div className="text-xs text-zinc-400">CUIT {agencia.cuit} · Alta {agencia.fecha_alta}</div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Contacto</h3>
          <div className="space-y-2 text-sm">
            <div className="font-medium text-zinc-800">{agencia.contacto_nombre} {agencia.contacto_apellido}</div>
            <div className="flex items-center gap-2 text-zinc-600">
              <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-400" strokeWidth={2} /> {agencia.contacto_email}
            </div>
            {agencia.celular_numero && (
              <div className="flex items-center gap-2 text-zinc-600">
                <Phone className="h-3.5 w-3.5 shrink-0 text-zinc-400" strokeWidth={2} />
                {agencia.celular_codigo_area} {agencia.celular_numero} ({agencia.celular_operador})
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Canales conectados</h3>
          <div className="space-y-2">
            {(["mercadolibre", "facebook", "instagram"] as const).map((c) => {
              const conectado = canales.find((x) => x.canal === c);
              return (
                <div key={c} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-700">{CANAL_LABEL[c]}</span>
                  {conectado ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} /> {conectado.cuenta_externa_nombre}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">Sin conectar</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          <Car className="h-3.5 w-3.5" strokeWidth={2} /> Stock ({stock.length})
        </h3>
        {stock.length === 0 ? (
          <p className="text-sm text-zinc-400">Sin vehículos cargados.</p>
        ) : (
          <div className="divide-y divide-zinc-100">
            {stock.map((v) => (
              <div key={v.dominio} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-medium text-zinc-800">{v.marca} {v.modelo}</span>{" "}
                  <span className="text-zinc-400">· {v.dominio}</span>
                </div>
                <span className={v.documentacion_validada ? "text-xs text-emerald-700" : "text-xs text-amber-600"}>
                  {v.documentacion_validada ? "Documentación validada" : "Pendiente de validar"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
