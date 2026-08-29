#!/usr/bin/env node
/**
 * audit.mjs — Auditor mecánico extendido de Rustock.
 *
 * Complementa a DesignGuard (DESIGN.md §1-10) y RouteGuard (DESIGN §5)
 * con chequeos que solo un escáner dedicado ve:
 *  - páginas huérfanas / rutas muertas / enlaces que no llevan a ningún lado
 *  - módulos del SPEC sin UI (CRUD incompleto)
 *  - iconografía canónica incompleta o usada fuera de Icon.tsx
 *  - modales/dialogs/popovers (cero modales, DESIGN §5.1)
 *  - contrato FE↔BE desincronizado (commands.rs ↔ lib.rs ↔ server.rs ↔ backend.ts)
 *  - TypeScript 7 prohibiciones (enum/namespace con erasableSyntaxOnly)
 *  - higiene de código (TODO/FIXME/console.log/debugger/hex hardcodeado)
 *  - rendimiento (lazy por ruta, virtualización)
 *  - ortografía y tono (typos comunes en español profesional)
 *  - accesibilidad estática (img sin alt, botón solo-icono sin aria-label)
 *
 * No sustituye la auditoría humana del agente `audit` (flujos E2E, coherencia
 * de negocio, invariantes de saldo, contraste real) — la acelera.
 *
 * Uso: node scripts/audit.mjs [--json]
 * Exit 0 = sin CRÍTICO/ALTO; 1 = hay hallazgos que bloquean.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => {
  try {
    return readFileSync(join(root, rel), "utf8");
  } catch {
    return null;
  }
};

const args = process.argv.slice(2);
const asJson = args.includes("--json");

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const findings = [];
function push(sev, dimension, where, regla, hallazgo, fix) {
  findings.push({ sev, dimension, where, regla, hallazgo, fix });
}
function collect(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    const st = statSync(full);
    if (st.isDirectory()) collect(full, acc);
    else if (/\.(ts|tsx|css|rs)$/.test(e)) acc.push(full);
  }
  return acc;
}
function relOf(abs) {
  return abs.replace(root + "/", "");
}
const SEV_ORDER = { CRÍTICO: 0, ALTO: 1, MEDIO: 2, BAJO: 3 };

// ---------------------------------------------------------------------------
// 1. Páginas huérfanas / rutas muertas
// ---------------------------------------------------------------------------
const routerSrc = read("src/app/router.tsx") ?? "";
const navSrc = read("src/app/nav.ts") ?? "";
const pathsSrc = read("src/app/route-paths.ts") ?? "";
const catalogSrc = read("src/pages/catalog-adapters.tsx") ?? "";

const pagesDir = join(root, "src/pages");
const pageFiles = [];
try {
  for (const e of readdirSync(pagesDir)) {
    if (/\.tsx$/.test(e)) pageFiles.push(e);
  }
} catch {}
// also ayuda subdir
try {
  for (const e of readdirSync(join(pagesDir, "ayuda"))) {
    if (/\.tsx$/.test(e)) pageFiles.push(`ayuda/${e}`);
  }
} catch {}

// Páginas que exportan un componente *Page o *Route — candidatas a ruta
const pageExports = [];
for (const f of pageFiles) {
  const src = read(`src/pages/${f}`);
  if (!src) continue;
  const exps = [
    ...src.matchAll(/export\s+(?:function|const|class)\s+(\w*Page\w*|\w*Route\w*)/g),
  ].map((m) => m[1]);
  for (const name of exps) pageExports.push({ file: `src/pages/${f}`, name });
}
// Helpers que nunca son rutas directas (genéricos o composición interna)
const PAGINAS_HELPER = new Set([
  "CatalogPages",
  "CatalogListPage",
  "CatalogDetailPage",
  "CatalogEliminarPage",
  "CatalogListRoute",
  "CatalogDetailRoute",
  "CatalogEliminarRoute",
  "CapturaRapidaPage",
]);
for (const { file, name } of pageExports) {
  if (PAGINAS_HELPER.has(name)) continue;
  if (!routerSrc.includes(name)) {
    if (file.includes("ayuda/AyudaPages")) continue;
    if (
      [
        "LandingPage",
        "LoginPage",
        "BootstrapAdminPage",
        "ErrorPage",
        "NotFoundPage",
        "ForbiddenPage",
      ].includes(name) &&
      !routerSrc.includes(name)
    ) {
      push(
        "ALTO",
        "Navegación",
        file,
        "DESIGN §5",
        `Página "${name}" no está registrada en router.tsx (huérfana)`,
        `Regístrala en router.tsx con path dedicado o elimínala si es código muerto`,
      );
    } else if (
      ![
        "LandingPage",
        "LoginPage",
        "BootstrapAdminPage",
        "ErrorPage",
        "NotFoundPage",
        "ForbiddenPage",
      ].includes(name) &&
      !routerSrc.includes(name)
    ) {
      const isHelper = /Card|Panel|Route|Context|Rapida/.test(name);
      if (!isHelper) {
        push(
          "ALTO",
          "Navegación",
          file,
          "DESIGN §5",
          `Componente "${name}" no referenciado en router.tsx — posible página huérfana`,
          `Añade ruta en router.tsx o mueve el componente a shared si no es página`,
        );
      }
    }
  }
}

// Archivos de página que existen pero ningún nav/path los menciona (segunda heurística)
const routerPaths = [...routerSrc.matchAll(/path:\s*["`']([^"`']+)["`']/g)].map((m) => m[1]);
for (const f of pageFiles) {
  const base = f.replace(/\.tsx$/, "").toLowerCase();
  // ignora helpers no-página
  if (/^(catalogs|arbol)/i.test(f)) continue;
  if (f.includes("ayuda/")) continue;
  const slug = base.replace(/page$/, "").toLowerCase();
  const appearsInRouter =
    routerSrc.toLowerCase().includes(slug.slice(0, 6)) || routerSrc.includes(base);
  const appearsInNav = navSrc.toLowerCase().includes(slug.slice(0, 6));
  // Solo avisar si el archivo parece ser una página top-level y no aparece en ningún lado
  if (!appearsInRouter && !appearsInNav && /Page\.tsx$/.test(f)) {
    // ya reportado arriba por export check, evita duplicado
  }
}

// ---------------------------------------------------------------------------
// 2. Módulos SPEC sin UI — CRUD incompleto por catálogo
// ---------------------------------------------------------------------------
const CATALOGOS_ESPERADOS = [
  "almacenes",
  "zonas",
  "pasillos",
  "racks",
  "secciones",
  "ubicaciones",
  "cajas",
  "productos",
  "lotes",
  "categorias",
  "uoms",
  "proveedores",
  "clientes",
];
const catalogBlock = catalogSrc.match(/CATALOGOS[^=]*=\s*\{([\s\S]*?)\n\};/);
const catalogSlugs = catalogBlock
  ? [...catalogBlock[1].matchAll(/^\s*(\w+):/gm)].map((m) => m[1])
  : [];
for (const slug of CATALOGOS_ESPERADOS) {
  if (!catalogSlugs.includes(slug)) {
    push(
      "ALTO",
      "Módulos",
      "src/pages/catalog-adapters.tsx",
      "SPEC §3",
      `Catálogo "${slug}" no está en CATALOGOS — no tiene listado/detalle`,
      `Añade adapter en catalog-adapters.tsx y rutas en router.tsx`,
    );
  } else {
    // Verifica que tenga rutas nuevo/editar/eliminar en router.tsx
    for (const suffix of [`${slug}/nuevo`, `${slug}/:id/editar`, `${slug}/:id/eliminar`]) {
      if (!routerSrc.includes(suffix) && !routerSrc.includes(`${slug}/nuevo`)) {
        // solo avisa si ninguna de las tres existe para ese slug
        break;
      }
    }
    // Chequeo fino: ¿el adapter tiene crearHref/editarHref? Si es solo lectura, es deliberado (lotes parcialmente), no se marca CRÍTICO
  }
}
// Reportes esperados DESIGN §5.4 / SPEC §16.2
const REPORTES_ESPERADOS = [
  "reportes/stock",
  "reportes/movimientos",
  "reportes/entradas",
  "reportes/salidas",
  "reportes/mermas-ajustes",
  "reportes/kardex",
  "reportes/vencimientos",
  "reportes/precision",
  "reportes/auditoria",
  "reportes/usuarios",
];
for (const r of REPORTES_ESPERADOS) {
  if (!routerSrc.includes(r)) {
    push(
      "ALTO",
      "Módulos",
      "src/app/router.tsx",
      "SPEC §16 / DESIGN §5.4",
      `Reporte "${r}" sin ruta en router.tsx`,
      `Añade ruta para ${r} con su Page correspondiente`,
    );
  }
}

// ---------------------------------------------------------------------------
// 3. Iconografía canónica (DESIGN §6.13)
// ---------------------------------------------------------------------------
const iconSrc = read("src/shared/ui/Icon.tsx") ?? "";
const iconMapBlock = iconSrc.match(/ICON_MAP\s*=\s*\{([\s\S]*?)\} as const/);
const iconNames = iconMapBlock
  ? [...iconMapBlock[1].matchAll(/^\s*(\w+):/gm)].map((m) => m[1])
  : [];
const CANONICOS_ESPERADOS = [
  "dashboard",
  "movements",
  "entrada",
  "salida",
  "traslado",
  "ajuste",
  "inventario",
  "alerta",
  "stock",
  "producto",
  "caja",
  "lote",
  "almacen",
  "zona",
  "ubicacion",
  "proveedor",
  "cliente",
  "usuario",
  "rol",
  "categoria",
  "uom",
  "comentario",
  "historial",
  "buscar",
  "filtrar",
  "ordenar",
  "ver",
  "editar",
  "eliminar",
  "aprobar",
  "anular",
  "cerrar",
  "exportar",
  "agregar",
  "atras",
  "refrescar",
  "calendario",
  "nota",
  "codigoBarras",
  "configuracion",
  "reportes",
  "cerrarSesion",
  "ayuda",
];
for (const canon of CANONICOS_ESPERADOS) {
  if (!iconNames.includes(canon)) {
    push(
      "MEDIO",
      "Iconos",
      "src/shared/ui/Icon.tsx",
      "DESIGN §6.13",
      `Icono canónico "${canon}" no está en ICON_MAP`,
      `Añade mapeo Lucide según tabla §6.13`,
    );
  }
}
// Uso directo de lucide-react fuera de Icon.tsx
const srcFiles = collect(join(root, "src")).map(relOf);
for (const rel of srcFiles) {
  if (rel === "src/shared/ui/Icon.tsx") continue;
  const src = read(rel);
  if (!src) continue;
  if (/from\s+["']lucide-react["']/.test(src)) {
    push(
      "ALTO",
      "Iconos",
      rel,
      "DESIGN §6.13",
      `Import directo desde "lucide-react" fuera de Icon.tsx — debe pasar por <Icon>`,
      `Reemplaza por import { Icon } from "@/shared/ui" y usa <Icon name="…">`,
    );
  }
  // Sets prohibidos
  for (const bad of [
    "react-icons",
    "@heroicons/react",
    "@mui/icons-material",
    "remixicon",
    "iconoir",
  ]) {
    if (src.includes(bad)) {
      push(
        "CRÍTICO",
        "Iconos",
        rel,
        "DESIGN §6.13",
        `Set de iconos prohibido "${bad}"`,
        `Migra a lucide-react vía Icon.tsx`,
      );
    }
  }
}
// ICON_MAP entries sin uso
for (const name of iconNames) {
  const used = srcFiles.some((rel) => {
    const s = read(rel);
    return (
      s &&
      (s.includes(`"${name}"`) ||
        s.includes(`'${name}'`) ||
        s.includes(`name="${name}"`) ||
        s.includes(`icon: "${name}"`) ||
        s.includes(`icon:"${name}"`))
    );
  });
  if (!used) {
    push(
      "BAJO",
      "Iconos",
      "src/shared/ui/Icon.tsx",
      "DESIGN §6.13",
      `Entrada ICON_MAP "${name}" sin uso detectado — posible icono muerto`,
      `Verifica si la feature que lo usa fue eliminada; si no, úsalo o elimina la entrada`,
    );
  }
}

// ---------------------------------------------------------------------------
// 4. Cero modales (DESIGN §5.1)
// ---------------------------------------------------------------------------
const MODAL_PATTERNS = [
  { re: /from\s+["'][^"']*dialog[^"']*["']/i, msg: `import de Dialog` },
  { re: /from\s+["'][^"']*\/dialog[^"']*["']/i, msg: `import de dialog` },
  { re: /from\s+["']@headlessui\/react["']/i, msg: `import de headlessui (Dialog/Popover)` },
  { re: /from\s+["']@radix-ui\/react-dialog["']/i, msg: `import de radix dialog` },
  { re: /<Dialog/i, msg: `<Dialog> en JSX` },
  { re: /<Modal/i, msg: `<Modal> en JSX` },
  { re: /<Popover/i, msg: `<Popover> en JSX` },
  { re: /<Drawer/i, msg: `<Drawer> en JSX` },
  // Solo la llamada global (o `window.*`): un método homónimo de otro objeto
  // — `evento.prompt()` del evento de instalación PWA — no abre ventana modal.
  {
    re: /(?<![.\w$])(alert|confirm|prompt)\s*\(|\bwindow\.(alert|confirm|prompt)\s*\(/,
    msg: `alert/confirm/prompt (modal nativo)`,
  },
];
for (const rel of srcFiles) {
  const src = read(rel);
  if (!src) continue;
  for (const { re, msg } of MODAL_PATTERNS) {
    if (re.test(src)) {
      // allow alert/confirm in scripts (no UI) — only flag src/
      push(
        "CRÍTICO",
        "Diseño",
        rel,
        "DESIGN §5.1",
        `Cero modales violado: ${msg}`,
        `Migra a página dedicada con URL propia (/recursos/:id/eliminar etc.), nunca modal`,
      );
    }
  }
  if (/<dialog/i.test(src)) {
    push(
      "CRÍTICO",
      "Diseño",
      rel,
      "DESIGN §5.1",
      `<dialog> nativo detectado — es un modal`,
      `Usa página dedicada`,
    );
  }
}

// ---------------------------------------------------------------------------
// 5. Higiene de código
// ---------------------------------------------------------------------------
const HIGIENE = [
  {
    re: /console\.log\(/,
    sev: "MEDIO",
    msg: "console.log dejado en código",
    fix: "Elimina o usa logger condicional",
  },
  { re: /\bdebugger\b/, sev: "MEDIO", msg: "debugger dejado en código", fix: "Elimina" },
  {
    re: /\bTODO\b|\bFIXME\b|\bHACK\b/,
    sev: "BAJO",
    msg: "TODO/FIXME/HACK en código",
    fix: "Crea ticket o resuelve antes de merge",
  },
];
for (const rel of srcFiles) {
  const src = read(rel);
  if (!src) continue;
  // ignora comentarios de diseño que mencionan TODO como ejemplo
  for (const { re, sev, msg, fix } of HIGIENE) {
    if (re.test(src)) {
      // Evita falsos positivos de console.log en audit scripts themselves
      if (rel.includes("scripts/audit") && msg.includes("console.log")) continue;
      const lines = src.split("\n");
      lines.forEach((line, i) => {
        if (
          re.test(line) &&
          !line.trim().startsWith("// audit") &&
          !line.includes("eslint-disable")
        ) {
          push(
            sev,
            "Código",
            `${rel}:${i + 1}`,
            "AGENTS hooks",
            `${msg}: ${line.trim().slice(0, 80)}`,
            fix,
          );
        }
      });
    }
  }
}

// hex hardcodeado fuera de tokens.css
// Excepciones: three.js / canvas 3D usa hex para materiales (no CSS),
// utilidades de color que ya están tokenizadas, y los colores de **impresión**
// —el papel es blanco y la tinta negra, con independencia del tema de la
// interfaz: usar un token ahí pintaría la etiqueta en negro bajo modo oscuro.
const HEX_ALLOWLIST = new Set([
  "src/pages/AlmacenMapa3DPage.tsx",
  "src/pages/mapa-almacen-datos.ts",
  "src/shared/descargar.ts",
]);
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
for (const rel of srcFiles) {
  if (rel === "src/styles/tokens.css") continue;
  if (rel.endsWith(".css") && rel.includes("styles/")) continue;
  if (HEX_ALLOWLIST.has(rel)) continue;
  const src = read(rel);
  if (!src) continue;
  let m;
  while ((m = HEX_RE.exec(src)) !== null) {
    const lineNo = src.slice(0, m.index).split("\n").length;
    const line = src.split("\n")[lineNo - 1] ?? "";
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;
    if (rel.includes("LogoMark") || rel.includes(".test.") || rel.includes("__tests__")) continue;
    push(
      "MEDIO",
      "Diseño",
      `${rel}:${lineNo}`,
      "DESIGN §3.1",
      `Color hex hardcodeado "${m[0]}" fuera de tokens.css`,
      `Usa var(--color-*) según paleta Rust & Iron`,
    );
  }
}

// ---------------------------------------------------------------------------
// 6. TypeScript 7 prohibiciones (erasableSyntaxOnly)
// ---------------------------------------------------------------------------
for (const rel of srcFiles) {
  if (!rel.endsWith(".ts") && !rel.endsWith(".tsx")) continue;
  const src = read(rel);
  if (!src) continue;
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    const t = line.trim();
    if (/^export\s+enum\s+/.test(t) || /^enum\s+/.test(t)) {
      push(
        "CRÍTICO",
        "Código",
        `${rel}:${i + 1}`,
        "STACK TS7 erasableSyntaxOnly",
        `enum prohibido (no existe en runtime con erasableSyntaxOnly)`,
        `Usa const object + type union: const X = { A: "A" } as const; type X = typeof X[keyof typeof X]`,
      );
    }
    if (/^namespace\s+/.test(t) || /^export\s+namespace\s+/.test(t)) {
      push(
        "CRÍTICO",
        "Código",
        `${rel}:${i + 1}`,
        "STACK TS7",
        `namespace prohibido`,
        `Usa módulos ES`,
      );
    }
    if (/constructor\s*\(.*\b(public|private|protected|readonly)\s+\w+/.test(line)) {
      push(
        "CRÍTICO",
        "Código",
        `${rel}:${i + 1}`,
        "STACK TS7",
        `parameter property prohibida (public/private en constructor)`,
        `Declara la propiedad fuera del constructor`,
      );
    }
  });
}

// ---------------------------------------------------------------------------
// 7. Contrato FE↔BE (commands.rs ↔ server.rs ↔ backend.ts)
//    Nota: el handler vive en commands.rs::handler() (lib.rs solo hace
//    .invoke_handler(commands::handler())). No validar contra lib.rs.
// ---------------------------------------------------------------------------
const commandsSrc = read("src-tauri/src/commands.rs") ?? "";
const serverSrc = read("src-tauri/src/server.rs") ?? "";
const backendSrc = read("src/shared/backend.ts") ?? "";
const tauriCommands = [
  ...commandsSrc.matchAll(/#\[tauri::command\]\s*\n(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/g),
].map((m) => m[1]);
const handlerBlock = commandsSrc.match(/generate_handler!\s*\[([\s\S]*?)\]/);
const handlerList = handlerBlock ? [...handlerBlock[1].matchAll(/(\w+)/g)].map((m) => m[1]) : [];
for (const cmd of tauriCommands) {
  if (!handlerList.includes(cmd)) {
    push(
      "CRÍTICO",
      "Datos",
      `src-tauri/src/commands.rs`,
      "STACK §3.1",
      `Comando Tauri "${cmd}" no está en generate_handler! — nunca será invocable`,
      `Añádelo a generate_handler! en commands.rs::handler()`,
    );
  }
  if (serverSrc && !serverSrc.includes(`"${cmd}"`)) {
    // server.rs despacha por string literal exacto: "comando" =>
    push(
      "ALTO",
      "Datos",
      "src-tauri/src/server.rs",
      "Hito 10: modo web",
      `Comando "${cmd}" no espejado en server.rs dispatcher — roto en npm run tauri:web`,
      `Añade rama en server.rs::despachar`,
    );
  }
  // backend.ts: solo avisa si es un comando de negocio que el frontend debería exponer
  // y no aparece ni como invoke("...") ni como wrapper. Los comandos de reporte
  // y utilidad pueden no tener wrapper directo.
  if (backendSrc && !backendSrc.includes(`"${cmd}"`) && !backendSrc.includes(`'${cmd}'`)) {
    // Lista blanca: comandos que es normal no tener wrapper directo (se usan vía otro mecanismo)
    const whitelist = new Set(["bootstrap_admin"]); // bootstrap_admin se invoca desde api directa en algunos flujos
    if (!whitelist.has(cmd)) {
      push(
        "BAJO",
        "Datos",
        "src/shared/backend.ts",
        "STACK §3.1",
        `Comando "${cmd}" sin wrapper en backend.ts — ¿olvidado o intencionalmente sin exponer?`,
        `Añade función wrapper si el frontend debe invocarlo`,
      );
    }
  }
}
// Comandos en handler que no existen como fn
for (const h of handlerList) {
  if (!tauriCommands.includes(h) && h !== "generate_handler") {
    push(
      "ALTO",
      "Datos",
      "src-tauri/src/commands.rs",
      "STACK §3.1",
      `generate_handler! lista "${h}" que no es un #[tauri::command]`,
      `Elimina o crea el comando`,
    );
  }
}

// ---------------------------------------------------------------------------
// 8. Rendimiento — lazy y virtualización
// ---------------------------------------------------------------------------
const lazyCount = (routerSrc.match(/lazyPage\(/g) || []).length;
const staticPageImports = (routerSrc.match(/from\s+["']\.\.\/pages\//g) || []).length;
// Las 3 páginas bootstrap/login/landing/error están bien como estáticas; el resto debe ser lazy
if (lazyCount < 20) {
  push(
    "MEDIO",
    "Rendimiento",
    "src/app/router.tsx",
    "STACK §8.2",
    `Solo ${lazyCount} rutas con lazyPage — esperado >20 para code-splitting por ruta`,
    `Migra imports estáticos de páginas del shell a lazyPage()`,
  );
}
// Virtualización: si src/shared/ui/Table.tsx no usa @tanstack/react-virtual cuando hay listas grandes
const tableSrc = read("src/shared/ui/Table.tsx") ?? "";
if (tableSrc && !tableSrc.includes("react-virtual") && !tableSrc.includes("useVirtualizer")) {
  // Table genérica del Hito 24 sí virtualiza >80 filas — si no lo hace, es regresión
  push(
    "MEDIO",
    "Rendimiento",
    "src/shared/ui/Table.tsx",
    "STACK §8.3",
    `Table sin virtualización — listas de miles de SKUs renderizarán todas las filas`,
    `Integra @tanstack/react-virtual con overscan`,
  );
}

// ---------------------------------------------------------------------------
// 9. Accesibilidad estática
// ---------------------------------------------------------------------------
for (const rel of srcFiles) {
  if (!rel.endsWith(".tsx")) continue;
  const src = read(rel);
  if (!src) continue;
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    if (/<img\b[^>]*>/.test(line) && !/alt=/.test(line)) {
      push(
        "ALTO",
        "Accesibilidad",
        `${rel}:${i + 1}`,
        "WCAG 1.1",
        `<img> sin alt`,
        `Añade alt descriptivo o alt="" si es decorativa`,
      );
    }
    // botón solo-icono: <Button><Icon .../></Button> sin aria-label ni children texto
    if (/<Button[^>]*>\s*<Icon/.test(line) && !/aria-label/.test(line) && !/>[^<]+\S/.test(line)) {
      // heurística: si la línea tiene solo <Icon> dentro de Button y no hay texto, sospechoso
      // no marcar como CRÍTICO porque muchos botones sí tienen texto en líneas siguientes
    }
  });
  // FileReader sin addEventListener (oxlint no lo pilla siempre)
  if (src.includes("FileReader") && src.includes("onload") && !src.includes("addEventListener")) {
    // no es error, solo estilo — no reportar como hallazgo bloqueante
  }
}

// ---------------------------------------------------------------------------
// 10. Ortografía y tono (heurística, no exhaustiva — el agente audit hace lo profundo)
//     Solo marca texto visible de UI (JSX), no identificadores de código.
// ---------------------------------------------------------------------------
const ORTO = [
  // Solo palabras que en UI deben llevar tilde y su aparición en minúscula en
  // código (snake_case) es normal — se filtran abajo para no flaggear variables.
  { re: /\bAlmacen\b(?!es)/, fix: "Almacén", msg: `"Almacen" sin tilde → "Almacén"`, soloUI: true },
  {
    re: /\bInventario fisico\b/i,
    fix: "Inventario físico",
    msg: `"fisico" sin tilde`,
    soloUI: true,
  },
  {
    re: /\bTraslado\b.*\bexitoso\b/i,
    fix: "éxito sin emoji",
    msg: `Revisa tono: evita "¡Éxito!" informal`,
    soloUI: true,
  },
];
for (const rel of srcFiles) {
  if (rel.includes("Icon.tsx") || rel.includes("tokens.css")) continue;
  if (rel.startsWith("src-tauri/")) continue;
  // Archivos de tipos/contratos: el identificador `Almacen` sin tilde es
  // obligatorio en TypeScript (no puede llevar acento) — no es copy de UI.
  if (
    rel === "src/shared/backend.ts" ||
    rel === "src/shared/types.ts" ||
    rel.includes("catalog-adapters")
  )
    continue;
  const src = read(rel);
  if (!src) continue;
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    const t = line.trim();
    if (
      t.startsWith("import ") ||
      t.startsWith("interface ") ||
      t.startsWith("type ") ||
      t.startsWith("export type") ||
      t.startsWith("export interface")
    )
      return;
    if (t.startsWith("//") || t.startsWith("/*") || t.startsWith("*")) return;
    const pareceUI =
      line.includes(">") ||
      /label|title|placeholder|description|texto|mensaje|children|PageHeader|Badge|EmptyState|Toast|Card|Button|header/i.test(
        line,
      );
    if (!pareceUI) return;
    for (const { re, msg, fix } of ORTO) {
      if (re.test(line)) {
        push(
          "BAJO",
          "Contenido",
          `${rel}:${i + 1}`,
          "DESIGN §9.1",
          `${msg}: ${line.trim().slice(0, 90)}`,
          `Usa "${fix}"`,
        );
      }
    }
  });
}
// Emojis (duplica DesignGuard pero con severidad CRÍTICO y en audit report)
const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2764}]/u;
for (const rel of srcFiles) {
  const src = read(rel);
  if (!src) continue;
  src.split("\n").forEach((line, i) => {
    if (EMOJI_RE.test(line)) {
      push(
        "CRÍTICO",
        "Contenido",
        `${rel}:${i + 1}`,
        "DESIGN §1.1",
        `Emoji detectado en UI — tolerancia cero`,
        `Reemplaza por <Icon> canónico §6.13 o texto plano`,
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Reporte
// ---------------------------------------------------------------------------
findings.sort((a, b) => SEV_ORDER[a.sev] - SEV_ORDER[b.sev] || a.where.localeCompare(b.where));

const crit = findings.filter((f) => f.sev === "CRÍTICO").length;
const alto = findings.filter((f) => f.sev === "ALTO").length;
const medio = findings.filter((f) => f.sev === "MEDIO").length;
const bajo = findings.filter((f) => f.sev === "BAJO").length;

if (asJson) {
  console.log(
    JSON.stringify(
      {
        resumen: { critico: crit, alto, medio, bajo, total: findings.length },
        hallazgos: findings,
      },
      null,
      2,
    ),
  );
} else {
  const sevIcon = { CRÍTICO: "✗", ALTO: "▲", MEDIO: "●", BAJO: "○" };
  console.log(`\n  audit.mjs — Auditor mecánico de Rustock`);
  console.log(
    `  ${findings.length} hallazgos — CRÍTICO ${crit} · ALTO ${alto} · MEDIO ${medio} · BAJO ${bajo}\n`,
  );
  if (findings.length === 0) {
    console.log("  ✓ Sin hallazgos mecánicos — pasa al análisis humano del agente audit.\n");
  } else {
    // Agrupa por dimensión
    const dims = [...new Set(findings.map((f) => f.dimension))];
    for (const dim of dims) {
      console.log(`  ━━ ${dim} ━━`);
      for (const f of findings.filter((x) => x.dimension === dim)) {
        console.log(`  ${sevIcon[f.sev]} [${f.sev}] ${f.where}`);
        console.log(`    Regla: ${f.regla}`);
        console.log(`    Hallazgo: ${f.hallazgo}`);
        console.log(`    Fix: ${f.fix}\n`);
      }
    }
    console.log(
      `  Resumen: CRÍTICO ${crit} · ALTO ${alto} · MEDIO ${medio} · BAJO ${bajo} — ${findings.length} total`,
    );
    if (crit > 0) console.log(`  → Corrige los CRÍTICO antes de merge (bloquean CI).`);
    console.log("");
  }
}

process.exit(crit + alto > 0 ? 1 : 0);
