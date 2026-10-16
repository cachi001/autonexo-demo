import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12 text-center text-zinc-900 sm:px-6">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white shadow-sm">A</div>
      <div className="mb-2 text-xl font-bold tracking-tight">
        Autos<span className="text-blue-600">click</span>
      </div>
      <h1 className="mb-3 max-w-xl text-xl font-bold sm:text-2xl">Prototipo — gestión de agencia y catálogo</h1>
      <p className="mb-8 max-w-md text-sm text-zinc-500">
        Carga de stock por cédula (OCR real: OpenCV + RapidOCR) o planilla, consultas de compradores, y el catálogo público — todo con datos que se mueven de verdad entre las dos pantallas.
      </p>

      <div className="mb-8 w-full max-w-sm rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-left">
        <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">Plan único — todo incluido</div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight">$90.000</span>
          <span className="text-xs text-zinc-500">ARS/mes · primeros 30 días gratis</span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">Stock y usuarios ilimitados, multi-sucursal incluido, OCR de cédula, WhatsApp y asistente de IA.</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
        <Link href="/registro" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
          Empezar prueba gratis
        </Link>
        <Link href="/stock" className="rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50">
          Ver demo del panel
        </Link>
        <Link href="/catalogo" className="rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50">
          Entrar como comprador
        </Link>
      </div>
      <p className="mt-10 max-w-md text-xs text-zinc-400">
        El OCR de la cédula corre de verdad (OpenCV + RapidOCR) en un backend aparte, desplegado en Render — la primera foto después de un rato sin uso puede tardar hasta un minuto mientras el servidor despierta.
      </p>
    </div>
  );
}
