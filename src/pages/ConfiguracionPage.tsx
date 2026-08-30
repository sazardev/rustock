import { useEffect, useMemo, useRef, useState } from "react";
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
import { useT, type Diccionario } from "../shared/i18n";
import { PATH } from "../app/route-paths";
import { usePwa } from "../shared/pwa";
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

/**
 * El esquema depende del idioma: los mensajes de validación se pintan tal cual
 * en el campo, así que se construyen con el diccionario activo en vez de vivir
 * como literales de módulo.
 */
function esquemaDe(t: Diccionario) {
  const entero = z
    .string()
    .refine(
      (v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0),
      t.configuracion.debeSerEntero,
    );
  const numero = z
    .string()
    .refine((v) => v === "" || !Number.isNaN(Number(v)), t.configuracion.debeSerNumero);

  return z.object({
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
    zona_horaria: z.string().min(1, t.configuracion.seleccionaZonaHoraria),
    formato_fecha: z.string().min(1, t.configuracion.seleccionaFormato),
    dias_aviso_vencimiento: entero,
    requiere_aprobacion: z.boolean(),
    stock_minimo_default: entero.optional(),
    tema_id: z.string().min(1, t.configuracion.seleccionaPaleta),
    modo_oscuro: z.boolean(),
  });
}

type FormValues = z.infer<ReturnType<typeof esquemaDe>>;

/** El mensaje llega de fuera: el helper es de módulo y no tiene diccionario. */
function fileToBase64(file: File, mensajeFallo: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.split(",")[1] ?? "");
    });
    reader.addEventListener("error", () => reject(new Error(mensajeFallo)));
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
  const t = useT();
  const esquema = useMemo(() => esquemaDe(t), [t]);
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
      toast(t.configuracion.guardada, "success");
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

  // ---- Logo ----
  const logoSubida = useMutation({
    mutationFn: async (file: File) => {
      const datos_base64 = await fileToBase64(file, t.configuracion.noSePudoLeerArchivo);
      return subirArchivoEmpresa({
        nombre: file.name,
        tipo: "LOGO",
        mime: file.type || "application/octet-stream",
        datos_base64,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["archivo-logo"] });
      toast(t.configuracion.logoActualizado, "success");
      if (logoInputRef.current) logoInputRef.current.value = "";
    },
    onError: (err) => setError(mensajeError(err)),
  });

  // ---- Documentos ----
  const docSubida = useMutation({
    mutationFn: async (file: File) => {
      const datos_base64 = await fileToBase64(file, t.configuracion.noSePudoLeerArchivo);
      return subirArchivoEmpresa({
        nombre: file.name,
        tipo: "DOCUMENTO",
        mime: file.type || "application/octet-stream",
        datos_base64,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["archivos-empresa"] });
      toast(t.configuracion.documentoSubido, "success");
      if (docInputRef.current) docInputRef.current.value = "";
    },
    onError: (err) => setError(mensajeError(err)),
  });
  const docEliminar = useMutation({
    mutationFn: (id: string) => eliminarArchivoEmpresa(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["archivos-empresa"] });
      toast(t.configuracion.documentoEliminado, "success");
    },
    onError: (err) => setError(mensajeError(err)),
  });

  const documentos = (docsQuery.data ?? []).filter((a) => a.tipo === "DOCUMENTO");

  if (isLoading) {
    return <PageHeader title={t.configuracion.titulo} description={t.comun.cargando} />;
  }
  if (!config && !isLoading) {
    return (
      <>
        <PageHeader title={t.configuracion.titulo} description={t.configuracion.intro} />
        <ErrorPanel title={t.configuracion.sinPermiso}>
          La configuración de la empresa la gestiona el administrador. Tus preferencias personales
          están en{" "}
          <ButtonLink variant="link" href={PATH.perfil}>
            {t.configuracion.miPerfil}
          </ButtonLink>
          .
        </ErrorPanel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t.configuracion.titulo}
        description={t.configuracion.descripcion}
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
          <ErrorPanel title={t.configuracion.noSePudoGuardar} className="mb-4">
            {error}
          </ErrorPanel>
        ) : null}

        <Card title={t.configuracion.datosEmpresa}>
          <Card.Body>
            <FormGrid columns={2}>
              <Field label={t.comun.nombre} htmlFor="nombre">
                <Input id="nombre" {...register("nombre")} />
              </Field>
              <Field label={t.comun.codigo} htmlFor="codigo" help={t.configuracion.codigoAyuda}>
                <Input id="codigo" code {...register("codigo")} />
              </Field>
              <Field label={t.campos.pais} htmlFor="pais" help={t.configuracion.paisAyuda}>
                <Select
                  id="pais"
                  placeholder={t.configuracion.seleccionaPais}
                  {...register("pais")}
                >
                  {PAISES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t.campos.ciudad} htmlFor="ciudad">
                <Input id="ciudad" {...register("ciudad")} />
              </Field>
              <Field label={t.configuracion.direccionSucursal} htmlFor="direccion">
                <Input id="direccion" {...register("direccion")} />
              </Field>
              <Field label={t.configuracion.codigoPostal} htmlFor="codigo_postal">
                <Input id="codigo_postal" code {...register("codigo_postal")} />
              </Field>
              <Field label={t.comun.descripcion} htmlFor="descripcion" className="lg:col-span-2">
                <Textarea id="descripcion" rows={2} {...register("descripcion")} />
              </Field>
            </FormGrid>
          </Card.Body>
        </Card>

        <Card title={t.configuracion.datosFiscales} className="mt-6">
          <Card.Body>
            <FormGrid columns={2}>
              <Field
                label={t.configuracion.razonSocial}
                htmlFor="razon_social"
                help={t.configuracion.razonSocialAyuda}
              >
                <Input id="razon_social" {...register("razon_social")} />
              </Field>
              <Field
                label={t.configuracion.documentoFiscal}
                htmlFor="documento_fiscal"
                help={t.configuracion.documentoFiscalAyuda}
              >
                <Input id="documento_fiscal" code {...register("documento_fiscal")} />
              </Field>
              <Field
                label={t.configuracion.direccionFiscal}
                htmlFor="direccion_fiscal"
                className="lg:col-span-2"
              >
                <Input id="direccion_fiscal" {...register("direccion_fiscal")} />
              </Field>
            </FormGrid>
          </Card.Body>
        </Card>

        <Card title={t.configuracion.contacto} className="mt-6">
          <Card.Body>
            <FormGrid columns={2}>
              <Field label={t.configuracion.telefono} htmlFor="telefono">
                <Input id="telefono" code {...register("telefono")} />
              </Field>
              <Field label={t.configuracion.emailContacto} htmlFor="email_contacto">
                <Input id="email_contacto" type="email" {...register("email_contacto")} />
              </Field>
              <Field label={t.configuracion.sitioWeb} htmlFor="sitio_web">
                <Input id="sitio_web" {...register("sitio_web")} />
              </Field>
            </FormGrid>
          </Card.Body>
        </Card>

        <Card title={t.configuracion.ubicacionMapa} className="mt-6">
          <Card.Body>
            <p className="mb-4 text-sm text-gray-600">{t.configuracion.ubicacionIntro}</p>
            <FormGrid columns={2}>
              <Field
                label={t.configuracion.latitud}
                htmlFor="latitud"
                error={errors.latitud?.message}
                help={t.configuracion.latitudAyuda}
              >
                <Input id="latitud" number {...register("latitud")} />
              </Field>
              <Field
                label={t.configuracion.longitud}
                htmlFor="longitud"
                error={errors.longitud?.message}
                help={t.configuracion.longitudAyuda}
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
                {detectando ? t.configuracion.detectando : t.configuracion.detectarUbicacion}
              </Button>
              {hayCoordenadas ? (
                <ButtonLink
                  variant="ghost"
                  href={`https://www.google.com/maps?q=${latitud},${longitud}`}
                >
                  {t.configuracion.abrirGoogleMaps}
                </ButtonLink>
              ) : null}
            </div>
            {hayCoordenadas ? (
              <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
                <iframe
                  title={t.configuracion.mapaSucursal}
                  src={osmEmbedUrl(latitud, longitud)}
                  className="h-72 w-full"
                  loading="lazy"
                  sandbox="allow-scripts allow-popups"
                />
              </div>
            ) : (
              <p className="mt-4 text-xs text-gray-500">{t.configuracion.agregaCoordenadas}</p>
            )}
          </Card.Body>
        </Card>

        <Card title={t.configuracion.parametrosGenerales} className="mt-6">
          <Card.Body>
            <FormGrid columns={2}>
              <Field
                label={t.configuracion.zonaHoraria}
                htmlFor="zona_horaria"
                required
                error={errors.zona_horaria?.message}
                help={t.configuracion.zonaHorariaAyuda}
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
                label={t.configuracion.formatoFecha}
                htmlFor="formato_fecha"
                required
                error={errors.formato_fecha?.message}
                help={t.configuracion.formatoFechaAyuda}
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
                label={t.configuracion.diasAvisoVencimiento}
                htmlFor="dias_aviso_vencimiento"
                required
                error={errors.dias_aviso_vencimiento?.message}
                help={t.configuracion.diasAvisoAyuda}
              >
                <Input
                  id="dias_aviso_vencimiento"
                  number
                  min={0}
                  {...register("dias_aviso_vencimiento")}
                />
              </Field>
              <Field
                label={t.configuracion.stockMinimoDefecto}
                htmlFor="stock_minimo_default"
                error={errors.stock_minimo_default?.message}
                help={t.configuracion.stockMinimoAyuda}
              >
                <Input
                  id="stock_minimo_default"
                  number
                  min={0}
                  placeholder={t.configuracion.sinValor}
                  {...register("stock_minimo_default")}
                />
              </Field>
            </FormGrid>
          </Card.Body>
        </Card>

        <Card title={t.configuracion.politicaOperacion} className="mt-6">
          <Card.Body>
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-1" {...register("requiere_aprobacion")} />
              <span>
                <span className="block text-sm font-medium text-gray-700">
                  {t.configuracion.requerirAprobacion}
                </span>
                <span className="block text-xs text-gray-500">
                  {t.configuracion.requerirAprobacionAyuda}
                </span>
              </span>
            </label>
          </Card.Body>
        </Card>

        <Card title={t.configuracion.apariencia} className="mt-6">
          <Card.Body>
            <p className="mb-4 text-sm text-gray-600">
              {t.configuracion.aparienciaIntro}{" "}
              <ButtonLink variant="link" href={PATH.perfil}>
                {t.configuracion.miPerfil}
              </ButtonLink>
              .
            </p>
            <FormGrid columns={1}>
              <Field
                label={t.configuracion.paleta}
                htmlFor="paleta"
                help={t.configuracion.paletaAyuda}
              >
                <PaletaPicker
                  temas={temasQuery.data ?? []}
                  seleccionado={watch("tema_id")}
                  onSeleccionar={(id) => {
                    setValue("tema_id", id, { shouldValidate: true });
                    void useTema.getState().previsualizar(id, watch("modo_oscuro"));
                  }}
                  ariaLabel={t.configuracion.paletaAria}
                />
              </Field>
              <Field label={t.configuracion.modoColor} htmlFor="modo">
                <ModoPicker
                  seleccionado={watch("modo_oscuro") ? "OSCURO" : "CLARO"}
                  onSeleccionar={(m) => {
                    setValue("modo_oscuro", m === "OSCURO", { shouldValidate: true });
                    void useTema.getState().previsualizar(watch("tema_id"), m === "OSCURO");
                  }}
                  ariaLabel={t.configuracion.modoColorAria}
                />
              </Field>
            </FormGrid>
          </Card.Body>
        </Card>

        <FormActions>
          <Button type="submit" variant="primary" disabled={isSubmitting || guardarMut.isPending}>
            {guardarMut.isPending ? t.comun.guardando : t.configuracion.guardar}
          </Button>
          <ButtonLink variant="secondary" href={PATH.dashboard}>
            {t.comun.cancelar}
          </ButtonLink>
        </FormActions>
      </form>

      <Card title={t.configuracion.logoEmpresa} className="mt-6">
        <Card.Body>
          <div className="flex items-center gap-6">
            {logoQuery.data ? (
              <img
                src={`data:${logoQuery.data.mime};base64,${logoQuery.data.datos_base64}`}
                alt={t.configuracion.logoEmpresa}
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
                  ? t.configuracion.subiendo
                  : logoQuery.data
                    ? t.configuracion.cambiarLogo
                    : t.configuracion.subirLogo}
              </Button>
              <p className="mt-2 text-xs text-gray-500">{t.configuracion.logoAyuda}</p>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card title={t.configuracion.documentosEmpresa} className="mt-6">
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
            {docSubida.isPending ? t.configuracion.subiendo : t.configuracion.subirDocumento}
          </Button>
          <p className="mt-2 text-xs text-gray-500">{t.configuracion.documentosAyuda}</p>
          {documentos.length > 0 ? (
            <ul className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
              {documentos.map((doc: ArchivoEmpresa) => (
                <li key={doc.id} className="flex items-center gap-3 px-4 py-2">
                  <Icon name="nota" size={16} aria-hidden="true" />
                  <span className="flex-1 font-mono text-sm text-gray-700">{doc.nombre}</span>
                  <span className="text-xs text-gray-500">{formatearTamano(doc.tamano)}</span>
                  <ButtonLink variant="ghost" href={`/configuracion/archivos/${doc.id}/ver`}>
                    {t.comun.ver}
                  </ButtonLink>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={docEliminar.isPending}
                    onClick={() => docEliminar.mutate(doc.id)}
                  >
                    {t.comun.eliminar}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-gray-500">{t.configuracion.sinDocumentos}</p>
          )}
        </Card.Body>
      </Card>

      <AplicacionCard />
    </>
  );
}

/**
 * Instalación de Rustock como aplicación del dispositivo. La invitación vive
 * aquí — en una página que la persona abre por decisión propia — y no como
 * un banner que interrumpe la operación (DESIGN §5.1).
 */
function AplicacionCard() {
  const t = useT();
  const instalable = usePwa((s) => s.instalable);
  const instalada = usePwa((s) => s.instalada);
  const instalar = usePwa((s) => s.instalar);

  return (
    <Card title={t.configuracion.aplicacion} className="mt-6">
      <Card.Body>
        {instalada ? (
          <p className="text-sm text-gray-500">{t.configuracion.yaInstalada}</p>
        ) : instalable ? (
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-sm text-gray-500 flex-1">{t.configuracion.invitacionInstalar}</p>
            <Button
              type="button"
              variant="secondary"
              icon="instalar"
              onClick={() => void instalar()}
            >
              {t.configuracion.instalarRustock}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">{t.configuracion.sinInstalacion}</p>
        )}
      </Card.Body>
    </Card>
  );
}

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
