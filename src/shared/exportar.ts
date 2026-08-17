/**
 * Exportación de datos de reportes (SPEC §15.8): genera y descarga archivos
 * CSV/JSON desde el navegador con los datos que el backend ya devolvió. El
 * formato CSV usa `;` como separador y BOM UTF-8 para abrirse correctamente
 * en Excel con locale es-ES/es-MX. No hay lógica de negocio aquí: solo
 * serialización del resultado de una consulta ya ejecutada en Rust.
 */

/** Convierte un valor a texto plano para una celda (nulos → vacío). */
function celda(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "sí" : "no";
  if (Array.isArray(v)) return v.map(celda).join(" | ");
  return String(v);
}

function escaparCelda(v: unknown): string {
  const texto = celda(v);
  if (/[;"\n\r]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

function filasACSV(filas: Array<Record<string, unknown>>): string {
  const cabeceras = filas.length > 0 ? Object.keys(filas[0]) : [];
  const lineas = [cabeceras.join(";")];
  for (const fila of filas) {
    lineas.push(cabeceras.map((c) => escaparCelda(fila[c])).join(";"));
  }
  // BOM UTF-8: Excel detecta la codificación correctamente.
  return `\uFEFF${lineas.join("\r\n")}`;
}

function descargar(nombreBase: string, contenido: string, tipo: string, extension: string): void {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `${nombreBase}.${extension}`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

/** Descarga las filas planas como CSV (SPEC §15.8). */
export function exportarCSV(nombreBase: string, filas: Array<Record<string, unknown>>): void {
  descargar(nombreBase, filasACSV(filas), "text/csv;charset=utf-8", "csv");
}

/** Descarga las filas planas como JSON (SPEC §15.8). */
export function exportarJSON(nombreBase: string, filas: Array<Record<string, unknown>>): void {
  descargar(nombreBase, JSON.stringify(filas, null, 2), "application/json", "json");
}

/** Nombre de archivo con fecha para que no colisionen exportaciones. */
export function nombreExportacion(base: string): string {
  const d = new Date();
  const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
  return `${base}-${fecha}`;
}
