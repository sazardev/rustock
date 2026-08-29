import { usePwa } from "../pwa";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { useT } from "../i18n";

/**
 * Franja de avisos de plataforma (DESIGN §6.12, §8.3).
 *
 * Vive en el flujo del lienzo, encima del contenido de la ruta: no flota, no
 * tapa nada y no exige una respuesta. Comunica exactamente dos hechos que la
 * persona necesita saber para confiar en lo que ve en pantalla —
 * "estás sin conexión" y "hay una versión nueva lista" — y ofrece la acción
 * correspondiente sin interrumpir la tarea en curso.
 */
export function AvisoSistema() {
  const t = useT();
  const enLinea = usePwa((s) => s.enLinea);
  const actualizacionLista = usePwa((s) => s.actualizacionLista);
  const aplicarActualizacion = usePwa((s) => s.aplicarActualizacion);

  if (enLinea && !actualizacionLista) {
    return null;
  }

  return (
    <div className="aviso-pila" role="status" aria-live="polite">
      {enLinea ? null : (
        <div className="aviso aviso--warning">
          <Icon name="sinConexion" size={16} className="aviso__icono" aria-hidden="true" />
          <p className="aviso__texto">{t.plataforma.sinConexion}</p>
        </div>
      )}
      {actualizacionLista ? (
        <div className="aviso aviso--info">
          <Icon name="refrescar" size={16} className="aviso__icono" aria-hidden="true" />
          <p className="aviso__texto">Hay una versión nueva de Rustock lista para usarse.</p>
          <Button variant="secondary" size="sm" onClick={aplicarActualizacion}>
            {t.plataforma.actualizarAhora}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
