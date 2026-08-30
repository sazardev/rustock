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
import { useT, type Diccionario } from "../shared/i18n";
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

/** Tipos etiquetables, en el idioma activo. */
function tiposDe(t: Diccionario): { valor: TipoEtiqueta; label: string }[] {
  return [
    { valor: "PRODUCTO", label: t.etiquetas.tipos.PRODUCTO },
    { valor: "UBICACION", label: t.etiquetas.tipos.UBICACION },
    { valor: "LOTE", label: t.etiquetas.tipos.LOTE },
    { valor: "CAJA", label: t.etiquetas.tipos.CAJA },
  ];
}

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
  const t = useT();
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
      setAvisoImpresora(
        t.etiquetas.enviadas({ total: seleccion.size, destino: r.destino, bytes: r.bytes }),
      ),
    onError: (e) => setAvisoImpresora(mensajeError(e)),
  });

  const probar = useMutation({
    mutationFn: () =>
      probarImpresora({ host: impresoraHost.trim(), puerto: Number(impresoraPuerto) || 9100 }),
    onSuccess: (r) => setAvisoImpresora(t.etiquetas.respondeOjo({ destino: r.destino })),
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
        title={t.etiquetas.titulo}
        description={t.etiquetas.descripcion}
        actions={
          etiquetas.length > 0 ? (
            <Button variant="primary" icon="exportar" onClick={() => window.print()}>
              {t.etiquetas.imprimirN({ total: etiquetas.length })}
            </Button>
          ) : null
        }
      />

      <div className="etiquetas__config">
        <Card title={t.etiquetas.queEtiquetar}>
          <Card.Body>
            <div className="form-stack">
              <Field label={t.comun.tipo} htmlFor="tipo">
                <Select
                  id="tipo"
                  value={tipo}
                  onChange={(e) => cambiarTipo(e.target.value as TipoEtiqueta)}
                >
                  {tiposDe(t).map((op) => (
                    <option key={op.valor} value={op.valor}>
                      {op.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t.comun.buscar} htmlFor="busqueda" help={t.etiquetas.buscarAyuda}>
                <Input
                  id="busqueda"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder={t.etiquetas.filtrarLista}
                />
              </Field>
            </div>
          </Card.Body>
        </Card>

        <Card title={t.etiquetas.comoImprimirlas}>
          <Card.Body>
            <div className="form-stack">
              <Field
                label={t.etiquetas.simbologia}
                htmlFor="simbologia"
                help={simbologia === "CODE128" ? t.etiquetas.code128Ayuda : t.etiquetas.qrAyuda}
              >
                <Select
                  id="simbologia"
                  value={simbologia}
                  onChange={(e) => setSimbologia(e.target.value as Simbologia)}
                >
                  <option value="CODE128">{t.etiquetas.code128Opcion}</option>
                  <option value="QR">{t.etiquetas.qrOpcion}</option>
                </Select>
              </Field>
              <Field label={t.etiquetas.tamano} htmlFor="formato">
                <Select id="formato" value={formato} onChange={(e) => setFormato(e.target.value)}>
                  {FORMATOS.map((f) => (
                    <option key={f.valor} value={f.valor}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t.etiquetas.disposicion} htmlFor="disposicion">
                <Select
                  id="disposicion"
                  value={disposicion}
                  onChange={(e) => setDisposicion(e.target.value as Disposicion)}
                >
                  <option value="hoja">{t.etiquetas.hojaOpcion}</option>
                  <option value="rollo">{t.etiquetas.rolloOpcion}</option>
                </Select>
              </Field>
            </div>
          </Card.Body>
        </Card>
      </div>

      <Card
        title={t.etiquetas.seleccion({ total: seleccion.size })}
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
            {generar.isPending
              ? t.etiquetas.generando
              : t.etiquetas.generarN({ total: seleccion.size })}
          </Button>
        }
      >
        <Card.Body>
          {candidatos.error ? (
            <ErrorPanel title={t.etiquetas.noSePudoCargarLista}>
              {mensajeError(candidatos.error)}
            </ErrorPanel>
          ) : listado.length === 0 ? (
            <Text as="p" size="sm" color="muted">
              {candidatos.isLoading ? t.comun.cargando : t.etiquetas.sinEtiquetables}
            </Text>
          ) : (
            <>
              <div className="etiquetas__todos">
                <Checkbox
                  checked={todosSeleccionados}
                  onChange={alternarTodos}
                  label={
                    todosSeleccionados ? t.etiquetas.quitarTodos : t.etiquetas.seleccionarTodos
                  }
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
        <ErrorPanel title={t.etiquetas.noSePudoGenerar}>{mensajeError(generar.error)}</ErrorPanel>
      ) : null}

      {etiquetas.length > 0 ? (
        <Card title={t.etiquetas.vistaPrevia}>
          <Card.Body>
            <Text as="p" size="sm" color="muted" className="mb-4">
              {t.etiquetas.avisoImpresion}
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
              <ErrorPanel title={t.etiquetas.noSePudoArchivo} className="mb-4">
                {mensajeError(descargar.error)}
              </ErrorPanel>
            ) : null}

            {avisos.length > 0 ? (
              <ErrorPanel
                title={t.etiquetas.puedenNoLeerse({ total: avisos.length })}
                className="mb-4"
              >
                {avisos[0].advertencia}{" "}
                {t.etiquetas.afectaA({ codigos: avisos.map((a) => a.codigo).join(", ") })}
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
        <Card title={t.etiquetas.impresoraRed}>
          <Card.Body>
            <Text as="p" size="sm" color="muted" className="mb-4">
              Casi toda impresora térmica —Zebra, Honeywell, TSC, Godex y la mayoría de las
              genéricas— acepta trabajos en crudo por el puerto 9100. Enviar así evita el driver y
              el diálogo del navegador, que reescala y estrecha las barras.
            </Text>
            <div className="form-grid">
              <Field label={t.etiquetas.direccion} htmlFor="host" help={t.etiquetas.direccionAyuda}>
                <Input
                  id="host"
                  value={impresoraHost}
                  onChange={(e) => setImpresoraHost(e.target.value)}
                  placeholder="192.168.1.50"
                  code
                />
              </Field>
              <Field label={t.etiquetas.puerto} htmlFor="puerto">
                <Input
                  id="puerto"
                  value={impresoraPuerto}
                  onChange={(e) => setImpresoraPuerto(e.target.value)}
                  code
                  number
                />
              </Field>
              <Field
                label={t.etiquetas.resolucion}
                htmlFor="dpi"
                help={t.etiquetas.resolucionAyuda}
              >
                <Select
                  id="dpi"
                  value={dpi}
                  onChange={(e) => setDpi(e.target.value as DpiImpresora)}
                >
                  <option value="d203">{t.etiquetas.dpi203}</option>
                  <option value="d300">{t.etiquetas.dpi300}</option>
                  <option value="d600">{t.etiquetas.dpi600}</option>
                </Select>
              </Field>
            </div>
            <div className="form-actions">
              <Button
                variant="secondary"
                disabled={!impresoraHost.trim() || probar.isPending}
                onClick={() => probar.mutate()}
              >
                {probar.isPending ? t.etiquetas.probando : t.etiquetas.probarConexion}
              </Button>
              <Button
                variant="primary"
                disabled={!impresoraHost.trim() || enviarAImpresora.isPending}
                onClick={() => enviarAImpresora.mutate("ZPL")}
              >
                {enviarAImpresora.isPending ? t.etiquetas.enviando : t.etiquetas.enviarZpl}
              </Button>
              <Button
                variant="secondary"
                disabled={!impresoraHost.trim() || enviarAImpresora.isPending}
                onClick={() => enviarAImpresora.mutate("EPL")}
              >
                {t.etiquetas.enviarEpl}
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
        <Card title={t.etiquetas.comoFunciona}>
          <Card.Body>
            <ul className="etiquetas__ayuda">
              <li>
                <Icon name="producto" size={16} aria-hidden="true" />
                <span>{t.etiquetas.ayudaProducto}</span>
              </li>
              <li>
                <Icon name="codigoBarras" size={16} aria-hidden="true" />
                <span>{t.etiquetas.ayudaSimbologia}</span>
              </li>
              <li>
                <Icon name="alerta" size={16} aria-hidden="true" />
                <span>{t.etiquetas.ayudaEscala}</span>
              </li>
            </ul>
          </Card.Body>
        </Card>
      ) : null}
    </>
  );
}
