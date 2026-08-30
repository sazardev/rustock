// Comprueba que las dos lenguas no se separen.
//
// El diccionario de interfaz ya lo garantiza el compilador: `en` se declara con
// el tipo derivado de `es`, así que una clave que falte no compila. La
// documentación no puede apoyarse en eso —es prosa en archivos aparte— así que
// se verifica aquí: mismos capítulos, mismos ids, mismos términos de glosario.
//
//   node scripts/i18n-guard.mjs
import { readFileSync } from "node:fs";

const errores = [];

/** Ids en el orden en que aparecen en un archivo de contenido. */
function ids(ruta, patron) {
  return [...readFileSync(ruta, "utf8").matchAll(patron)].map((m) => m[1]);
}

function comparar(que, esperados, obtenidos) {
  const faltan = esperados.filter((id) => !obtenidos.includes(id));
  const sobran = obtenidos.filter((id) => !esperados.includes(id));
  if (faltan.length > 0) {
    errores.push(`${que}: sin traducir → ${faltan.join(", ")}`);
  }
  if (sobran.length > 0) {
    errores.push(`${que}: en inglés pero no en castellano → ${sobran.join(", ")}`);
  }
}

const AYUDA_ES = "src/pages/ayuda/ayuda-contenido.es.ts";
const AYUDA_EN = "src/pages/ayuda/ayuda-contenido.en.ts";
const MANUAL_ES = "src/pages/manual/manual-contenido.es.ts";
const MANUAL_EN = "src/pages/manual/manual-contenido.en.ts";

const GUIA = /^\s+id: "([a-z][a-z0-9-]*)",\n\s+titulo:/gm;
const CAPITULO = /^\s+id: "(m\d\d-[a-z-]+)",/gm;
const TERMINO = /^\s+id: "([a-z][a-z0-9-]*)",\n\s+termino:/gm;

comparar("guías de Ayuda", ids(AYUDA_ES, GUIA), ids(AYUDA_EN, GUIA));
comparar("glosario de Ayuda", ids(AYUDA_ES, TERMINO), ids(AYUDA_EN, TERMINO));
comparar("capítulos del Manual", ids(MANUAL_ES, CAPITULO), ids(MANUAL_EN, CAPITULO));
comparar("glosario del Manual", ids(MANUAL_ES, TERMINO), ids(MANUAL_EN, TERMINO));

if (errores.length > 0) {
  console.error("I18nGuard falló — la documentación se ha separado entre idiomas:");
  for (const e of errores) console.error(`  ✗ ${e}`);
  process.exit(1);
}

const total =
  ids(AYUDA_ES, GUIA).length +
  ids(AYUDA_ES, TERMINO).length +
  ids(MANUAL_ES, CAPITULO).length +
  ids(MANUAL_ES, TERMINO).length;
console.log(`I18nGuard OK — ${total} piezas de documentación con su par en inglés`);
