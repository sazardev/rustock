import { Button } from "../../../shared/ui";
import { useT } from "../../../shared/i18n";

/** Cabecera minima de la caminata: boton para salir y, en escritorio, las
 * teclas. Sustituye a la barra de herramientas mientras se camina. */
export function CabeceraCaminata({
  teclas,
  bloqueado,
  onSalir,
}: {
  /** Mostrar la ayuda de teclado (solo con teclado/raton). */
  teclas: boolean;
  bloqueado: boolean;
  onSalir: () => void;
}) {
  const t = useT();
  return (
    <>
      <div className="caminata__cabecera">
        <Button variant="secondary" size="sm" icon="atras" onClick={onSalir}>
          {t.mapa3d.salirDeCaminar}
          {teclas ? <kbd>Esc</kbd> : null}
        </Button>
        {teclas ? (
          <ul className="caminata__teclas" aria-label={t.mapa3d.ayudaTeclasAria}>
            <li>
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd> {t.mapa3d.ayudaMover}
            </li>
            <li>
              <kbd>Shift</kbd> {t.mapa3d.ayudaCorrer}
            </li>
            <li>
              <kbd>C</kbd> {t.mapa3d.ayudaAgacharse}
            </li>
          </ul>
        ) : null}
      </div>
      {teclas && !bloqueado ? <p className="caminata__captura">{t.mapa3d.capturarRaton}</p> : null}
    </>
  );
}
