import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { crearMovimiento, resolverEscaneo } from "../shared/backend";
import type { EscaneoResuelto, NuevaLinea } from "../shared/types";
import { invalidarRecurso } from "../shared/invalidar";
import { movimientoDetalle, PATH } from "../app/route-paths";
import { mensajeError } from "../shared/format";
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

const ETAPA_HINT: Record<Etapa, string> = {
  producto: "Escanea el producto (SKU o código de barras).",
  lote: "El producto controla lote: escanea el número de lote.",
  cantidad: "Escribe la cantidad y pulsa Enter.",
  ubicacion: "Escanea la ubicación.",
  listo: "Pulsa Enter o «Agregar línea» para incorporar la línea.",
};

export function CapturaRapidaPage({ modo }: { modo: ModoCaptura }) {
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
        setError("Este producto no controla lote: el lote no aplica.");
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
    setError("Las cajas no se usan en captura rápida: escanea la ubicación.");
  }

  function agregarLinea() {
    if (!lineaValida(linea)) {
      setError("Completa producto, cantidad y ubicación antes de agregar la línea.");
      return;
    }
    setLineas((prev) => [...prev, linea]);
    setLinea({ ...LINEA_VACIA, key: generarKey() });
    setEtapa("producto");
    setError(null);
    scanRef.current?.focus();
  }

  function quitarLinea(key: string) {
    setLineas((prev) => prev.filter((l) => l.key !== key));
  }

  async function onEnter() {
    const valor = escaneo.trim();
    if (!valor || busy) return;

    if (etapa === "cantidad") {
      const n = Number(valor);
      if (!(n > 0)) {
        setError("La cantidad debe ser un número mayor que 0.");
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
      const res = await resolverEscaneo(valor);
      if (!res) {
        setError(`No se encontró «${valor}». Verifica el código o búscalo manualmente.`);
        return;
      }
      aplicarResuelto(res);
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
      header: "Producto",
      code: true,
      render: (l) => l.producto_etiqueta,
    },
    { key: "lote_etiqueta", header: "Lote", code: true, render: (l) => l.lote_etiqueta || "—" },
    { key: "cantidad", header: "Cantidad", num: true, render: (l) => l.cantidad },
    {
      key: "ubicacion_etiqueta",
      header: esRecepcion ? "Destino" : "Origen",
      code: true,
      render: (l) => l.ubicacion_etiqueta,
    },
  ];

  return (
    <>
      <PageHeader
        title={esRecepcion ? "Recepción rápida" : "Despacho rápido"}
        description={
          esRecepcion
            ? "Captura una entrada escaneando producto, lote y ubicación. Enter avanza de campo."
            : "Captura una salida escaneando producto, lote y ubicación de origen. Enter avanza de campo."
        }
        actions={
          <ButtonLink
            variant="secondary"
            href={esRecepcion ? "/movimientos/captura-despacho" : "/movimientos/captura-recepcion"}
          >
            {esRecepcion ? "Ir a despacho rápido" : "Ir a recepción rápida"}
          </ButtonLink>
        }
      />

      <Card title="Línea actual">
        <Card.Body>
          {error ? (
            <ErrorPanel title="Captura" className="mb-4">
              {error}
            </ErrorPanel>
          ) : null}
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Text size="sm" color="muted" as="span" className="min-w-24">
                Producto
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
                Lote
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
                Cantidad
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

          <Field label="Escanea o escribe" htmlFor="scan" help={ETAPA_HINT[etapa]}>
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
              placeholder="Escáner o teclado…"
              autoComplete="off"
            />
          </Field>
        </Card.Body>
      </Card>

      <div className="mt-6">
        <Card title={`Líneas capturadas (${totalLineas})`}>
          <Table
            columns={columnas}
            rows={lineas}
            rowKey={(l) => l.key}
            emptyTitle="Sin líneas todavía"
            emptyDescription="Escanea producto → lote → cantidad → ubicación para ir llenando esta captura."
            actions={(l) => (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon="eliminar"
                onClick={() => quitarLinea(l.key)}
              >
                Quitar
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
          Agregar línea
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={(!lineaValida(linea) && lineas.length === 0) || guardarMut.isPending}
          onClick={() => guardarMut.mutate(lineaValida(linea) ? [...lineas, linea] : lineas)}
        >
          {guardarMut.isPending
            ? "Guardando…"
            : `Guardar ${esRecepcion ? "entrada" : "salida"} (${totalLineas} ${
                totalLineas === 1 ? "línea" : "líneas"
              })`}
        </Button>
        <Link href={PATH.movimientos}>Cancelar</Link>
      </div>
    </>
  );
}
