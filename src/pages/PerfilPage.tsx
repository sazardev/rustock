import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import { cambiarPassword, listarTemas } from "../shared/backend";
import { PATH } from "../app/route-paths";
import {
  ZONA_HORARIA_LABEL,
  ZONAS_HORARIAS,
  type FormatoFecha,
  type TamanioFuente,
} from "../shared/types";
import { usePreferencias } from "../shared/preferencias";
import { useTema } from "../shared/tema";
import { useSession } from "../shared/session";
import { mensajeError } from "../shared/format";
import { itemsDeNav } from "../app/nav";
import { useT, type Diccionario } from "../shared/i18n";
import {
  Button,
  Card,
  Checkbox,
  DetailList,
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
  useToast,
} from "../shared/ui";
import type { IconName } from "../shared/ui";

/** Los mensajes se pintan en el campo, así que el esquema sigue al idioma. */
function esquemaPasswordDe(t: Diccionario) {
  return z
    .object({
      password_actual: z.string().min(1, t.perfil.ingresaActual),
      password_nueva: z.string().min(8, t.perfil.minimoOcho),
      confirmacion: z.string().min(1, t.perfil.confirmaNueva),
    })
    .refine((v) => v.password_nueva === v.confirmacion, {
      message: t.perfil.noCoinciden,
      path: ["confirmacion"],
    });
}

type FormPassword = z.infer<ReturnType<typeof esquemaPasswordDe>>;

export function PerfilPage() {
  const t = useT();
  const esquemaPassword = useMemo(() => esquemaPasswordDe(t), [t]);
  const usuario = useSession((s) => s.usuario);
  const cerrarSesion = useSession((s) => s.cerrarSesion);
  const preferencias = usePreferencias((s) => s.resueltas);
  const guardarPrefs = usePreferencias((s) => s.guardar);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    await cerrarSesion();
    navigate(PATH.login, { replace: true });
  }

  // ---- Orden del sidebar (solo UI; se persiste al guardar preferencias) ----
  const [orden, setOrden] = useState<string[]>(() => {
    if (!preferencias?.orden_sidebar) return itemsDeNav(t).map(({ item }) => item.href);
    try {
      const parsed: unknown = JSON.parse(preferencias.orden_sidebar);
      if (!Array.isArray(parsed)) {
        return itemsDeNav(t).map(({ item }) => item.href);
      }
      const actuales = new Set(itemsDeNav(t).map(({ item }) => item.href));
      const validos = (parsed as string[]).filter((h) => actuales.has(h));
      const faltantes = itemsDeNav(t)
        .map(({ item }) => item.href)
        .filter((h) => !validos.includes(h));
      return [...validos, ...faltantes];
    } catch {
      return itemsDeNav(t).map(({ item }) => item.href);
    }
  });

  const grupos = useMemo(() => {
    const items = itemsDeNav(t);
    const gruposUnicos = [...new Set(items.map(({ grupo }) => grupo))];
    return gruposUnicos.map((titulo) => {
      const hrefsDelGrupo = items.filter((i) => i.grupo === titulo).map(({ item }) => item.href);
      return {
        titulo,
        items: hrefsDelGrupo
          .map((href) => ({
            href,
            orden: orden.indexOf(href) >= 0 ? orden.indexOf(href) : orden.length,
            label: items.find((i) => i.item.href === href)?.item.label ?? href,
            icon:
              items.find((i) => i.item.href === href)?.item.icon ?? ("configuracion" as IconName),
          }))
          .toSorted((a, b) => a.orden - b.orden),
      };
    });
  }, [t, orden]);

  function moverItem(href: string, delta: -1 | 1) {
    setOrden((actual) => {
      const siguiente = [...actual];
      const a = siguiente.indexOf(href);
      const b = a + delta;
      if (a === -1) {
        siguiente.push(href);
        return siguiente;
      }
      if (b < 0 || b >= siguiente.length) return actual;
      [siguiente[a], siguiente[b]] = [siguiente[b], siguiente[a]];
      return siguiente;
    });
  }

  // ---- Formulario de preferencias ----
  const guardarPrefsMut = useMutation({
    mutationFn: () => {
      const cambios: {
        tamano_fuente?: string;
        orden_sidebar?: string | null;
        zona_horaria?: string | null;
        formato_fecha?: string | null;
        tema_id?: string | null;
        modo_oscuro?: boolean | null;
        ayuda_en_palette?: boolean;
      } = { orden_sidebar: JSON.stringify(orden) };
      const t = (document.getElementById("tamano_fuente") as HTMLSelectElement | null)?.value;
      const z = (document.getElementById("zona_horaria") as HTMLSelectElement | null)?.value;
      const f = (document.getElementById("formato_fecha") as HTMLSelectElement | null)?.value;
      const heredarZ = (document.getElementById("heredar_zona") as HTMLInputElement | null)
        ?.checked;
      const heredarF = (document.getElementById("heredar_formato") as HTMLInputElement | null)
        ?.checked;
      const ayudaPalette = (document.getElementById("ayuda_en_palette") as HTMLInputElement | null)
        ?.checked;
      if (t && t !== preferencias?.tamano_fuente) cambios.tamano_fuente = t;
      if (!heredarZ && z && z !== preferencias?.zona_horaria) cambios.zona_horaria = z;
      if (heredarZ && preferencias?.zona_horaria) cambios.zona_horaria = null;
      if (!heredarF && f && f !== preferencias?.formato_fecha) cambios.formato_fecha = f;
      if (heredarF && preferencias?.formato_fecha) cambios.formato_fecha = null;
      // Ayuda en el command palette: solo se envía si cambió.
      if (ayudaPalette !== undefined && ayudaPalette !== preferencias?.ayuda_en_palette) {
        cambios.ayuda_en_palette = ayudaPalette;
      }
      // Apariencia: null = heredar de la empresa; id/bool = fijar preferencia propia.
      cambios.tema_id = paletaSel;
      cambios.modo_oscuro = modoSel === null ? null : modoSel === "OSCURO";
      return guardarPrefs(cambios);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["preferencias"] });
      const ayudaPalette = (document.getElementById("ayuda_en_palette") as HTMLInputElement | null)
        ?.checked;
      if (ayudaPalette !== undefined && ayudaPalette !== preferencias?.ayuda_en_palette) {
        toast(ayudaPalette ? t.perfil.ayudaActivada : t.perfil.ayudaDesactivada, "success");
      } else {
        toast(t.perfil.preferenciasGuardadas, "success");
      }
    },
    onError: (err) => setError(mensajeError(err)),
  });

  // ---- Cambio de contraseña ----
  const passwordForm = useForm<FormPassword>({
    resolver: zodResolver(esquemaPassword),
    defaultValues: { password_actual: "", password_nueva: "", confirmacion: "" },
  });
  const cambiarPassMut = useMutation({
    mutationFn: (v: FormPassword) => cambiarPassword(v.password_actual, v.password_nueva),
    onSuccess: () => {
      passwordForm.reset();
      toast(t.perfil.actualizada, "success");
    },
    onError: (err) => setError(mensajeError(err)),
  });

  const heredaZona = !preferencias?.zona_horaria || preferencias.zona_horaria === "";
  const heredaFormato = !preferencias?.formato_fecha || preferencias.formato_fecha === "";

  // ---- Apariencia (paleta + modo, con vista previa en vivo) ----
  const temasQuery = useQuery({
    queryKey: ["temas"],
    queryFn: listarTemas,
    staleTime: Infinity,
  });
  const [paletaSel, setPaletaSel] = useState<string | null>(() =>
    preferencias?.tema_heredado ? null : (preferencias?.tema_id ?? null),
  );
  const [modoSel, setModoSel] = useState<"CLARO" | "OSCURO" | null>(() =>
    preferencias?.modo_oscuro_heredado ? null : preferencias?.modo_oscuro ? "OSCURO" : "CLARO",
  );
  useEffect(() => {
    if (!preferencias) return;
    setPaletaSel(preferencias.tema_heredado ? null : preferencias.tema_id);
    setModoSel(
      preferencias.modo_oscuro_heredado ? null : preferencias.modo_oscuro ? "OSCURO" : "CLARO",
    );
  }, [preferencias]);

  function previewTema(paleta: string | null, modo: "CLARO" | "OSCURO" | null) {
    const p = paleta ?? preferencias?.tema_id ?? "rust";
    const m = modo === null ? (preferencias?.modo_oscuro ?? false) : modo === "OSCURO";
    void useTema.getState().previsualizar(p, m);
  }

  // La apariencia (paleta + modo) se guarda al instante al elegirla — a
  // diferencia del resto de "Preferencias", no depende del botón "Guardar
  // preferencias" de abajo. Antes solo se previsualizaba, así que navegar
  // (p.ej. al dar clic en el logo) recargaba las preferencias persistidas y
  // deshacía visualmente el cambio recién elegido.
  //
  // Paleta y modo se eligen en controles separados: elegir uno justo después
  // del otro dispara dos guardados independientes que viajan en paralelo. Si
  // el de la paleta responde después del de modo, pisa el modo recién
  // guardado con el valor viejo (condición de carrera). Por eso se debounce:
  // solo el último cambio dentro de la ventana llega a la red, y ya lleva la
  // combinación final de paleta+modo.
  const guardarAparienciaMut = useMutation({
    mutationFn: (payload: { tema_id: string | null; modo_oscuro: boolean | null }) =>
      guardarPrefs(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["preferencias"] });
    },
    onError: (err) => setError(mensajeError(err)),
  });
  const guardarAparienciaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function guardarApariencia(paleta: string | null, modo: "CLARO" | "OSCURO" | null) {
    if (guardarAparienciaTimer.current) {
      clearTimeout(guardarAparienciaTimer.current);
    }
    guardarAparienciaTimer.current = setTimeout(() => {
      guardarAparienciaMut.mutate({
        tema_id: paleta,
        modo_oscuro: modo === null ? null : modo === "OSCURO",
      });
    }, 350);
  }

  useEffect(() => {
    return () => {
      if (guardarAparienciaTimer.current) {
        clearTimeout(guardarAparienciaTimer.current);
      }
    };
  }, []);

  return (
    <>
      <PageHeader
        title={t.perfil.titulo}
        description={t.perfil.descripcion}
        actions={
          <Button type="button" variant="secondary" icon="cerrarSesion" onClick={handleLogout}>
            {t.perfil.cerrarSesion}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title={t.perfil.datos}>
          <Card.Body>
            <DetailList
              items={[
                { label: t.perfil.usuario, value: usuario?.nombre_usuario ?? "—" },
                { label: t.perfil.nombreCompleto, value: usuario?.nombre_completo ?? "—" },
                { label: t.perfil.email, value: usuario?.email ?? "—" },
                {
                  label: t.perfil.rol,
                  value: t.roles[usuario?.rol_id as keyof typeof t.roles] ?? "—",
                },
              ]}
            />
          </Card.Body>
        </Card>

        <Card title={t.perfil.contrasena}>
          <Card.Body>
            <p className="mb-4 text-sm text-gray-600">{t.perfil.contrasenaIntro}</p>
            <form onSubmit={passwordForm.handleSubmit((v) => cambiarPassMut.mutate(v))} noValidate>
              <FormGrid columns={1}>
                <Field
                  label={t.perfil.actual}
                  htmlFor="password_actual"
                  error={passwordForm.formState.errors.password_actual?.message}
                >
                  <Input
                    id="password_actual"
                    type="password"
                    {...passwordForm.register("password_actual")}
                  />
                </Field>
                <Field
                  label={t.perfil.nueva}
                  htmlFor="password_nueva"
                  error={passwordForm.formState.errors.password_nueva?.message}
                >
                  <Input
                    id="password_nueva"
                    type="password"
                    {...passwordForm.register("password_nueva")}
                  />
                </Field>
                <Field
                  label={t.perfil.confirmar}
                  htmlFor="confirmacion"
                  error={passwordForm.formState.errors.confirmacion?.message}
                >
                  <Input
                    id="confirmacion"
                    type="password"
                    {...passwordForm.register("confirmacion")}
                  />
                </Field>
              </FormGrid>
              <FormActions>
                <Button type="submit" variant="primary" disabled={cambiarPassMut.isPending}>
                  {cambiarPassMut.isPending ? t.perfil.cambiando : t.perfil.cambiar}
                </Button>
              </FormActions>
            </form>
          </Card.Body>
        </Card>
      </div>

      <Card title={t.perfil.preferencias} className="mt-6">
        <Card.Body>
          {error ? (
            <ErrorPanel title={t.perfil.noSePudieronGuardar} className="mb-4">
              {error}
            </ErrorPanel>
          ) : null}
          <FormGrid columns={2}>
            <Field
              label={t.perfil.tamanoFuente}
              htmlFor="tamano_fuente"
              help={t.perfil.tamanoFuenteAyuda}
            >
              <Select
                id="tamano_fuente"
                defaultValue={preferencias?.tamano_fuente ?? "MEDIA"}
                options={(Object.keys(t.perfil.tamanos) as TamanioFuente[]).map((k) => ({
                  value: k,
                  label: t.perfil.tamanos[k],
                }))}
              />
            </Field>
            <Field
              label={t.perfil.zonaHoraria}
              htmlFor="zona_horaria"
              help={t.perfil.zonaHorariaAyuda}
            >
              <Select
                id="zona_horaria"
                defaultValue={preferencias?.zona_horaria ?? ""}
                options={[
                  { value: "", label: t.perfil.heredarEmpresa },
                  ...ZONAS_HORARIAS.map((z) => ({
                    value: z,
                    label: ZONA_HORARIA_LABEL[z] ?? z,
                  })),
                ]}
              />
            </Field>
            <Field label={t.perfil.formatoFecha} htmlFor="formato_fecha">
              <Select
                id="formato_fecha"
                defaultValue={preferencias?.formato_fecha ?? ""}
                options={[
                  { value: "", label: t.perfil.heredarEmpresa },
                  ...(Object.keys(t.perfil.formatosFecha) as FormatoFecha[]).map((k) => ({
                    value: k,
                    label: t.perfil.formatosFecha[k],
                  })),
                ]}
              />
            </Field>
          </FormGrid>
          <div className="mt-4">
            <Checkbox
              id="ayuda_en_palette"
              defaultChecked={preferencias?.ayuda_en_palette ?? true}
              label={t.perfil.ayudaEnPalette}
            />
            <p className="mt-1 text-xs text-gray-500">{t.perfil.ayudaEnPaletteDesc}</p>
          </div>
          <p className="mt-4 text-xs text-gray-500">
            {heredaZona ? t.perfil.zonaHeredada : t.perfil.zonaPropia}{" "}
            {heredaFormato ? t.perfil.formatoHeredado : t.perfil.formatoPropio}
          </p>
        </Card.Body>
      </Card>

      <Card title={t.perfil.apariencia} className="mt-6">
        <Card.Body>
          <p className="mb-4 text-sm text-gray-600">{t.perfil.aparienciaIntro}</p>
          <FormGrid columns={1}>
            <Field
              label={t.perfil.paleta}
              htmlFor="paleta"
              help={paletaSel === null ? t.perfil.paletaHeredada : undefined}
            >
              <PaletaPicker
                temas={temasQuery.data ?? []}
                seleccionado={paletaSel}
                onSeleccionar={(id) => {
                  setPaletaSel(id);
                  previewTema(id, modoSel);
                  guardarApariencia(id, modoSel);
                }}
                heredar
                onHeredar={() => {
                  setPaletaSel(null);
                  previewTema(null, modoSel);
                  guardarApariencia(null, modoSel);
                }}
                ariaLabel={t.perfil.paletaAria}
              />
            </Field>
            <Field
              label={t.perfil.modoColor}
              htmlFor="modo"
              help={modoSel === null ? t.perfil.modoHeredado : undefined}
            >
              <ModoPicker
                seleccionado={modoSel}
                onSeleccionar={(m) => {
                  setModoSel(m);
                  previewTema(paletaSel, m);
                  guardarApariencia(paletaSel, m);
                }}
                heredar
                onHeredar={() => {
                  setModoSel(null);
                  previewTema(paletaSel, null);
                  guardarApariencia(paletaSel, null);
                }}
                ariaLabel={t.perfil.modoColorAria}
              />
            </Field>
          </FormGrid>
        </Card.Body>
      </Card>

      <Card title={t.perfil.ordenPanel} className="mt-6">
        <Card.Body>
          <p className="mb-4 text-sm text-gray-600">{t.perfil.ordenPanelIntro}</p>
          {grupos.map((grupo) => (
            <div key={grupo.titulo} className="mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">{grupo.titulo}</h3>
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {grupo.items.map((item, idx, arr) => (
                  <li key={item.href} className="flex items-center gap-3 px-4 py-2">
                    <Icon name={item.icon} size={16} aria-hidden="true" />
                    <span className="flex-1 text-sm text-gray-700">{item.label}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t.perfil.subir({ nombre: item.label })}
                      disabled={idx === 0}
                      onClick={() => moverItem(item.href, -1)}
                    >
                      <Icon name="subir" size={14} aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t.perfil.bajar({ nombre: item.label })}
                      disabled={idx === arr.length - 1}
                      onClick={() => moverItem(item.href, 1)}
                    >
                      <Icon name="bajar" size={14} aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <FormActions>
            <Button
              type="button"
              variant="primary"
              disabled={guardarPrefsMut.isPending}
              onClick={() => guardarPrefsMut.mutate()}
            >
              {guardarPrefsMut.isPending ? t.comun.guardando : t.perfil.guardarPreferencias}
            </Button>
          </FormActions>
        </Card.Body>
      </Card>
    </>
  );
}
