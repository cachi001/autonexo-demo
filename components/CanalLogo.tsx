// Logos oficiales reales, descargados de fuentes oficiales (no aproximados):
// Mercado Libre -favicon oficial servido por http2.mlstatic.com (CDN propio
// de ML)-, Facebook e Instagram -ícono oficial 2023/glifo de Meta Brand
// Resource Center, vía el archivo que Wikimedia Commons aloja como logo de
// marca registrada-. Archivos en public/logos/.
import Image from "next/image";
import { Canal } from "@/lib/data";

const SRC: Record<Canal, string> = {
  mercadolibre: "/logos/mercadolibre-icon.svg",
  facebook: "/logos/facebook.svg",
  instagram: "/logos/instagram.svg",
};

const ALT: Record<Canal, string> = {
  mercadolibre: "Mercado Libre",
  facebook: "Facebook",
  instagram: "Instagram",
};

export default function CanalLogo({ canal, size = 36 }: { canal: Canal; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200"
      style={{ width: size, height: size, padding: size * 0.12 }}
    >
      <Image src={SRC[canal]} alt={ALT[canal]} width={size} height={size} className="h-full w-full object-contain" />
    </div>
  );
}
