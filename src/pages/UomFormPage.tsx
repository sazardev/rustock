import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { crearUom, editarUom, obtenerUom } from "../shared/backend";
import { invalidarRecurso } from "../shared/invalidar";
import { catalogoDetalle, catalogoLista } from "../app/route-paths";
import { mensajeError } from "../shared/format";
import { usePeticionCreacion, urlConRegreso, urlConSeleccion } from "../shared/creacion-rapida";
import {
  Button,
  ButtonLink,
  Card,
  Checkbox,
  ErrorPanel,
  Field,
  FormActions,
  FormGrid,
  Input,
  PageHeader,
  Select,
} from "../shared/ui";
import type { TipoUom } from "../shared/types";

const TIPOS: Array<{ valor: TipoUom; etiqueta: string }> = [
  { valor: "UNIDAD", etiqueta: "Unidad" },
  { valor: "PESO", etiqueta: "Peso" },
  { valor: "VOLUMEN", etiqueta: "Volumen" },
  { valor: "LONGITUD", etiqueta: "Longitud" },
  { valor: "SUPERFICIE", etiqueta: "Superficie" },
];

const esquema = z.object({
  codigo: z.string().trim().min(1, "El código es obligatorio"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  tipo: z.string().trim().min(1, "El tipo es obligatorio"),
  factor: z
    .string()
    .trim()
    .min(1, "El factor de conversión es obligatorio")
    .refine((v) => Number(v) >= 1, "El factor debe ser mayor o igual a 1"),
  base: z.boolean(),
});

type FormValues = z.infer<typeof esquema>;

export function UomFormPage() {
  const { id } = useParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { volver, campo } = usePeticionCreacion();
  const retornaAFormulario = !esEdicion && Boolean(volver && campo);

  const uomQuery = useQuery({
    queryKey: ["uom", id],
    queryFn: () => obtenerUom(id as string),
    enabled: esEdicion,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: { codigo: "", nombre: "", tipo: "UNIDAD", factor: "1", base: true },
  });

  useEffect(() => {
    const u = uomQuery.data;
    if (u) {
      reset({
        codigo: u.codigo,
        nombre: u.nombre,
        tipo: u.tipo,
        factor: String(u.factor),
        base: u.base,
      });
    }
  }, [uomQuery.data, reset]);

  const guardarMut = useMutation({
    mutationFn: (v: FormValues) => {
      if (esEdicion) {
        return editarUom(id as string, {
          nombre: v.nombre,
          tipo: v.tipo as TipoUom,
          factor: Number(v.factor),
          base: v.base,
        });
      }
      return crearUom({
        codigo: v.codigo,
        nombre: v.nombre,
        tipo: v.tipo as TipoUom,
        factor: Number(v.factor),
        base: v.base,
      });
    },
    onSuccess: (uom) => {
      invalidarRecurso(queryClient, "uoms", "uom");
      if (volver && campo && !esEdicion) {
        navigate(urlConSeleccion(volver, campo, uom.id));
      } else {
        navigate(catalogoDetalle("uoms", uom.id));
      }
    },
    onError: (err) => setError(mensajeError(err)),
  });

  if (esEdicion && uomQuery.isLoading) {
    return <PageHeader title="Editar unidad de medida" description="Cargando…" />;
  }

  return (
    <>
      <PageHeader
        title={
          esEdicion
            ? `Editar unidad de medida — ${uomQuery.data?.codigo ?? ""}`
            : "Nueva unidad de medida"
        }
        description={
          retornaAFormulario
            ? "Crea la UOM y vuelve al formulario anterior con ella seleccionada."
            : "La UOM base es la unidad más pequeña gestionable; las demás se expresan como factor de conversión hacia la base de su familia."
        }
      />

      <form onSubmit={handleSubmit((v) => guardarMut.mutate(v))} noValidate>
        <Card title="Datos generales">
          <Card.Body>
            {error ? (
              <ErrorPanel title="No se pudo guardar la unidad de medida" className="mb-4">
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
              <Field label="Tipo" htmlFor="tipo" required error={errors.tipo?.message}>
                <Select id="tipo" {...register("tipo")}>
                  {TIPOS.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.etiqueta}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Factor de conversión"
                htmlFor="factor"
                required
                error={errors.factor?.message}
                help="Cuántas unidades base equivale esta UOM (1 = la base de su familia)."
              >
                <Input id="factor" type="number" min="1" step="1" number {...register("factor")} />
              </Field>
            </FormGrid>
            <div className="mt-4">
              <Checkbox id="base" label="Es la unidad base de su familia" {...register("base")} />
            </div>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || guardarMut.isPending}>
            {guardarMut.isPending
              ? "Guardando…"
              : esEdicion
                ? "Guardar cambios"
                : "Crear unidad de medida"}
          </Button>
          <ButtonLink
            variant="secondary"
            href={
              retornaAFormulario
                ? urlConRegreso(volver as string)
                : esEdicion
                  ? catalogoDetalle("uoms", id as string)
                  : catalogoLista("uoms")
            }
          >
            Cancelar
          </ButtonLink>
        </FormActions>
      </form>
    </>
  );
}
