#!/usr/bin/env node
/**
 * check-commit — valida que el mensaje de commit siga Conventional Commits.
 * Lo invoca lefthook (hook commit-msg) con el archivo del mensaje.
 *
 * Formato válido:
 *   <tipo>(<alcance>)?: <descripción>
 *   o <tipo>! : <descripción>   (breaking)
 */
import { readFileSync } from "node:fs";

const TYPES = [
  "feat",
  "fix",
  "perf",
  "refactor",
  "docs",
  "test",
  "build",
  "ci",
  "chore",
  "revert",
  "style",
  "wip",
];

const file = process.argv[2];
if (!file) {
  console.error("check-commit: falta el archivo del mensaje de commit");
  process.exit(1);
}

let raw;
try {
  raw = readFileSync(file, "utf8");
} catch {
  process.exit(1);
}

const lines = raw.split("\n").filter((l) => !l.startsWith("#")).map((l) => l.trim());
const subject = lines.find((l) => l.length > 0) ?? "";

// Mensaje vacío → dejarlo pasar (git lo rechazará igualmente si está vacío)
if (!subject) process.exit(0);

const pattern = new RegExp(`^(${TYPES.join("|")})(\\([\\w-]+\\))?(!)?: .+$`);
if (!pattern.test(subject)) {
  console.error(`commit-msg: mensaje de commit inválido (Conventional Commits requerido).`);
  console.error(`Recibido: "${subject}"`);
  console.error(`Esperado: <tipo>(<alcance>)?: <descripción>`);
  console.error(`Tipos válidos: ${TYPES.join(", ")}`);
  console.error(`Ejemplo: feat(movimientos): agrega traslados entre ubicaciones`);
  process.exit(1);
}
