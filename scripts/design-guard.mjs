#!/usr/bin/env node
/**
 * DesignGuard — valida que el código fuente respete el DESIGN.md de Rustock.
 *
 * Restricciones verificadas:
 *  1. Cero emojis en la UI (fuentes de código).
 *  2. Sin border-radius > 0 en CSS.
 *  3. Sin sombras, gradientes, blur ni backdrop-filter en CSS.
 *  4. Sin ventanas nativas de JS (alert/confirm/prompt) que funcionen como modales.
 *  5. Sin fuentes fuera de Open Sans / JetBrains Mono.
 *  6. Iconos solo desde lucide-react (otros sets de iconos prohibidos).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(new URL("..", import.meta.url).pathname, "src");

function collect(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collect(full, acc);
    } else if (/\.(ts|tsx|css)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

const FILES = collect(ROOT);

const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2764}\u{1F004}]/u;
const RADIUS_RE = /border-radius:\s*([^;]+)/g;
const SHADOW_RE = /box-shadow\s*:/;
const GRADIENT_RE = /(linear|radial|conic)-gradient\s*\(/;
const BLUR_RE = /(backdrop-filter|filter)\s*:\s*[^;]*blur\s*\(/;
const NATIVE_DIALOG_RE = /\b(alert|confirm|prompt)\s*\(/;
const FONT_RE = /font-family\s*:\s*[^;]+/g;
const LUCIDE_IMPORT_RE = /from\s+["']lucide-react["']/;

const ALLOWED_FONTS = ["Open Sans", "JetBrains Mono", "system-ui", "Segoe UI", "SFMono-Regular", "Menlo", "Consolas", "monospace", "sans-serif", "-apple-system", "ui-sans-serif", "var(--font-sans)", "var(--font-mono)"];

const FORBIDDEN_ICON_SETS = [
  "react-icons",
  "@mui/icons-material",
  "@heroicons/react",
  "lucide",
  "iconoir",
  "remixicon",
];

const errors = [];
let lucideImportCount = 0;

for (const filePath of FILES) {
  const rel = filePath.replace(join(ROOT, "..") + "/", "");
  let content;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    continue;
  }
  const lines = content.split("\n");
  const ctx = (i) => `${rel}:${i + 1}`;

  if (rel.endsWith(".css")) {
    let m;
    RADIUS_RE.lastIndex = 0;
    while ((m = RADIUS_RE.exec(content)) !== null) {
      const value = m[1].trim();
      const lineNo = content.slice(0, m.index).split("\n").length;
      if (value !== "0" && value !== "var(--radius-none)") {
        errors.push(`${ctx(lineNo - 1)} — border-radius no permitido: "${value}" (DESIGN §3.4, debe ser 0)`);
      }
    }
    if (SHADOW_RE.test(content)) {
      const lineNo = content.slice(0, content.match(SHADOW_RE).index).split("\n").length;
      errors.push(`${ctx(lineNo - 1)} — box-shadow prohibido (DESIGN §3.5)`);
    }
    if (GRADIENT_RE.test(content)) {
      const lineNo = content.slice(0, content.match(GRADIENT_RE).index).split("\n").length;
      errors.push(`${ctx(lineNo - 1)} — gradiente prohibido (DESIGN §2)`);
    }
    if (BLUR_RE.test(content)) {
      const lineNo = content.slice(0, content.match(BLUR_RE).index).split("\n").length;
      errors.push(`${ctx(lineNo - 1)} — blur/backdrop-filter prohibido (DESIGN §2)`);
    }
    let fm;
    FONT_RE.lastIndex = 0;
    while ((fm = FONT_RE.exec(content)) !== null) {
      const declared = fm[0];
      const names = declared.replace(/font-family\s*:/, "").split(",").map((s) => s.trim().replace(/["']/g, ""));
      const lineNo = content.slice(0, fm.index).split("\n").length;
      for (const name of names) {
        if (!ALLOWED_FONTS.includes(name)) {
          errors.push(`${ctx(lineNo - 1)} — fuente no permitida: "${name}" (DESIGN §3.2, solo Open Sans / JetBrains Mono)`);
        }
      }
    }
  } else {
    lines.forEach((line, i) => {
      if (EMOJI_RE.test(line)) {
        errors.push(`${ctx(i)} — emoji detectado en UI (DESIGN §1.1, tolerancia cero)`);
      }
      if (NATIVE_DIALOG_RE.test(line)) {
        errors.push(`${ctx(i)} — alert/confirm/prompt prohibido (DESIGN §5.1, cero modales)`);
      }
      if (LUCIDE_IMPORT_RE.test(line)) {
        lucideImportCount += 1;
      }
      for (const set of FORBIDDEN_ICON_SETS) {
        if (new RegExp(`from\\s+["']${set}(/|["'])`).test(line)) {
          errors.push(`${ctx(i)} — set de iconos prohibido: "${set}" (DESIGN §6.13, solo lucide-react)`);
        }
      }
    });
  }
}

if (lucideImportCount === 0) {
  errors.push(`Ningún import desde lucide-react en el código — el set de iconos obligatorio es Lucide (DESIGN §6.13)`);
}

if (errors.length > 0) {
  console.error("DesignGuard falló — violaciones al DESIGN.md:\n");
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log(`DesignGuard OK — ${FILES.length} archivos validados contra DESIGN.md`);
