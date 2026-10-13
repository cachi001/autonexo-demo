import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center text-zinc-900">
      <div className="mb-2 text-xl font-bold tracking-tight">
        Autos<span className="text-blue-600">click</span>
      </div>
      <h1 className="mb-3 max-w-xl text-2xl font-bold">Prototipo de demo — gestión de agencia y catálogo</h1>
      <p className="mb-8 max-w-md text-sm text-zinc-500">
        Carga de stock por cédula o planilla, consultas de compradores, y el catálogo público — todo con datos de prueba que se mueven de verdad entre las dos pantallas.
      </p>
      <div className="flex gap-3">
        <Link href="/stock" className="rounded-lg bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:opacity-90">
          Entrar como agencia
        </Link>
        <Link href="/catalogo" className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-semibold hover:bg-zinc-50">
          Entrar como comprador
        </Link>
      </div>
      <p className="mt-10 max-w-md text-xs text-zinc-400">
        La lectura de cédula verde está simulada acá (con datos reales ya obtenidos antes) — el motor de OCR real (PaddleOCR) corre en el prototipo local, no en esta demo de Vercel.
      </p>
    </div>
  );
}
