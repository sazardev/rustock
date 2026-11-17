import type { PointerEvent as ReactPointerEvent } from "react";
import { Link as RouterLink } from "react-router";
import { useT } from "../../../shared/i18n";
import { cn } from "../../../shared/lib/cn";
import { Icon } from "../../../shared/ui";
import type { NavFilaView } from "./tipos";

interface NavFilaProps {
  item: NavFilaView;
  activo: boolean;
  filtrando: boolean;
  primero: boolean;
  ultimo: boolean;
  arrastrando: boolean;
  onAlternarFijado: (href: string) => void;
  onOcultar: (href: string) => void;
  onMover: (href: string, delta: -1 | 1) => void;
  onIniciarArrastre: (evento: ReactPointerEvent, tipo: "item" | "seccion", id: string) => void;
  onNavegar: () => void;
}

/** Una fila del drawer: enlace al módulo y herramientas de personalización. */
export function NavFila({
  item,
  activo,
  filtrando,
  primero,
  ultimo,
  arrastrando,
  onAlternarFijado,
  onOcultar,
  onMover,
  onIniciarArrastre,
  onNavegar,
}: NavFilaProps) {
  const t = useT();

  return (
    <div
      className={cn(
        "drawer-item",
        activo && "drawer-item--active",
        !filtrando && "drawer-item--ordenable",
        arrastrando && "drawer-item--arrastrando",
      )}
    >
      <div className="drawer-item__link">
        <span
          className="drawer-item__tirador"
          role="button"
          tabIndex={0}
          aria-label={t.shell.moverModulo}
          onPointerDown={(evento) => onIniciarArrastre(evento, "item", item.href)}
        >
          <Icon name="agarrar" size={14} aria-hidden="true" />
        </span>
        <RouterLink
          to={item.href}
          className="drawer-item__enlace"
          aria-current={activo ? "page" : undefined}
          onClick={onNavegar}
        >
          <span className="drawer-item__icon">
            <Icon name={item.icon} size={18} aria-hidden="true" />
          </span>
          <span className="drawer-item__label">{item.label}</span>
        </RouterLink>
      </div>
      <div className="drawer-item__tools">
        <button
          type="button"
          className="drawer-item__tool"
          aria-label={item.fijado ? t.shell.desfijarModulo : t.shell.fijarModulo}
          aria-pressed={item.fijado}
          onClick={() => onAlternarFijado(item.href)}
        >
          <Icon name={item.fijado ? "desfijar" : "fijar"} size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="drawer-item__tool"
          aria-label={t.shell.ocultarModulo}
          onClick={() => onOcultar(item.href)}
        >
          <Icon name="ocultar" size={16} aria-hidden="true" />
        </button>
        {filtrando ? null : (
          <>
            <button
              type="button"
              className="drawer-item__tool"
              aria-label={t.shell.subirModulo}
              disabled={primero}
              onClick={() => onMover(item.href, -1)}
            >
              <Icon name="subir" size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="drawer-item__tool"
              aria-label={t.shell.bajarModulo}
              disabled={ultimo}
              onClick={() => onMover(item.href, 1)}
            >
              <Icon name="bajar" size={16} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
