import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { crearSesionInventario, listarAlmacenes } from "../shared/backend";
import { esPaginado } from "../shared/types";
import { PATH, sesionInventarioDetalle } from "../app/route-paths";
import { mensajeError } from "../shared/format";
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

function ahoraLocal(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const esquema = z.object({
  tipo: z.enum(["COMPLETO", "CICLICO"]),
  almacen_id: z.string().trim().min(1, "Selecciona un almacén"),
  alcance: z.string().optional(),
  fecha_inicio: z.string().optional(),
  conteo_ciego: z.boolean(),
  exige_doble_conteo: z.boolean(),
});

type FormValues = z.infer<typeof esquema>;

export function InventarioNuevoPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const almacenesQuery = useQuery({
    queryKey: ["almacenes", "selector"],
    queryFn: () => listarAlmacenes({ page_size: 200, sort: "codigo" }),
  });
  const almacenes =
    almacenesQuery.data && esPaginado(almacenesQuery.data) ? almacenesQuery.data.data : [];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: {
      tipo: "CICLICO",
      almacen_id: "",
      alcance: "",
      fecha_inicio: ahoraLocal(),
      conteo_ciego: false,
      exige_doble_conteo: false,
    },
  });

  const crearMut = useMutation({
    mutationFn: (v: FormValues) =>
      crearSesionInventario({
        tipo: v.tipo,
        almacen_id: v.almacen_id,
        alcance: v.alcance || null,
        fecha_inicio: v.fecha_inicio ? new Date(v.fecha_inicio).toISOString() : null,
        conteo_ciego: v.conteo_ciego,
        exige_doble_conteo: v.exige_doble_conteo,
      }),
    onSuccess: (sesion) => navigate(sesionInventarioDetalle(sesion.id)),
    onError: (err) => setError(mensajeError(err)),
  });

  return (
    <>
      <PageHeader
        title="Nueva sesión de inventario"
        description="Una sesión formaliza el proceso de contar; si defines fecha de inicio queda EN_CURSO y ya admite conteos."
      />

      <form onSubmit={handleSubmit((v) => crearMut.mutate(v))} noValidate>
        <Card title="Datos generales">
          <Card.Body>
            {error ? (
              <ErrorPanel title="No se pudo crear la sesión" className="mb-4">
                {error}
              </ErrorPanel>
            ) : null}
            <FormGrid columns={2}>
              <Field label="Tipo" htmlFor="tipo" required>
                <Select id="tipo" {...register("tipo")}>
                  <option value="COMPLETO">Completo</option>
                  <option value="CICLICO">Cíclico</option>
                </Select>
              </Field>
              <Field
                label="Almacén"
                htmlFor="almacen_id"
                required
                error={errors.almacen_id?.message}
              >
                <Select id="almacen_id" placeholder="Selecciona" {...register("almacen_id")}>
                  {almacenes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.codigo} — {a.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Alcance"
                htmlFor="alcance"
                help="Criterio del conteo cíclico: zona, categoría, ubicación, etc."
              >
                <Input id="alcance" {...register("alcance")} />
              </Field>
              <Field
                label="Fecha de inicio"
                htmlFor="fecha_inicio"
                help="Vacío = queda PLANEADA (no admite conteos todavía)."
              >
                <Input id="fecha_inicio" type="datetime-local" {...register("fecha_inicio")} />
              </Field>
            </FormGrid>

            <div className="mt-4 flex flex-col gap-2">
              <Checkbox
                id="conteo_ciego"
                label="Conteo ciego (no muestra el saldo del sistema al contador)"
                {...register("conteo_ciego")}
              />
              <Checkbox
                id="exige_doble_conteo"
                label="Exige doble conteo (toda diferencia requiere un segundo conteo)"
                {...register("exige_doble_conteo")}
              />
            </div>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || crearMut.isPending}>
            {crearMut.isPending ? "Creando…" : "Crear sesión"}
          </Button>
          <ButtonLink variant="secondary" href={PATH.inventario}>
            Cancelar
          </ButtonLink>
        </FormActions>
      </form>
    </>
  );
}
