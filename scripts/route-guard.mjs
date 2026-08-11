#!/usr/bin/env node
/**
 * RouteGuard — valida la integridad del mapa de rutas contra DESIGN.md §5.4.
 *
 * Reglas verificadas:
 *  1. Todo `href` del nav (nav.ts) apunta a una ruta definida en el router (router.tsx).
 *  2. Todo path del router tiene un elemento de página asociado.
 *  3. No hay rutas declaradas en el router sin página correspondiente en src/pages/.
 *  4. El path `/galeria` (y las rutas de sistema) están declaradas en route-paths.ts.
 *
 * Uso: node scripts/route-guard.mjs
 * Exit code 0 = OK; 1 = fugas detectadas.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const navSource = read("src/app/nav.ts");
const routerSource = read("src/app/router.tsx");
const pathsSource = read("src/app/route-paths.ts");
const catalogsSource = read("src/pages/catalog-adapters.tsx");

const failures = [];
const warn = (msg) => failures.push(msg);

// 1. Extraer todos los href de NAV_GROUPS (strings literales "/...")
const navHrefs = [...navSource.matchAll(/href:\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
// hrefs que vienen de PATH.* (resueltos en runtime, no literales) los ignoramos aquí;
// se validan vía route-paths.ts y router.tsx.

// 2. Extraer los paths declarados en el router: strings literal "..." que son rutas hijas
const routerPaths = [
  ...routerSource.matchAll(/path:\s*["']([^"']+)["']/g),
]
  .map((m) => m[1])
  .filter((p) => !p.includes(":") || p === "*");

// 3. Declared path names en route-paths.ts (identificadores, no sus valores)
const pathKeys = [...pathsSource.matchAll(/^  (\w+):/gm)].map((m) => m[1]);

// 4. Verificar que PATH.galeria y PATH.noEncontrado están declarados en route-paths
for (const key of ["galeria", "noEncontrado", "accesoNoPermitido"]) {
  if (!pathKeys.includes(key)) {
    warn(`route-paths.ts no declara PATH.${key}`);
  }
}

// 5. Verificar que los hrefs literales del nav existen como ruta en el router.
//    Rutas literales del nav: los catálogos (/almacenes, ...) y las de PATH resueltas
//    (dashboard="/", movimientos, etc.). Los paths del router son hijos sin "/" inicial,
//    así que normalizamos.
const catalogosBlock = catalogsSource.match(/CATALOGOS[^=]*=\s*\{([\s\S]*?)\n\};/);
const catalogSlugs = catalogosBlock
  ? [...catalogosBlock[1].matchAll(/^\s*(\w+):/gm)].map((m) => m[1])
  : [];

for (const href of navHrefs) {
  const normalized = href.replace(/^\//, "");
  const isCatalog = catalogSlugs.includes(normalized);
  const isIndex = normalized === "";
  const declared =
    isIndex ||
    isCatalog ||
    routerPaths.includes(normalized) ||
    routerPaths.includes(normalized.split("/")[0]);
  if (!declared) {
    warn(`nav href "${href}" no tiene ruta declarada en el router`);
  }
}

// 6. Verificar que las rutas literales de página del router tengan un elemento de página real.
//    Las rutas index y las generadas por map() se validan por la existencia del archivo de página.
const pageFiles = ["DashboardPage", "MovimientosPage", "InventarioPage", "AlertasPage", "ReportesPage", "ConfiguracionPage", "GaleriaPage", "NotFoundPage", "ForbiddenPage", "ErrorPage", "CatalogListRoute", "CatalogDetailRoute"];
const missingImports = pageFiles.filter((name) => !routerSource.includes(name));
if (missingImports.length) {
  warn(`router no importa/referencia páginas: ${missingImports.join(", ")}`);
}

// 7. Verificar que cada página referenciada existe como archivo en src/pages/
const pageModules = ["DashboardPage", "MovimientosPage", "InventarioPage", "AlertasPage", "ReportesPage", "ConfiguracionPage", "GaleriaPage", "NotFoundPage", "ForbiddenPage", "ErrorPage"];
const missingPages = pageModules.filter((name) => {
  const file = resolve(root, `src/pages/${name}.tsx`);
  try {
    readFileSync(file);
    return false;
  } catch {
    return true;
  }
});
if (missingPages.length) {
  warn(`páginas sin archivo en src/pages/: ${missingPages.join(", ")}`);
}

if (failures.length) {
  console.error("❌ RouteGuard: fugas de rutas detectadas");
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}

console.log(`✅ RouteGuard OK — ${navHrefs.length} enlaces de nav, ${routerPaths.length} rutas declaradas, ${pathKeys.length} paths centralizados`);
