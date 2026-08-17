#!/usr/bin/env node
// npm run tauri:web — modo navegador sin ventana.
//
// Lanza las dos piezas sin pasar por el CLI de tauri ni crear ventana:
//   - vite (frontend)  -> http://localhost:6821
//   - cargo run con RUSTOCK_WEB_ONLY=1 (backend Rust, sin GTK/WebKit)
//     -> API HTTP en http://127.0.0.1:1421
//
// Ventajas sobre "tauri dev": no requiere servidor X/Wayland (funciona en WSL,
// CI o SSH puro), no arma la ventana nativa, y el Ctrl+C detiene ambos
// procesos de forma limpia. La lógica de negocio es exactamente la misma
// (server.rs es la misma fachada HTTP que usa el modo escritorio).
//
// Variables útiles:
//   RUSTOCK_SEED=1    -> datos de ejemplo (admin / Admin1234!)
//   RUSTOCK_DB_PATH=  -> ruta alternativa de la base de datos
//   RUSTOCK_HTTP_PORT=-> puerto del API HTTP (por defecto 1421); el frontend
//                        se entera vía VITE_RUSTOCK_API, que se inyecta aquí.

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = Number(process.env.RUSTOCK_HTTP_PORT) || 1421;
const FRONT = 6821;

const hijos = [];

function lanzar(comando, args, cwd, envExtra = {}, nombre = comando) {
  const hijo = spawn(comando, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ...envExtra },
  });
  hijo.on("error", (e) => {
    console.error(`[tauri:web] error lanzando ${nombre}: ${e.message}`);
    limpiar("error de lanzamiento");
  });
  hijo.on("exit", (code, sig) => {
    console.log(`[tauri:web] ${nombre} terminó (code=${code} sig=${sig})`);
    limpiar(`${nombre} terminó`);
  });
  hijos.push(hijo);
  return hijo;
}

function limpiar(motivo) {
  if (limpiar.hecho) return;
  limpiar.hecho = true;
  console.log(`\n[tauri:web] deteniendo (${motivo})...`);
  for (const h of hijos) h.kill("SIGTERM");
  // Red de seguridad: si algo no cierra, se fuerza.
  setTimeout(() => {
    for (const h of hijos) {
      if (h.exitCode === null) h.kill("SIGKILL");
    }
  }, 3000);
  setTimeout(() => process.exit(0), 3500);
}

for (const senal of ["SIGINT", "SIGTERM"]) {
  process.on(senal, () => limpiar(senal));
}

lanzar(
  "npm",
  ["run", "dev"],
  RAIZ,
  process.env.RUSTOCK_HTTP_PORT ? { VITE_RUSTOCK_API: `http://127.0.0.1:${API}/api` } : {},
  "vite (frontend)",
);
lanzar(
  "cargo",
  ["run"],
  path.join(RAIZ, "src-tauri"),
  { RUSTOCK_WEB_ONLY: "1", RUSTOCK_HTTP_PORT: String(API) },
  "backend Rust",
);

// El backend tarda en compilar (cargo) antes de abrir el puerto; el frontend
// (vite) está listo en ~1s. Si el usuario abre la app en ese intervalo, el
// fetch a la API falla con "no se pudo conectar". Por eso se espera a que el
// servidor responda antes de anunciar que todo está listo.
console.log("[tauri:web] esperando al backend (compilando Rust si hace falta)...");
await esperarBackend(API, 5 * 60_000);
console.log(
  `[tauri:web] frontend: http://localhost:${FRONT} | API: http://127.0.0.1:${API} (Ctrl+C para detener)`,
);

/** Hace polling al API hasta que responda o se agote el tiempo. */
async function esperarBackend(puerto, timeoutMs) {
  const url = `http://127.0.0.1:${puerto}/api/quien_soy`;
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    try {
      // Cualquier respuesta HTTP (aunque sea un JSON de error de sesión)
      // significa que el servidor ya escucha.
      const res = await fetch(url, { method: "POST", signal: AbortSignal.timeout(1500) });
      if (res.status >= 200 && res.status < 500) return;
    } catch {
      // Sin conexión todavía: se reintenta.
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  console.warn(
    `[tauri:web] aviso: el backend no respondió en ${Math.round(timeoutMs / 1000)}s. ` +
      "Revisa que el puerto " + `${puerto}` + " no esté ocupado por otra instancia.",
  );
}
