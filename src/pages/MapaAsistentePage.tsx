/**
 * Asistente de layout base (SPEC §14, "prototipar primero"): genera en una
 * transacción el prototipo inicial del almacén — zona contenedora + pasillos
 * paralelos + racks apilados entre ellos — con geometría garantizada sin
 * solapes. La vista previa replica la MISMA fórmula geométrica del backend
 * (`mapa.rs::generar_layout_base`); si cambia allá, cambia acá.
 *
 * Solo disponible para almacenes sin zonas: es la semilla del prototipo.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { generarLayoutBase, obtenerAlmacen } from "../shared/backend";
import { invalidarRecurso } from "../shared/invalidar";
import { almacenMapa } from "../app/route-paths";
import { mensajeError } from "../shared/format";
import { useT, type Diccionario } from "../shared/i18n";
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
  Text,
  useToast,
} from "../shared/ui";

const numeroRango = (campo: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${campo} es obligatorio`)
    .refine((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= min && n <= max;
    }, `Entre ${min} y ${max} unidades`);

/** El esquema sigue al idioma: sus mensajes se pintan tal cual en el campo. */
function esquemaDe(t: Diccionario) {
  return z.object({
    ancho_recinto: numeroRango("El ancho", 200, 100000),
    profundo_recinto: numeroRango("La profundidad", 200, 100000),
    pasillos: z
      .string()
      .trim()
      .min(1, t.asistenteMapa.pasillosObligatorios)
      .refine((v) => {
        const n = Number(v);
        return Number.isInteger(n) && n >= 1 && n <= 12;
      }, "Entre 1 y 12 pasillos"),
    racks_por_bloque: z
      .string()
      .trim()
      .min(1, t.asistenteMapa.racksObligatorios)
      .refine((v) => {
        const n = Number(v);
        return Number.isInteger(n) && n >= 1 && n <= 20;
      }, t.asistenteMapa.racksRango),
  });
}

type FormValues = z.infer<ReturnType<typeof esquemaDe>>;

/** Misma fórmula que `mapa.rs` (MARGEN_RECINTO / GAP_RACKS). */
const MARGEN = 20;
const GAP = 10;

/** Valores ya convertidos a número (lo que produce el backend). */
type FormValuesNumerico = {
  ancho_recinto: number;
  profundo_recinto: number;
  pasillos: number;
  racks_por_bloque: number;
};

interface PiezaPreview {
  tipo: "zona" | "pasillo" | "rack";
  x: number;
  y: number;
  w: number;
  h: number;
}

function piezasDeLayout(v: FormValuesNumerico): PiezaPreview[] {
  const usableW = v.ancho_recinto - 2 * MARGEN;
  const usableH = v.profundo_recinto - 2 * MARGEN;
  const totalCols = v.pasillos * 2 + 1;
  const colW = usableW / totalCols;
  const rackH = (usableH - GAP * (v.racks_por_bloque + 1)) / v.racks_por_bloque;
  if (colW < 10 || rackH < 10) return [];
  const piezas: PiezaPreview[] = [
    { tipo: "zona", x: 0, y: 0, w: v.ancho_recinto, h: v.profundo_recinto },
  ];
  for (let col = 0; col < totalCols; col++) {
    const x = MARGEN + col * colW;
    if (col % 2 === 1) {
      piezas.push({ tipo: "pasillo", x, y: MARGEN, w: colW, h: usableH });
    } else {
      for (let fila = 0; fila < v.racks_por_bloque; fila++) {
        const y = MARGEN + GAP + fila * (rackH + GAP);
        piezas.push({ tipo: "rack", x, y, w: colW, h: rackH });
      }
    }
  }
  return piezas;
}

const RELLENO: Record<PiezaPreview["tipo"], string> = {
  zona: "var(--color-info-bg)",
  pasillo: "var(--color-gray-100)",
  rack: "var(--color-blue-200)",
};
const TRAZO: Record<PiezaPreview["tipo"], string> = {
  zona: "var(--color-blue-300)",
  pasillo: "var(--color-gray-400)",
  rack: "var(--color-blue-500)",
};

export function MapaAsistentePage() {
  const t = useT();
  const esquema = useMemo(() => esquemaDe(t), [t]);
  const { id: almacenId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const almacenQ = useQuery({
    queryKey: ["mapa-almacen", "almacen", almacenId],
    queryFn: () => obtenerAlmacen(almacenId!),
    enabled: !!almacenId,
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: {
      ancho_recinto: "900",
      profundo_recinto: "500",
      pasillos: "2",
      racks_por_bloque: "3",
    },
  });

  const valores = watch();
  const parsed = useMemo(() => esquema.safeParse(valores), [esquema, valores]);
  const piezas = useMemo(() => {
    if (!parsed.success) return [];
    const v = parsed.data;
    return piezasDeLayout({
      ancho_recinto: Number(v.ancho_recinto),
      profundo_recinto: Number(v.profundo_recinto),
      pasillos: Number(v.pasillos),
      racks_por_bloque: Number(v.racks_por_bloque),
    });
  }, [parsed]);
  const muyPequeno = piezas.length === 0;

  const mut = useMutation({
    mutationFn: generarLayoutBase,
    onSuccess: (resumen) => {
      invalidarRecurso(queryClient, "zonas");
      invalidarRecurso(queryClient, "pasillos");
      invalidarRecurso(queryClient, "racks");
      queryClient.invalidateQueries({ queryKey: ["mapa-almacen"] });
      toast(
        `Layout base generado: ${resumen.zonas} zona, ${resumen.pasillos} pasillos y ${resumen.racks} racks. Ajústalo a gusto en el mapa.`,
        "success",
      );
      navigate(almacenMapa(almacenId ?? ""));
    },
    onError: (err) => toast(mensajeError(err), "error"),
  });

  if (!almacenId) return null;

  return (
    <>
      <PageHeader
        title={
          almacenQ.data ? `Prototipar almacén — ${almacenQ.data.codigo}` : t.asistenteMapa.titulo
        }
        description={t.asistenteMapa.descripcion}
        actions={
          <ButtonLink variant="secondary" icon="atras" href={almacenMapa(almacenId)}>
            Volver al mapa
          </ButtonLink>
        }
      />
      <div className="asistente-layout">
        <Card title={t.asistenteMapa.medidas}>
          <Card.Body>
            <form
              onSubmit={handleSubmit((v) => {
                mut.mutate({
                  almacen_id: almacenId,
                  ancho_recinto: Number(v.ancho_recinto),
                  profundo_recinto: Number(v.profundo_recinto),
                  pasillos: Number(v.pasillos),
                  racks_por_bloque: Number(v.racks_por_bloque),
                });
              })}
            >
              <FormGrid columns={2}>
                <Field
                  label={t.asistenteMapa.ancho}
                  htmlFor="ancho_recinto"
                  error={errors.ancho_recinto?.message}
                >
                  <Input id="ancho_recinto" type="number" number {...register("ancho_recinto")} />
                </Field>
                <Field
                  label={t.asistenteMapa.profundidad}
                  htmlFor="profundo_recinto"
                  error={errors.profundo_recinto?.message}
                >
                  <Input
                    id="profundo_recinto"
                    type="number"
                    number
                    {...register("profundo_recinto")}
                  />
                </Field>
                <Field
                  label={t.asistenteMapa.pasillos}
                  htmlFor="pasillos"
                  help={t.asistenteMapa.pasillosAyuda}
                  error={errors.pasillos?.message}
                >
                  <Input id="pasillos" type="number" number {...register("pasillos")} />
                </Field>
                <Field
                  label={t.asistenteMapa.racksPorBloque}
                  htmlFor="racks_por_bloque"
                  help={t.asistenteMapa.racksAyuda}
                  error={errors.racks_por_bloque?.message}
                >
                  <Input
                    id="racks_por_bloque"
                    type="number"
                    number
                    {...register("racks_por_bloque")}
                  />
                </Field>
              </FormGrid>
              <Text as="p" size="sm" color="muted">
                Unidades de plano del mapa (10 unidades por celda de rejilla). Los códigos se
                asignan solos (Z-01, PAS-01… RACK-01…) y puedes renombrarlos después.
              </Text>
              <FormActions>
                <ButtonLink variant="secondary" href={almacenMapa(almacenId)}>
                  Cancelar
                </ButtonLink>
                <Button
                  type="submit"
                  variant="primary"
                  icon="agregar"
                  disabled={muyPequeno || mut.isPending}
                >
                  {mut.isPending ? "Generando…" : t.asistenteMapa.generar}
                </Button>
              </FormActions>
            </form>
            {muyPequeno ? (
              <ErrorPanel>
                El recinto es pequeño para tantos elementos: aumenta las medidas o reduce
                pasillos/racks.
              </ErrorPanel>
            ) : null}
          </Card.Body>
        </Card>

        <Card title={t.asistenteMapa.vistaPrevia}>
          <Card.Body>
            {!muyPequeno ? (
              <svg
                className="asistente-preview"
                viewBox={`${-MARGEN * 2} ${-MARGEN * 2} ${valores_ancho_preview(piezas)} ${valores_alto_preview(piezas)}`}
                role="img"
                aria-label={`Vista previa del layout base con ${piezas.length} elementos`}
              >
                {piezas.map((p, i) => (
                  <rect
                    key={`${p.tipo}-${i}`}
                    x={p.x}
                    y={p.y}
                    width={p.w}
                    height={p.h}
                    rx={4}
                    fill={RELLENO[p.tipo]}
                    stroke={TRAZO[p.tipo]}
                    strokeWidth={p.tipo === "zona" ? 2 : 1}
                  />
                ))}
              </svg>
            ) : (
              <Text as="p" size="sm" color="muted">
                Ajusta los valores para ver la vista previa.
              </Text>
            )}
          </Card.Body>
        </Card>
      </div>
    </>
  );
}

function valores_ancho_preview(piezas: PiezaPreview[]): number {
  const maxX = Math.max(...piezas.map((p) => p.x + p.w));
  return maxX + MARGEN * 2;
}

function valores_alto_preview(piezas: PiezaPreview[]): number {
  const maxY = Math.max(...piezas.map((p) => p.y + p.h));
  return maxY + MARGEN * 2;
}
