import { useT } from "../../../shared/i18n";

const PASOS = [
  { token: "--color-gray-100", clave: "libre" },
  { token: "--color-success-500", clave: "normal" },
  { token: "--color-warning-500", clave: "alta" },
  { token: "--color-danger-500", clave: "llena" },
] as const;

/** Significado de los colores de ocupación de las celdas. */
export function LeyendaOcupacion() {
  const t = useT();
  return (
    <ul className="mapa-leyenda" aria-label={t.lienzo2D.leyenda.titulo}>
      {PASOS.map((p) => (
        <li key={p.clave} className="mapa-leyenda__item">
          <span className="mapa-leyenda__muestra" style={{ backgroundColor: `var(${p.token})` }} />
          {t.lienzo2D.leyenda[p.clave]}
        </li>
      ))}
    </ul>
  );
}
