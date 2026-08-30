import { useCallback, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { crearMovimiento, escanear } from "../shared/backend";
import type { EscaneoResuelto, NuevaLinea } from "../shared/types";
import { invalidarRecurso } from "../shared/invalidar";
import { movimientoDetalle, PATH } from "../app/route-paths";
import { mensajeError } from "../shared/format";
import { useCapturaEscaneo } from "../shared/useEscanerGlobal";
import { useT } from "../shared/i18n";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  ErrorPanel,
  Field,
  Link,
  PageHeader,
  Table,
  Text,
  type TableColumn,
} from "../shared/ui";

/**
 * Captura rápida con escáner (SPEC §14.3): flujo guiado campo-a-campo para
 * operadores. El escáner (tipo teclado) alimenta un único input; al leer cada
 * valor se avanza de campo. Modos:
 *   - `recepcion`: crea una ENTRADA/COMPRA (producto → lote → cantidad → destino).
 *   - `despacho`:  crea una SALIDA/CLIENTE  (producto → lote → cantidad → origen).
 */
export type ModoCaptura = "recepcion" | "despacho";

export function CapturaRecepcionPage() {
  return <CapturaRapidaPage modo="recepcion" />;
}

export function CapturaDespachoPage() {
  return <CapturaRapidaPage modo="despacho" />;
}

type Etapa = "producto" | "lote" | "cantidad" | "ubicacion" | "listo";

interface LineaCaptura {
  key: string;
  producto_id: string;
  producto_etiqueta: string;
  lote_id: string;
  lote_etiqueta: string;
  cantidad: string;
  ubicacion_id: string;
  ubicacion_etiqueta: string;
}

const LINEA_VACIA: Omit<LineaCaptura, "key"> = {
  producto_id: "",
  producto_etiqueta: "",
  lote_id: "",
  lote_etiqueta: "",
  cantidad: "",
  ubicacion_id: "",
  ubicacion_etiqueta: "",
};

function generarKey(): string {
  return Math.random().toString(36).slice(2);
}

function lineaValida(l: LineaCaptura): boolean {
  return Boolean(l.producto_id && Number(l.cantidad) > 0 && l.ubicacion_id);
}

export function CapturaRapidaPage({ modo }: { modo: ModoCaptura }) {
  const t = useT();
  const esRecepcion = modo === "recepcion";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [lineas, setLineas] = useState<LineaCaptura[]>([]);
  const [linea, setLinea] = useState<LineaCaptura>({ ...LINEA_VACIA, key: generarKey() });
  const [etapa, setEtapa] = useState<Etapa>("producto");
  const [escaneo, setEscaneo] = useState("");
  const [busy, setBusy] = useState(false);
  /** `controla_lote` del producto resuelto en la línea actual (llega con el
   * escaneo, no depende de que la lista de productos haya cargado). */
  const [controlaLoteActual, setControlaLoteActual] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);

  function fijar(l: Partial<LineaCaptura>) {
    setLinea((prev) => ({ ...prev, ...l }));
  }

  // El paso siguiente depende del producto RESUELTO (res.controla_lote, que
  // Llega del backend con el escaneo): Leerlo de la lista del cliente sería
  // Una carrera — si el listado aún no cargó, se saltaría el paso de lote.
  function avanzarDeProducto(resuelto: EscaneoResuelto) {
    setControlaLoteActual(Boolean(resuelto.controla_lote));
    if (resuelto.controla_lote) {
      setEtapa("lote");
    } else {
      setEtapa("cantidad");
    }
  }

  function aplicarResuelto(res: EscaneoResuelto) {
    if (res.tipo === "PRODUCTO") {
      // Si ya había un producto en esta línea y se escanea otro, se cierra la
      // Línea actual (si es válida) y se empieza una nueva.
      if (linea.producto_id && linea.producto_id !== res.id) {
        if (lineaValida(linea)) {
          setLineas((prev) => [...prev, linea]);
        }
        setLinea({
          ...LINEA_VACIA,
          key: generarKey(),
          producto_id: res.id,
          producto_etiqueta: res.etiqueta,
        });
      } else {
        fijar({ producto_id: res.id, producto_etiqueta: res.etiqueta });
      }
      setError(null);
      avanzarDeProducto(res);
      return;
    }
    if (res.tipo === "LOTE") {
      if (!controlaLoteActual) {
        setError(t.captura.sinLote);
        return;
      }
      fijar({ lote_id: res.id, lote_etiqueta: res.etiqueta });
      setError(null);
      setEtapa("cantidad");
      return;
    }
    if (res.tipo === "UBICACION") {
      fijar({ ubicacion_id: res.id, ubicacion_etiqueta: res.etiqueta });
      setError(null);
      setEtapa("listo");
      return;
    }
    setError(t.captura.sinCajas);
  }

  function agregarLinea() {
    if (!lineaValida(linea)) {
      setError(t.captura.completaLinea);
      return;
    }
    setLineas((prev) => [...prev, linea]);
    setLinea({ ...LINEA_VACIA, key: generarKey() });
    setEtapa("producto");
    setError(null);
    scanRef.current?.focus();
  }

  // Estando en captura, los códigos son de esta pantalla: se reclaman para que
  // la acción por defecto del escáner global no navegue a otro sitio.
  useCapturaEscaneo(
    useCallback((codigo: string) => {
      scanRef.current?.focus();
      void onEnter(codigo);
      // `onEnter` se redefine en cada render pero solo lee estado actual a
      // través de refs y setters, así que basta con recrear el manejador.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  function quitarLinea(key: string) {
    setLineas((prev) => prev.filter((l) => l.key !== key));
  }

  /**
   * Procesa un código. `codigoExterno` llega del lector de mano cuando el foco
   * se ha perdido (alguien pulsó un botón): sin esto, la escucha global se
   * llevaría el código a otra pantalla en mitad de una captura.
   */
  async function onEnter(codigoExterno?: string) {
    const valor = (codigoExterno ?? escaneo).trim();
    if (!valor || busy) return;

    if (etapa === "cantidad") {
      const n = Number(valor);
      if (!(n > 0)) {
        setError(t.captura.cantidadInvalida);
        return;
      }
      fijar({ cantidad: valor });
      setError(null);
      setEtapa("ubicacion");
      setEscaneo("");
      scanRef.current?.focus();
      return;
    }

    if (etapa === "listo") {
      agregarLinea();
      setEscaneo("");
      return;
    }

    setBusy(true);
    try {
      // `escanear` resuelve el código y deja constancia de la lectura. Esta
      // es la pantalla donde más se escanea: dejarla fuera del registro
      // vaciaba de sentido el panel de escaneos (SPEC §14.3.4).
      const res = await escanear({
        codigo: valor,
        origen: "TECLADO",
        proposito: "CAPTURA",
        ruta: window.location.pathname,
        ubicacion_contexto_id: linea.ubicacion_id || null,
        dispositivo: navigator.userAgent,
      });
      if (!res.resuelto) {
        setError(`No se encontró «${valor}». Verifica el código o búscalo manualmente.`);
        return;
      }
      aplicarResuelto(res.resuelto);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setBusy(false);
      setEscaneo("");
      scanRef.current?.focus();
    }
  }

  const guardarMut = useMutation({
    mutationFn: (filas: LineaCaptura[]) => {
      const lineasEnvio: NuevaLinea[] = filas.map((l) => ({
        producto_id: l.producto_id,
        lote_id: l.lote_id || null,
        cantidad: Number(l.cantidad),
        origen_ubicacion_id: esRecepcion ? null : l.ubicacion_id || null,
        destino_ubicacion_id: esRecepcion ? l.ubicacion_id || null : null,
      }));
      return crearMovimiento({
        tipo: esRecepcion ? "ENTRADA" : "SALIDA",
        sub_tipo: esRecepcion ? "COMPRA" : "CLIENTE",
        lineas: lineasEnvio,
      });
    },
    onSuccess: (movimiento) => {
      invalidarRecurso(queryClient, "movimientos");
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate(movimientoDetalle(movimiento.id));
    },
    onError: (err) => setError(mensajeError(err)),
  });

  const totalLineas = lineas.length + (lineaValida(linea) ? 1 : 0);

  const columnas: Array<TableColumn<LineaCaptura>> = [
    {
      key: "producto_etiqueta",
      header: t.campos.producto,
      code: true,
      render: (l) => l.producto_etiqueta,
    },
    {
      key: "lote_etiqueta",
      header: t.campos.lote,
      code: true,
      render: (l) => l.lote_etiqueta || "—",
    },
    { key: "cantidad", header: t.comun.cantidad, num: true, render: (l) => l.cantidad },
    {
      key: "ubicacion_etiqueta",
      header: esRecepcion ? t.captura.destino : t.captura.origen,
      code: true,
      render: (l) => l.ubicacion_etiqueta,
    },
  ];

  return (
    <>
      <PageHeader
        title={esRecepcion ? t.captura.recepcion : t.captura.despacho}
        description={esRecepcion ? t.captura.recepcionDesc : t.captura.despachoDesc}
        actions={
          <ButtonLink
            variant="secondary"
            href={esRecepcion ? "/movimientos/captura-despacho" : "/movimientos/captura-recepcion"}
          >
            {esRecepcion ? t.captura.irADespacho : t.captura.irARecepcion}
          </ButtonLink>
        }
      />

      <Card title={t.captura.lineaActual}>
        <Card.Body>
          {error ? (
            <ErrorPanel title={t.captura.tituloError} className="mb-4">
              {error}
            </ErrorPanel>
          ) : null}
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Text size="sm" color="muted" as="span" className="min-w-24">
                {t.campos.producto}
              </Text>
              {linea.producto_etiqueta ? (
                <Badge tone="info">{linea.producto_etiqueta}</Badge>
              ) : (
                <Text size="sm" color="muted" as="span">
                  —
                </Text>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Text size="sm" color="muted" as="span" className="min-w-24">
                {t.campos.lote}
              </Text>
              {linea.lote_etiqueta ? (
                <Badge tone="neutral">{linea.lote_etiqueta}</Badge>
              ) : (
                <Text size="sm" color="muted" as="span">
                  —
                </Text>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Text size="sm" color="muted" as="span" className="min-w-24">
                {t.comun.cantidad}
              </Text>
              <Text size="sm" as="span">
                {linea.cantidad || "—"}
              </Text>
            </div>
            <div className="flex items-center gap-2">
              <Text size="sm" color="muted" as="span" className="min-w-24">
                {esRecepcion ? "Destino" : "Origen"}
              </Text>
              {linea.ubicacion_etiqueta ? (
                <Badge tone="neutral">{linea.ubicacion_etiqueta}</Badge>
              ) : (
                <Text size="sm" color="muted" as="span">
                  —
                </Text>
              )}
            </div>
          </div>

          <Field label={t.captura.escaneaOEscribe} htmlFor="scan" help={t.captura.pistas[etapa]}>
            <input
              id="scan"
              ref={scanRef}
              className="field__control field__control--code"
              autoFocus
              value={escaneo}
              onChange={(e) => setEscaneo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void onEnter();
                }
              }}
              placeholder={t.captura.marcador}
              autoComplete="off"
            />
          </Field>
        </Card.Body>
      </Card>

      <div className="mt-6">
        <Card title={t.captura.lineasCapturadas({ total: totalLineas })}>
          <Table
            columns={columnas}
            rows={lineas}
            rowKey={(l) => l.key}
            emptyTitle={t.captura.sinLineas}
            emptyDescription={t.captura.sinLineasDesc}
            actions={(l) => (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon="eliminar"
                onClick={() => quitarLinea(l.key)}
              >
                {t.captura.quitar}
              </Button>
            )}
          />
        </Card>
      </div>

      <div className="mt-6 flex gap-3">
        <Button
          type="button"
          variant="secondary"
          icon="agregar"
          disabled={!lineaValida(linea)}
          onClick={agregarLinea}
        >
          {t.captura.agregarLinea}
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={(!lineaValida(linea) && lineas.length === 0) || guardarMut.isPending}
          onClick={() => guardarMut.mutate(lineaValida(linea) ? [...lineas, linea] : lineas)}
        >
          {guardarMut.isPending
            ? t.comun.guardando
            : esRecepcion
              ? t.captura.guardarEntrada({ total: totalLineas })
              : t.captura.guardarSalida({ total: totalLineas })}
        </Button>
        <Link href={PATH.movimientos}>{t.comun.cancelar}</Link>
      </div>
    </>
  );
}
