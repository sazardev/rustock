// Prueba definitiva del PDF de etiquetas (SPEC §14.3.5).
//
// Rasteriza el PDF que genera Rust con poppler y decodifica los códigos con
// zxing. Si esto pasa, lo que sale por una impresora corriente desde ese PDF
// lo lee un escáner: no se comprueba el formato del archivo, se comprueba el
// resultado impreso.
//
// Requiere `pdftoppm` (poppler-utils). Sin él, la prueba se omite.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync, mkdirSync } from "node:fs";
import { readBarcodes, prepareZXingModule } from "zxing-wasm/reader";

const wasm = readFileSync("node_modules/zxing-wasm/dist/reader/zxing_reader.wasm");
prepareZXingModule({ overrides: { wasmBinary: wasm.buffer } });

const API = process.env.RUSTOCK_API ?? "http://127.0.0.1:1421/api";
const TRABAJO = "/tmp/rustock-verificar-pdf";

let token = "";
async function api(comando, cuerpo) {
  const res = await fetch(`${API}/${comando}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "x-rustock-sesion": token } : {}),
    },
    body: JSON.stringify(cuerpo ?? {}),
  });
  const json = await res.json();
  if (json.sesion) token = json.sesion;
  if (!json.ok) throw new Error(`${comando}: ${json.error}`);
  return json.data;
}

try {
  execFileSync("pdftoppm", ["-v"], { stdio: "ignore" });
} catch {
  console.log("pdftoppm no disponible: se omite la verificación del PDF.");
  process.exit(0);
}

await api("login", {
  nombreUsuario: process.env.RUSTOCK_USER ?? "admin",
  password: process.env.RUSTOCK_PASS ?? "Admin1234!",
});

rmSync(TRABAJO, { recursive: true, force: true });
mkdirSync(TRABAJO, { recursive: true });

const candidatos = await api("listar_etiquetables", { tipo: "PRODUCTO", limite: 4 });
const esperados = candidatos.map((c) => c.codigo);

const tanda = await api("generar_tanda_etiquetas", {
  peticion: {
    tipo: "PRODUCTO",
    ids: candidatos.map((c) => c.id),
    simbologia: "CODE128",
    // Etiqueta ancha: con códigos largos en 50 mm las barras quedan por debajo
    // del mínimo legible, y eso ya lo avisa la propia aplicación.
    ancho_mm: 90,
    alto_mm: 40,
    formato: "PDF",
    disposicion: "hoja",
  },
});

const pdf = `${TRABAJO}/etiquetas.pdf`;
const { writeFileSync } = await import("node:fs");
writeFileSync(pdf, Buffer.from(tanda.contenido_base64, "base64"));

// 600 dpi: por encima de lo que imprime una láser de oficina.
execFileSync("pdftoppm", ["-r", "600", "-png", pdf, `${TRABAJO}/pagina`]);

const paginas = readdirSync(TRABAJO).filter((f) => f.endsWith(".png"));
const leidos = new Set();
for (const pagina of paginas) {
  const bytes = readFileSync(`${TRABAJO}/${pagina}`);
  const encontrados = await readBarcodes(new Blob([bytes]), {
    formats: ["Code128"],
    tryHarder: true,
    maxNumberOfSymbols: 20,
  });
  for (const c of encontrados) leidos.add(c.text);
}

let fallos = 0;
for (const esperado of esperados) {
  const ok = leidos.has(esperado);
  if (!ok) fallos++;
  console.log(`${ok ? "OK   " : "FALLA"} en el PDF impreso: ${JSON.stringify(esperado)}`);
}

rmSync(TRABAJO, { recursive: true, force: true });
console.log(
  fallos === 0
    ? `\nEL PDF SE IMPRIME Y SE LEE (${paginas.length} página(s), ${leidos.size} códigos decodificados)`
    : `\n${fallos} CÓDIGOS NO SE LEEN DESDE EL PDF`,
);
process.exit(fallos === 0 ? 0 : 1);
