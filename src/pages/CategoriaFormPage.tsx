import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  crearCategoria,
  editarCategoria,
  listarCategorias,
  obtenerCategoria,
} from "../shared/backend";
import { esPaginado } from "../shared/types";
import { invalidarRecurso } from "../shared/invalidar";
import { catalogoDetalle, catalogoLista, catalogoNuevo } from "../app/route-paths";
import { mensajeError } from "../shared/format";
import { useT, type Diccionario } from "../shared/i18n";
import {
  CrearRapido,
  usePeticionCreacion,
  usePreservarFormulario,
  useSeleccionCreada,
  urlConRegreso,
  urlConSeleccion,
} from "../shared/creacion-rapida";
import {
  Button,
  ButtonLink,
  Card,
  ErrorPanel,
  Field,
  FormActions,
  FormGrid,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "../shared/ui";

/** El esquema sigue al idioma: sus mensajes se pintan tal cual en el campo. */
function esquemaDe(t: Diccionario) {
  return z.object({
    nombre: z.string().trim().min(1, t.formularios.nombreObligatorio),
    parent_id: z.string().optional(),
    descripcion: z.string().optional(),
  });
}

type FormValues = z.infer<ReturnType<typeof esquemaDe>>;

const INVALIDAR_CATEGORIAS = ["categorias", "selector"] as const;

export function CategoriaFormPage() {
  const t = useT();
  const esquema = useMemo(() => esquemaDe(t), [t]);
  const { id } = useParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { volver, campo } = usePeticionCreacion();
  const retornaAFormulario = !esEdicion && Boolean(volver && campo);

  const categoriaQuery = useQuery({
    queryKey: ["categoria", id],
    queryFn: () => obtenerCategoria(id as string),
    enabled: esEdicion,
  });

  const categoriasQuery = useQuery({
    queryKey: ["categorias", "selector"],
    queryFn: () => listarCategorias({ page_size: 200, sort: "nombre" }),
  });
  const categorias =
    categoriasQuery.data && esPaginado(categoriasQuery.data) ? categoriasQuery.data.data : [];
  const padresPosibles = esEdicion ? categorias.filter((c) => c.id !== id) : categorias;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: { nombre: "", parent_id: "", descripcion: "" },
  });

  // Conserva el borrador al salir a crear una categoría padre (encadenado) y
  // lo restaura al volver (crear o cancelar).
  const { descartar } = usePreservarFormulario(
    "/categorias/nuevo",
    () => getValues(),
    (valores) => reset(valores as FormValues),
    !esEdicion,
  );

  useSeleccionCreada(
    "parent_id",
    (nuevoId) => setValue("parent_id", nuevoId),
    INVALIDAR_CATEGORIAS,
    !esEdicion,
  );

  useEffect(() => {
    if (categoriaQuery.data) {
      reset({
        nombre: categoriaQuery.data.nombre,
        parent_id: categoriaQuery.data.parent_id ?? "",
        descripcion: categoriaQuery.data.descripcion ?? "",
      });
    }
  }, [categoriaQuery.data, reset]);

  const guardarMut = useMutation({
    mutationFn: (v: FormValues) =>
      esEdicion
        ? editarCategoria(id as string, {
            nombre: v.nombre,
            descripcion: v.descripcion || null,
            parent_id: v.parent_id || null,
          })
        : crearCategoria({
            nombre: v.nombre,
            descripcion: v.descripcion || null,
            parent_id: v.parent_id || null,
          }),
    onSuccess: (categoria) => {
      descartar();
      invalidarRecurso(queryClient, "categorias", "categoria");
      if (volver && campo && !esEdicion) {
        navigate(urlConSeleccion(volver, campo, categoria.id));
      } else {
        navigate(catalogoDetalle("categorias", categoria.id));
      }
    },
    onError: (err) => setError(mensajeError(err)),
  });

  if (esEdicion && categoriaQuery.isLoading) {
    return <PageHeader title={t.formularios.categoria.editar} description="Cargando…" />;
  }

  return (
    <>
      <PageHeader
        title={
          esEdicion
            ? `${t.formularios.categoria.editar} — ${categoriaQuery.data?.nombre ?? ""}`
            : t.formularios.categoria.nueva
        }
        description={
          retornaAFormulario
            ? t.formularios.categoria.volverConSeleccion
            : t.formularios.categoria.descripcion
        }
      />

      <form onSubmit={handleSubmit((v) => guardarMut.mutate(v))} noValidate>
        <Card title={t.formularios.datosGenerales}>
          <Card.Body>
            {error ? (
              <ErrorPanel title={t.formularios.categoria.noSePudoGuardar} className="mb-4">
                {error}
              </ErrorPanel>
            ) : null}
            <FormGrid columns={2}>
              <Field
                label={t.comun.nombre}
                htmlFor="nombre"
                required
                error={errors.nombre?.message}
              >
                <Input id="nombre" {...register("nombre")} />
              </Field>
              <Field
                label={t.formularios.categoria.padre}
                htmlFor="parent_id"
                help={t.formularios.categoria.padreAyuda}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      id="parent_id"
                      placeholder={t.formularios.categoria.sinPadre}
                      {...register("parent_id")}
                    >
                      {padresPosibles.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {!esEdicion && !retornaAFormulario ? (
                    <CrearRapido campo="parent_id" rutaNueva={catalogoNuevo("categorias")}>
                      Nueva categoría
                    </CrearRapido>
                  ) : null}
                </div>
              </Field>
            </FormGrid>
            <Field label={t.comun.descripcion} htmlFor="descripcion">
              <Textarea id="descripcion" rows={3} {...register("descripcion")} />
            </Field>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || guardarMut.isPending}>
            {guardarMut.isPending
              ? "Guardando…"
              : esEdicion
                ? t.formularios.guardarCambios
                : t.formularios.categoria.crear}
          </Button>
          <ButtonLink
            variant="secondary"
            href={
              retornaAFormulario
                ? urlConRegreso(volver as string)
                : esEdicion
                  ? catalogoDetalle("categorias", id as string)
                  : catalogoLista("categorias")
            }
          >
            {t.comun.cancelar}
          </ButtonLink>
        </FormActions>
      </form>
    </>
  );
}
