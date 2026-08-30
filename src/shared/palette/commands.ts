/**
 * Registro de comandos estáticos del command palette (DESIGN §5, §6.10).
 *
 * Tres fuentes:
 *  - Páginas: la navegación real (`nav.ts`) + destinos que no están en el
 *    sidebar (reportes individuales, perfil, glosario).
 *  - Acciones: crear entidades, gatadas por el rol del usuario según la
 *    matriz de permisos (SPEC §4.4).
 *  - Ayuda ("palabras"): los módulos de la guía y los términos del glosario.
 *
 * Los datos de negocio (productos, ubicaciones, movimientos…) no viven aquí:
 * los resuelve el backend vía `buscar` (SPEC §15.4) y se mezclan en
 * `CommandPalette`.
 */
import type { IconName } from "../ui";
import type { Diccionario } from "../i18n";
import { itemsDeNav } from "../../app/nav";
import { PATH, ayudaModulo, catalogoNuevo } from "../../app/route-paths";
import { AYUDA_GRUPOS, GLOSARIO, textoModulo } from "../../pages/ayuda/ayuda-data";
import { MANUAL_GLOSARIO, MANUAL_PARTES, textoManual } from "../../pages/manual/manual-data";

/**
 * Clave estable del grupo. No es lo que se muestra: la etiqueta visible sale
 * del diccionario al pintar, para que el agrupado y la heurística de intención
 * no dependan del idioma activo.
 */
export type GrupoComando = "paginas" | "acciones" | "ayuda" | "manual";

export interface ComandoPalette {
  id: string;
  titulo: string;
  subtitulo?: string;
  icono: IconName;
  grupo: GrupoComando;
  href: string;
  /** Términos extra para la búsqueda (descripción, definición…). */
  keywords?: string;
}

/** Conjuntos de roles por nivel de acceso (SPEC §4.4, simplificado). */
const ROL_OPERACION = new Set(["ADMIN", "GERENTE", "ENCARGADO_ALMACEN", "OPERADOR"]);
const ROL_CATALOGO = new Set(["ADMIN", "GERENTE", "ENCARGADO_ALMACEN"]);
const ROL_ADMIN = new Set(["ADMIN"]);

/** Los diez reportes, en el idioma activo. */
function reportes(t: Diccionario): ComandoPalette[] {
  const r = t.palette.reportes;
  return [
    {
      id: "pagina:reporte-stock",
      titulo: r.stock,
      subtitulo: r.stockDesc,
      icono: "reportes",
      grupo: "paginas",
      href: PATH.reporteStock,
    },
    {
      id: "pagina:reporte-movimientos",
      titulo: r.movimientos,
      subtitulo: r.movimientosDesc,
      icono: "reportes",
      grupo: "paginas",
      href: PATH.reporteMovimientos,
    },
    {
      id: "pagina:reporte-entradas",
      titulo: r.entradas,
      subtitulo: r.entradasDesc,
      icono: "entrada",
      grupo: "paginas",
      href: PATH.reporteEntradas,
    },
    {
      id: "pagina:reporte-salidas",
      titulo: r.salidas,
      subtitulo: r.salidasDesc,
      icono: "salida",
      grupo: "paginas",
      href: PATH.reporteSalidas,
    },
    {
      id: "pagina:reporte-mermas",
      titulo: r.mermas,
      subtitulo: r.mermasDesc,
      icono: "ajuste",
      grupo: "paginas",
      href: PATH.reporteMermasAjustes,
    },
    {
      id: "pagina:reporte-vencimientos",
      titulo: r.vencimientos,
      subtitulo: r.vencimientosDesc,
      icono: "calendario",
      grupo: "paginas",
      href: PATH.reporteVencimientos,
    },
    {
      id: "pagina:reporte-kardex",
      titulo: r.kardex,
      subtitulo: r.kardexDesc,
      icono: "historial",
      grupo: "paginas",
      href: PATH.reporteKardex,
    },
    {
      id: "pagina:reporte-precision",
      titulo: r.precision,
      subtitulo: r.precisionDesc,
      icono: "inventario",
      grupo: "paginas",
      href: PATH.reportePrecision,
    },
    {
      id: "pagina:reporte-auditoria",
      titulo: r.auditoria,
      subtitulo: r.auditoriaDesc,
      icono: "historial",
      grupo: "paginas",
      href: PATH.reporteAuditoria,
    },
    {
      id: "pagina:reporte-usuarios",
      titulo: r.usuarios,
      subtitulo: r.usuariosDesc,
      icono: "usuario",
      grupo: "paginas",
      href: PATH.reporteUsuarios,
    },
  ];
}

/** Páginas: navegación real del sidebar + destinos fuera de él. */
function paginas(t: Diccionario): ComandoPalette[] {
  const delNav = itemsDeNav(t).map(({ item }) => ({
    id: `pagina:${item.href}`,
    titulo: item.label,
    subtitulo: item.descripcion,
    icono: item.icon,
    grupo: "paginas" as const,
    href: item.href,
  }));
  const extras: ComandoPalette[] = [
    {
      id: "pagina:perfil",
      titulo: t.palette.perfil,
      subtitulo: t.palette.perfilDesc,
      icono: "usuario",
      grupo: "paginas",
      href: PATH.perfil,
    },
    {
      id: "pagina:glosario",
      titulo: t.palette.glosario,
      subtitulo: t.palette.glosarioDesc,
      icono: "ayuda",
      grupo: "paginas",
      href: PATH.ayudaGlosario,
    },
    ...reportes(t),
  ];
  return [...delNav, ...extras];
}

/** Acciones de creación, gatadas por rol. */
function acciones(rolCodigo: string | undefined, t: Diccionario): ComandoPalette[] {
  const a = t.palette.acciones2;
  const permite = (roles: Set<string>) => (rolCodigo ? roles.has(rolCodigo) : false);
  const todas: Array<{ comando: ComandoPalette; roles: Set<string> }> = [
    {
      comando: {
        id: "accion:movimiento",
        titulo: a.movimiento,
        subtitulo: a.movimientoDesc,
        icono: "movements",
        grupo: "acciones",
        href: PATH.movimientosNuevo,
      },
      roles: ROL_OPERACION,
    },
    {
      comando: {
        id: "accion:inventario",
        titulo: a.inventario,
        subtitulo: a.inventarioDesc,
        icono: "inventario",
        grupo: "acciones",
        href: PATH.inventarioNuevo,
      },
      roles: ROL_OPERACION,
    },
    {
      comando: {
        id: "accion:almacen",
        titulo: a.almacen,
        icono: "almacen",
        grupo: "acciones",
        href: catalogoNuevo("almacenes"),
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:zona",
        titulo: a.zona,
        subtitulo: a.zonaDesc,
        icono: "zona",
        grupo: "acciones",
        href: "/zonas/nuevo",
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:rack",
        titulo: a.rack,
        subtitulo: a.rackDesc,
        icono: "zona",
        grupo: "acciones",
        href: "/racks/nuevo",
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:seccion",
        titulo: a.seccion,
        subtitulo: a.seccionDesc,
        icono: "zona",
        grupo: "acciones",
        href: "/secciones/nuevo",
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:ubicacion",
        titulo: a.ubicacion,
        subtitulo: a.ubicacionDesc,
        icono: "ubicacion",
        grupo: "acciones",
        href: catalogoNuevo("ubicaciones"),
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:producto",
        titulo: a.producto,
        subtitulo: a.productoDesc,
        icono: "producto",
        grupo: "acciones",
        href: catalogoNuevo("productos"),
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:lote",
        titulo: a.lote,
        subtitulo: a.loteDesc,
        icono: "lote",
        grupo: "acciones",
        href: catalogoNuevo("lotes"),
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:categoria",
        titulo: a.categoria,
        subtitulo: a.categoriaDesc,
        icono: "categoria",
        grupo: "acciones",
        href: catalogoNuevo("categorias"),
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:uom",
        titulo: a.uom,
        subtitulo: a.uomDesc,
        icono: "uom",
        grupo: "acciones",
        href: catalogoNuevo("uoms"),
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:proveedor",
        titulo: a.proveedor,
        subtitulo: a.proveedorDesc,
        icono: "proveedor",
        grupo: "acciones",
        href: catalogoNuevo("proveedores"),
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:cliente",
        titulo: a.cliente,
        subtitulo: a.clienteDesc,
        icono: "cliente",
        grupo: "acciones",
        href: catalogoNuevo("clientes"),
      },
      roles: ROL_CATALOGO,
    },
    {
      comando: {
        id: "accion:usuario",
        titulo: a.usuario,
        subtitulo: a.usuarioDesc,
        icono: "usuario",
        grupo: "acciones",
        href: "/usuarios/nuevo",
      },
      roles: ROL_ADMIN,
    },
    {
      comando: {
        id: "accion:sucursal",
        titulo: a.sucursal,
        subtitulo: a.sucursalDesc,
        icono: "ubicacion",
        grupo: "acciones",
        href: "/sucursales/nuevo",
      },
      roles: ROL_ADMIN,
    },
  ];
  return todas.filter(({ roles }) => permite(roles)).map(({ comando }) => comando);
}

/** Ayuda: guías de módulo + procesos del negocio + términos del glosario. */
function palabrasAyuda(t: Diccionario): ComandoPalette[] {
  const modulos: ComandoPalette[] = AYUDA_GRUPOS.flatMap((g) => g.modulos).map((m) => ({
    id: `ayuda:${m.id}`,
    titulo: m.titulo,
    subtitulo: t.palette.guiaDeUso({ resumen: m.resumen }),
    icono: m.icono,
    grupo: "ayuda",
    href: ayudaModulo(m.id),
    keywords: [
      m.resumen,
      m.paraQueSirve ?? "",
      m.cuandoUsarlo ?? "",
      textoModulo(m),
      (m.terminosClave ?? []).join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  }));
  const glosario: ComandoPalette[] = GLOSARIO.map((termino) => ({
    id: `glosario:${termino.id}`,
    titulo: termino.termino,
    subtitulo: termino.definicion,
    icono: "historial",
    grupo: "ayuda",
    href: `${PATH.ayudaGlosario}#${termino.id}`,
    keywords: termino.definicion,
  }));
  return [...modulos, ...glosario];
}

/** Manual: capítulos + glosario (indexado igual que Ayuda, pero grupo Manual). */
function palabrasManual(t: Diccionario): ComandoPalette[] {
  const capitulos: ComandoPalette[] = MANUAL_PARTES.flatMap((parte) => parte.capitulos).map(
    (c) => ({
      id: `manual:${c.id}`,
      titulo: c.titulo,
      subtitulo: t.palette.delManual({ resumen: c.resumen }),
      icono: c.icono,
      grupo: "manual",
      href: `/manual/${c.id}`,
      keywords: [
        c.resumen,
        c.paraQueSirve ?? "",
        c.cuandoUsarlo ?? "",
        textoManual(c),
        (c.terminosClave ?? []).join(" "),
      ]
        .filter(Boolean)
        .join(" "),
    }),
  );
  const glosario: ComandoPalette[] = MANUAL_GLOSARIO.map((termino) => ({
    id: `manual-glosario:${termino.id}`,
    titulo: termino.termino,
    subtitulo: termino.definicion,
    icono: "historial",
    grupo: "manual",
    href: `/manual/m08-glosario#${termino.id}`,
    keywords: termino.definicion,
  }));
  const imprimir: ComandoPalette = {
    id: "manual:imprimir",
    titulo: t.palette.imprimirManual,
    subtitulo: t.palette.imprimirManualDesc,
    icono: "ayuda",
    grupo: "manual",
    href: "/manual/imprimir",
    keywords: t.palette.imprimirManualKeywords,
  };
  return [...capitulos, ...glosario, imprimir];
}

/** Comandos estáticos completos, filtrados por el rol de la sesión. */
export function comandosPalette(
  rolCodigo: string | undefined,
  t: Diccionario,
  mostrarAyuda = true,
): ComandoPalette[] {
  return [
    ...paginas(t),
    ...acciones(rolCodigo, t),
    ...(mostrarAyuda ? palabrasAyuda(t) : []),
    ...palabrasManual(t),
  ];
}

// ============ Recientes (localStorage, solo del cliente) ============

const RECIENTES_KEY = "rustock.palette.recientes";
const RECIENTES_MAX = 8;

export interface RecientePalette {
  id: string;
  titulo: string;
  subtitulo?: string;
  icono: IconName;
  grupo: string;
  href: string;
}

export function leerRecientes(): RecientePalette[] {
  try {
    const raw = window.localStorage.getItem(RECIENTES_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecientePalette[]).slice(0, RECIENTES_MAX) : [];
  } catch {
    return [];
  }
}

export function registrarReciente(entrada: RecientePalette): void {
  try {
    const actual = leerRecientes().filter((r) => r.id !== entrada.id);
    const siguientes = [entrada, ...actual].slice(0, RECIENTES_MAX);
    window.localStorage.setItem(RECIENTES_KEY, JSON.stringify(siguientes));
  } catch {
    // Almacenamiento no disponible: los recientes viven solo en memoria.
  }
}
