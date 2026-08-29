import { IDIOMAS, useIdioma, useT, type Idioma } from "../i18n";
import { cn } from "../lib/cn";

export interface SelectorIdiomaProps {
  className?: string;
}

/**
 * Cambio de idioma (SPEC §17).
 *
 * Vive en la barra superior y no enterrado en Configuración: quien abre la app
 * en un idioma que no entiende necesita encontrarlo **sin leer nada**, y por
 * eso las opciones se muestran en su propia lengua («English», no «Inglés»).
 *
 * Es un grupo de botones y no un desplegable a propósito: con dos idiomas, un
 * desplegable esconde la mitad de la información para ahorrar unos píxeles.
 */
export function SelectorIdioma({ className }: SelectorIdiomaProps) {
  const t = useT();
  const idioma = useIdioma((s) => s.idioma);
  const cambiar = useIdioma((s) => s.cambiar);

  return (
    <div className={cn("selector-idioma", className)} role="group" aria-label={t.shell.idioma}>
      {IDIOMAS.map((op) => (
        <button
          key={op.codigo}
          type="button"
          className={cn(
            "selector-idioma__opcion",
            op.codigo === idioma && "selector-idioma__opcion--activa",
          )}
          aria-pressed={op.codigo === idioma}
          // El nombre se anuncia en su propia lengua para que un lector de
          // pantalla no lo pronuncie con la fonética del idioma actual.
          lang={op.etiquetaHtml}
          onClick={() => cambiar(op.codigo as Idioma)}
        >
          {op.codigo.toUpperCase()}
          <span className="sr-only"> — {op.nombre}</span>
        </button>
      ))}
    </div>
  );
}
