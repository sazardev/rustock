import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    react(),
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
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
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
