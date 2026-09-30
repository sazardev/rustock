import { useT } from "../../../shared/i18n";
import type { ModoColor } from "../../mapa/personalizacion";

type Tono = "libre" | "medio" | "lleno" | "completo" | "peligro" | "aviso" | "bien" | "neutro";

function Muestras({ items }: { items: { tono: Tono; texto: string }[] }) {
  return (
    <ul className="mapa3d-panel__leyenda">
      {items.map((i) => (
        <li key={i.texto}>
          <span className={`mapa3d-panel__muestra mapa3d-panel__muestra--${i.tono}`} />
          {i.texto}
        </li>
      ))}
    </ul>
  );
}

/** Explica el modo de color activo y, si tiene escala, muestra sus colores. */
export function LeyendaColor({ modo }: { modo: ModoColor }) {
  const t = useT().mapa3d.personalizacion.color;
  if (modo === "ocupacion") {
    return (
      <Muestras
        items={[
          { tono: "libre", texto: t.leyendaLibre },
          { tono: "bien", texto: t.leyendaMedia },
          { tono: "aviso", texto: t.leyendaLlena },
          { tono: "peligro", texto: t.leyendaCompleta },
        ]}
      />
    );
  }
  if (modo === "vencimiento") {
    return (
      <Muestras
        items={[
          { tono: "peligro", texto: t.leyendaVencido },
          { tono: "aviso", texto: t.leyendaProximo },
          { tono: "bien", texto: t.leyendaHolgado },
          { tono: "neutro", texto: t.leyendaSinFecha },
        ]}
      />
    );
  }
  if (modo === "categoria") {
    return <Muestras items={[{ tono: "neutro", texto: t.leyendaSinCategoria }]} />;
  }
  return null;
}
