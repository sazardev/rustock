// oxlint-disable eslint/max-lines
/**
 * Páginas de la sección Ayuda de Rustock.
 *
 * Tres páginas:
 *  - AyudaIndexPage  (/ayuda): índice con todos los módulos agrupados + glosario
 *    + búsqueda en cliente.
 *  - AyudaModulePage (/ayuda/:id): guía de un módulo (qué es, para qué sirve,
 *    acciones, pasos, reglas) renderizada desde `ayuda-data.ts`.
 *  - AyudaGlosarioPage (/ayuda/glosario): definiciones de términos agrupadas
 *    por letra, con anclas para enlaces directos.
 *
 * El contenido se mantiene en `ayuda-data.ts`; aquí solo se renderiza.
 */
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  AYUDA_GRUPOS,
  GLOSARIO,
  textoModulo,
  type AyudaBloque,
  type AyudaModulo,
  type AyudaSeccion,
} from "./ayuda-data";
import { ayudaModulo, PATH } from "../../app/route-paths";
import { useLocation } from "react-router";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  Icon,
  Link,
  PageHeader,
  Search,
  Text,
  useToast,
  type IconName,
} from "../../shared/ui";

const TITULO_GLO = "Glosario de términos";

/** Enlace desde una guía de Ayuda. Si apunta fuera de /ayuda (una página real
 *  de la app), confirma el destino con un toast breve antes de navegar, para
 *  que el usuario sepa que sale de la ayuda hacia la operación (DESIGN §5.5). */
function EnlaceAyuda({ href, children }: { href: string; children: ReactNode }) {
  const { toast } = useToast();
  return (
    <Link
      href={href}
      onClick={() => {
        if (!href.startsWith("/ayuda")) {
          toast(`Abriendo: ${String(children)}`, "success");
        }
      }}
    >
      {children}
    </Link>
  );
}

/** Tabla HTML simple para los bloques de tipo "tabla" (misma clase que la UI). */
function TablaAyuda({ cabeceras, filas }: { cabeceras: string[]; filas: string[][] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {cabeceras.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i}>
              {fila.map((celda, j) => (
                <td key={j}>{celda}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TONO_NOTA_CLASS: Record<string, string> = {
  info: "ayuda-nota--info",
  warning: "ayuda-nota--warning",
  success: "ayuda-nota--success",
};

function NotaAyuda({ bloque }: { bloque: Extract<AyudaBloque, { tipo: "nota" }> }) {
  const tono = bloque.tono ?? "info";
  const icono: IconName = tono === "success" ? "aprobar" : tono === "warning" ? "alerta" : "ver";
  return (
    <div className={`ayuda-nota ${TONO_NOTA_CLASS[tono]}`} role="note">
      <Icon name={icono} size={16} className="ayuda-nota__icon" aria-hidden="true" />
      <Text as="p" size="sm" className="ayuda-nota__text">
        {bloque.texto}
      </Text>
    </div>
  );
}

function Bloque({ bloque }: { bloque: AyudaBloque }) {
  switch (bloque.tipo) {
    case "texto":
      return (
        <Text as="p" size="sm" color="muted" className="mb-3">
          {bloque.texto}
        </Text>
      );
    case "lista":
      return (
        <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
          {bloque.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "pasos":
      return (
        <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-gray-600">
          {bloque.pasos.map((paso) => (
            <li key={paso}>{paso}</li>
          ))}
        </ol>
      );
    case "tabla":
      return (
        <div className="mb-3">
          <TablaAyuda cabeceras={bloque.cabeceras} filas={bloque.filas} />
        </div>
      );
    case "enlaces":
      return (
        <ul className="mb-3 space-y-1">
          {bloque.items.map((item) => (
            <li key={`${item.etiqueta}-${item.href}`} className="text-sm">
              <EnlaceAyuda href={item.href}>{item.etiqueta}</EnlaceAyuda>
            </li>
          ))}
        </ul>
      );
    case "nota":
      return <NotaAyuda bloque={bloque} />;
    default:
      return null;
  }
}

function Seccion({ seccion }: { seccion: AyudaSeccion }) {
  return (
    <Card title={seccion.titulo} className="mt-6">
      <Card.Body>
        {seccion.bloques.map((bloque, i) => (
          <Bloque key={i} bloque={bloque} />
        ))}
      </Card.Body>
    </Card>
  );
}

function buscarModulo(id: string): { grupo: string; modulo: AyudaModulo } | null {
  for (const grupo of AYUDA_GRUPOS) {
    const modulo = grupo.modulos.find((m) => m.id === id);
    if (modulo) return { grupo: grupo.titulo, modulo };
  }
  return null;
}

function terminoGlosario(id: string): string | null {
  return GLOSARIO.find((t) => t.id === id)?.termino ?? null;
}

/** Barra de módulos del mismo grupo para navegar entre guías. */
function ModulosDelGrupo({ grupo, actualId }: { grupo: string; actualId: string }) {
  const grupoEncontrado = AYUDA_GRUPOS.find((g) => g.titulo === grupo);
  if (!grupoEncontrado) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {grupoEncontrado.modulos.map((m) => (
        <ButtonLink
          key={m.id}
          variant={m.id === actualId ? "primary" : "secondary"}
          size="sm"
          icon={m.icono}
          href={ayudaModulo(m.id)}
        >
          {m.titulo}
        </ButtonLink>
      ))}
    </div>
  );
}

/** Tarjeta destacada con el contexto de negocio de la guía (para qué sirve). */
function TarjetaContexto({ modulo }: { modulo: AyudaModulo }) {
  return (
    <Card muted className="mt-6">
      <Card.Body>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <Icon name="stock" size={18} aria-hidden="true" />
          </div>
          <div>
            <Text size="xs" color="muted" className="mb-1">
              PARA QUÉ SIRVE EN TU OPERACIÓN
            </Text>
            <Text as="p" size="sm" className="text-gray-700">
              {modulo.paraQueSirve}
            </Text>
            {modulo.cuandoUsarlo ? (
              <Text as="p" size="sm" color="muted" className="mt-2">
                <Text as="span" weight="medium" className="text-gray-700">
                  Cuándo usarlo:{" "}
                </Text>
                {modulo.cuandoUsarlo}
              </Text>
            ) : null}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

/** Sección automática de términos del glosario que la guía usa. */
function TerminosDelModulo({ modulo }: { modulo: AyudaModulo }) {
  if (!modulo.terminosClave || modulo.terminosClave.length === 0) return null;
  const terminos = modulo.terminosClave
    .map((id) => ({ id, termino: terminoGlosario(id) }))
    .filter((t) => t.termino !== null) as Array<{ id: string; termino: string }>;
  if (terminos.length === 0) return null;
  return (
    <Card title="Términos del glosario" className="mt-6">
      <Card.Body>
        <div className="flex flex-wrap gap-2">
          {terminos.map((t) => (
            <Link
              key={t.id}
              href={`${PATH.ayudaGlosario}#${t.id}`}
              ariaLabel={`Ver término ${t.termino} en el glosario`}
            >
              <Badge tone="info">{t.termino}</Badge>
            </Link>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
}

/** Sección automática de guías relacionadas (módulos y procesos). */
function RelacionadosDelModulo({ modulo }: { modulo: AyudaModulo }) {
  if (!modulo.relacionados || modulo.relacionados.length === 0) return null;
  const guias = modulo.relacionados
    .map((id) => {
      const encontrado = buscarModulo(id);
      return encontrado
        ? { id, titulo: encontrado.modulo.titulo, icono: encontrado.modulo.icono }
        : null;
    })
    .filter((g) => g !== null) as Array<{ id: string; titulo: string; icono: IconName }>;
  if (guias.length === 0) return null;
  return (
    <Card title="Guías relacionadas" className="mt-6">
      <Card.Body>
        <ul className="space-y-2">
          {guias.map((g) => (
            <li key={g.id} className="flex items-center gap-2 text-sm">
              <Icon name={g.icono} size={16} aria-hidden="true" />
              <Link href={ayudaModulo(g.id)}>{g.titulo}</Link>
            </li>
          ))}
        </ul>
      </Card.Body>
    </Card>
  );
}

/** Tarjeta de guía del índice: toda la tarjeta es un enlace (grid de documentación). */
function GuiaCard({ modulo }: { modulo: AyudaModulo }) {
  return (
    <Link href={ayudaModulo(modulo.id)} className="ayuda-grid__card">
      <span className="ayuda-grid__icon" aria-hidden="true">
        <Icon name={modulo.icono} size={18} />
      </span>
      <span className="ayuda-grid__cuerpo">
        <Text as="span" size="sm" weight="medium" className="ayuda-grid__titulo">
          {modulo.titulo}
        </Text>
        <Text as="span" size="xs" color="muted" className="ayuda-grid__resumen">
          {modulo.resumen}
        </Text>
      </span>
      <span className="ayuda-grid__cta">
        <Icon name="ver" size={14} aria-hidden="true" />
        <Text as="span" size="xs">
          Ver guía
        </Text>
      </span>
    </Link>
  );
}

export function AyudaIndexPage() {
  const [busqueda, setBusqueda] = useState("");

  const modulosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return AYUDA_GRUPOS;
    return AYUDA_GRUPOS.map((grupo) => ({
      ...grupo,
      modulos: grupo.modulos.filter(
        (m) => m.titulo.toLowerCase().includes(q) || textoModulo(m).includes(q),
      ),
    })).filter((grupo) => grupo.modulos.length > 0);
  }, [busqueda]);

  const glosarioFiltrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) {
      return GLOSARIO;
    }
    return GLOSARIO.filter(
      (t) =>
        t.termino.toLowerCase().includes(q) ||
        t.definicion.toLowerCase().includes(q) ||
        t.id.includes(q),
    );
  }, [busqueda]);

  const hayBusqueda = busqueda.trim().length > 0;
  const hayModulos = modulosFiltrados.length > 0;
  const hayGlosario = glosarioFiltrado.length > 0;

  return (
    <>
      <PageHeader
        title="Ayuda"
        description="Guía de uso de todos los módulos de Rustock: qué hace cada uno, sus acciones y sus pasos, más el glosario de términos."
      />

      <Card className="mt-6">
        <Card.Body>
          <Search
            aria-label="Buscar en la ayuda"
            placeholder="Buscar módulos, procesos y términos del glosario…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <Text as="p" size="xs" color="muted" className="mt-2">
            Escribe para filtrar las guías y el glosario al instante.
          </Text>
        </Card.Body>
      </Card>

      {hayBusqueda && !hayModulos && !hayGlosario ? (
        <Card className="mt-6">
          <Card.Body>
            <EmptyState
              icon="buscar"
              title="Sin resultados en la ayuda"
              description="No se encontró nada con esa búsqueda. Prueba con otros términos."
              action={
                <ButtonLink variant="secondary" icon="refrescar" href={PATH.ayuda}>
                  Limpiar búsqueda
                </ButtonLink>
              }
            />
          </Card.Body>
        </Card>
      ) : null}

      {modulosFiltrados.map((grupo) => (
        <section key={grupo.titulo} className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {grupo.titulo}
          </h2>
          <div className="ayuda-grid">
            {grupo.modulos.map((modulo) => (
              <GuiaCard key={modulo.id} modulo={modulo} />
            ))}
          </div>
        </section>
      ))}

      {!hayBusqueda ? (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {TITULO_GLO}
          </h2>
          <div className="ayuda-grid">
            <Link href={PATH.ayudaGlosario} className="ayuda-grid__card">
              <span className="ayuda-grid__icon" aria-hidden="true">
                <Icon name="historial" size={18} />
              </span>
              <span className="ayuda-grid__cuerpo">
                <Text as="span" size="sm" weight="medium" className="ayuda-grid__titulo">
                  Glosario de términos
                </Text>
                <Text as="span" size="xs" color="muted" className="ayuda-grid__resumen">
                  Definición de los términos usados en la aplicación: SKU, UOM, lote, saldo,
                  FEFO/FIFO, estados de movimiento y más.
                </Text>
              </span>
              <span className="ayuda-grid__cta">
                <Icon name="ver" size={14} aria-hidden="true" />
                <Text as="span" size="xs">
                  Ver glosario
                </Text>
              </span>
            </Link>
          </div>
        </section>
      ) : null}

      {hayBusqueda && hayGlosario ? (
        <div className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Términos del glosario que coinciden
          </h2>
          <Card>
            <Card.Body>
              <dl>
                {glosarioFiltrado.map((t) => (
                  <div key={t.id} id={t.id} className="border-b border-gray-100 py-2 last:border-0">
                    <dt className="font-mono text-sm font-medium text-gray-800">{t.termino}</dt>
                    <dd className="mt-1 text-sm text-gray-600">{t.definicion}</dd>
                  </div>
                ))}
              </dl>
            </Card.Body>
          </Card>
        </div>
      ) : null}
    </>
  );
}

export function AyudaModulePage({ id }: { id: string }) {
  const encontrado = buscarModulo(id);

  if (!encontrado) {
    return (
      <>
        <PageHeader title="Ayuda" description="Módulo no encontrado." />
        <Card className="mt-6">
          <Card.Body>
            <Text as="p" size="sm" color="muted">
              No existe una guía para este módulo.{" "}
              <Link href={PATH.ayuda}>Volver al índice de ayuda</Link>.
            </Text>
          </Card.Body>
        </Card>
      </>
    );
  }

  const { grupo, modulo } = encontrado;

  return (
    <>
      <PageHeader
        title={modulo.titulo}
        description={modulo.resumen}
        actions={
          <ButtonLink variant="secondary" icon="atras" href={PATH.ayuda}>
            Índice de ayuda
          </ButtonLink>
        }
      />

      <Card muted className="mt-6">
        <Card.Body>
          <div className="mb-2 flex items-center gap-2">
            <Badge tone="info" icon={modulo.icono as IconName}>
              {grupo}
            </Badge>
          </div>
          <ModulosDelGrupo grupo={grupo} actualId={modulo.id} />
        </Card.Body>
      </Card>

      {modulo.paraQueSirve ? <TarjetaContexto modulo={modulo} /> : null}

      {modulo.secciones.map((seccion) => (
        <Seccion key={seccion.titulo} seccion={seccion} />
      ))}

      <TerminosDelModulo modulo={modulo} />
      <RelacionadosDelModulo modulo={modulo} />
    </>
  );
}

export function AyudaGlosarioPage() {
  const location = useLocation();

  // Deep-link a un término (/ayuda/glosario#saldo): React Router no hace
  // scroll a anclas en navegación SPA — hay que hacerlo tras el render.
  useEffect(() => {
    if (!location.hash) return;
    const id = decodeURIComponent(location.hash.slice(1));
    const raf = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [location.hash]);

  const porLetra = useMemo(() => {
    const mapa = new Map<string, typeof GLOSARIO>();
    for (const termino of GLOSARIO) {
      const letra = termino.termino.charAt(0).toUpperCase();
      const grupo = mapa.get(letra) ?? [];
      grupo.push(termino);
      mapa.set(letra, grupo);
    }
    return [...mapa.entries()].toSorted((a, b) => a[0].localeCompare(b[0]));
  }, []);

  return (
    <>
      <PageHeader
        title={TITULO_GLO}
        description="Definiciones de los términos de Rustock: entidades, estados, políticas y conceptos."
        actions={
          <ButtonLink variant="secondary" icon="atras" href={PATH.ayuda}>
            Índice de ayuda
          </ButtonLink>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {porLetra.map(([letra, terminos]) => (
          <Card key={letra} title={letra}>
            <Card.Body>
              <dl>
                {terminos.map((t) => (
                  <div key={t.id} id={t.id} className="border-b border-gray-100 py-2 last:border-0">
                    <dt className="font-mono text-sm font-medium text-gray-800">{t.termino}</dt>
                    <dd className="mt-1 text-sm text-gray-600">{t.definicion}</dd>
                  </div>
                ))}
              </dl>
            </Card.Body>
          </Card>
        ))}
      </div>
    </>
  );
}
