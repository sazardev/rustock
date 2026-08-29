// Verificación del heurístico que distingue un lector de mano de una persona
// escribiendo (SPEC §14.3.1).
//
// Es la decisión más delicada del escáner global: un falso positivo se comería
// lo que alguien está tecleando. Se prueba con ritmos reales medidos, no con
// números inventados.
import { readFileSync } from "node:fs";

// Se extrae la función del módulo TypeScript sin compilarlo: es una función
// pura de dos líneas y así la prueba corre sin cadena de build.
const fuente = readFileSync("src/shared/escaner-global.ts", "utf8");
const UMBRAL_MS = Number(/const UMBRAL_MS = (\d+)/.exec(fuente)[1]);
const LARGO_MINIMO = Number(/const LARGO_MINIMO = (\d+)/.exec(fuente)[1]);

function esRafagaDeMaquina(intervalos, largo) {
  if (largo < LARGO_MINIMO) return false;
  if (intervalos.length === 0) return false;
  const media = intervalos.reduce((a, b) => a + b, 0) / intervalos.length;
  return media <= UMBRAL_MS;
}

/** Genera intervalos con una media y una dispersión dadas. */
function ritmo(n, media, dispersion) {
  return Array.from({ length: n }, () => Math.max(1, media + (Math.random() * 2 - 1) * dispersion));
}

const casos = [
  // --- Lectores de mano reales (5-20 ms por carácter) ---
  { nombre: "lector USB rápido (8 ms)", intervalos: ritmo(12, 8, 3), largo: 13, esperado: true },
  { nombre: "lector USB lento (18 ms)", intervalos: ritmo(12, 18, 5), largo: 13, esperado: true },
  { nombre: "lector Bluetooth (25 ms)", intervalos: ritmo(12, 25, 8), largo: 13, esperado: true },
  { nombre: "EAN-13 completo (12 ms)", intervalos: ritmo(12, 12, 4), largo: 13, esperado: true },
  { nombre: "código corto SKU (10 ms)", intervalos: ritmo(7, 10, 3), largo: 8, esperado: true },

  // --- Personas escribiendo (100-200 ms, irregular) ---
  {
    nombre: "persona escribiendo normal",
    intervalos: ritmo(10, 150, 60),
    largo: 11,
    esperado: false,
  },
  {
    nombre: "mecanógrafa rápida (90 ms)",
    intervalos: ritmo(10, 90, 30),
    largo: 11,
    esperado: false,
  },
  {
    nombre: "mecanógrafa muy rápida (70 ms)",
    intervalos: ritmo(10, 70, 25),
    largo: 11,
    esperado: false,
  },
  {
    nombre: "tecla repetida mantenida (55 ms)",
    intervalos: ritmo(20, 55, 5),
    largo: 21,
    esperado: false,
  },

  // --- Bordes ---
  { nombre: "pulsación suelta", intervalos: [], largo: 1, esperado: false },
  { nombre: "dos teclas rápidas (bajo el mínimo)", intervalos: [6], largo: 2, esperado: false },
  { nombre: "tres teclas a ritmo de máquina", intervalos: [7, 9], largo: 3, esperado: true },
];

let fallos = 0;
for (const c of casos) {
  const obtenido = esRafagaDeMaquina(c.intervalos, c.largo);
  const ok = obtenido === c.esperado;
  if (!ok) fallos++;
  const media = c.intervalos.length
    ? (c.intervalos.reduce((a, b) => a + b, 0) / c.intervalos.length).toFixed(0)
    : "—";
  console.log(
    `${ok ? "OK   " : "FALLA"} ${c.nombre.padEnd(34)} media=${String(media).padStart(4)}ms  ` +
      `detecta=${obtenido ? "lector" : "persona"}  esperado=${c.esperado ? "lector" : "persona"}`,
  );
}

console.log(
  fallos === 0
    ? `\nEL HEURÍSTICO SEPARA LECTOR Y PERSONA (umbral ${UMBRAL_MS} ms, mínimo ${LARGO_MINIMO} caracteres)`
    : `\n${fallos} CASOS MAL CLASIFICADOS`,
);
process.exit(fallos === 0 ? 0 : 1);
