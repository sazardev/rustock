import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { z } from "zod";
import { crearSucursal, editarSucursal, obtenerSucursal } from "../shared/backend";
import { PAISES } from "../shared/types";
import { invalidarRecurso } from "../shared/invalidar";
import { mensajeError } from "../shared/format";
import { PATH } from "../app/route-paths";
import { useT, type Diccionario } from "../shared/i18n";
import {
  Button,
  ButtonLink,
  Card,
  ErrorPanel,
  Field,
  FormActions,
  FormGrid,
  Icon,
  Input,
  PageHeader,
  Select,
  useToast,
} from "../shared/ui";

/** El esquema sigue al idioma: sus mensajes se pintan tal cual en el campo. */
function esquemaDe(t: Diccionario) {
  const numero = z
    .string()
    .refine((v) => v === "" || !Number.isNaN(Number(v)), t.configuracion.debeSerNumero);

  return z.object({
    codigo: z.string().trim().min(1, t.formularios.codigoObligatorio),
    nombre: z.string().trim().min(1, t.formularios.nombreObligatorio),
    pais: z.string().optional(),
    ciudad: z.string().optional(),
    direccion: z.string().optional(),
    latitud: numero,
    longitud: numero,
  });
}

type FormValues = z.infer<ReturnType<typeof esquemaDe>>;

export function SucursalFormPage() {
  const t = useT();
  const esquema = useMemo(() => esquemaDe(t), [t]);
  const { id } = useParams<{ id?: string }>();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [detectando, setDetectando] = useState(false);

  const entidadQuery = useQuery({
    queryKey: ["sucursal", id],
    queryFn: () => obtenerSucursal(id as string),
    enabled: esEdicion,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: {
      codigo: "",
      nombre: "",
      pais: "",
      ciudad: "",
      direccion: "",
      latitud: "",
      longitud: "",
    },
  });

  useEffect(() => {
    const s = entidadQuery.data;
    if (s) {
      reset({
        codigo: s.codigo,
        nombre: s.nombre,
        pais: s.pais ?? "",
        ciudad: s.ciudad ?? "",
        direccion: s.direccion ?? "",
        latitud: s.latitud === null ? "" : String(s.latitud),
        longitud: s.longitud === null ? "" : String(s.longitud),
      });
    }
  }, [entidadQuery.data, reset]);

  const guardarMut = useMutation({
    mutationFn: (v: FormValues) => {
      const datos = {
        nombre: v.nombre,
        pais: v.pais || null,
        ciudad: v.ciudad || null,
        direccion: v.direccion || null,
        latitud: v.latitud === "" ? null : Number(v.latitud),
        longitud: v.longitud === "" ? null : Number(v.longitud),
      };
      return esEdicion
        ? editarSucursal(id as string, datos)
        : crearSucursal({ codigo: v.codigo, ...datos });
    },
    onSuccess: (r) => {
      invalidarRecurso(queryClient, "sucursales", "sucursal");
      navigate(`${PATH.sucursales}/${r.id}`);
    },
    onError: (err) => setError(mensajeError(err)),
  });

  function detectarUbicacion() {
    if (!("geolocation" in navigator)) {
      setError(t.configuracion.sinGeolocalizacion);
      return;
    }
    setDetectando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue("latitud", String(Number(pos.coords.latitude.toFixed(6))), {
          shouldValidate: true,
        });
        setValue("longitud", String(Number(pos.coords.longitude.toFixed(6))), {
          shouldValidate: true,
        });
        setDetectando(false);
        toast(t.configuracion.ubicacionDetectada, "success");
      },
      () => {
        setDetectando(false);
        setError(t.configuracion.noSePudoUbicacion);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  if (esEdicion && entidadQuery.isLoading) {
    return <PageHeader title={t.formularios.sucursal.editar} description="Cargando…" />;
  }

  return (
    <>
      <PageHeader
        title={
          esEdicion
            ? `${t.formularios.sucursal.editar} — ${entidadQuery.data?.codigo ?? ""}`
            : t.formularios.sucursal.nueva
        }
        description={t.formularios.sucursal.descripcion}
      />

      <form onSubmit={handleSubmit((v) => guardarMut.mutate(v))} noValidate>
        <Card title={t.formularios.sucursal.datos}>
          <Card.Body>
            {error ? (
              <ErrorPanel title={t.formularios.sucursal.noSePudoGuardar} className="mb-4">
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
              <Field label="País" htmlFor="pais">
                <Select id="pais" placeholder={t.formularios.seleccionaPais} {...register("pais")}>
                  {PAISES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Ciudad" htmlFor="ciudad">
                <Input id="ciudad" {...register("ciudad")} />
              </Field>
              <Field label="Dirección" htmlFor="direccion" className="lg:col-span-2">
                <Input id="direccion" {...register("direccion")} />
              </Field>
              <Field
                label="Latitud"
                htmlFor="latitud"
                error={errors.latitud?.message}
                help="Entre -90 y 90."
              >
                <Input id="latitud" number {...register("latitud")} />
              </Field>
              <Field
                label="Longitud"
                htmlFor="longitud"
                error={errors.longitud?.message}
                help="Entre -180 y 180."
              >
                <Input id="longitud" number {...register("longitud")} />
              </Field>
            </FormGrid>
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                disabled={detectando}
                onClick={detectarUbicacion}
              >
                <Icon name="ubicacion" size={16} aria-hidden="true" />
                {detectando ? "Detectando…" : t.configuracion.detectarUbicacion}
              </Button>
            </div>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || guardarMut.isPending}>
            {guardarMut.isPending
              ? "Guardando…"
              : esEdicion
                ? t.formularios.guardarCambios
                : t.formularios.sucursal.crear}
          </Button>
          <ButtonLink
            variant="secondary"
            href={esEdicion ? `${PATH.sucursales}/${id}` : PATH.sucursales}
          >
            {t.comun.cancelar}
          </ButtonLink>
        </FormActions>
      </form>
    </>
  );
}
