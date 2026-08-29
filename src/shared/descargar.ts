/**
 * Descarga de archivos generados por el backend (SPEC §14.3.8).
 *
 * El backend devuelve todo en base64 —sea texto (ZPL, EPL) o binario (PDF)—
 * para tener un solo camino de transporte. Aquí se reconstruye el archivo y se
 * entrega al navegador.
 */

/** Convierte base64 a bytes sin pasar por cadenas intermedias enormes. */
function desdeBase64(base64: string): ArrayBuffer {
  const binario = atob(base64);
  const buffer = new ArrayBuffer(binario.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binario.length; i++) {
    bytes[i] = binario.charCodeAt(i);
  }
  return buffer;
}

/** Entrega un archivo al navegador con el nombre indicado. */
export function descargarArchivo(nombre: string, mime: string, base64: string): void {
  const blob = new Blob([desdeBase64(base64)], { type: mime });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  // Liberar el objeto en el siguiente ciclo: revocarlo de inmediato cancela la
  // descarga en algunos navegadores.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Rasteriza un SVG a PNG en el propio navegador.
 *
 * Se hace aquí y no en el backend a propósito: rasterizar es presentación
 * pura, el navegador ya trae un motor de dibujo, y traerse una librería de
 * imagen a Rust por esto sería una dependencia enorme para un botón.
 *
 * `escala` multiplica la resolución: 8 equivale a unos 200 dpi sobre una
 * etiqueta en milímetros, suficiente para que las barras salgan nítidas si
 * alguien pega el PNG en otro sistema.
 */
export async function svgAPng(svg: string, escala = 8): Promise<Blob> {
  const url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  const imagen = new Image();
  await new Promise<void>((resolver, rechazar) => {
    imagen.addEventListener("load", () => resolver(), { once: true });
    imagen.addEventListener("error", () => rechazar(new Error("SVG ilegible")), { once: true });
    imagen.src = url;
  });

  const lienzo = document.createElement("canvas");
  lienzo.width = Math.max(1, Math.round(imagen.width * escala));
  lienzo.height = Math.max(1, Math.round(imagen.height * escala));
  const contexto = lienzo.getContext("2d");
  if (!contexto) throw new Error("El navegador no permitió dibujar la imagen.");
  // Blanco literal, no un token del tema: esto es papel, no interfaz. Con
  // `--color-surface` el PNG saldría negro en modo oscuro y la etiqueta sería
  // ilegible. Un PNG transparente impreso sobre papel de color tampoco da el
  // contraste que un lector necesita, así que el fondo va explícito.
  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, lienzo.width, lienzo.height);
  contexto.imageSmoothingEnabled = false;
  contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);

  return new Promise<Blob>((resolver, rechazar) => {
    lienzo.toBlob((blob) => {
      if (blob) resolver(blob);
      else rechazar(new Error("No se pudo generar el PNG."));
    }, "image/png");
  });
}

/** Descarga un blob ya construido (para el PNG rasterizado aquí). */
export function descargarBlob(nombre: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
