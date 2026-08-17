import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { importarDatos } from "../shared/backend";
import { invalidarRecurso } from "../shared/invalidar";
import { mensajeError } from "../shared/format";
import {
  Badge,
  Button,
  Card,
  ErrorPanel,
  Field,
  FormActions,
  Link,
  PageHeader,
  Select,
  Table,
  Textarea,
  Text,
  type TableColumn,
} from "../shared/ui";
import type { ResultadoImportacion } from "../shared/types";
import { PATH } from "../app/route-paths";

type TipoImportacion = "PRODUCTOS" | "UBICACIONES" | "STOCK_INICIAL";

const TIPOS: Array<{ valor: TipoImportacion; etiqueta: string }> = [
  { valor: "PRODUCTOS", etiqueta: "Productos" },
  { valor: "UBICACIONES", etiqueta: "Ubicaciones" },
  { valor: "STOCK_INICIAL", etiqueta: "Stock inicial" },
];

const ENCABEZADOS: Record<TipoImportacion, string> = {
  PRODUCTOS:
    "sku,nombre,uom_base,descripcion,categoria,codigo_barras,peso,volumen,stock_minimo,stock_maximo,controla_lote,controla_vencimiento,perecedero,uom_venta,uom_compra",
  UBICACIONES: "codigo,nombre,tipo,capacidad_maxima,ubicado_en",
  STOCK_INICIAL: "sku,cantidad,ubicacion,lote,vencimiento,origen_lote,documento",
};

/**
 * Parser CSV mínimo: soporta `,`, `;` o tabulador, comillas dobles y saltos
 * de línea. La primera fila es la cabecera.
 */
function parsearCsv(csv: string): Record<string, unknown>[] {
  const filas = csv
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((linea) => {
      const celdas: string[] = [];
      let actual = "";
      let entreComillas = false;
      for (let i = 0; i < linea.length; i++) {
        const c = linea[i];
        if (c === '"') {
          if (entreComillas && linea[i + 1] === '"') {
            actual += '"';
            i++;
          } else {
            entreComillas = !entreComillas;
          }
        } else if ((c === "," || c === ";" || c === "\t") && !entreComillas) {
          celdas.push(actual);
          actual = "";
        } else {
          actual += c;
        }
      }
      celdas.push(actual);
      return celdas;
    })
    .filter((f) => f.some((celda) => celda.trim() !== ""));

  if (filas.length < 2) return [];
  const cabecera = filas[0].map((c) => c.trim());
  const datos: Record<string, unknown>[] = [];
  for (const fila of filas.slice(1)) {
    const filaObj: Record<string, unknown> = {};
    cabecera.forEach((col, i) => {
      filaObj[col] = fila[i]?.trim() ?? "";
    });
    datos.push(filaObj);
  }
  return datos;
}

/**
 * Importación masiva (Fase C): pegar o subir un CSV con productos, ubicaciones
 * o stock inicial. El backend valida cada fila contra las reglas del SPEC y
 * devuelve un resultado por fila (válida insertada / error corregible).
 */
export function ImportarPage() {
  const queryClient = useQueryClient();
  const [tipo, setTipo] = useState<TipoImportacion>("PRODUCTOS");
  const [texto, setTexto] = useState("");
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);

  function previsualizar() {
    setError(null);
    if (!texto.trim()) {
      setError("Pega o escribe el contenido del CSV para previsualizarlo.");
      return;
    }
    const filas = parsearCsv(texto);
    if (filas.length === 0) {
      setError("No se encontraron filas de datos (se espera una cabecera + datos).");
      return;
    }
    setPreview(filas);
  }

  function descargarPlantilla() {
    const contenido = `\uFEFF${ENCABEZADOS[tipo]}\n`;
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rustock-${tipo.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const importarMut = useMutation({
    mutationFn: () => {
      const filas = preview.length > 0 ? preview : parsearCsv(texto);
      if (filas.length === 0) throw new Error("No hay filas para importar.");
      return importarDatos(tipo, filas);
    },
    onSuccess: (resultados) => {
      invalidarRecurso(queryClient, "productos", "producto");
      invalidarRecurso(queryClient, "ubicaciones", "ubicacion");
      invalidarRecurso(queryClient, "lotes", "lote");
      void queryClient.invalidateQueries({ queryKey: ["movimientos"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setResultados(resultados);
    },
    onError: (err) => setError(mensajeError(err)),
  });

  const [resultados, setResultados] = useState<ResultadoImportacion[] | null>(null);
  const ok = resultados?.filter((r) => r.ok).length ?? 0;
  const mal = (resultados?.length ?? 0) - ok;

  const columnasResultado: Array<TableColumn<ResultadoImportacion>> = [
    { key: "fila", header: "Fila", num: true, render: (r) => r.fila },
    {
      key: "ok",
      header: "Estado",
      render: (r) =>
        r.ok ? <Badge tone="success">Importado</Badge> : <Badge tone="danger">Error</Badge>,
    },
    { key: "id", header: "Id", code: true, render: (r) => r.id ?? "—" },
    { key: "error", header: "Detalle", render: (r) => r.error ?? "—" },
  ];

  return (
    <>
      <PageHeader
        title="Importación masiva"
        description="Carga productos, ubicaciones o stock inicial desde un CSV. Cada fila se valida contra las reglas del sistema y los errores se reportan por fila."
      />

      <Card title="Origen de los datos">
        <Card.Body>
          {error ? (
            <ErrorPanel title="Importación" className="mb-4">
              {error}
            </ErrorPanel>
          ) : null}
          <div className="flex items-end gap-3">
            <Field label="Tipo de datos">
              <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoImportacion)}>
                {TIPOS.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.etiqueta}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="button" variant="secondary" icon="exportar" onClick={descargarPlantilla}>
              Descargar plantilla
            </Button>
          </div>
          <div className="mt-4">
            <Field
              label="Contenido CSV"
              htmlFor="csv"
              help="La primera fila es la cabecera. Separa con coma, punto y coma o tabulador."
            >
              <Textarea
                id="csv"
                rows={10}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={`${ENCABEZADOS[tipo]}\n…`}
              />
            </Field>
          </div>
          <FormActions>
            <Button type="button" variant="secondary" icon="filtrar" onClick={previsualizar}>
              Previsualizar ({preview.length} filas)
            </Button>
            <Button
              type="button"
              variant="primary"
              icon="aprobar"
              disabled={importarMut.isPending}
              onClick={() => importarMut.mutate()}
            >
              {importarMut.isPending ? "Importando…" : "Importar"}
            </Button>
          </FormActions>
        </Card.Body>
      </Card>

      {preview.length > 0 ? (
        <div className="mt-6">
          <Card title={`Vista previa (${preview.length} filas)`}>
            <Text size="sm" color="muted" as="p">
              Se importarán las {preview.length} filas detectadas. Revisa la cabecera antes de
              importar; los errores se reportarán por fila sin abortar el resto.
            </Text>
          </Card>
        </div>
      ) : null}

      {resultados ? (
        <div className="mt-6">
          <Card title={`Resultado de la importación (${ok} ok, ${mal} con error)`}>
            <Table
              columns={columnasResultado}
              rows={resultados}
              rowKey={(r) => String(r.fila)}
              emptyTitle="Sin resultados"
            />
            {mal > 0 ? (
              <Text size="sm" color="muted" as="p" className="mt-3">
                Corrige las filas con error y vuelve a importar solo esas filas.
              </Text>
            ) : null}
          </Card>
        </div>
      ) : null}

      <div className="mt-6">
        <Link href={PATH.configuracion}>Volver a Configuración</Link>
      </div>
    </>
  );
}
