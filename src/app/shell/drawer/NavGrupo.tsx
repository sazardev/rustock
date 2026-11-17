import type { PointerEvent as ReactPointerEvent } from "react";
import { useT } from "../../../shared/i18n";
import { cn } from "../../../shared/lib/cn";
import { Icon } from "../../../shared/ui";
import { NavFila } from "./NavFila";
import type { NavGrupoView } from "./tipos";

interface NavGrupoProps {
  grupo: NavGrupoView;
  abierto: boolean;
  activo: string | null;
  filtrando: boolean;
  arrastrando: boolean;
  sobre: boolean;
  onAlternarGrupo: (id: string) => void;
  onAlternarFijado: (href: string) => void;
  onOcultar: (href: string) => void;
  onMover: (href: string, delta: -1 | 1) => void;
  onOcultarSeccion: (id: string) => void;
  onReordenarSeccion: (id: string, delta: -1 | 1) => void;
  onIniciarArrastre: (evento: ReactPointerEvent, tipo: "item" | "seccion", id: string) => void;
  onNavegar: () => void;
}

/** Grupo en acordeón: el encabezado es el control de apertura y de sección. */
export function NavGrupo({
  grupo,
  abierto,
  activo,
  filtrando,
  arrastrando,
  sobre,
  onAlternarGrupo,
  onAlternarFijado,
  onOcultar,
  onMover,
  onOcultarSeccion,
  onReordenarSeccion,
  onIniciarArrastre,
  onNavegar,
}: NavGrupoProps) {
  const t = useT();

  return (
    <section
      className={cn(
        "drawer-grupo",
        abierto && "drawer-grupo--abierto",
        arrastrando && "drawer-grupo--arrastrando",
        sobre && "sobre",
      )}
      data-seccion={grupo.id}
    >
      <div className="drawer-grupo__barra">
        <span
          className="drawer-grupo__tirador"
          role="button"
          tabIndex={0}
          aria-label={t.shell.moverSeccion}
          onPointerDown={(evento) => onIniciarArrastre(evento, "seccion", grupo.id)}
        >
          <Icon name="agarrar" size={14} aria-hidden="true" />
        </span>
        <button
          type="button"
          className="drawer-grupo__cabecera"
          aria-expanded={abierto}
          aria-label={abierto ? t.shell.contraerGrupo : t.shell.expandirGrupo}
          onClick={() => onAlternarGrupo(grupo.id)}
        >
          <span>{grupo.title}</span>
          <Icon name={abierto ? "subir" : "bajar"} size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="drawer-grupo__acciones">
        <button
          type="button"
          className="drawer-item__tool"
          aria-label={t.shell.ocultarSeccion}
          onClick={() => onOcultarSeccion(grupo.id)}
        >
          <Icon name="ocultar" size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="drawer-item__tool"
          aria-label={t.shell.subirModulo}
          onClick={() => onReordenarSeccion(grupo.id, -1)}
        >
          <Icon name="subir" size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="drawer-item__tool"
          aria-label={t.shell.bajarModulo}
          onClick={() => onReordenarSeccion(grupo.id, 1)}
        >
          <Icon name="bajar" size={16} aria-hidden="true" />
        </button>
      </div>
      {abierto ? (
        <div className="drawer-grupo__items">
          {grupo.items.map((item, indice) => (
            <NavFila
              key={item.href}
              item={item}
              activo={item.href === activo}
              filtrando={filtrando}
              primero={indice === 0}
              ultimo={indice === grupo.items.length - 1}
              arrastrando={false}
              onAlternarFijado={onAlternarFijado}
              onOcultar={onOcultar}
              onMover={onMover}
              onIniciarArrastre={onIniciarArrastre}
              onNavegar={onNavegar}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
