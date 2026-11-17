import { useRef } from "react";
import { useT } from "../../../shared/i18n";
import { Icon } from "../../../shared/ui";

interface NavBuscadorProps {
  consulta: string;
  onChange: (valor: string) => void;
  onLimpiar: () => void;
}

export function NavBuscador({ consulta, onChange, onLimpiar }: NavBuscadorProps) {
  const t = useT();
  const entrada = useRef<HTMLInputElement>(null);

  return (
    <div className="drawer-buscar">
      <Icon name="buscar" size={16} aria-hidden="true" />
      <input
        ref={entrada}
        type="search"
        className="drawer-buscar__input"
        placeholder={t.shell.filtrarNav}
        aria-label={t.shell.filtrarNav}
        value={consulta}
        onChange={(event) => onChange(event.target.value)}
      />
      {consulta ? (
        <button
          type="button"
          className="drawer-buscar__limpiar"
          aria-label={t.shell.limpiarFiltroNav}
          onClick={() => {
            onLimpiar();
            entrada.current?.focus();
          }}
        >
          <Icon name="cerrarPanel" size={16} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
