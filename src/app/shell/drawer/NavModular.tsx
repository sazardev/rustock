import { useEffect, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useT } from "../../../shared/i18n";
import { Button, Icon } from "../../../shared/ui";
import type { DispositivoNav } from "../../../shared/types";
import type { NavGroup } from "../../nav";
import { NavBuscador } from "./NavBuscador";
import { NavFila } from "./NavFila";
import { NavGrupo } from "./NavGrupo";
import { useNavModular } from "./useNavModular";

interface NavModularProps {
  grupos: NavGroup[];
  dispositivo: DispositivoNav;
  rolCodigo: string | null;
  onNavegar: () => void;
  pie?: ReactNode;
}

interface Arrastre {
  tipo: "item" | "seccion";
  id: string;
}

/** Drawer de navegación: buscador, fijados, secciones y panel de ocultos. */
export function NavModular({ grupos, dispositivo, rolCodigo, onNavegar, pie }: NavModularProps) {
  const t = useT();
  const nav = useNavModular(grupos, dispositivo, rolCodigo);
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [punto, setPunto] = useState({ x: 0, y: 0 });
  const [verOcultos, setVerOcultos] = useState(false);

  useEffect(() => {
    if (!arrastre) return;
    function mover(evento: PointerEvent) {
      setPunto({ x: evento.clientX, y: evento.clientY });
      const destino = document
        .elementFromPoint(evento.clientX, evento.clientY)
        ?.closest<HTMLElement>("[data-seccion]");
      setSobre(destino?.dataset.seccion ?? null);
    }
    function soltar() {
      if (arrastre && sobre) {
        if (arrastre.tipo === "item") nav.moverASeccion(arrastre.id, sobre);
        else nav.moverSeccionA(arrastre.id, sobre);
      }
      setArrastre(null);
      setSobre(null);
    }
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
    return () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
    };
  }, [arrastre, sobre, nav]);

  function iniciarArrastre(evento: ReactPointerEvent, tipo: "item" | "seccion", id: string) {
    evento.preventDefault();
    setPunto({ x: evento.clientX, y: evento.clientY });
    setArrastre({ tipo, id });
  }

  const hayOcultos = nav.ocultos.length > 0 || nav.seccionesOcultas.length > 0;

  return (
    <div className="drawer-nav">
      <div className="drawer-nav__buscar">
        <NavBuscador consulta={nav.consulta} onChange={nav.setConsulta} onLimpiar={nav.limpiar} />
        <button
          type="button"
          className="drawer-nav__ambito"
          aria-pressed={nav.porDispositivo}
          onClick={nav.alternarGuardarDispositivo}
        >
          {nav.porDispositivo ? t.shell.guardarDispositivo : t.shell.guardarGlobal}
        </button>
      </div>

      <nav className="drawer-nav__scroll" aria-label={t.shell.navegacionPrincipal}>
        {nav.fijadosVisibles.length > 0 ? (
          <section className="drawer-grupo drawer-grupo--fijados">
            <h2 className="drawer-grupo__titulo-fijo">{t.shell.modulosFijados}</h2>
            {nav.fijadosVisibles.map((item) => (
              <NavFila
                key={item.href}
                item={item}
                activo={item.href === nav.activo}
                filtrando
                primero
                ultimo
                arrastrando={false}
                onAlternarFijado={nav.alternarFijado}
                onOcultar={nav.ocultarModulo}
                onMover={nav.mover}
                onIniciarArrastre={iniciarArrastre}
                onNavegar={onNavegar}
              />
            ))}
          </section>
        ) : null}

        {nav.filtrando && nav.gruposVisibles.length === 0 ? (
          <div className="drawer-nav__vacio">
            <Icon name="buscar" size={24} aria-hidden="true" />
            <p>{t.shell.navSinResultados}</p>
            <Button type="button" variant="secondary" size="sm" onClick={nav.limpiar}>
              {t.shell.limpiarFiltroNav}
            </Button>
          </div>
        ) : null}

        {nav.gruposVisibles.map((grupo) => (
          <NavGrupo
            key={grupo.id}
            grupo={grupo}
            abierto={nav.filtrando || nav.abiertos.has(grupo.id)}
            activo={nav.activo}
            filtrando={nav.filtrando}
            arrastrando={arrastre?.tipo === "seccion" && arrastre.id === grupo.id}
            sobre={sobre === grupo.id}
            onAlternarGrupo={nav.alternarGrupo}
            onAlternarFijado={nav.alternarFijado}
            onOcultar={nav.ocultarModulo}
            onMover={nav.mover}
            onOcultarSeccion={nav.ocultarSeccion}
            onReordenarSeccion={nav.reordenarSeccion}
            onIniciarArrastre={iniciarArrastre}
            onNavegar={onNavegar}
          />
        ))}

        <section className="drawer-ocultos">
          <button
            type="button"
            className="drawer-ocultos__toggle"
            aria-expanded={verOcultos}
            onClick={() => setVerOcultos((actual) => !actual)}
          >
            <Icon name="ocultar" size={16} aria-hidden="true" />
            <span>
              {t.shell.modulosOcultos}
              {hayOcultos ? ` (${nav.ocultos.length + nav.seccionesOcultas.length})` : ""}
            </span>
            <Icon name={verOcultos ? "subir" : "bajar"} size={16} aria-hidden="true" />
          </button>
          {verOcultos ? (
            <div className="drawer-ocultos__lista">
              {!hayOcultos ? <p>{t.shell.sinOcultos}</p> : null}
              {nav.ocultos.map((item) => (
                <button key={item.href} type="button" onClick={() => nav.mostrarModulo(item.href)}>
                  <Icon name="ver" size={14} aria-hidden="true" />
                  {item.label}
                </button>
              ))}
              {nav.seccionesOcultas.map((id) => {
                const indice = Number(id.slice(1));
                return (
                  <button key={id} type="button" onClick={() => nav.mostrarSeccion(id)}>
                    <Icon name="ver" size={14} aria-hidden="true" />
                    {grupos[indice]?.title ?? id}
                  </button>
                );
              })}
              {hayOcultos ? (
                <Button type="button" variant="link" size="sm" onClick={nav.restaurarTodo}>
                  {t.shell.restaurarTodo}
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>
      </nav>

      {arrastre ? (
        <div className="drawer-fantasma" style={{ left: punto.x, top: punto.y }}>
          <Icon name="agarrar" size={14} aria-hidden="true" />
          {arrastre.id}
        </div>
      ) : null}

      {pie ? <div className="drawer-nav__pie">{pie}</div> : null}
    </div>
  );
}
