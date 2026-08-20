#!/usr/bin/env node
/**
 * DesignGuard — valida que el código fuente respete el DESIGN.md de Rustock ("Ink & Signal").
 *
 * Restricciones verificadas:
 *  1. Cero emojis en la UI (fuentes de código).
 *  2. Sin border-radius fuera de los tokens --radius-sm/md/lg/xl/full.
 *  3. box-shadow solo con los tokens --shadow-xs/sm/md/lg/focus-ring/glow-primary (o "none").
 *  4. Sin gradientes en CSS.
 *  5. Sin filter: blur() en ningún lugar; backdrop-filter: blur() solo permitido en layout.css
 *     (el cristal de la barra superior al hacer scroll, DESIGN §3.5/§4.2).
 *  6. Sin ventanas nativas de JS (alert/confirm/prompt) que funcionen como modales.
 *  7. Sin fuentes fuera de Geist Sans / Geist Mono (y sus fallbacks declarados).
 *  8. Iconos solo desde lucide-react vía Icon.tsx (otros sets + import directo prohibidos).
 *  9. Sin colores literales (hex/rgba/hsla) fuera de tokens.css (DESIGN §3.1).
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
const SHADOW_RE = /box-shadow:\s*([^;]+)/g;
const GRADIENT_RE = /(linear|radial|conic)-gradient\s*\(/;
const FILTER_BLUR_RE = /(?<!backdrop-)filter\s*:\s*[^;]*blur\s*\(/;
const BACKDROP_BLUR_RE = /backdrop-filter\s*:\s*[^;]*blur\s*\(/;
const NATIVE_DIALOG_RE = /\b(alert|confirm|prompt)\s*\(/;
const FONT_RE = /font-family\s*:\s*[^;]+/g;
const LUCIDE_IMPORT_RE = /from\s+["']lucide-react["']/;
const COLOR_LITERAL_RE =
  /(?:#[0-9a-fA-F]{3,8}\b|rgba?\s*\([^)]*\)|hsla?\s*\([^)]*\))/g;
const INLINE_STYLE_COLOR_RE = /style\s*=\s*\{[^}]*?(?:#[0-9a-fA-F]{3,8}\b|rgba?\s*\()/;

const ALLOWED_SHADOWS = [
  "none",
  "var(--shadow-xs)",
  "var(--shadow-sm)",
  "var(--shadow-md)",
  "var(--shadow-lg)",
  "var(--shadow-focus-ring)",
  "var(--shadow-glow-primary)",
];

const ALLOWED_FONTS = [
  "Geist Sans",
  "Geist Mono",
  "Inter",
  "JetBrains Mono",
  "system-ui",
  "Segoe UI",
  "SFMono-Regular",
  "Menlo",
  "Consolas",
  "monospace",
  "sans-serif",
  "-apple-system",
  "ui-sans-serif",
  "var(--font-sans)",
  "var(--font-mono)",
];

const FORBIDDEN_ICON_SETS = [
  "react-icons",
  "@mui/icons-material",
  "@heroicons/react",
  "lucide",
  "iconoir",
  "remixicon",
];

const ALLOWLIST_COLOR_FILES = new Set([
  "src/styles/tokens.css",
  // Three.js no resuelve var(--x): los colores literales del mapa 3D se validan
  // a mano en el audit (deben usar resolverColorCss con token, no hex directo).
  // El script los denunciaría como falsos positivos sin la allowlist, pero
  // preferimos denunciarlos — por eso NO están en la allowlist.
]);

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
    // 9. Colores literales fuera de tokens (solo tokens.css puede declarar hex/rgba).
    if (!ALLOWLIST_COLOR_FILES.has(rel)) {
      let cm;
      COLOR_LITERAL_RE.lastIndex = 0;
      while ((cm = COLOR_LITERAL_RE.exec(content)) !== null) {
        const snippet = cm[0].slice(0, 40);
        const lineNo = content.slice(0, cm.index).split("\n").length;
        // Se permite var(--color-*) con fallback hex dentro de var() — no es literal suelto.
        // Detecta si el match está dentro de var(--color-... , #hex) — lo ignoramos.
        const before = content.slice(Math.max(0, cm.index - 30), cm.index);
        if (before.includes("var(--color-")) {
          continue;
        }
        // rgba con tokens (var(--scrim-overlay)) no es literal; solo literales puros.
        if (cm[0].startsWith("var(")) {
          continue;
        }
        errors.push(
          `${ctx(lineNo - 1)} — color literal fuera de tokens: "${snippet}" (DESIGN §3.1, usar var(--color-*))`,
        );
      }
    }
    let m;
    RADIUS_RE.lastIndex = 0;
    const ALLOWED_RADIUS = [
      "var(--radius-sm)",
      "var(--radius-md)",
      "var(--radius-lg)",
      "var(--radius-xl)",
      "var(--radius-full)",
    ];
    while ((m = RADIUS_RE.exec(content)) !== null) {
      const value = m[1].trim();
      const lineNo = content.slice(0, m.index).split("\n").length;
      if (!ALLOWED_RADIUS.includes(value)) {
        errors.push(`${ctx(lineNo - 1)} — border-radius fuera de tokens: "${value}" (DESIGN §3.4, usar --radius-sm/md/lg/xl/full)`);
      }
    }
    let sm;
    SHADOW_RE.lastIndex = 0;
    while ((sm = SHADOW_RE.exec(content)) !== null) {
      const value = sm[1].trim();
      const lineNo = content.slice(0, sm.index).split("\n").length;
      if (!ALLOWED_SHADOWS.includes(value)) {
        errors.push(`${ctx(lineNo - 1)} — box-shadow fuera de tokens: "${value}" (DESIGN §3.5, usar --shadow-xs/sm/md/lg/focus-ring/glow-primary)`);
      }
    }
    if (GRADIENT_RE.test(content)) {
      const lineNo = content.slice(0, content.match(GRADIENT_RE).index).split("\n").length;
      errors.push(`${ctx(lineNo - 1)} — gradiente prohibido (DESIGN §2)`);
    }
    if (FILTER_BLUR_RE.test(content)) {
      const lineNo = content.slice(0, content.match(FILTER_BLUR_RE).index).split("\n").length;
      errors.push(`${ctx(lineNo - 1)} — filter: blur prohibido (DESIGN §3.5)`);
    }
    if (BACKDROP_BLUR_RE.test(content) && !rel.endsWith("layout.css")) {
      const lineNo = content.slice(0, content.match(BACKDROP_BLUR_RE).index).split("\n").length;
      errors.push(`${ctx(lineNo - 1)} — backdrop-filter: blur solo permitido en layout.css (barra superior en scroll, DESIGN §3.5/§4.2)`);
    }
    let fm;
    FONT_RE.lastIndex = 0;
    while ((fm = FONT_RE.exec(content)) !== null) {
      const declared = fm[0];
      const names = declared.replace(/font-family\s*:/, "").split(",").map((s) => s.trim().replace(/["']/g, ""));
      const lineNo = content.slice(0, fm.index).split("\n").length;
      for (const name of names) {
        if (!ALLOWED_FONTS.includes(name)) {
          errors.push(`${ctx(lineNo - 1)} — fuente no permitida: "${name}" (DESIGN §3.2, solo Geist Sans/Mono + fallbacks)`);
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
        // Solo Icon.tsx puede importar lucide-react directamente (DESIGN §6.13 encapsulación).
        if (!rel.endsWith("Icon.tsx")) {
          errors.push(`${ctx(i)} — import directo desde lucide-react fuera de Icon.tsx (DESIGN §6.13, usar Icon.tsx)`);
        }
      }
      // Colores literales en style={{}} inline (TSX) — DESIGN §3.1.
      if (!ALLOWLIST_COLOR_FILES.has(rel) && INLINE_STYLE_COLOR_RE.test(line)) {
        // Ignora si es var(--color-*) — solo literales hex/rgba directos.
        if (!line.includes("var(--color-")) {
          errors.push(`${ctx(i)} — color literal en style inline (DESIGN §3.1, usar var(--color-*))`);
        }
      }
      // font: shorthand (DESIGN §3.2) — detecta font: 14px ... sin font-family.
      if (/\bfont\s*:\s*[^;]*\b(?:Geist|Inter|JetBrains|SFMono|Menlo|Consolas|system-ui)/.test(line)) {
        errors.push(`${ctx(i)} — shorthand font: detectado, usar font-family con tokens (DESIGN §3.2)`);
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
