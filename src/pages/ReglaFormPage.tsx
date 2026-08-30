import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import {
  crearRegla,
  editarRegla,
  eliminarRegla,
  listarAlmacenes,
  listarCategorias,
  listarPasillos,
  listarProductos,
  listarRacks,
  listarUbicaciones,
  listarZonas,
  obtenerRegla,
} from "../shared/backend";
import type { AmbitoRegla, NuevaRegla, SeveridadRegla, TipoRegla } from "../shared/types";
import { esPaginado } from "../shared/types";
import { mensajeError } from "../shared/format";
import { PATH } from "../app/route-paths";
import { useT } from "../shared/i18n";
import {
  Button,
  ButtonLink,
  Card,
  ErrorPanel,
  Field,
  FormActions,
  Input,
  PageHeader,
  Select,
  Text,
  Textarea,
} from "../shared/ui";

const AMBITOS: AmbitoRegla[] = ["ALMACEN", "ZONA", "PASILLO", "RACK", "SECCION", "UBICACION"];
const TIPOS: TipoRegla[] = [
  "PESO_MAXIMO",
  "CANTIDAD_MAXIMA",
  "VOLUMEN_MAXIMO",
  "PRODUCTOS_DISTINTOS_MAXIMO",
  "CATEGORIA_PROHIBIDA",
  "CATEGORIA_EXCLUSIVA",
  "PRODUCTO_PROHIBIDO",
  "REQUIERE_LOTE",
  "PROHIBIR_VENCIDO",
];

/** Los tipos que necesitan un número para tener sentido. */
const CON_VALOR = new Set<TipoRegla>([
  "PESO_MAXIMO",
  "CANTIDAD_MAXIMA",
  "VOLUMEN_MAXIMO",
  "PRODUCTOS_DISTINTOS_MAXIMO",
]);
/** Los que apuntan a una categoría. */
const CON_CATEGORIA = new Set<TipoRegla>(["CATEGORIA_PROHIBIDA", "CATEGORIA_EXCLUSIVA"]);
/** Los que apuntan a un producto. */
const CON_PRODUCTO = new Set<TipoRegla>(["PRODUCTO_PROHIBIDO"]);

/** Fila mínima de cualquier catálogo, para poblar el selector del ámbito. */
interface FilaCatalogo {
  id: string;
  codigo?: string;
  nombre?: string;
  sku?: string;
}

/** Extrae las filas de una consulta paginada. */
function filas<T>(q: { data?: unknown }): T[] {
  const d = q.data;
  return d && esPaginado(d as never) ? ((d as { data: T[] }).data ?? []) : [];
}

/** Convierte filas de catálogo en opciones con una etiqueta legible. */
function aOpciones(xs: FilaCatalogo[]): { id: string; etiqueta: string }[] {
  return xs.map((x) => ({ id: x.id, etiqueta: x.codigo ?? x.nombre ?? x.sku ?? x.id }));
}

const VACIA: NuevaRegla = {
  codigo: "",
  nombre: "",
  descripcion: "",
  ambito: "RACK",
  ambito_id: null,
  tipo: "PESO_MAXIMO",
  valor_numerico: null,
  valor_referencia: null,
  severidad: "BLOQUEA",
  mensaje: "",
  activa: true,
};

/**
 * Escribir una regla (SPEC §16).
 *
 * El formulario está ordenado como la frase que la persona tiene en la cabeza
 * —dónde aplica, qué limita, qué pasa si se incumple— y no como las columnas
 * de la tabla. Los campos que no aplican al tipo elegido no se muestran: un
 * "límite en kg" bajo una prohibición de categoría solo genera dudas.
 */
export function ReglaFormPage() {
  const t = useT();
  const { id } = useParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [valores, setValores] = useState<NuevaRegla>(VACIA);

  const reglaQuery = useQuery({
    queryKey: ["regla", id],
    queryFn: () => obtenerRegla(id as string),
    enabled: esEdicion,
  });

  useEffect(() => {
    const r = reglaQuery.data;
    if (!r) return;
    setValores({
      codigo: r.codigo,
      nombre: r.nombre,
      descripcion: r.descripcion ?? "",
      ambito: r.ambito,
      ambito_id: r.ambito_id,
      tipo: r.tipo,
      valor_numerico: r.valor_numerico,
      valor_referencia: r.valor_referencia,
      severidad: r.severidad,
      mensaje: r.mensaje ?? "",
      activa: r.activa,
    });
  }, [reglaQuery.data]);

  // Candidatos del ámbito elegido. Se consultan todos y se usa el que toca:
  // son listas pequeñas y así cambiar de ámbito no espera a una carga nueva.
  const almacenes = useQuery({
    queryKey: ["almacenes", "sel"],
    queryFn: () => listarAlmacenes({ page_size: 200 }),
  });
  const zonas = useQuery({
    queryKey: ["zonas", "sel"],
    queryFn: () => listarZonas({ page_size: 200 }),
  });
  const pasillos = useQuery({
    queryKey: ["pasillos", "sel"],
    queryFn: () => listarPasillos({ page_size: 200 }),
  });
  const racks = useQuery({
    queryKey: ["racks", "sel"],
    queryFn: () => listarRacks({ page_size: 200 }),
  });
  const ubicaciones = useQuery({
    queryKey: ["ubicaciones", "sel"],
    queryFn: () => listarUbicaciones({ page_size: 300 }),
  });
  const categorias = useQuery({
    queryKey: ["categorias", "sel"],
    queryFn: () => listarCategorias({ page_size: 200 }),
  });
  const productos = useQuery({
    queryKey: ["productos", "sel"],
    queryFn: () => listarProductos({ page_size: 300 }),
  });

  const candidatos: { id: string; etiqueta: string }[] = (() => {
    switch (valores.ambito) {
      case "ALMACEN":
        return aOpciones(filas<FilaCatalogo>(almacenes));
      case "ZONA":
        return aOpciones(filas<FilaCatalogo>(zonas));
      case "PASILLO":
        return aOpciones(filas<FilaCatalogo>(pasillos));
      case "RACK":
        return aOpciones(filas<FilaCatalogo>(racks));
      case "UBICACION":
        return aOpciones(filas<FilaCatalogo>(ubicaciones));
      default:
        // Las secciones no tienen listado propio: se deja la regla a nivel
        // general del ámbito en vez de ofrecer un selector vacío.
        return [];
    }
  })();

  const guardar = useMutation({
    mutationFn: (v: NuevaRegla) => (esEdicion ? editarRegla(id as string, v) : crearRegla(v)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reglas"] });
      navigate(PATH.reglas);
    },
    onError: (e) => setError(mensajeError(e)),
  });

  const borrar = useMutation({
    mutationFn: () => eliminarRegla(id as string),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reglas"] });
      navigate(PATH.reglas);
    },
    onError: (e) => setError(mensajeError(e)),
  });

  function set<K extends keyof NuevaRegla>(clave: K, valor: NuevaRegla[K]) {
    setValores((previo) => ({ ...previo, [clave]: valor }));
  }

  const unidad = t.reglas.unidades[valores.tipo as keyof typeof t.reglas.unidades] ?? "";

  return (
    <>
      <PageHeader
        title={esEdicion ? t.reglas.editar : t.reglas.nueva}
        description={t.reglas.editarDesc}
        actions={
          <ButtonLink variant="secondary" href={PATH.reglas}>
            {t.comun.volver}
          </ButtonLink>
        }
      />

      {error ? <ErrorPanel title={t.reglas.noSePudoGuardar}>{error}</ErrorPanel> : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          guardar.mutate({
            ...valores,
            // Los campos que no aplican al tipo se envían vacíos: dejar un
            // valor viejo de otro tipo guardaría una regla que dice una cosa
            // y contiene otra.
            valor_numerico: CON_VALOR.has(valores.tipo) ? valores.valor_numerico : null,
            valor_referencia:
              CON_CATEGORIA.has(valores.tipo) || CON_PRODUCTO.has(valores.tipo)
                ? valores.valor_referencia
                : null,
          });
        }}
      >
        <Card title={t.reglas.identificacion}>
          <Card.Body>
            <div className="form-grid">
              <Field label={t.campos.codigo} htmlFor="codigo" required help={t.reglas.codigoAyuda}>
                <Input
                  id="codigo"
                  code
                  value={valores.codigo}
                  onChange={(e) => set("codigo", e.target.value)}
                />
              </Field>
              <Field label={t.campos.nombre} htmlFor="nombre" required>
                <Input
                  id="nombre"
                  value={valores.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                />
              </Field>
              <Field
                label={t.campos.descripcion}
                htmlFor="descripcion"
                className="form-grid__span-2"
              >
                <Textarea
                  id="descripcion"
                  value={valores.descripcion ?? ""}
                  onChange={(e) => set("descripcion", e.target.value)}
                />
              </Field>
            </div>
          </Card.Body>
        </Card>

        <Card title={t.reglas.dondeAplica} className="mt-6">
          <Card.Body>
            <div className="form-grid">
              <Field label={t.reglas.nivel} htmlFor="ambito" help={t.reglas.nivelAyuda}>
                <Select
                  id="ambito"
                  value={valores.ambito}
                  onChange={(e) => {
                    set("ambito", e.target.value as AmbitoRegla);
                    // El elemento elegido pertenecía al ámbito anterior.
                    set("ambito_id", null);
                  }}
                >
                  {AMBITOS.map((ambito) => (
                    <option key={ambito} value={ambito}>
                      {t.reglas.ambitos[ambito]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t.reglas.elemento} htmlFor="ambito_id" help={t.reglas.elementoAyuda}>
                <Select
                  id="ambito_id"
                  value={valores.ambito_id ?? ""}
                  onChange={(e) => set("ambito_id", e.target.value || null)}
                >
                  <option value="">{t.comun.todos}</option>
                  {candidatos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.etiqueta}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card.Body>
        </Card>

        <Card title={t.reglas.queLimita} className="mt-6">
          <Card.Body>
            <div className="form-grid">
              <Field label={t.comun.tipo} htmlFor="tipo">
                <Select
                  id="tipo"
                  value={valores.tipo}
                  onChange={(e) => set("tipo", e.target.value as TipoRegla)}
                >
                  {TIPOS.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {t.reglas.tipos[tipo]}
                    </option>
                  ))}
                </Select>
              </Field>

              {CON_VALOR.has(valores.tipo) ? (
                <Field label={t.reglas.limite({ unidad })} htmlFor="valor" required>
                  <Input
                    id="valor"
                    number
                    value={valores.valor_numerico ?? ""}
                    onChange={(e) => set("valor_numerico", Number(e.target.value) || null)}
                  />
                </Field>
              ) : null}

              {CON_CATEGORIA.has(valores.tipo) ? (
                <Field label={t.campos.categoria} htmlFor="referencia" required>
                  <Select
                    id="referencia"
                    value={valores.valor_referencia ?? ""}
                    placeholder={t.reglas.elegirCategoria}
                    onChange={(e) => set("valor_referencia", e.target.value || null)}
                  >
                    {filas<{ id: string; nombre: string }>(categorias).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}

              {CON_PRODUCTO.has(valores.tipo) ? (
                <Field label={t.campos.producto} htmlFor="referencia" required>
                  <Select
                    id="referencia"
                    value={valores.valor_referencia ?? ""}
                    placeholder={t.reglas.elegirProducto}
                    onChange={(e) => set("valor_referencia", e.target.value || null)}
                  >
                    {filas<{ id: string; sku: string; nombre: string }>(productos).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
            </div>
          </Card.Body>
        </Card>

        <Card title={t.reglas.quePasaSiSeIncumple} className="mt-6">
          <Card.Body>
            <div className="form-grid">
              <Field label={t.reglas.severidad} htmlFor="severidad" help={t.reglas.severidadAyuda}>
                <Select
                  id="severidad"
                  value={valores.severidad}
                  onChange={(e) => set("severidad", e.target.value as SeveridadRegla)}
                >
                  <option value="BLOQUEA">{t.reglas.bloqueaOpcion}</option>
                  <option value="ADVIERTE">{t.reglas.adviertOpcion}</option>
                </Select>
              </Field>
              <Field label={t.comun.estado} htmlFor="activa" help={t.reglas.estadoAyuda}>
                <Select
                  id="activa"
                  value={valores.activa ? "1" : "0"}
                  onChange={(e) => set("activa", e.target.value === "1")}
                >
                  <option value="1">{t.reglas.activa}</option>
                  <option value="0">{t.reglas.apagada}</option>
                </Select>
              </Field>
              <Field
                label={t.reglas.mensajePropio}
                htmlFor="mensaje"
                className="form-grid__span-2"
                help={t.reglas.mensajeAyuda}
              >
                <Input
                  id="mensaje"
                  value={valores.mensaje ?? ""}
                  onChange={(e) => set("mensaje", e.target.value)}
                  placeholder={t.reglas.mensajeMarcador}
                />
              </Field>
            </div>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={guardar.isPending}>
            {guardar.isPending ? t.comun.guardando : t.reglas.guardarRegla}
          </Button>
          <ButtonLink variant="secondary" href={PATH.reglas}>
            {t.comun.cancelar}
          </ButtonLink>
          {esEdicion ? (
            <Button
              type="button"
              variant="danger"
              disabled={borrar.isPending}
              onClick={() => borrar.mutate()}
            >
              {t.comun.eliminar}
            </Button>
          ) : null}
        </FormActions>
      </form>

      <Card title={t.reglas.ejemplos} className="mt-6">
        <Card.Body>
          <ul className="reglas__ejemplos">
            <li>
              <strong>Peso máximo</strong> en un rack: no se aprueba una entrada que dejaría el rack
              por encima de los kilos indicados. Necesita que los productos tengan peso unitario.
            </li>
            <li>
              <strong>Productos distintos máximo</strong> con valor 1 en todas las ubicaciones: cada
              ubicación admite un único SKU. Reponer el mismo producto sigue permitido.
            </li>
            <li>
              <strong>Categoría prohibida</strong> en un pasillo: la química no entra donde va la
              comida.
            </li>
            <li>
              <strong>Exige lote</strong> en una zona: nada entra sin lote, aunque el producto no lo
              exija por sí mismo.
            </li>
          </ul>
          <Text as="p" size="sm" color="muted" className="mt-4">
            Si una regla no puede evaluarse porque falta un dato del producto —peso, por ejemplo—,
            Rustock avisa en vez de callar: una protección que crees tener y no tienes es peor que
            no tenerla.
          </Text>
        </Card.Body>
      </Card>
    </>
  );
}
