import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  FORMATO_FECHA_LABEL,
  PAISES,
  ZONA_HORARIA_LABEL,
  ZONAS_HORARIAS,
  type FormatoFecha,
} from "../shared/types";
import {
  eliminarArchivoEmpresa,
  guardarConfiguracionEmpresa,
  listarArchivosEmpresa,
  listarTemas,
  obtenerConfiguracionEmpresa,
  obtenerLogoEmpresa,
  subirArchivoEmpresa,
} from "../shared/backend";
import { mensajeError } from "../shared/format";
import { usePreferencias } from "../shared/preferencias";
import { useTema } from "../shared/tema";
import { PATH } from "../app/route-paths";
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
  ModoPicker,
  PageHeader,
  PaletaPicker,
  Select,
  Textarea,
  useToast,
} from "../shared/ui";
import type { ArchivoEmpresa } from "../shared/types";

const entero = z
  .string()
  .refine(
    (v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0),
    "Debe ser un entero no negativo",
  );

const numero = z.string().refine((v) => v === "" || !Number.isNaN(Number(v)), "Debe ser un número");

const esquema = z.object({
  nombre: z.string().optional(),
  codigo: z.string().optional(),
  descripcion: z.string().optional(),
  pais: z.string().optional(),
  ciudad: z.string().optional(),
  direccion: z.string().optional(),
  codigo_postal: z.string().optional(),
  razon_social: z.string().optional(),
  documento_fiscal: z.string().optional(),
  direccion_fiscal: z.string().optional(),
  telefono: z.string().optional(),
  email_contacto: z.string().optional(),
  sitio_web: z.string().optional(),
  latitud: numero,
  longitud: numero,
  zona_horaria: z.string().min(1, "Selecciona una zona horaria"),
  formato_fecha: z.string().min(1, "Selecciona un formato"),
  dias_aviso_vencimiento: entero,
  requiere_aprobacion: z.boolean(),
  stock_minimo_default: entero.optional(),
  tema_id: z.string().min(1, "Selecciona una paleta"),
  modo_oscuro: z.boolean(),
});

type FormValues = z.infer<typeof esquema>;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.split(",")[1] ?? "");
    });
    reader.addEventListener("error", () => reject(new Error("No se pudo leer el archivo")));
    reader.readAsDataURL(file);
  });
}

/** URL del mapa embebido de OpenStreetMap para un punto (sin key). */
function osmEmbedUrl(lat: number, lng: number): string {
  const d = 0.008; // ~1 km de margen
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

/**
 * Configuración de la empresa (SPEC §4.3, §14.4, §17.1): datos generales,
 * fiscales, contacto, ubicación con mapa y los archivos (logo + documentos).
 * Todo lo edita el ADMIN (`configuracion:ver/editar`).
 */
export function ConfiguracionPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [detectando, setDetectando] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ["configuracion-empresa"],
    queryFn: obtenerConfiguracionEmpresa,
    retry: false,
  });
  const temasQuery = useQuery({
    queryKey: ["temas"],
    queryFn: listarTemas,
    staleTime: Infinity,
  });
  const logoQuery = useQuery({
    queryKey: ["archivo-logo"],
    queryFn: obtenerLogoEmpresa,
    enabled: Boolean(config),
  });
  const docsQuery = useQuery({
    queryKey: ["archivos-empresa"],
    queryFn: listarArchivosEmpresa,
    enabled: Boolean(config),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: "",
      codigo: "",
      descripcion: "",
      pais: "",
      ciudad: "",
      direccion: "",
      codigo_postal: "",
      razon_social: "",
      documento_fiscal: "",
      direccion_fiscal: "",
      telefono: "",
      email_contacto: "",
      sitio_web: "",
      latitud: "",
      longitud: "",
      zona_horaria: "America/Lima",
      formato_fecha: "DD_MMM_YYYY",
      dias_aviso_vencimiento: "30",
      requiere_aprobacion: true,
      stock_minimo_default: "",
      tema_id: "rust",
      modo_oscuro: false,
    },
  });

  useEffect(() => {
    if (config) {
      reset({
        nombre: config.nombre ?? "",
        codigo: config.codigo ?? "",
        descripcion: config.descripcion ?? "",
        pais: config.pais ?? "",
        ciudad: config.ciudad ?? "",
        direccion: config.direccion ?? "",
        codigo_postal: config.codigo_postal ?? "",
        razon_social: config.razon_social ?? "",
        documento_fiscal: config.documento_fiscal ?? "",
        direccion_fiscal: config.direccion_fiscal ?? "",
        telefono: config.telefono ?? "",
        email_contacto: config.email_contacto ?? "",
        sitio_web: config.sitio_web ?? "",
        latitud: config.latitud === null ? "" : String(config.latitud),
        longitud: config.longitud === null ? "" : String(config.longitud),
        zona_horaria: config.zona_horaria,
        formato_fecha: config.formato_fecha,
        dias_aviso_vencimiento: String(config.dias_aviso_vencimiento),
        requiere_aprobacion: config.requiere_aprobacion,
        stock_minimo_default:
          config.stock_minimo_default === null ? "" : String(config.stock_minimo_default),
        tema_id: config.tema_id,
        modo_oscuro: config.modo_oscuro,
      });
    }
  }, [config, reset]);

  const guardarMut = useMutation({
    mutationFn: (v: FormValues) =>
      guardarConfiguracionEmpresa({
        nombre: v.nombre || null,
        codigo: v.codigo || null,
        descripcion: v.descripcion || null,
        pais: v.pais || null,
        ciudad: v.ciudad || null,
        direccion: v.direccion || null,
        codigo_postal: v.codigo_postal || null,
        razon_social: v.razon_social || null,
        documento_fiscal: v.documento_fiscal || null,
        direccion_fiscal: v.direccion_fiscal || null,
        telefono: v.telefono || null,
        email_contacto: v.email_contacto || null,
        sitio_web: v.sitio_web || null,
        latitud: v.latitud === "" ? null : Number(v.latitud),
        longitud: v.longitud === "" ? null : Number(v.longitud),
        zona_horaria: v.zona_horaria,
        formato_fecha: v.formato_fecha,
        dias_aviso_vencimiento: Number(v.dias_aviso_vencimiento),
        requiere_aprobacion: v.requiere_aprobacion,
        stock_minimo_default: v.stock_minimo_default === "" ? null : Number(v.stock_minimo_default),
        tema_id: v.tema_id,
        modo_oscuro: v.modo_oscuro,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["configuracion-empresa"] });
      // Si el ADMIN no tiene preferencia propia, su tema hereda de la empresa:
      // se recargan las preferencias para re-aplicar la apariencia al instante.
      void usePreferencias.getState().refrescar();
      toast("Configuración guardada", "success");
    },
    onError: (err) => setError(mensajeError(err)),
  });

  // ---- Ubicación ----
  const latitudTexto = watch("latitud");
  const longitudTexto = watch("longitud");
  const latitud = latitudTexto === "" ? null : Number(latitudTexto);
  const longitud = longitudTexto === "" ? null : Number(longitudTexto);
  const hayCoordenadas =
    latitud !== null && longitud !== null && !Number.isNaN(latitud) && !Number.isNaN(longitud);

  function detectarUbicacion() {
    if (!("geolocation" in navigator)) {
      setError("Este navegador no expone geolocalización");
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
        toast("Ubicación detectada", "success");
      },
      () => {
        setDetectando(false);
        setError("No se pudo obtener la ubicación. Revisa los permisos del navegador.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  // ---- Logo ----
  const logoSubida = useMutation({
    mutationFn: async (file: File) => {
      const datos_base64 = await fileToBase64(file);
      return subirArchivoEmpresa({
        nombre: file.name,
        tipo: "LOGO",
        mime: file.type || "application/octet-stream",
        datos_base64,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["archivo-logo"] });
      toast("Logo actualizado", "success");
      if (logoInputRef.current) logoInputRef.current.value = "";
    },
    onError: (err) => setError(mensajeError(err)),
  });

  // ---- Documentos ----
  const docSubida = useMutation({
    mutationFn: async (file: File) => {
      const datos_base64 = await fileToBase64(file);
      return subirArchivoEmpresa({
        nombre: file.name,
        tipo: "DOCUMENTO",
        mime: file.type || "application/octet-stream",
        datos_base64,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["archivos-empresa"] });
      toast("Documento subido", "success");
      if (docInputRef.current) docInputRef.current.value = "";
    },
    onError: (err) => setError(mensajeError(err)),
  });
  const docEliminar = useMutation({
    mutationFn: (id: string) => eliminarArchivoEmpresa(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["archivos-empresa"] });
      toast("Documento eliminado", "success");
    },
    onError: (err) => setError(mensajeError(err)),
  });

  const documentos = (docsQuery.data ?? []).filter((a) => a.tipo === "DOCUMENTO");

  if (isLoading) {
    return <PageHeader title="Configuración" description="Cargando…" />;
  }
  if (!config && !isLoading) {
    return (
      <>
        <PageHeader title="Configuración" description="Parámetros de la instalación." />
        <ErrorPanel title="No tienes permiso para ver la configuración">
          La configuración de la empresa la gestiona el administrador. Tus preferencias personales
          están en{" "}
          <ButtonLink variant="link" href={PATH.perfil}>
            Mi perfil
          </ButtonLink>
          .
        </ErrorPanel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Datos de tu empresa, ubicación, archivos y parámetros globales. Solo el administrador los edita."
        actions={
          <div className="flex items-center gap-2">
            <ButtonLink variant="secondary" href="/configuracion/importar">
              <Icon name="exportar" size={16} aria-hidden="true" /> Importar datos
            </ButtonLink>
            <ButtonLink variant="secondary" href={PATH.sucursales}>
              <Icon name="ubicacion" size={16} aria-hidden="true" /> Sucursales
            </ButtonLink>
            <ButtonLink variant="primary" href={PATH.usuarios}>
              <Icon name="usuario" size={16} aria-hidden="true" /> Usuarios y roles
            </ButtonLink>
          </div>
        }
      />

      <form onSubmit={handleSubmit((v) => guardarMut.mutate(v))} noValidate>
        {error ? (
          <ErrorPanel title="No se pudo guardar la configuración" className="mb-4">
            {error}
          </ErrorPanel>
        ) : null}

        <Card title="Datos de la empresa">
          <Card.Body>
            <FormGrid columns={2}>
              <Field label="Nombre" htmlFor="nombre">
                <Input id="nombre" {...register("nombre")} />
              </Field>
              <Field label="Código" htmlFor="codigo" help="Identificador de la instalación.">
                <Input id="codigo" code {...register("codigo")} />
              </Field>
              <Field label="País" htmlFor="pais" help="Se usa para sugerir la ubicación.">
                <Select id="pais" placeholder="Selecciona un país" {...register("pais")}>
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
              <Field label="Dirección de la sucursal principal" htmlFor="direccion">
                <Input id="direccion" {...register("direccion")} />
              </Field>
              <Field label="Código postal" htmlFor="codigo_postal">
                <Input id="codigo_postal" code {...register("codigo_postal")} />
              </Field>
              <Field label="Descripción" htmlFor="descripcion" className="lg:col-span-2">
                <Textarea id="descripcion" rows={2} {...register("descripcion")} />
              </Field>
            </FormGrid>
          </Card.Body>
        </Card>

        <Card title="Datos fiscales" className="mt-6">
          <Card.Body>
            <FormGrid columns={2}>
              <Field label="Razón social" htmlFor="razon_social" help="Nombre legal de la empresa.">
                <Input id="razon_social" {...register("razon_social")} />
              </Field>
              <Field
                label="Documento fiscal"
                htmlFor="documento_fiscal"
                help="RUC, NIT, RFC o equivalente."
              >
                <Input id="documento_fiscal" code {...register("documento_fiscal")} />
              </Field>
              <Field label="Dirección fiscal" htmlFor="direccion_fiscal" className="lg:col-span-2">
                <Input id="direccion_fiscal" {...register("direccion_fiscal")} />
              </Field>
            </FormGrid>
          </Card.Body>
        </Card>

        <Card title="Contacto" className="mt-6">
          <Card.Body>
            <FormGrid columns={2}>
              <Field label="Teléfono" htmlFor="telefono">
                <Input id="telefono" code {...register("telefono")} />
              </Field>
              <Field label="Email de contacto" htmlFor="email_contacto">
                <Input id="email_contacto" type="email" {...register("email_contacto")} />
              </Field>
              <Field label="Sitio web" htmlFor="sitio_web">
                <Input id="sitio_web" {...register("sitio_web")} />
              </Field>
            </FormGrid>
          </Card.Body>
        </Card>

        <Card title="Ubicación y mapa" className="mt-6">
          <Card.Body>
            <p className="mb-4 text-sm text-gray-600">
              Detecta tu ubicación con el navegador o escríbela a mano. El mapa muestra la sucursal
              principal; el enlace abre las coordenadas en Google Maps.
            </p>
            <FormGrid columns={2}>
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
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={detectando}
                onClick={detectarUbicacion}
              >
                <Icon name="ubicacion" size={16} aria-hidden="true" />
                {detectando ? "Detectando…" : "Detectar mi ubicación"}
              </Button>
              {hayCoordenadas ? (
                <ButtonLink
                  variant="ghost"
                  href={`https://www.google.com/maps?q=${latitud},${longitud}`}
                >
                  Abrir en Google Maps
                </ButtonLink>
              ) : null}
            </div>
            {hayCoordenadas ? (
              <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
                <iframe
                  title="Mapa de la sucursal principal"
                  src={osmEmbedUrl(latitud, longitud)}
                  className="h-72 w-full"
                  loading="lazy"
                  sandbox="allow-scripts allow-popups"
                />
              </div>
            ) : (
              <p className="mt-4 text-xs text-gray-500">
                Agrega las coordenadas para ver el mapa aquí.
              </p>
            )}
          </Card.Body>
        </Card>

        <Card title="Parámetros generales" className="mt-6">
          <Card.Body>
            <FormGrid columns={2}>
              <Field
                label="Zona horaria"
                htmlFor="zona_horaria"
                required
                error={errors.zona_horaria?.message}
                help="Hora de las fechas en reportes y alertas (SPEC §14.4)."
              >
                <Select
                  id="zona_horaria"
                  options={ZONAS_HORARIAS.map((z) => ({
                    value: z,
                    label: ZONA_HORARIA_LABEL[z] ?? z,
                  }))}
                  {...register("zona_horaria")}
                />
              </Field>
              <Field
                label="Formato de fecha"
                htmlFor="formato_fecha"
                required
                error={errors.formato_fecha?.message}
                help="Formato en que se muestran las fechas (DESIGN §9.2)."
              >
                <Select
                  id="formato_fecha"
                  options={(Object.keys(FORMATO_FECHA_LABEL) as FormatoFecha[]).map((k) => ({
                    value: k,
                    label: FORMATO_FECHA_LABEL[k],
                  }))}
                  {...register("formato_fecha")}
                />
              </Field>
              <Field
                label="Días de aviso de vencimiento"
                htmlFor="dias_aviso_vencimiento"
                required
                error={errors.dias_aviso_vencimiento?.message}
                help="Horizonte de la alerta 'lote por vencer' (SPEC §17.1)."
              >
                <Input
                  id="dias_aviso_vencimiento"
                  number
                  min={0}
                  {...register("dias_aviso_vencimiento")}
                />
              </Field>
              <Field
                label="Stock mínimo por defecto"
                htmlFor="stock_minimo_default"
                error={errors.stock_minimo_default?.message}
                help="Umbral de stock bajo para productos sin stock_minimo propio."
              >
                <Input
                  id="stock_minimo_default"
                  number
                  min={0}
                  placeholder="Sin valor"
                  {...register("stock_minimo_default")}
                />
              </Field>
            </FormGrid>
          </Card.Body>
        </Card>

        <Card title="Política de operación" className="mt-6">
          <Card.Body>
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-1" {...register("requiere_aprobacion")} />
              <span>
                <span className="block text-sm font-medium text-gray-700">
                  Requerir aprobación de movimientos
                </span>
                <span className="block text-xs text-gray-500">
                  Con esto activado, los movimientos nacen en borrador y pasan por aprobación (SPEC
                  §6.2). Si se desactiva, el flujo de aprobación deja de ser obligatorio y el
                  sistema lo permite según el rol de cada usuario.
                </span>
              </span>
            </label>
          </Card.Body>
        </Card>

        <Card title="Apariencia" className="mt-6">
          <Card.Body>
            <p className="mb-4 text-sm text-gray-600">
              Paleta global de la interfaz y modo claro u oscuro (DESIGN §3.1). Los usuarios sin
              preferencia propia heredan esta apariencia; cada quien puede cambiarla en{" "}
              <ButtonLink variant="link" href={PATH.perfil}>
                Mi perfil
              </ButtonLink>
              .
            </p>
            <FormGrid columns={1}>
              <Field
                label="Paleta de colores"
                htmlFor="paleta"
                help="La vista previa se aplica al instante; se guarda con el botón de abajo."
              >
                <PaletaPicker
                  temas={temasQuery.data ?? []}
                  seleccionado={watch("tema_id")}
                  onSeleccionar={(id) => {
                    setValue("tema_id", id, { shouldValidate: true });
                    void useTema.getState().previsualizar(id, watch("modo_oscuro"));
                  }}
                  ariaLabel="Paleta de colores de la interfaz"
                />
              </Field>
              <Field label="Modo de color" htmlFor="modo">
                <ModoPicker
                  seleccionado={watch("modo_oscuro") ? "OSCURO" : "CLARO"}
                  onSeleccionar={(m) => {
                    setValue("modo_oscuro", m === "OSCURO", { shouldValidate: true });
                    void useTema.getState().previsualizar(watch("tema_id"), m === "OSCURO");
                  }}
                  ariaLabel="Modo de color de la interfaz"
                />
              </Field>
            </FormGrid>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || guardarMut.isPending}>
            {guardarMut.isPending ? "Guardando…" : "Guardar configuración"}
          </Button>
          <ButtonLink variant="secondary" href={PATH.dashboard}>
            Cancelar
          </ButtonLink>
        </FormActions>
      </form>

      <Card title="Logo de la empresa" className="mt-6">
        <Card.Body>
          <div className="flex items-center gap-6">
            {logoQuery.data ? (
              <img
                src={`data:${logoQuery.data.mime};base64,${logoQuery.data.datos_base64}`}
                alt="Logo de la empresa"
                className="h-20 w-20 rounded-lg border border-gray-200 object-contain"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-400">
                <Icon name="caja" size={24} aria-hidden="true" />
              </div>
            )}
            <div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) logoSubida.mutate(file);
                }}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={logoSubida.isPending}
                onClick={() => logoInputRef.current?.click()}
              >
                {logoSubida.isPending
                  ? "Subiendo…"
                  : logoQuery.data
                    ? "Cambiar logo"
                    : "Subir logo"}
              </Button>
              <p className="mt-2 text-xs text-gray-500">
                PNG, JPG o SVG, máximo 2 MB. Se muestra en esta página y en los encabezados.
              </p>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card title="Documentos de la empresa" className="mt-6">
        <Card.Body>
          <input
            ref={docInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) docSubida.mutate(file);
            }}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={docSubida.isPending}
            onClick={() => docInputRef.current?.click()}
          >
            <Icon name="agregar" size={16} aria-hidden="true" />
            {docSubida.isPending ? "Subiendo…" : "Subir documento"}
          </Button>
          <p className="mt-2 text-xs text-gray-500">
            Facturas, certificados o cualquier archivo de la empresa. Máximo 10 MB por documento.
          </p>
          {documentos.length > 0 ? (
            <ul className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
              {documentos.map((doc: ArchivoEmpresa) => (
                <li key={doc.id} className="flex items-center gap-3 px-4 py-2">
                  <Icon name="nota" size={16} aria-hidden="true" />
                  <span className="flex-1 font-mono text-sm text-gray-700">{doc.nombre}</span>
                  <span className="text-xs text-gray-500">{formatearTamano(doc.tamano)}</span>
                  <ButtonLink variant="ghost" href={`/configuracion/archivos/${doc.id}/ver`}>
                    Ver
                  </ButtonLink>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={docEliminar.isPending}
                    onClick={() => docEliminar.mutate(doc.id)}
                  >
                    Eliminar
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-gray-500">Aún no hay documentos.</p>
          )}
        </Card.Body>
      </Card>
    </>
  );
}

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
