import { useT } from "../../../shared/i18n";

/** Atajos y gestos del lienzo, en un panel inline plegable. */
export function AyudaAtajos({ id, construir }: { id: string; construir: boolean }) {
  const t = useT();
  const filas = construir
    ? [...t.lienzo2D.atajos, ...t.lienzo2D.atajosConstruir]
    : t.lienzo2D.atajos;
  return (
    <section id={id} className="mapa-panel" aria-label={t.lienzo2D.ayuda}>
      <dl className="mapa-atajos">
        {filas.map((a) => (
          <div key={a.teclas} className="mapa-atajos__fila">
            <dt>
              <kbd className="kbd">{a.teclas}</kbd>
            </dt>
            <dd>{a.accion}</dd>
          </div>
        ))}
      </dl>
      <p className="mapa-panel__nota">{t.lienzo2D.notaInterior}</p>
    </section>
  );
}
