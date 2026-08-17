import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  crearCliente,
  crearProveedor,
  editarCliente,
  editarProveedor,
  obtenerCliente,
  obtenerProveedor,
} from "../shared/backend";
import { invalidarRecurso } from "../shared/invalidar";
import { catalogoDetalle, catalogoLista } from "../app/route-paths";
import { mensajeError } from "../shared/format";
import { usePeticionCreacion, urlConRegreso, urlConSeleccion } from "../shared/creacion-rapida";
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
  Textarea,
} from "../shared/ui";

const esquema = z.object({
  codigo: z.string().trim().min(1, "El código es obligatorio"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  contacto_nombre: z.string().optional(),
  contacto_telefono: z.string().optional(),
  contacto_email: z.string().optional(),
  direccion: z.string().optional(),
});

type FormValues = z.infer<typeof esquema>;

const CONFIG = {
  proveedor: {
    slug: "proveedores",
    singular: "Proveedor",
    singularMin: "proveedor",
    titulo:
      "Proveedores de productos y materiales; las entradas de compra los referencian como origen.",
  },
  cliente: {
    slug: "clientes",
    singular: "Cliente",
    singularMin: "cliente",
    titulo: "Clientes que reciben despachos; las salidas los referencian como destino.",
  },
} as const;

type TipoEntidad = keyof typeof CONFIG;

export function ContactoFormPage({ tipo }: { tipo: TipoEntidad }) {
  const { id } = useParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const cfg = CONFIG[tipo];
  const { volver, campo } = usePeticionCreacion();
  const retornaAFormulario = !esEdicion && Boolean(volver && campo);

  const entidadQuery = useQuery({
    queryKey: [tipo, id],
    queryFn: () =>
      tipo === "proveedor" ? obtenerProveedor(id as string) : obtenerCliente(id as string),
    enabled: esEdicion,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: {
      codigo: "",
      nombre: "",
      contacto_nombre: "",
      contacto_telefono: "",
      contacto_email: "",
      direccion: "",
    },
  });

  useEffect(() => {
    const r = entidadQuery.data;
    if (r) {
      reset({
        codigo: r.codigo,
        nombre: r.nombre,
        contacto_nombre: r.contacto_nombre ?? "",
        contacto_telefono: r.contacto_telefono ?? "",
        contacto_email: r.contacto_email ?? "",
        direccion: r.direccion ?? "",
      });
    }
  }, [entidadQuery.data, reset]);

  const guardarMut = useMutation({
    mutationFn: (v: FormValues) => {
      const datos = {
        nombre: v.nombre,
        contacto_nombre: v.contacto_nombre || null,
        contacto_telefono: v.contacto_telefono || null,
        contacto_email: v.contacto_email || null,
        direccion: v.direccion || null,
      };
      if (esEdicion) {
        return tipo === "proveedor"
          ? editarProveedor(id as string, datos)
          : editarCliente(id as string, datos);
      }
      const nuevo = { codigo: v.codigo, ...datos };
      return tipo === "proveedor" ? crearProveedor(nuevo) : crearCliente(nuevo);
    },
    onSuccess: (r) => {
      invalidarRecurso(queryClient, cfg.slug, tipo);
      if (volver && campo && !esEdicion) {
        navigate(urlConSeleccion(volver, campo, r.id));
      } else {
        navigate(catalogoDetalle(cfg.slug, r.id));
      }
    },
    onError: (err) => setError(mensajeError(err)),
  });

  if (esEdicion && entidadQuery.isLoading) {
    return <PageHeader title={`Editar ${cfg.singularMin}`} description="Cargando…" />;
  }

  return (
    <>
      <PageHeader
        title={
          esEdicion
            ? `Editar ${cfg.singularMin} — ${entidadQuery.data?.codigo ?? ""}`
            : retornaAFormulario
              ? `Nuevo ${cfg.singularMin} (creación rápida)`
              : `Nuevo ${cfg.singularMin}`
        }
        description={
          retornaAFormulario
            ? `Crea el ${cfg.singularMin} y vuelve al formulario anterior con él seleccionado.`
            : cfg.titulo
        }
      />

      <form onSubmit={handleSubmit((v) => guardarMut.mutate(v))} noValidate>
        <Card title="Datos generales">
          <Card.Body>
            {error ? (
              <ErrorPanel title={`No se pudo guardar el ${cfg.singularMin}`} className="mb-4">
                {error}
              </ErrorPanel>
            ) : null}
            <FormGrid columns={2}>
              <Field
                label="Código"
                htmlFor="codigo"
                required
                error={errors.codigo?.message}
                help={esEdicion ? "El código no se puede modificar." : undefined}
              >
                <Input id="codigo" code disabled={esEdicion} {...register("codigo")} />
              </Field>
              <Field label="Nombre" htmlFor="nombre" required error={errors.nombre?.message}>
                <Input id="nombre" {...register("nombre")} />
              </Field>
              <Field label="Contacto" htmlFor="contacto_nombre">
                <Input id="contacto_nombre" {...register("contacto_nombre")} />
              </Field>
              <Field label="Teléfono" htmlFor="contacto_telefono">
                <Input id="contacto_telefono" code {...register("contacto_telefono")} />
              </Field>
              <Field label="Email" htmlFor="contacto_email">
                <Input id="contacto_email" type="email" {...register("contacto_email")} />
              </Field>
            </FormGrid>
            <Field label="Dirección" htmlFor="direccion">
              <Textarea id="direccion" rows={2} {...register("direccion")} />
            </Field>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || guardarMut.isPending}>
            {guardarMut.isPending
              ? "Guardando…"
              : esEdicion
                ? "Guardar cambios"
                : `Crear ${cfg.singularMin}`}
          </Button>
          <ButtonLink
            variant="secondary"
            href={
              retornaAFormulario
                ? urlConRegreso(volver as string)
                : esEdicion
                  ? catalogoDetalle(cfg.slug, id as string)
                  : catalogoLista(cfg.slug)
            }
          >
            Cancelar
          </ButtonLink>
        </FormActions>
      </form>
    </>
  );
}
