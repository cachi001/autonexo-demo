import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // "cacheComponents" (experimental en Next 16) cacheaba las rutas GET de la
  // API en el build, devolviendo datos congelados del momento del build en
  // vez de ejecutar la función en cada request -> bug real encontrado esta
  // sesión (/api/leads devolvía siempre [] aunque se creara un lead nuevo).
  // Desactivado para que "export const dynamic" se comporte como el
  // estándar de Next.js, no la API experimental nueva.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
