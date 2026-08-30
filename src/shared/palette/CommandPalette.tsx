// oxlint-disable eslint/max-statements
/**
 * Command palette global de Rustock (DESIGN §6.10, §8.2): búsqueda en todo —
 * páginas, acciones, ayuda/glosario y datos de negocio en vivo.
 *
 * Es el panel de búsqueda flotante que DESIGN §6.10 ya contempla ("al
 * escribir, despliega un panel de resultados con --shadow-lg"); nunca muta
 * datos, solo navega, por lo que convive con la regla de cero modales (§5.1).
 *
 * Comportamiento:
 *  - Abre con Ctrl/Cmd+K o "/"; cierra con Escape o Ctrl/Cmd+K.
 *  - Con la consulta vacía muestra recientes + todas las páginas/acciones.
 *  - Escribiendo filtra los comandos estáticos por subsecuencia (fuzzy) y
 *    consulta al backend los recursos del usuario (debounce 250 ms).
 *  - Navegación por teclado: ↑/↓, Enter, Inicio/Fin. Foco devuelto al
 *    elemento que lo abrió al cerrar.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { buscar, listarRoles } from "../backend";
import { useSession } from "../session";
import { usePreferencias } from "../preferencias";
import type { BuscarItem } from "../types";
import { Icon, useToast, type IconName } from "../ui";
import { useT, type Diccionario } from "../i18n";
import { usePalette } from "./palette-store";
import {
  comandosPalette,
  leerRecientes,
  registrarReciente,
  type ComandoPalette,
  type GrupoComando,
} from "./commands";
import { indiceResaltado, puntuacionCandidato } from "./fuzzy";
import {
  catalogoDetalle,
  movimientoDetalle,
  sesionInventarioDetalle,
  PATH,
} from "../../app/route-paths";

const DEBOUNCE_MS = 250;
const MINIMO_DATOS = 2;

/** Icono de cada grupo de datos devuelto por el backend. La etiqueta visible
 *  sale del diccionario: la clave del recurso es la que da el backend. */
const ICONO_DATOS: Record<string, IconName> = {
  productos: "producto",
  ubicaciones: "ubicacion",
  lotes: "lote",
  proveedores: "proveedor",
  clientes: "cliente",
  almacenes: "almacen",
  categorias: "categoria",
  uoms: "uom",
  movimientos: "movements",
  sesiones_inventario: "inventario",
  alertas: "alerta",
};

/** Etiqueta visible de un grupo de comandos estáticos. */
function etiquetaComando(t: Diccionario, clave: string): string {
  return t.palette.grupos[clave as GrupoComando] ?? clave;
}

function etiquetaGrupo(t: Diccionario, recurso: string): string {
  return t.palette.datos[recurso as keyof typeof t.palette.datos] ?? recurso;
}

/** Ruta de detalle exacta de un dato devuelto por `buscar` (DESIGN §5.5). */
function hrefDeDato(recurso: string, item: BuscarItem): string {
  switch (recurso) {
    case "movimientos":
      return movimientoDetalle(item.id);
    case "sesiones_inventario":
      return sesionInventarioDetalle(item.id);
    case "alertas": {
      const entidad = item.datos?.entidad;
      const entidadId = item.datos?.entidad_id;
      if (entidad && entidadId) {
        switch (entidad) {
          case "producto":
            return catalogoDetalle("productos", entidadId);
          case "lote":
            return catalogoDetalle("lotes", entidadId);
          case "ubicacion":
            return catalogoDetalle("ubicaciones", entidadId);
          case "movimiento":
            return movimientoDetalle(entidadId);
          case "inventario":
            return sesionInventarioDetalle(entidadId);
          default:
            return PATH.alertas;
        }
      }
      return PATH.alertas;
    }
    default:
      return catalogoDetalle(recurso, item.id);
  }
}

/** Subtítulo legible de un dato, etiquetando tipo/estado con la UI (DESIGN §9.1). */
function subtituloDeDato(t: Diccionario, recurso: string, item: BuscarItem): string {
  if (recurso === "movimientos") {
    const tipo = item.datos?.tipo;
    const estado = item.datos?.estado;
    return [
      tipo && (t.dominio.tipoMovimiento[tipo as keyof typeof t.dominio.tipoMovimiento] ?? tipo),
      estado &&
        (t.dominio.estadoMovimiento[estado as keyof typeof t.dominio.estadoMovimiento] ?? estado),
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (recurso === "sesiones_inventario") {
    const tipo = item.datos?.tipo;
    const estado = item.datos?.estado;
    return [
      tipo && (t.dominio.tipoSesion[tipo as keyof typeof t.dominio.tipoSesion] ?? tipo),
      estado && (t.dominio.estadoSesion[estado as keyof typeof t.dominio.estadoSesion] ?? estado),
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (recurso === "alertas") {
    const tipo = item.datos?.tipo;
    return tipo
      ? (t.dominio.tipoAlerta[tipo as keyof typeof t.dominio.tipoAlerta] ?? tipo)
      : (item.subtitulo ?? "");
  }
  return item.subtitulo ?? "";
}

interface FilaPalette {
  id: string;
  grupo: string;
  titulo: string;
  subtitulo: string;
  icono: IconName;
  href: string;
}

/**
 * Intención heurística de la consulta: qué grupo priorizar al ordenar.
 * Reconoce las dos lenguas de la interfaz, porque quien escribe «how to» y
 * quien escribe «cómo» buscan lo mismo.
 */
function intencionConsulta(consulta: string): GrupoComando | null {
  const q = consulta.toLowerCase();
  const acciones = /crear|nuevo|agregar|alta|registrar|dar de alta|create|new|add|register/.test(q);
  const ayuda =
    /como|qu[eé] es|gu[ií]a|ayuda|proceso|c[oó]mo|para qu[eé]|explicar|aprender|tutorial|how|what is|guide|help|process|learn|explain/.test(
      q,
    );
  const datos = /reporte|informe|lista|analizar|total|c[ua]nto|report|list|analyse|analyze/.test(q);
  if (ayuda) return "ayuda";
  if (acciones) return "acciones";
  if (datos) return "paginas";
  return null;
}

/** Boost por historial: los comandos ya usados (recientes) puntúan más. */
function boostRecientes(id: string, recientes: ReturnType<typeof leerRecientes>): number {
  return recientes.some((r) => r.id === id) ? 60 : 0;
}

/** Ordena dentro de cada grupo y, al agrupar, coloca primero el grupo de
 *  mayor intención cuando la consulta la sugiere. */
function ordenarPorGrupo(
  grupos: Array<{ clave: string; titulo: string; filas: FilaPalette[] }>,
  intencion: GrupoComando | null,
): Array<{ titulo: string; filas: FilaPalette[] }> {
  const ordenados = intencion
    ? grupos.toSorted((a, b) => {
        const pa = a.clave === intencion ? 0 : 1;
        const pb = b.clave === intencion ? 0 : 1;
        return pa - pb;
      })
    : grupos;
  return ordenados.map(({ titulo, filas }) => ({ titulo, filas }));
}

function comandoAFila(c: ComandoPalette): FilaPalette {
  return {
    id: c.id,
    grupo: c.grupo,
    titulo: c.titulo,
    subtitulo: c.subtitulo ?? "",
    icono: c.icono,
    href: c.href,
  };
}

function datoAFila(t: Diccionario, recurso: string, item: BuscarItem): FilaPalette {
  return {
    id: `${recurso}:${item.id}`,
    grupo: etiquetaGrupo(t, recurso),
    titulo: item.titulo,
    subtitulo: subtituloDeDato(t, recurso, item),
    icono: ICONO_DATOS[recurso] ?? "buscar",
    href: hrefDeDato(recurso, item),
  };
}

/** Valor con debounce (para no golpear el backend en cada tecla). */
function useValorDebounced(valor: string, retraso: number): string {
  const [debounced, setDebounced] = useState(valor);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(valor), retraso);
    return () => window.clearTimeout(t);
  }, [valor, retraso]);
  return debounced;
}

function estaEnCampo(objetivo: EventTarget | null): boolean {
  const el = objetivo as HTMLElement | null;
  if (!el) return false;
  return (
    el.isContentEditable ||
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT"
  );
}

/** Resalta el primer tramo de `titulo` que coincide con `consulta`. */
function TituloResaltado({ titulo, consulta }: { titulo: string; consulta: string }) {
  const pos = indiceResaltado(consulta, titulo);
  if (pos < 0 || !consulta.trim()) return <>{titulo}</>;
  const q = consulta.trim();
  const final = pos + q.length;
  if (final > titulo.length) return <>{titulo}</>;
  return (
    <>
      {titulo.slice(0, pos)}
      <mark className="palette__mark">{titulo.slice(pos, final)}</mark>
      {titulo.slice(final)}
    </>
  );
}

export function CommandPalette() {
  const t = useT();
  const navigate = useNavigate();
  const { toast } = useToast();
  const abierto = usePalette((s) => s.abierto);
  const consulta = usePalette((s) => s.consulta);
  const cerrar = usePalette((s) => s.cerrar);
  const setConsulta = usePalette((s) => s.setConsulta);

  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const origenRef = useRef<HTMLElement | null>(null);
  const [indice, setIndice] = useState(0);
  const [recientes, setRecientes] = useState<ReturnType<typeof leerRecientes>>([]);

  const usuario = useSession((s) => s.usuario);
  const { data: roles } = useQuery({ queryKey: ["roles"], queryFn: listarRoles, enabled: abierto });
  const rolCodigo = roles?.find((r) => r.id === usuario?.rol_id)?.codigo;

  // Preferencia personal: si la Ayuda aparece como sugerencia en el palette.
  const ayudaEnPalette = usePreferencias((s) => s.resueltas?.ayuda_en_palette ?? true);

  const comandos = useMemo(
    () => comandosPalette(rolCodigo, t, ayudaEnPalette),
    [rolCodigo, t, ayudaEnPalette],
  );

  const qDebounced = useValorDebounced(consulta.trim(), DEBOUNCE_MS);
  const datosQuery = useQuery({
    queryKey: ["buscar", qDebounced],
    queryFn: () => buscar(qDebounced),
    enabled: abierto && qDebounced.length >= MINIMO_DATOS,
    staleTime: 10_000,
  });

  // Grupos de filas visibles: estáticos (recientes/páginas/acciones/ayuda) +
  // datos en vivo del backend.
  const grupos = useMemo(() => {
    const gruposEstaticos: Array<{ titulo: string; filas: FilaPalette[] }> = [];
    if (!consulta.trim()) {
      if (recientes.length > 0) {
        gruposEstaticos.push({
          titulo: t.palette.recientes,
          filas: recientes.map((r) => ({
            id: r.id,
            grupo: r.grupo,
            titulo: r.titulo,
            subtitulo: r.subtitulo ?? "",
            icono: r.icono,
            href: r.href,
          })),
        });
      }
      const todas = comandos.map(comandoAFila);
      const porGrupo = new Map<string, FilaPalette[]>();
      for (const f of todas) {
        const arr = porGrupo.get(f.grupo) ?? [];
        arr.push(f);
        porGrupo.set(f.grupo, arr);
      }
      for (const [clave, filas] of porGrupo) {
        gruposEstaticos.push({ titulo: etiquetaComando(t, clave), filas });
      }
    } else {
      const intencion = intencionConsulta(consulta);
      const puntuados = comandos
        .map((c) => {
          const score = puntuacionCandidato(consulta, {
            titulo: c.titulo,
            subtitulo: c.subtitulo,
            keywords: c.keywords,
          });
          if (score === null) return null;
          const boost = boostRecientes(c.id, recientes);
          return { c, score: score + boost };
        })
        .filter((x): x is { c: ComandoPalette; score: number } => x !== null)
        .toSorted((a, b) => b.score - a.score);
      const porGrupo = new Map<string, FilaPalette[]>();
      for (const { c } of puntuados) {
        const f = comandoAFila(c);
        const arr = porGrupo.get(f.grupo) ?? [];
        arr.push(f);
        porGrupo.set(f.grupo, arr);
      }
      const agrupados = [...porGrupo.entries()].map(([clave, filas]) => ({
        clave,
        titulo: etiquetaComando(t, clave),
        filas,
      }));
      gruposEstaticos.push(...ordenarPorGrupo(agrupados, intencion));
    }

    const gruposDatos: Array<{ titulo: string; filas: FilaPalette[] }> = [];
    for (const g of datosQuery.data?.grupos ?? []) {
      const filas = g.items.map((item) => datoAFila(t, g.recurso, item));
      if (filas.length > 0) gruposDatos.push({ titulo: etiquetaGrupo(t, g.recurso), filas });
    }

    return [...gruposEstaticos, ...gruposDatos];
  }, [t, consulta, comandos, recientes, datosQuery.data]);

  // Lista plana (sin cabeceras) para la navegación por teclado.
  const listaPlana = useMemo(() => grupos.flatMap((g) => g.filas), [grupos]);

  useEffect(() => {
    if (abierto) {
      setRecientes(leerRecientes());
      setIndice(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [t, abierto]);

  // Atajos globales (Ctrl/Cmd+K y "/").
  useEffect(() => {
    function alTeclado(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        usePalette.getState().alternar();
        return;
      }
      if (!usePalette.getState().abierto && e.key === "/" && !estaEnCampo(e.target)) {
        e.preventDefault();
        usePalette.getState().abrir();
      }
    }
    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, []);

  function ejecutarFila(fila: FilaPalette) {
    registrarReciente({
      id: fila.id,
      titulo: fila.titulo,
      subtitulo: fila.subtitulo || undefined,
      icono: fila.icono,
      grupo: fila.grupo,
      href: fila.href,
    });
    const esAyuda = fila.grupo === "Ayuda" || fila.href.startsWith("/ayuda");
    cerrar();
    navigate(fila.href);
    if (esAyuda) {
      toast(`Abriendo guía de Ayuda: ${fila.titulo}`, "success");
    }
  }

  // Teclado dentro del palette abierto.
  useEffect(() => {
    if (!abierto) return;
    function alTeclado(e: KeyboardEvent) {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          cerrar();
          break;
        case "ArrowDown":
          e.preventDefault();
          setIndice((i) => (listaPlana.length === 0 ? 0 : Math.min(i + 1, listaPlana.length - 1)));
          break;
        case "ArrowUp":
          e.preventDefault();
          setIndice((i) => (listaPlana.length === 0 ? 0 : Math.max(i - 1, 0)));
          break;
        case "Home":
          e.preventDefault();
          setIndice(0);
          break;
        case "End":
          e.preventDefault();
          setIndice(listaPlana.length > 0 ? listaPlana.length - 1 : 0);
          break;
        case "Enter": {
          const fila = listaPlana[indice];
          if (fila) {
            e.preventDefault();
            ejecutarFila(fila);
          }
          break;
        }
        default:
          break;
      }
    }
    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, abierto, indice, listaPlana, cerrar]);

  // Mantiene visible la fila activa al navegar.
  useEffect(() => {
    if (!abierto) {
      return;
    }
    const el = listaRef.current?.querySelector<HTMLElement>(`[data-flat="${indice}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [t, abierto, indice, listaPlana]);

  // Devuelve el foco al elemento que abrió el palette.
  useEffect(() => {
    if (abierto) {
      origenRef.current = document.activeElement as HTMLElement | null;
      return;
    }
    const origen = origenRef.current;
    origenRef.current = null;
    if (origen && typeof origen.focus === "function") {
      origen.focus();
    }
  }, [t, abierto]);

  if (!abierto) {
    return null;
  }

  const consultaActiva = consulta.trim();
  const hayResultados = listaPlana.length > 0;
  const buscando = datosQuery.isFetching && qDebounced.length >= MINIMO_DATOS;
  const sinResultados =
    consultaActiva.length > 0 && !hayResultados && !buscando && !datosQuery.isPending;

  let flatIndex = -1;

  return (
    <div className="palette">
      <button
        type="button"
        className="palette__scrim"
        aria-label={t.palette.cerrarBusqueda}
        onClick={cerrar}
        tabIndex={-1}
      />
      <div
        className="palette__panel"
        role="dialog"
        aria-modal="true"
        aria-label={t.shell.buscarGlobal}
      >
        <div className="palette__bar">
          <Icon name="buscar" size={18} className="palette__bar-icono" aria-hidden="true" />
          <input
            ref={inputRef}
            className="palette__input"
            type="text"
            placeholder={t.palette.marcador}
            aria-label={t.shell.buscarGlobal}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-lista"
            aria-activedescendant={hayResultados ? `palette-opcion-${indice}` : undefined}
            value={consulta}
            onChange={(e) => {
              setConsulta(e.target.value);
              setIndice(0);
            }}
          />
          <span className="palette__hint">
            <kbd className="kbd">Esc</kbd>
          </span>
        </div>

        <div className="palette__lista" id="palette-lista" role="listbox" ref={listaRef}>
          {grupos.map((grupo) => (
            <div key={grupo.titulo} className="palette__grupo-bloque">
              <div className="palette__grupo" role="presentation">
                {grupo.titulo}
              </div>
              {grupo.filas.map((fila) => {
                flatIndex += 1;
                const activa = flatIndex === indice;
                return (
                  <button
                    type="button"
                    key={fila.id}
                    id={`palette-opcion-${flatIndex}`}
                    data-flat={flatIndex}
                    role="option"
                    aria-selected={activa}
                    className={`palette__item${activa ? " palette__item--activo" : ""}`}
                    onMouseEnter={() => setIndice(flatIndex)}
                    onClick={() => ejecutarFila(fila)}
                  >
                    <span className="palette__item-icono" aria-hidden="true">
                      <Icon name={fila.icono} size={16} />
                    </span>
                    <span className="palette__item-texto">
                      <span className="palette__item-titulo">
                        {consultaActiva === "" ? (
                          fila.titulo
                        ) : (
                          <TituloResaltado titulo={fila.titulo} consulta={consultaActiva} />
                        )}
                      </span>
                      {fila.subtitulo ? (
                        <span className="palette__item-sub">{fila.subtitulo}</span>
                      ) : null}
                    </span>
                    <Icon
                      name="atras"
                      size={14}
                      className="palette__item-flecha"
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          ))}

          {hayResultados ? null : (
            <div className="palette__estado">
              {buscando || datosQuery.isPending ? (
                <span className="palette__estado-texto">Buscando en todo Rustock…</span>
              ) : null}
              {!buscando && !datosQuery.isPending && sinResultados ? (
                <>
                  <span className="palette__estado-titulo">
                    Sin resultados para &quot;{consultaActiva}&quot;
                  </span>
                  <span className="palette__estado-texto">
                    Prueba con el SKU, código, número o nombre de lo que buscas.
                  </span>
                  {!ayudaEnPalette ? (
                    <span className="palette__estado-texto">
                      Las guías de Ayuda están desactivadas en la búsqueda: actívalas en Mi perfil
                      para obtener sugerencias de procesos, módulos y glosario.
                    </span>
                  ) : null}
                </>
              ) : null}
              {!buscando && !datosQuery.isPending && !sinResultados ? (
                <span className="palette__estado-texto">Escribe para buscar en todo Rustock.</span>
              ) : null}
            </div>
          )}
        </div>

        <div className="palette__footer">
          <span className="palette__footer-cuenta">
            {hayResultados ? (
              <>
                {listaPlana.length} resultados
                <span className="palette__footer-desglose">
                  {grupos.map((g) => `${g.filas.length} ${g.titulo.toLowerCase()}`).join(" · ")}
                </span>
              </>
            ) : (
              t.palette.sinCoincidencias
            )}
          </span>
          <span className="palette__footer-atajos">
            <kbd className="kbd">↑</kbd>
            <kbd className="kbd">↓</kbd>
            <span>navegar</span>
            <kbd className="kbd">Enter</kbd>
            <span>abrir</span>
          </span>
        </div>
      </div>
    </div>
  );
}
