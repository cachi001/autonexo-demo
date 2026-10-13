import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-violet-50 px-4 py-12 text-center text-zinc-900 sm:px-6">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-xl font-bold text-white shadow-lg shadow-blue-200">A</div>
      <div className="mb-2 text-xl font-bold tracking-tight">
        Autos<span className="text-blue-600">click</span>
      </div>
      <h1 className="mb-3 max-w-xl text-xl font-bold sm:text-2xl">Prototipo de demo — gestión de agencia y catálogo</h1>
      <p className="mb-8 max-w-md text-sm text-zinc-500">
        Carga de stock por cédula o planilla, consultas de compradores, y el catálogo público — todo con datos de prueba que se mueven de verdad entre las dos pantallas.
      </p>
      <div className="flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
        <Link href="/stock" className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 hover:opacity-90">
          Entrar como agencia
        </Link>
        <Link href="/catalogo" className="rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50">
          Entrar como comprador
        </Link>
      </div>
      <p className="mt-10 max-w-md text-xs text-zinc-400">
        La lectura de cédula verde está simulada acá (con datos reales ya obtenidos antes) — el motor de OCR real (PaddleOCR) corre en el prototipo local, no en esta demo de Vercel.
      </p>
    </div>
  );
}
