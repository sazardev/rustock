import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
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
import { useT, type Diccionario } from "../shared/i18n";

const TIPOS: Array<{ valor: TipoUom; etiqueta: string }> = [
  { valor: "UNIDAD", etiqueta: "Unidad" },
  { valor: "PESO", etiqueta: "Peso" },
  { valor: "VOLUMEN", etiqueta: "Volumen" },
  { valor: "LONGITUD", etiqueta: "Longitud" },
  { valor: "SUPERFICIE", etiqueta: "Superficie" },
];

/** El esquema sigue al idioma: sus mensajes se pintan tal cual en el campo. */
function esquemaDe(t: Diccionario) {
  return z.object({
    codigo: z.string().trim().min(1, t.formularios.codigoObligatorio),
    nombre: z.string().trim().min(1, t.formularios.nombreObligatorio),
    tipo: z.string().trim().min(1, t.formularios.tipoObligatorio),
    factor: z
      .string()
      .trim()
      .min(1, t.formularios.uom.factorObligatorio)
      .refine((v) => Number(v) >= 1, t.formularios.uom.factorMinimo),
    base: z.boolean(),
  });
}

type FormValues = z.infer<ReturnType<typeof esquemaDe>>;

export function UomFormPage() {
  const t = useT();
  const esquema = useMemo(() => esquemaDe(t), [t]);
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
    return <PageHeader title={t.formularios.uom.editar} description="Cargando…" />;
  }

  return (
    <>
      <PageHeader
        title={
          esEdicion
            ? `${t.formularios.uom.editar} — ${uomQuery.data?.codigo ?? ""}`
            : t.formularios.uom.nueva
        }
        description={
          retornaAFormulario ? t.formularios.uom.volverConSeleccion : t.formularios.uom.descripcion
        }
      />

      <form onSubmit={handleSubmit((v) => guardarMut.mutate(v))} noValidate>
        <Card title={t.formularios.datosGenerales}>
          <Card.Body>
            {error ? (
              <ErrorPanel title={t.formularios.uom.noSePudoGuardar} className="mb-4">
                {error}
              </ErrorPanel>
            ) : null}
            <FormGrid columns={2}>
              <Field
                label="Código"
                htmlFor="codigo"
                required
                error={errors.codigo?.message}
                help={esEdicion ? t.formularios.codigoInmutable : undefined}
              >
                <Input id="codigo" code disabled={esEdicion} {...register("codigo")} />
              </Field>
              <Field
                label={t.comun.nombre}
                htmlFor="nombre"
                required
                error={errors.nombre?.message}
              >
                <Input id="nombre" {...register("nombre")} />
              </Field>
              <Field label={t.comun.tipo} htmlFor="tipo" required error={errors.tipo?.message}>
                <Select id="tipo" {...register("tipo")}>
                  {TIPOS.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.etiqueta}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label={t.formularios.uom.factor}
                htmlFor="factor"
                required
                error={errors.factor?.message}
                help={t.formularios.uom.factorAyuda}
              >
                <Input id="factor" type="number" min="1" step="1" number {...register("factor")} />
              </Field>
            </FormGrid>
            <div className="mt-4">
              <Checkbox id="base" label={t.formularios.uom.esBase} {...register("base")} />
            </div>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || guardarMut.isPending}>
            {guardarMut.isPending
              ? "Guardando…"
              : esEdicion
                ? t.formularios.guardarCambios
                : t.formularios.uom.crear}
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
            {t.comun.cancelar}
          </ButtonLink>
        </FormActions>
      </form>
    </>
  );
}
