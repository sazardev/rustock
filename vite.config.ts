import { readFileSync, writeFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  version: string;
};

/**
 * Materializa `src/pwa/sw-template.js` en `dist/sw.js` con la versión real y
 * la lista de artefactos del build (shell precacheado). Solo en build: en
 * desarrollo no hay worker, así el HMR nunca sirve una copia vieja.
 */
function rustockPwa() {
  return {
    name: "rustock-pwa",
    apply: "build" as const,
    writeBundle(options: { dir?: string }, bundle: Record<string, unknown>) {
      const dir = options.dir ?? "dist";
      // Shell de arranque: solo lo necesario para pintar la primera pantalla
      // — el chunk de entrada y lo que importa de forma estática — más hojas
      // de estilo y fuentes. Los fragmentos por ruta (mapa 3D, manual,
      // reportes) se guardan al visitarlos, no al instalar la aplicación.
      const delArranque = new Set<string>();
      for (const [nombre, item] of Object.entries(bundle)) {
        const chunk = item as { isEntry?: boolean; imports?: string[] };
        if (!chunk.isEntry) continue;
        delArranque.add(nombre);
        for (const importado of chunk.imports ?? []) {
          delArranque.add(importado);
        }
      }
      const artefactos = Object.keys(bundle).filter(
        (nombre) => delArranque.has(nombre) || /\.(?:css|woff2)$/.test(nombre),
      );
      const precache = [
        "/",
        "/index.html",
        "/manifest.webmanifest",
        "/rustock.svg",
        "/rustock-192.png",
        "/rustock-512.png",
        ...artefactos.map((nombre) => `/${nombre}`),
      ];
      const plantilla = readFileSync(new URL("./src/pwa/sw-template.js", import.meta.url), "utf8");
      const salida = plantilla
        .replaceAll("__RUSTOCK_VERSION__", pkg.version)
        .replaceAll("__RUSTOCK_PRECACHE__", JSON.stringify(precache, null, 2));
      writeFileSync(`${dir}/sw.js`, salida);
    },
  };
}

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react(),
    rustockPwa(),
    {
      name: "rustock-font-preload",
      transformIndexHtml(html, ctx) {
        const bundle = ctx?.bundle as Record<string, unknown> | undefined;
        if (!bundle) return html;
        const critical = Object.keys(bundle).filter(
          (n) =>
            n.endsWith(".woff2") &&
            (n.includes("geist-sans-latin-600") || n.includes("geist-sans-latin-700")),
        );
        if (critical.length === 0) return html;
        const links = critical
          .slice(0, 2)
          .map((f) => `<link rel="preload" href="/${f}" as="font" type="font/woff2" crossorigin>`)
          .join("\n    ");
        return html.replace("</head>", `    ${links}\n  </head>`);
      },
    },
  ],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // SEO + security headers en dev (espejo de lo que debe servir el hosting de rustock.app)
  // HSTS, nosniff y X-Frame-Options son señales de confianza para crawlers
  // y mejoran el ranking de "page experience".
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 6821,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      // La cámara es la herramienta del escáner (SPEC §14.3): se habilita
      // solo para el propio origen. El micrófono sigue denegado — Rustock no
      // graba audio en ninguna pantalla.
      "Permissions-Policy": "camera=(self), microphone=(), geolocation=(self)",
    },
  },

  // 4. build optimizations for max performance (STACK §8.2 code-splitting)
  build: {
    target: "es2022",
    sourcemap: false,
    minify: "esbuild",
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three") || id.includes("@react-three")) return "three";
          if (id.includes("node_modules/react-router")) return "router";
          if (id.includes("@tanstack/react-query") || id.includes("node_modules/zustand"))
            return "query";
          if (id.includes("node_modules/react")) return "react";
        },
      },
    },
  },
}));
