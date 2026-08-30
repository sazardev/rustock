// oxlint-disable eslint/max-lines
/**
 * Páginas del Manual del Cliente — Rustock
 *
 * Tres páginas:
 *  - ManualIndexPage      (/manual): índice por Partes + buscador + glosario destacado
 *  - ManualCapituloPage   (/manual/:id): capítulo completo con contexto, secciones, términos y relacionados
 *  - ManualGlosarioPage   (/manual/glosario): 50 términos agrupados con anclas
 *
 * Reutiliza los patrones visuales de AyudaPages.tsx (Card, PageHeader, Badge, Icon, etc.)
 * para coherencia total con DESIGN.md (tokens, radius, shadow).
 */
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import {
  manualGlosario,
  manualPartes,
  type TerminoManual,
  textoManual,
  type ManualBloque,
  type ManualCapitulo,
  type ManualSeccion,
} from "./manual-data";
import { Link } from "../../shared/ui/Link";
import { PATH } from "../../app/route-paths";
import { useIdioma, type Idioma } from "../../shared/i18n";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Icon,
  PageHeader,
  Search,
  Text,
  useToast,
  type IconName,
} from "../../shared/ui";

function manualHref(id: string): string {
  return `/manual/${id}`;
}

function buscarCapitulo(
  id: string,
  idioma: Idioma,
): { parte: string; capitulo: ManualCapitulo } | null {
  for (const parte of manualPartes(idioma)) {
    const cap = parte.capitulos.find((c) => c.id === id);
    if (cap) return { parte: parte.titulo, capitulo: cap };
  }
  return null;
}

function terminoDeGlosario(id: string, idioma: Idioma): string | null {
  return manualGlosario(idioma).find((t) => t.id === id)?.termino ?? null;
}

function EnlaceManual({ href, children }: { href: string; children: ReactNode }) {
  const { toast } = useToast();
  return (
    <Link
      href={href}
      onClick={() => {
        if (href.startsWith("/manual")) return;
        toast(`Abriendo: ${String(children)}`, "success");
      }}
    >
      {children}
    </Link>
  );
}

function Tabla({ cabeceras, filas }: { cabeceras: string[]; filas: string[][] }) {
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

const TONO_CLASS: Record<string, string> = {
  info: "ayuda-nota--info",
  warning: "ayuda-nota--warning",
  success: "ayuda-nota--success",
};

function Nota({ bloque }: { bloque: Extract<ManualBloque, { tipo: "nota" }> }) {
  const tono = bloque.tono ?? "info";
  const icono: IconName = tono === "success" ? "aprobar" : tono === "warning" ? "alerta" : "ver";
  return (
    <div className={`ayuda-nota ${TONO_CLASS[tono]}`} role="note">
      <Icon name={icono} size={16} className="ayuda-nota__icon" aria-hidden="true" />
      <Text as="p" size="sm" className="ayuda-nota__text">
        {bloque.texto}
      </Text>
    </div>
  );
}

function Bloque({ bloque }: { bloque: ManualBloque }) {
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
          {bloque.items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
      );
    case "pasos":
      return (
        <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-gray-600">
          {bloque.pasos.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
      );
    case "tabla":
      return (
        <div className="mb-3">
          <Tabla cabeceras={bloque.cabeceras} filas={bloque.filas} />
        </div>
      );
    case "enlaces":
      return (
        <ul className="mb-3 space-y-1">
          {bloque.items.map((it) => (
            <li key={`${it.etiqueta}-${it.href}`} className="text-sm">
              <EnlaceManual href={it.href}>{it.etiqueta}</EnlaceManual>
            </li>
          ))}
        </ul>
      );
    case "nota":
      return <Nota bloque={bloque} />;
    default:
      return null;
  }
}

function Seccion({ seccion }: { seccion: ManualSeccion }) {
  const anchor = seccion.titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <Card title={seccion.titulo} className="mt-6" id={anchor}>
      <Card.Body>
        {seccion.bloques.map((b, i) => (
          <Bloque key={i} bloque={b} />
        ))}
      </Card.Body>
    </Card>
  );
}

function TarjetaContexto({ cap }: { cap: ManualCapitulo }) {
  if (!cap.paraQueSirve && !cap.cuandoUsarlo) return null;
  return (
    <Card muted className="mt-6">
      <Card.Body>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <Icon name={cap.icono} size={18} aria-hidden="true" />
          </div>
          <div>
            {cap.paraQueSirve ? (
              <>
                <Text size="xs" color="muted" className="mb-1">
                  PARA QUÉ SIRVE EN TU OPERACIÓN
                </Text>
                <Text as="p" size="sm" className="text-gray-700">
                  {cap.paraQueSirve}
                </Text>
              </>
            ) : null}
            {cap.cuandoUsarlo ? (
              <Text as="p" size="sm" color="muted" className="mt-2">
                <Text as="span" weight="medium" className="text-gray-700">
                  Cuándo usarlo:{" "}
                </Text>
                {cap.cuandoUsarlo}
              </Text>
            ) : null}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

function Terminos({ cap }: { cap: ManualCapitulo }) {
  const idioma = useIdioma((estado) => estado.idioma);
  if (!cap.terminosClave || cap.terminosClave.length === 0) return null;
  const terminos = cap.terminosClave
    .map((id) => ({ id, termino: terminoDeGlosario(id, idioma) }))
    .filter((t) => t.termino !== null) as Array<{ id: string; termino: string }>;
  if (terminos.length === 0) return null;
  return (
    <Card title="Términos del glosario" className="mt-6">
      <Card.Body>
        <div className="flex flex-wrap gap-2">
          {terminos.map((t) => (
            <Link
              key={t.id}
              href={`/manual/m08-glosario#${t.id}`}
              ariaLabel={`Ver término ${t.termino} en el glosario del manual`}
            >
              <Badge tone="info">{t.termino}</Badge>
            </Link>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
}

function Relacionados({ cap }: { cap: ManualCapitulo }) {
  const idioma = useIdioma((estado) => estado.idioma);
  if (!cap.relacionados || cap.relacionados.length === 0) return null;
  const guias = cap.relacionados
    .map((id) => {
      const enc = buscarCapitulo(id, idioma);
      return enc ? { id, titulo: enc.capitulo.titulo, icono: enc.capitulo.icono } : null;
    })
    .filter((g) => g !== null) as Array<{ id: string; titulo: string; icono: IconName }>;
  if (guias.length === 0) return null;
  return (
    <Card title="Capítulos relacionados" className="mt-6">
      <Card.Body>
        <ul className="space-y-2">
          {guias.map((g) => (
            <li key={g.id} className="flex items-center gap-2 text-sm">
              <Icon name={g.icono} size={16} aria-hidden="true" />
              <Link href={manualHref(g.id)}>{g.titulo}</Link>
            </li>
          ))}
        </ul>
      </Card.Body>
    </Card>
  );
}

function CapitulosDeParte({ parteTitulo, actualId }: { parteTitulo: string; actualId: string }) {
  const idioma = useIdioma((estado) => estado.idioma);
  const parte = manualPartes(idioma).find((p) => p.titulo === parteTitulo);
  if (!parte) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {parte.capitulos.map((c) => (
        <ButtonLink
          key={c.id}
          variant={c.id === actualId ? "primary" : "secondary"}
          size="sm"
          icon={c.icono}
          href={manualHref(c.id)}
        >
          {c.titulo}
        </ButtonLink>
      ))}
    </div>
  );
}

function GuiaCardManual({ cap }: { cap: ManualCapitulo }) {
  return (
    <Link href={manualHref(cap.id)} className="ayuda-grid__card">
      <span className="ayuda-grid__icon" aria-hidden="true">
        <Icon name={cap.icono} size={18} />
      </span>
      <span className="ayuda-grid__cuerpo">
        <Text as="span" size="sm" weight="medium" className="ayuda-grid__titulo">
          {cap.titulo}
        </Text>
        <Text as="span" size="xs" color="muted" className="ayuda-grid__resumen">
          {cap.resumen}
        </Text>
      </span>
      <span className="ayuda-grid__cta">
        <Icon name="ver" size={14} aria-hidden="true" />
        <Text as="span" size="xs">
          Ver capítulo
        </Text>
      </span>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ÍNDICE
// ─────────────────────────────────────────────────────────────────────────────
export function ManualIndexPage() {
  const idioma = useIdioma((estado) => estado.idioma);
  const [q, setQ] = useState("");

  const partesFiltradas = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return manualPartes(idioma);
    return manualPartes(idioma)
      .map((parte) => ({
        ...parte,
        capitulos: parte.capitulos.filter(
          (c) => c.titulo.toLowerCase().includes(s) || textoManual(c).includes(s),
        ),
      }))
      .filter((p) => p.capitulos.length > 0);
  }, [q, idioma]);

  const glosarioFiltrado = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return manualGlosario(idioma);
    return manualGlosario(idioma).filter(
      (t) =>
        t.termino.toLowerCase().includes(s) ||
        t.definicion.toLowerCase().includes(s) ||
        t.id.includes(s),
    );
  }, [q, idioma]);

  const hayBusqueda = q.trim().length > 0;
  const hayCapitulos = partesFiltradas.length > 0;
  const hayGlosario = glosarioFiltrado.length > 0;
  const totalCapitulos = manualPartes(idioma).reduce((acc, p) => acc + p.capitulos.length, 0);

  return (
    <>
      <PageHeader
        title="Manual del Cliente — Rustock"
        description={`Guía completa de la lógica de negocio: ${manualPartes(idioma).length} partes, ${totalCapitulos} capítulos y ${manualGlosario(idioma).length} términos. Todo lo que tu operación puede hacer, especificado y verificable.`}
        actions={
          <div className="flex gap-2">
            <ButtonLink variant="primary" icon="ayuda" href="/manual/imprimir">
              Imprimir manual completo (PDF)
            </ButtonLink>
            <ButtonLink variant="secondary" icon="ver" href="/manual/m08-glosario">
              Glosario
            </ButtonLink>
          </div>
        }
      />

      <Card className="mt-6">
        <Card.Body>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <Icon name="ayuda" size={18} aria-hidden="true" />
            </div>
            <div className="flex-1">
              <Text as="p" size="sm" color="muted" className="mb-1">
                CÓMO USAR ESTE MANUAL
              </Text>
              <Text as="p" size="sm" className="text-gray-700">
                Lee en orden (Parte 0→8) la primera vez. Luego usa el buscador, el índice por Partes
                o Ctrl+K para saltar a cualquier capítulo. Cada capítulo enlaza a su glosario y a
                capítulos relacionados. Todos los enlaces a la app son deep-links reales.
              </Text>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card className="mt-6" title="Versión imprimible — PDF completo">
        <Card.Body>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Text size="sm" color="muted" className="flex-1">
              Todo el manual en un solo documento A4, con portada, índice, {totalCapitulos}{" "}
              capítulos y glosario. Optimizado para <strong>Guardar como PDF</strong> (Ctrl+P) con
              gráficos y tablas.
            </Text>
            <div className="flex gap-2">
              <ButtonLink variant="primary" icon="ayuda" href="/manual/imprimir">
                Abrir versión imprimible
              </ButtonLink>
              <ButtonLink variant="secondary" icon="exportar" href="/rustock-manual.pdf">
                Descargar PDF
              </ButtonLink>
            </div>
          </div>
          <Text size="xs" color="muted" className="mt-2 block">
            En la página imprimible, pulsa <strong>Guardar como PDF</strong>. Activa “Gráficos de
            fondo” y elige “Márgenes: mínimos” para un PDF idéntico al manual digital. O descarga el{" "}
            <Link href="/rustock-manual.pdf">PDF pre-generado (v0.3.0, 59 páginas, 2.5 MB)</Link>.
          </Text>
        </Card.Body>
      </Card>

      <Card className="mt-6">
        <Card.Body>
          <Search
            aria-label="Buscar en el manual"
            placeholder="Buscar capítulos, tablas y términos del glosario…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Text as="p" size="xs" color="muted" className="mt-2">
            Filtra al instante por título, resumen, tablas, pasos y definiciones.
          </Text>
        </Card.Body>
      </Card>

      {hayBusqueda && !hayCapitulos && !hayGlosario ? (
        <Card className="mt-6">
          <Card.Body>
            <EmptyState
              icon="buscar"
              title="Sin resultados en el manual"
              description="Prueba con otros términos o limpia la búsqueda."
              action={
                <Button variant="secondary" icon="refrescar" onClick={() => setQ("")}>
                  Limpiar búsqueda
                </Button>
              }
            />
          </Card.Body>
        </Card>
      ) : null}

      {partesFiltradas.map((parte) => (
        <section key={parte.titulo} className="mt-8">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {parte.titulo}
          </h2>
          <Text as="p" size="xs" color="muted" className="mb-3">
            {parte.descripcion}
          </Text>
          <div className="ayuda-grid">
            {parte.capitulos.map((cap) => (
              <GuiaCardManual key={cap.id} cap={cap} />
            ))}
          </div>
        </section>
      ))}

      {!hayBusqueda ? (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Glosario del manual
          </h2>
          <div className="ayuda-grid">
            <Link href="/manual/m08-glosario" className="ayuda-grid__card">
              <span className="ayuda-grid__icon" aria-hidden="true">
                <Icon name="historial" size={18} />
              </span>
              <span className="ayuda-grid__cuerpo">
                <Text as="span" size="sm" weight="medium" className="ayuda-grid__titulo">
                  Glosario completo — 50 términos
                </Text>
                <Text as="span" size="xs" color="muted" className="ayuda-grid__resumen">
                  Definición operativa de cada término con ancla directa para enlaces desde
                  cualquier capítulo.
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

      <Card muted className="mt-8">
        <Card.Body>
          <Text size="xs" color="muted">
            Versión del manual: v0.3.0 · Alineado a SPEC.md (19 reglas no negociables), DESIGN.md
            (Rust & Iron) y código ejecutable. Última verificación: Chrome MCP contra app viva. Para
            el PDF completo, abre <Link href="/manual/imprimir">la versión imprimible</Link> y pulsa{" "}
            <strong>Guardar como PDF</strong> (Ctrl+P).
          </Text>
        </Card.Body>
      </Card>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPÍTULO
// ─────────────────────────────────────────────────────────────────────────────
export function ManualCapituloPage({ id }: { id: string }) {
  const idioma = useIdioma((estado) => estado.idioma);
  const enc = buscarCapitulo(id, idioma);

  if (!enc) {
    return (
      <>
        <PageHeader title="Manual" description="Capítulo no encontrado." />
        <Card className="mt-6">
          <Card.Body>
            <Text as="p" size="sm" color="muted">
              No existe un capítulo con ese identificador.{" "}
              <Link href="/manual">Volver al índice del manual</Link>.
            </Text>
          </Card.Body>
        </Card>
      </>
    );
  }

  const { parte, capitulo } = enc;

  return (
    <>
      <PageHeader
        title={capitulo.titulo}
        description={capitulo.resumen}
        actions={
          <div className="flex gap-2">
            <ButtonLink variant="secondary" icon="atras" href="/manual">
              Índice
            </ButtonLink>
            <ButtonLink variant="secondary" icon="ayuda" href="/manual/imprimir">
              PDF completo
            </ButtonLink>
            <Button variant="secondary" icon="ayuda" onClick={() => window.print()}>
              Imprimir
            </Button>
          </div>
        }
      />

      <Card muted className="mt-6">
        <Card.Body>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="info" icon={capitulo.icono as IconName}>
              {parte}
            </Badge>
            <Badge tone="neutral">{capitulo.id}</Badge>
          </div>
          <CapitulosDeParte parteTitulo={parte} actualId={capitulo.id} />
        </Card.Body>
      </Card>

      <TarjetaContexto cap={capitulo} />

      {capitulo.secciones.map((sec) => (
        <Seccion key={sec.titulo} seccion={sec} />
      ))}

      <Terminos cap={capitulo} />
      <Relacionados cap={capitulo} />

      <Card className="mt-6">
        <Card.Body>
          <div className="flex flex-wrap gap-2">
            <ButtonLink variant="secondary" icon="atras" href="/manual">
              Volver al índice
            </ButtonLink>
            <ButtonLink variant="secondary" icon="ayuda" href="/manual/m08-glosario">
              Glosario
            </ButtonLink>
            <ButtonLink variant="secondary" icon="buscar" href={PATH.ayuda}>
              Ayuda por módulos (26 guías)
            </ButtonLink>
          </div>
        </Card.Body>
      </Card>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GLOSARIO
// ─────────────────────────────────────────────────────────────────────────────
export function ManualGlosarioPage() {
  const idioma = useIdioma((estado) => estado.idioma);
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const slug = decodeURIComponent(location.hash.slice(1));
    const raf = requestAnimationFrame(() => {
      document.getElementById(slug)?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [location.hash]);

  const porLetra = useMemo(() => {
    const mapa = new Map<string, TerminoManual[]>();
    for (const t of manualGlosario(idioma)) {
      const letra = t.termino.charAt(0).toUpperCase();
      const g = mapa.get(letra) ?? [];
      g.push(t);
      mapa.set(letra, g);
    }
    return [...mapa.entries()].toSorted((a, b) => a[0].localeCompare(b[0]));
  }, [idioma]);

  return (
    <>
      <PageHeader
        title="Glosario del Manual — 50 términos"
        description="Definiciones operativas de Rustock con ancla directa. Cada término es enlazable como /manual/m08-glosario#saldo."
        actions={
          <div className="flex gap-2">
            <ButtonLink variant="secondary" icon="atras" href="/manual">
              Índice
            </ButtonLink>
            <ButtonLink variant="secondary" icon="ayuda" href="/manual/imprimir">
              PDF completo
            </ButtonLink>
            <Button variant="secondary" icon="ayuda" onClick={() => window.print()}>
              Imprimir
            </Button>
          </div>
        }
      />

      <Card className="mt-6">
        <Card.Body>
          <div className="flex flex-wrap gap-2">
            {porLetra.map(([letra]) => (
              <a
                key={letra}
                href={`#letra-${letra}`}
                className="badge badge--neutral"
                style={{ textDecoration: "none" }}
              >
                {letra}
              </a>
            ))}
          </div>
        </Card.Body>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {porLetra.map(([letra, terminos]) => (
          <Card key={letra} title={letra} id={`letra-${letra}`}>
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

// ─────────────────────────────────────────────────────────────────────────────
// VERSIÓN IMPRIMIBLE COMPLETA — /manual/imprimir
// Un solo documento con todo el manual, optimizado para PDF vía Ctrl+P.
// ─────────────────────────────────────────────────────────────────────────────
export function ManualPrintPage() {
  const idioma = useIdioma((estado) => estado.idioma);
  const totalCapitulos = manualPartes(idioma).reduce((acc, p) => acc + p.capitulos.length, 0);
  const fecha = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="manual-print">
      {/* Acciones solo en pantalla, ocultas en impresión */}
      <div className="no-print mb-6 flex flex-wrap gap-2">
        <Button icon="atras" variant="secondary" onClick={() => window.history.back()}>
          Volver
        </Button>
        <ButtonLink icon="ver" variant="secondary" href="/manual">
          Índice interactivo
        </ButtonLink>
        <ButtonLink icon="exportar" variant="secondary" href="/rustock-manual.pdf">
          Descargar PDF (2.5 MB)
        </ButtonLink>
        <Button icon="ayuda" variant="primary" onClick={() => window.print()}>
          Guardar como PDF
        </Button>
      </div>

      {/* Portada */}
      <div className="manual-print__portada">
        <div className="manual-print__logo">
          <Icon name="almacen" size={48} aria-hidden="true" />
        </div>
        <Text as="p" size="xs" color="muted" className="manual-print__eyebrow">
          RUSTOCK — WMS SELF-HOSTED
        </Text>
        <h1 className="manual-print__titulo">Manual del Cliente</h1>
        <Text as="p" size="lg" color="muted" className="manual-print__subtitulo">
          Guía completa de la lógica de negocio — todo lo que tu operación puede hacer, especificado
          y verificable.
        </Text>
        <div className="manual-print__meta">
          <Text size="sm" color="muted">
            Versión <strong>v0.3.0</strong> · Alineado a SPEC.md (19 reglas no negociables),
            DESIGN.md (Rust &amp; Iron) y código ejecutable · {manualPartes(idioma).length} partes ·{" "}
            {totalCapitulos} capítulos · {manualGlosario(idioma).length} términos
          </Text>
          <Text size="xs" color="muted">
            Generado el {fecha} · Imprime con Ctrl+P → “Guardar como PDF” · Papel A4, márgenes
            mínimos
          </Text>
        </div>
        <div className="manual-print__badges">
          <Badge tone="info">100% trazable</Badge>
          <Badge tone="success">Saldo nunca negativo</Badge>
          <Badge tone="info">Sin nube</Badge>
          <Badge tone="neutral">Self-hosted</Badge>
        </div>
      </div>

      {/* Índice */}
      <div className="manual-print__indice">
        <h2 className="manual-print__h2">Índice</h2>
        <ol className="manual-print__toc">
          {manualPartes(idioma).map((parte, idx) => (
            <li key={parte.titulo} className="manual-print__toc-parte">
              <span className="manual-print__toc-parte-titulo">
                {idx} · {parte.titulo}
              </span>
              <span className="manual-print__toc-parte-desc">{parte.descripcion}</span>
              <ol className="manual-print__toc-capitulos">
                {parte.capitulos.map((cap) => (
                  <li key={cap.id}>
                    <a href={`#print-${cap.id}`} className="manual-print__toc-link">
                      {cap.titulo}
                    </a>
                    <span className="manual-print__toc-resumen"> — {cap.resumen}</span>
                  </li>
                ))}
              </ol>
            </li>
          ))}
          <li className="manual-print__toc-parte">
            <span className="manual-print__toc-parte-titulo">Glosario</span>
            <ol className="manual-print__toc-capitulos">
              <li>
                <a href="#print-glosario" className="manual-print__toc-link">
                  Glosario completo — {manualGlosario(idioma).length} términos
                </a>
              </li>
            </ol>
          </li>
        </ol>
        <Text size="xs" color="muted" className="mt-4 block">
          Sugerencia: en el diálogo de impresión, activa “Gráficos de fondo” para conservar los
          colores de tablas y badges, y elige “Márgenes: mínimos”.
        </Text>
      </div>

      {/* Contenido completo */}
      {manualPartes(idioma).map((parte) => (
        <section key={parte.titulo} className="manual-print__parte">
          <div className="manual-print__parte-header">
            <Text size="xs" color="muted" className="manual-print__parte-kicker">
              {parte.titulo.toUpperCase()}
            </Text>
            <h2 className="manual-print__h2">{parte.titulo}</h2>
            <Text size="sm" color="muted">
              {parte.descripcion}
            </Text>
          </div>
          {parte.capitulos.map((cap) => (
            <article key={cap.id} id={`print-${cap.id}`} className="manual-print__capitulo">
              <div className="manual-print__capitulo-header">
                <Badge tone="info" icon={cap.icono as IconName}>
                  {cap.id}
                </Badge>
                <h3 className="manual-print__h3">{cap.titulo}</h3>
                <Text size="sm" color="muted">
                  {cap.resumen}
                </Text>
              </div>
              {cap.paraQueSirve || cap.cuandoUsarlo ? (
                <div className="manual-print__contexto">
                  {cap.paraQueSirve ? (
                    <Text size="sm" className="manual-print__contexto-bloque">
                      <strong>Para qué sirve:</strong> {cap.paraQueSirve}
                    </Text>
                  ) : null}
                  {cap.cuandoUsarlo ? (
                    <Text size="sm" color="muted" className="manual-print__contexto-bloque">
                      <strong>Cuándo usarlo:</strong> {cap.cuandoUsarlo}
                    </Text>
                  ) : null}
                </div>
              ) : null}
              {cap.secciones.map((sec) => (
                <div key={sec.titulo} className="manual-print__seccion">
                  <h4 className="manual-print__h4">{sec.titulo}</h4>
                  {sec.bloques.map((b, i) => (
                    <Bloque key={i} bloque={b} />
                  ))}
                </div>
              ))}
              {cap.terminosClave && cap.terminosClave.length > 0 ? (
                <div className="manual-print__terminos">
                  <Text size="xs" color="muted">
                    Términos:{" "}
                    {cap.terminosClave.map((id) => terminoDeGlosario(id, idioma) ?? id).join(" · ")}
                  </Text>
                </div>
              ) : null}
              {cap.relacionados && cap.relacionados.length > 0 ? (
                <div className="manual-print__relacionados">
                  <Text size="xs" color="muted">
                    Relacionado:{" "}
                    {cap.relacionados
                      .map((id) => buscarCapitulo(id, idioma)?.capitulo.titulo ?? id)
                      .join(" · ")}
                  </Text>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ))}

      {/* Glosario */}
      <section id="print-glosario" className="manual-print__parte manual-print__glosario">
        <h2 className="manual-print__h2">Glosario — {manualGlosario(idioma).length} términos</h2>
        <Text size="sm" color="muted" className="mb-4 block">
          Definiciones operativas con referencia cruzada desde cada capítulo. Cada término tiene
          ancla estable (ej. #saldo) y se usa en Ctrl+K.
        </Text>
        <div className="manual-print__glosario-grid">
          {manualGlosario(idioma)
            .toSorted((a, b) => a.termino.localeCompare(b.termino))
            .map((t) => (
              <div key={t.id} id={`print-glosario-${t.id}`} className="manual-print__glosario-item">
                <Text size="sm" weight="medium" className="font-mono">
                  {t.termino}
                </Text>
                <Text size="sm" color="muted">
                  {t.definicion}
                </Text>
                <Text size="xs" color="muted" className="font-mono">
                  #{t.id}
                </Text>
              </div>
            ))}
        </div>
      </section>

      {/* Pie */}
      <div className="manual-print__pie">
        <Text size="xs" color="muted">
          Rustock v0.3.0 · Manual del Cliente · {manualPartes(idioma).length} partes ·{" "}
          {totalCapitulos} capítulos · {manualGlosario(idioma).length} términos · Generado {fecha} ·
          SPEC.md + código verificable · Impreso desde{" "}
          {typeof window !== "undefined" ? window.location.origin : ""}
          /manual/imprimir
        </Text>
      </div>
    </div>
  );
}
