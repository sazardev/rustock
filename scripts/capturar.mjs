// Capturas de pantalla para revisión visual.
//
// Rustock no tiene una suite de pruebas de interfaz, y muchos defectos —un
// contraste roto, un panel que desborda, un tema que no se aplica— no los ve
// ni el compilador ni el linter. Esto abre la app en Chrome headless, inicia
// sesión de verdad y guarda una captura por ruta.
//
//   node scripts/capturar.mjs [ruta...]
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

const CHROME = process.env.CHROME ?? "google-chrome-stable";
const FRONT = process.env.RUSTOCK_FRONT ?? "http://localhost:6821";
const API = process.env.RUSTOCK_API ?? "http://127.0.0.1:1421/api";
const SALIDA = process.env.SALIDA ?? "/tmp/rustock-capturas";
/** Idioma con el que se pinta la app (RUSTOCK_IDIOMA=en para revisar el inglés). */
const IDIOMA = process.env.RUSTOCK_IDIOMA ?? "es";
const PERFIL = `${SALIDA}/perfil`;

const RUTAS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "/login",
      "/dashboard",
      "/movimientos",
      "/escanear",
      "/etiquetas",
      "/reglas",
      "/reglas/nueva",
      "/escaneos",
      "/productos",
      "/configuracion",
    ];

/** Inicia sesión contra el backend y devuelve el token. */
async function token() {
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombreUsuario: process.env.RUSTOCK_USER ?? "admin",
      password: process.env.RUSTOCK_PASS ?? "Admin1234!",
    }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return json.sesion;
}

rmSync(SALIDA, { recursive: true, force: true });
mkdirSync(PERFIL, { recursive: true });

// El token vive en sessionStorage del navegador (ver `api.ts`), que es por
// origen: la página que lo escribe tiene que servirse desde el mismo origen
// que la app. Por eso la semilla va a `public/`, no a un `file://`.
const t = await token();
const semilla = "public/_captura.html";

for (const ruta of RUTAS) {
  const archivo = `${SALIDA}/${ruta.replaceAll("/", "_").replace(/^_/, "") || "raiz"}.png`;
  writeFileSync(
    semilla,
    `<!doctype html><meta charset="utf-8"><script>
       sessionStorage.setItem(${JSON.stringify("rustock.sesion")}, ${JSON.stringify(t)});
       localStorage.setItem(${JSON.stringify("rustock.idioma")}, ${JSON.stringify(IDIOMA)});
       location.replace(${JSON.stringify(ruta)});
     </script>`,
  );
  try {
    execFileSync(
      CHROME,
      [
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        `--user-data-dir=${PERFIL}`,
        "--window-size=1440,900",
        "--virtual-time-budget=8000",
        `--screenshot=${archivo}`,
        `${FRONT}/_captura.html`,
      ],
      { stdio: "ignore", timeout: 60_000 },
    );
    console.log(`  ${ruta.padEnd(20)} → ${archivo}`);
  } catch {
    console.log(`  ${ruta.padEnd(20)} → FALLÓ`);
  }
}
rmSync(semilla, { force: true });
console.log(`\n${RUTAS.length} capturas en ${SALIDA}`);
