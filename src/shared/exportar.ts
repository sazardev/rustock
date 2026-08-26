/**
 * Exportación de datos de reportes (SPEC §15.8): genera y descarga archivos
 * CSV/XLSX/JSON desde el navegador con los datos que el backend ya devolvió.
 * El formato CSV usa `;` como separador y BOM UTF-8 para abrirse correctamente
 * en Excel con locale es-ES/es-MX. No hay lógica de negocio aquí: solo
 * serialización del resultado de una consulta ya ejecutada en Rust.
 */
import writeExcelFile from "write-excel-file/universal";

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

function descargarBlob(nombreBase: string, blob: Blob, extension: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `${nombreBase}.${extension}`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

function descargar(nombreBase: string, contenido: string, tipo: string, extension: string): void {
  descargarBlob(nombreBase, new Blob([contenido], { type: tipo }), extension);
}

/** Descarga las filas planas como CSV (SPEC §15.8). */
export function exportarCSV(nombreBase: string, filas: Array<Record<string, unknown>>): void {
  descargar(nombreBase, filasACSV(filas), "text/csv;charset=utf-8", "csv");
}

/** Descarga las filas planas como JSON (SPEC §15.8). */
export function exportarJSON(nombreBase: string, filas: Array<Record<string, unknown>>): void {
  descargar(nombreBase, JSON.stringify(filas, null, 2), "application/json", "json");
}

/** Convierte un valor de celda a un tipo compatible con `write-excel-file`
 * (string/number/boolean/Date) — nulos y arreglos se aplanan a texto igual
 * que en CSV, para que ambos formatos muestren la misma información. */
function valorCeldaXlsx(v: unknown): string | number | boolean | Date {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (v instanceof Date) return v;
  if (Array.isArray(v)) return v.map(celda).join(" | ");
  return String(v);
}

/** Descarga las filas planas como XLSX real (SPEC §15.8): un archivo .xlsx
 * válido, no un CSV renombrado — se abre directamente en Excel/LibreOffice
 * con los tipos de columna correctos (texto/número/booleano). */
export async function exportarXLSX(
  nombreBase: string,
  filas: Array<Record<string, unknown>>,
): Promise<void> {
  const cabeceras = filas.length > 0 ? Object.keys(filas[0]) : [];
  const sheetData = [
    cabeceras.map((c) => ({ value: c, fontWeight: "bold" as const })),
    ...filas.map((fila) => cabeceras.map((c) => ({ value: valorCeldaXlsx(fila[c]) }))),
  ];
  const blob = await writeExcelFile(sheetData).toBlob();
  descargarBlob(nombreBase, blob, "xlsx");
}

/** Nombre de archivo con fecha para que no colisionen exportaciones. */
export function nombreExportacion(base: string): string {
  const d = new Date();
  const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
  return `${base}-${fecha}`;
}
