/** El mensaje llega de fuera: el helper es de módulo y no tiene diccionario. */
export function fileToBase64(file: File, mensajeFallo: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.split(",")[1] ?? "");
    });
    reader.addEventListener("error", () => reject(new Error(mensajeFallo)));
    reader.readAsDataURL(file);
  });
}

/** URL del mapa embebido de OpenStreetMap para un punto (sin key). */
export function osmEmbedUrl(lat: number, lng: number): string {
  const d = 0.008; // ~1 km de margen
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

export function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
