import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import {
  generarEtiquetas,
  generarTandaEtiquetas,
  imprimirEtiquetas,
  listarEtiquetables,
  probarImpresora,
} from "../shared/backend";
import { descargarArchivo, descargarBlob, svgAPng } from "../shared/descargar";
import type {
  DpiImpresora,
  Etiqueta,
  FormatoEtiqueta,
  Simbologia,
  TipoEtiqueta,
} from "../shared/types";
import { mensajeError } from "../shared/format";
import {
  Button,
  Card,
  Checkbox,
  ErrorPanel,
  Field,
  Icon,
  Input,
  PageHeader,
  Select,
  Text,
} from "../shared/ui";

const TIPOS: { valor: TipoEtiqueta; label: string }[] = [
  { valor: "PRODUCTO", label: "Productos" },
  { valor: "UBICACION", label: "Ubicaciones" },
  { valor: "LOTE", label: "Lotes" },
  { valor: "CAJA", label: "Cajas" },
];

/** Formatos de etiqueta habituales en almacén, en milímetros reales. */
const FORMATOS = [
  { valor: "50x25", label: "50 × 25 mm — rollo estándar", ancho: 50, alto: 25 },
  { valor: "70x37", label: "70 × 37 mm — hoja A4 (24 por hoja)", ancho: 70, alto: 37 },
  { valor: "100x50", label: "100 × 50 mm — caja grande", ancho: 100, alto: 50 },
  { valor: "38x38", label: "38 × 38 mm — QR cuadrado", ancho: 38, alto: 38 },
];

type Disposicion = "hoja" | "rollo";

/**
 * Ajustes que se recuerdan entre visitas.
 *
 * Se guardan en el propio equipo y no en el perfil del usuario a propósito: la
 * impresora de etiquetas está físicamente al lado del equipo desde el que se
 * imprime, y el mismo operador usa una distinta según el muelle en el que
 * esté. Recordarlo por persona sería recordarlo mal.
 */
const CLAVE_AJUSTES = "rustock.etiquetas.ajustes";

interface AjustesRecordados {
  simbologia?: Simbologia;
  formato?: string;
  disposicion?: Disposicion;
  dpi?: DpiImpresora;
  impresoraHost?: string;
  impresoraPuerto?: string;
}

function leerAjustes(): AjustesRecordados {
  try {
    const crudo = window.localStorage.getItem(CLAVE_AJUSTES);
    return crudo ? (JSON.parse(crudo) as AjustesRecordados) : {};
  } catch {
    return {};
  }
}

function guardarAjustes(ajustes: AjustesRecordados): void {
  try {
    window.localStorage.setItem(CLAVE_AJUSTES, JSON.stringify(ajustes));
  } catch {
    // Almacenamiento no disponible: los ajustes duran esta visita.
  }
}

/**
 * Impresión de etiquetas (SPEC §14.3.5).
 *
 * El código impreso es exactamente el que resuelve el escáner: lo decide el
 * backend, no esta pantalla. Aquí solo se elige qué etiquetar, en qué
 * simbología y a qué tamaño.
 *
 * La impresión usa la del navegador (`window.print()`) contra una hoja de
 * estilos `@media print`: no hay generación de PDF ni servicio externo, que
 * en una aplicación self-hosted sería una dependencia de más para resolver un
 * problema que el navegador ya resuelve bien.
 */
export function EtiquetasPage() {
  // La pantalla se puede abrir ya preparada desde cualquier módulo:
  // `/etiquetas?tipo=PRODUCTO&ids=a,b,c`. Así se imprime desde donde se está
  // trabajando, sin venir aquí a buscar otra vez lo que ya se tenía delante.
  const [searchParams] = useSearchParams();
  const tipoInicial = (searchParams.get("tipo") as TipoEtiqueta | null) ?? "PRODUCTO";
  const idsIniciales = (searchParams.get("ids") ?? "").split(",").filter(Boolean);
  const ajustes = useMemo(leerAjustes, []);

  const [tipo, setTipo] = useState<TipoEtiqueta>(tipoInicial);
  const [busqueda, setBusqueda] = useState("");
  const [seleccion, setSeleccion] = useState<Set<string>>(() => new Set(idsIniciales));
  const [simbologia, setSimbologia] = useState<Simbologia>(ajustes.simbologia ?? "CODE128");
  const [formato, setFormato] = useState(ajustes.formato ?? "50x25");
  const [disposicion, setDisposicion] = useState<Disposicion>(ajustes.disposicion ?? "hoja");
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [dpi, setDpi] = useState<DpiImpresora>(ajustes.dpi ?? "d203");
  const [impresoraHost, setImpresoraHost] = useState(ajustes.impresoraHost ?? "");
  const [impresoraPuerto, setImpresoraPuerto] = useState(ajustes.impresoraPuerto ?? "9100");
  const [avisoImpresora, setAvisoImpresora] = useState<string | null>(null);

  const medidas = FORMATOS.find((f) => f.valor === formato) ?? FORMATOS[0];

  const candidatos = useQuery({
    queryKey: ["etiquetables", tipo, busqueda],
    queryFn: () => listarEtiquetables(tipo, busqueda || undefined, 200),
  });

  const generar = useMutation({
    mutationFn: generarEtiquetas,
    onSuccess: setEtiquetas,
  });

  // Los ajustes se recuerdan en cuanto cambian: nadie debería volver a teclear
  // la IP de la impresora cada vez que imprime una etiqueta.
  useEffect(() => {
    guardarAjustes({ simbologia, formato, disposicion, dpi, impresoraHost, impresoraPuerto });
  }, [simbologia, formato, disposicion, dpi, impresoraHost, impresoraPuerto]);

  const listado = useMemo(() => candidatos.data ?? [], [candidatos.data]);

  /** La petición que comparten generar, descargar e imprimir. */
  function peticionBase(formato: FormatoEtiqueta) {
    return {
      tipo,
      ids: [...seleccion],
      simbologia,
      ancho_mm: medidas.ancho,
      alto_mm: medidas.alto,
      formato,
      dpi,
      disposicion,
    };
  }

  const descargar = useMutation({
    mutationFn: (formato: FormatoEtiqueta) => generarTandaEtiquetas(peticionBase(formato)),
    onSuccess: (tanda) =>
      descargarArchivo(tanda.nombre_archivo, tanda.mime, tanda.contenido_base64),
  });

  const enviarAImpresora = useMutation({
    mutationFn: (formato: FormatoEtiqueta) =>
      imprimirEtiquetas(peticionBase(formato), {
        host: impresoraHost.trim(),
        puerto: Number(impresoraPuerto) || 9100,
      }),
    onSuccess: (r) =>
      setAvisoImpresora(`Enviadas ${seleccion.size} etiquetas a ${r.destino} (${r.bytes} bytes).`),
    onError: (e) => setAvisoImpresora(mensajeError(e)),
  });

  const probar = useMutation({
    mutationFn: () =>
      probarImpresora({ host: impresoraHost.trim(), puerto: Number(impresoraPuerto) || 9100 }),
    onSuccess: (r) =>
      setAvisoImpresora(
        `${r.destino} responde. Ojo: el puerto abierto no garantiza que haya papel ni que el cabezal esté bajado.`,
      ),
    onError: (e) => setAvisoImpresora(mensajeError(e)),
  });

  /** Rasteriza la vista previa a PNG, para pegarla en otro sistema. */
  async function descargarPng() {
    if (etiquetas.length === 0) return;
    const primera = etiquetas[0];
    const blob = await svgAPng(primera.svg);
    descargarBlob(`etiqueta-${primera.codigo}.png`, blob);
  }
  // Barras demasiado finas para el lector. El backend lo calcula a partir del
  // ancho real en milímetros: se avisa antes de imprimir cien etiquetas, no
  // después de pegarlas en las cajas.
  const avisos = useMemo(() => etiquetas.filter((e) => e.advertencia), [etiquetas]);
  const todosSeleccionados = listado.length > 0 && listado.every((c) => seleccion.has(c.id));

  // Al llegar desde un módulo con la selección hecha, la vista previa se genera
  // sola: quien pulsó "Etiqueta" en una ficha ya dijo lo que quiere, y pedirle
  // que además pulse "Generar" sería un paso de más.
  const yaAutogenerado = useRef(false);
  useEffect(() => {
    if (yaAutogenerado.current || idsIniciales.length === 0) return;
    yaAutogenerado.current = true;
    generar.mutate({
      tipo: tipoInicial,
      ids: idsIniciales,
      simbologia,
      ancho_mm: medidas.ancho,
      alto_mm: medidas.alto,
    });
    // Solo en el montaje: recalcularlo al cambiar de tamaño reimprimiría sin
    // que nadie lo haya pedido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function alternar(id: string) {
    setSeleccion((previo) => {
      const siguiente = new Set(previo);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  function alternarTodos() {
    setSeleccion((previo) => {
      if (todosSeleccionados) {
        const siguiente = new Set(previo);
        for (const c of listado) siguiente.delete(c.id);
        return siguiente;
      }
      return new Set([...previo, ...listado.map((c) => c.id)]);
    });
  }

  function cambiarTipo(nuevo: TipoEtiqueta) {
    setTipo(nuevo);
    // La selección es por tipo: arrastrarla entre tipos produciría una hoja
    // con etiquetas de entidades que ya no están a la vista.
    setSeleccion(new Set());
    setEtiquetas([]);
  }

  return (
    <>
      <PageHeader
        title="Etiquetas"
        description="Genera e imprime los códigos que después leerá el escáner. El código impreso es el mismo con el que Rustock encuentra la entidad."
        actions={
          etiquetas.length > 0 ? (
            <Button variant="primary" icon="exportar" onClick={() => window.print()}>
              Imprimir {etiquetas.length}
            </Button>
          ) : null
        }
      />

      <div className="etiquetas__config">
        <Card title="Qué etiquetar">
          <Card.Body>
            <div className="form-stack">
              <Field label="Tipo" htmlFor="tipo">
                <Select
                  id="tipo"
                  value={tipo}
                  onChange={(e) => cambiarTipo(e.target.value as TipoEtiqueta)}
                >
                  {TIPOS.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Buscar" htmlFor="busqueda" help="Por código o por nombre.">
                <Input
                  id="busqueda"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Filtrar la lista"
                />
              </Field>
            </div>
          </Card.Body>
        </Card>

        <Card title="Cómo imprimirlas">
          <Card.Body>
            <div className="form-stack">
              <Field
                label="Simbología"
                htmlFor="simbologia"
                help={
                  simbologia === "CODE128"
                    ? "Lineal, la que lee cualquier lector de mano sin configurar nada."
                    : "Aguanta suciedad y lecturas en ángulo; admite códigos con acentos."
                }
              >
                <Select
                  id="simbologia"
                  value={simbologia}
                  onChange={(e) => setSimbologia(e.target.value as Simbologia)}
                >
                  <option value="CODE128">Code128 — código de barras</option>
                  <option value="QR">QR</option>
                </Select>
              </Field>
              <Field label="Tamaño" htmlFor="formato">
                <Select id="formato" value={formato} onChange={(e) => setFormato(e.target.value)}>
                  {FORMATOS.map((f) => (
                    <option key={f.valor} value={f.valor}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Disposición" htmlFor="disposicion">
                <Select
                  id="disposicion"
                  value={disposicion}
                  onChange={(e) => setDisposicion(e.target.value as Disposicion)}
                >
                  <option value="hoja">Hoja A4 — varias etiquetas por página</option>
                  <option value="rollo">Rollo — una etiqueta por página</option>
                </Select>
              </Field>
            </div>
          </Card.Body>
        </Card>
      </div>

      <Card
        title={`Selección (${seleccion.size})`}
        actions={
          <Button
            variant="primary"
            disabled={seleccion.size === 0 || generar.isPending}
            onClick={() =>
              generar.mutate({
                tipo,
                ids: [...seleccion],
                simbologia,
                ancho_mm: medidas.ancho,
                alto_mm: medidas.alto,
              })
            }
          >
            {generar.isPending ? "Generando…" : `Generar ${seleccion.size} etiquetas`}
          </Button>
        }
      >
        <Card.Body>
          {candidatos.error ? (
            <ErrorPanel title="No se pudo cargar la lista">
              {mensajeError(candidatos.error)}
            </ErrorPanel>
          ) : listado.length === 0 ? (
            <Text as="p" size="sm" color="muted">
              {candidatos.isLoading
                ? "Cargando…"
                : "Nada con código imprimible para este tipo. Una entidad sin código no se puede escanear, así que no se ofrece para etiquetar."}
            </Text>
          ) : (
            <>
              <div className="etiquetas__todos">
                <Checkbox
                  checked={todosSeleccionados}
                  onChange={alternarTodos}
                  label={todosSeleccionados ? "Quitar todos" : "Seleccionar todos"}
                />
              </div>
              <ul className="etiquetas__lista">
                {listado.map((c) => (
                  <li key={c.id} className="etiquetas__item">
                    <Checkbox
                      checked={seleccion.has(c.id)}
                      onChange={() => alternar(c.id)}
                      label={
                        <>
                          <span className="etiquetas__item-codigo">{c.codigo}</span>
                          {c.nombre !== c.codigo ? (
                            <span className="etiquetas__item-nombre">{c.nombre}</span>
                          ) : null}
                        </>
                      }
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card.Body>
      </Card>

      {generar.error ? (
        <ErrorPanel title="No se pudieron generar las etiquetas">
          {mensajeError(generar.error)}
        </ErrorPanel>
      ) : null}

      {etiquetas.length > 0 ? (
        <Card title="Vista previa">
          <Card.Body>
            <Text as="p" size="sm" color="muted" className="mb-4">
              Al imprimir solo salen las etiquetas: el resto de la pantalla se oculta. Comprueba en
              la vista previa del navegador que la escala esté al 100 % — si el sistema la reduce
              para «ajustar a la página», las barras se estrechan y el lector puede fallar.
            </Text>

            <div className="etiquetas__salidas">
              <Button
                variant="secondary"
                icon="exportar"
                disabled={descargar.isPending}
                onClick={() => descargar.mutate("PDF")}
              >
                PDF
              </Button>
              <Button variant="secondary" icon="exportar" onClick={() => void descargarPng()}>
                PNG
              </Button>
              <Button
                variant="secondary"
                icon="exportar"
                disabled={descargar.isPending}
                onClick={() => descargar.mutate("SVG")}
              >
                SVG
              </Button>
              <Button
                variant="secondary"
                icon="exportar"
                disabled={descargar.isPending}
                onClick={() => descargar.mutate("ZPL")}
              >
                ZPL (Zebra)
              </Button>
              <Button
                variant="secondary"
                icon="exportar"
                disabled={descargar.isPending}
                onClick={() => descargar.mutate("EPL")}
              >
                EPL
              </Button>
            </div>

            {descargar.error ? (
              <ErrorPanel title="No se pudo generar el archivo" className="mb-4">
                {mensajeError(descargar.error)}
              </ErrorPanel>
            ) : null}

            {avisos.length > 0 ? (
              <ErrorPanel
                title={`${avisos.length} ${avisos.length === 1 ? "etiqueta puede no leerse" : "etiquetas pueden no leerse"}`}
                className="mb-4"
              >
                {avisos[0].advertencia} Afecta a: {avisos.map((a) => a.codigo).join(", ")}.
              </ErrorPanel>
            ) : null}
            <div
              className={`etiquetas__hoja etiquetas__hoja--${disposicion}`}
              style={{ "--etiqueta-ancho": `${medidas.ancho}mm` } as React.CSSProperties}
            >
              {etiquetas.map((e) => (
                <figure
                  key={`${e.entidad_id}-${e.codigo}`}
                  className={`etiqueta${e.advertencia ? " etiqueta--dudosa" : ""}`}
                  title={e.advertencia ?? undefined}
                >
                  {/* El SVG va como `img` con data URI, no inyectado en el DOM:
                      un SVG dentro de `img` no ejecuta scripts ni accede a la
                      página, así que ni siquiera un backend comprometido podría
                      convertir una etiqueta en código ejecutable. */}
                  <img
                    className="etiqueta__codigo"
                    src={`data:image/svg+xml;utf8,${encodeURIComponent(e.svg)}`}
                    alt={`${e.simbologia === "QR_CODE" ? "Código QR" : "Código de barras"} ${e.codigo}`}
                  />
                  <figcaption className="etiqueta__pie">
                    <span className="etiqueta__titulo">{e.titulo}</span>
                    {e.subtitulo ? (
                      <span className="etiqueta__subtitulo">{e.subtitulo}</span>
                    ) : null}
                  </figcaption>
                </figure>
              ))}
            </div>
          </Card.Body>
        </Card>
      ) : null}

      {etiquetas.length > 0 ? (
        <Card title="Impresora de etiquetas en red">
          <Card.Body>
            <Text as="p" size="sm" color="muted" className="mb-4">
              Casi toda impresora térmica —Zebra, Honeywell, TSC, Godex y la mayoría de las
              genéricas— acepta trabajos en crudo por el puerto 9100. Enviar así evita el driver y
              el diálogo del navegador, que reescala y estrecha las barras.
            </Text>
            <div className="form-grid">
              <Field label="Dirección" htmlFor="host" help="IP o nombre de la impresora.">
                <Input
                  id="host"
                  value={impresoraHost}
                  onChange={(e) => setImpresoraHost(e.target.value)}
                  placeholder="192.168.1.50"
                  code
                />
              </Field>
              <Field label="Puerto" htmlFor="puerto">
                <Input
                  id="puerto"
                  value={impresoraPuerto}
                  onChange={(e) => setImpresoraPuerto(e.target.value)}
                  code
                  number
                />
              </Field>
              <Field
                label="Resolución"
                htmlFor="dpi"
                help="Debe coincidir con la impresora: con el valor equivocado la etiqueta sale de otro tamaño."
              >
                <Select
                  id="dpi"
                  value={dpi}
                  onChange={(e) => setDpi(e.target.value as DpiImpresora)}
                >
                  <option value="d203">203 dpi — la más común</option>
                  <option value="d300">300 dpi</option>
                  <option value="d600">600 dpi — industrial</option>
                </Select>
              </Field>
            </div>
            <div className="form-actions">
              <Button
                variant="secondary"
                disabled={!impresoraHost.trim() || probar.isPending}
                onClick={() => probar.mutate()}
              >
                {probar.isPending ? "Probando…" : "Probar conexión"}
              </Button>
              <Button
                variant="primary"
                disabled={!impresoraHost.trim() || enviarAImpresora.isPending}
                onClick={() => enviarAImpresora.mutate("ZPL")}
              >
                {enviarAImpresora.isPending ? "Enviando…" : "Enviar en ZPL"}
              </Button>
              <Button
                variant="secondary"
                disabled={!impresoraHost.trim() || enviarAImpresora.isPending}
                onClick={() => enviarAImpresora.mutate("EPL")}
              >
                Enviar en EPL
              </Button>
            </div>
            {avisoImpresora ? (
              <Text as="p" size="sm" color="muted" className="mt-4">
                {avisoImpresora}
              </Text>
            ) : null}
          </Card.Body>
        </Card>
      ) : null}

      {etiquetas.length === 0 ? (
        <Card title="Cómo funciona">
          <Card.Body>
            <ul className="etiquetas__ayuda">
              <li>
                <Icon name="producto" size={16} aria-hidden="true" />
                <span>
                  Un producto se etiqueta con su código de barras comercial si lo tiene; si no, con
                  su SKU. Ubicaciones, lotes y cajas llevan su propio código.
                </span>
              </li>
              <li>
                <Icon name="codigoBarras" size={16} aria-hidden="true" />
                <span>
                  Code128 es la opción por defecto: es lo que lee cualquier lector de mano. El QR se
                  reserva para etiquetas pequeñas o códigos con caracteres que Code128 no admite.
                </span>
              </li>
              <li>
                <Icon name="alerta" size={16} aria-hidden="true" />
                <span>
                  Imprime siempre al 100 % de escala y sobre fondo blanco mate. Una etiqueta
                  reducida o brillante es la causa más común de que un escáner no lea.
                </span>
              </li>
            </ul>
          </Card.Body>
        </Card>
      ) : null}
    </>
  );
}
