// Verificación de extremo a extremo de las etiquetas (SPEC §14.3.5).
//
// Toma el SVG que devuelve la API, reconstruye la imagen a partir de sus
// rectángulos y la decodifica con zxing — el mismo lector que usa la cámara.
// Si esto pasa, lo que sale por la impresora es lo que el escáner leerá.
import { readBarcodes, prepareZXingModule } from "zxing-wasm/reader";
import { readFileSync } from "node:fs";

const API = process.env.RUSTOCK_API ?? "http://127.0.0.1:1421/api";
const wasm = readFileSync("node_modules/zxing-wasm/dist/reader/zxing_reader.wasm");
prepareZXingModule({ overrides: { wasmBinary: wasm.buffer } });

// Sesión por cliente (SPEC §4.1): el backend emite un token al iniciar sesión
// y este cliente lo presenta en cada petición. Sin token no hay sesión.
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

/** Rasteriza el SVG de un Code128 leyendo sus `<rect>` de barra.
 *
 * 24 px/mm ≈ 600 dpi: por encima de lo que imprime una térmica de etiquetas
 * (203–300 dpi), para que la prueba mida la codificación y no la resolución
 * del rasterizador. La estrechez real de las barras se comprueba aparte, en
 * la propia pantalla de etiquetas. */
function rasterizar(svg, ESCALA = 24, ALTO = 200) {
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  const anchoMm = Number(vb[1]);
  // El primer rect es el fondo blanco; el resto son las barras.
  const barras = [...svg.matchAll(/<rect x="([\d.]+)" y="0" width="([\d.]+)"/g)].map((m) => ({
    x: Number(m[1]),
    w: Number(m[2]),
  }));
  const ancho = Math.round(anchoMm * ESCALA);
  const datos = new Uint8ClampedArray(ancho * ALTO * 4).fill(255);
  for (const b of barras) {
    const x0 = Math.round(b.x * ESCALA);
    const x1 = Math.round((b.x + b.w) * ESCALA);
    for (let x = x0; x < x1 && x < ancho; x++) {
      for (let y = 0; y < ALTO; y++) {
        const p = (y * ancho + x) * 4;
        datos[p] = datos[p + 1] = datos[p + 2] = 0;
      }
    }
  }
  return { data: datos, width: ancho, height: ALTO };
}

const usuario = process.env.RUSTOCK_USER ?? "admin";
const clave = process.env.RUSTOCK_PASS ?? "Admin1234!";
await api("login", { nombreUsuario: usuario, password: clave });

let fallos = 0;
for (const tipo of ["PRODUCTO", "UBICACION", "LOTE", "CAJA"]) {
  const candidatos = await api("listar_etiquetables", { tipo, limite: 4 });
  if (candidatos.length === 0) {
    console.log(`${tipo}: sin entidades etiquetables, se omite`);
    continue;
  }
  const etiquetas = await api("generar_etiquetas", {
    peticion: {
      tipo,
      ids: candidatos.map((c) => c.id),
      simbologia: "CODE128",
      ancho_mm: 50,
      alto_mm: 25,
    },
  });
  for (const e of etiquetas) {
    const leidos = await readBarcodes(rasterizar(e.svg), {
      formats: ["Code128"],
      tryHarder: true,
    });
    const leido = leidos[0]?.text ?? null;
    const ok = leido === e.codigo;
    if (!ok) fallos++;
    console.log(
      `${ok ? "OK   " : "FALLA"} ${tipo.padEnd(10)} impreso=${JSON.stringify(e.codigo).padEnd(20)} leido=${JSON.stringify(leido)}`,
    );
  }
}

console.log(
  fallos === 0
    ? "\nTODAS LAS ETIQUETAS SE LEEN: lo impreso coincide con lo que resuelve el escáner"
    : `\n${fallos} ETIQUETAS ILEGIBLES`,
);
process.exit(fallos === 0 ? 0 : 1);
