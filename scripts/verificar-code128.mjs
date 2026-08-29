// Prueba de ida y vuelta: toma los módulos que genera Rust, los rasteriza y
// los decodifica con zxing — el mismo lector que usa la cámara de Rustock.
// Si esto pasa, un escáner físico lee la etiqueta.
import { execFileSync } from "node:child_process";
import { readBarcodes, prepareZXingModule } from "zxing-wasm/reader";
import { readFileSync } from "node:fs";

const wasm = readFileSync("node_modules/zxing-wasm/dist/reader/zxing_reader.wasm");
prepareZXingModule({ overrides: { wasmBinary: wasm.buffer } });

const ESCALA = 3;   // px por módulo
const ALTO = 60;    // px
const MUDA = 10;    // módulos de zona muda a cada lado

async function verificar(texto) {
  const modulos = execFileSync(
    "cargo",
    ["run", "--quiet", "--example", "dump_modulos", "--", texto],
    { cwd: "src-tauri", encoding: "utf8" },
  ).trim();

  const ancho = (modulos.length + MUDA * 2) * ESCALA;
  const datos = new Uint8ClampedArray(ancho * ALTO * 4).fill(255);
  for (let i = 0; i < modulos.length; i++) {
    if (modulos[i] !== "1") continue;
    for (let dx = 0; dx < ESCALA; dx++) {
      const x = (MUDA + i) * ESCALA + dx;
      for (let y = 0; y < ALTO; y++) {
        const p = (y * ancho + x) * 4;
        datos[p] = datos[p + 1] = datos[p + 2] = 0;
      }
    }
  }

  const leidos = await readBarcodes(
    { data: datos, width: ancho, height: ALTO },
    { formats: ["Code128"], tryHarder: true },
  );
  const leido = leidos[0]?.text ?? null;
  const ok = leido === texto;
  console.log(`${ok ? "OK  " : "FALLA"}  escrito=${JSON.stringify(texto)}  leido=${JSON.stringify(leido)}  formato=${leidos[0]?.format ?? "-"}`);
  return ok;
}

const casos = ["SKU-1004", "UBI-A1-N2-P3", "LOTE-2026-0042", "CAJA-001", "Code128", "a-z_0..9"];
let todos = true;
for (const caso of casos) todos = (await verificar(caso)) && todos;
console.log(todos ? "\nTODOS LOS CÓDIGOS SE LEEN CORRECTAMENTE" : "\nHAY CÓDIGOS ILEGIBLES");
process.exit(todos ? 0 : 1);
