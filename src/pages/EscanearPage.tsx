import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { escanear } from "../shared/backend";
import type { PropositoEscaneo, ResultadoEscaneo } from "../shared/types";
import {
  abrirCamara,
  cerrarCamara,
  confirmarLectura,
  crearDecodificador,
  mensajeCamara,
  soportaCamara,
  type Decodificador,
} from "../shared/escaner";
import { mensajeError } from "../shared/format";
import { useT } from "../shared/i18n";
import { useCapturaEscaneo } from "../shared/useEscanerGlobal";
import { useEscanerGlobal } from "../shared/escaner-global";
import { PATH } from "../app/route-paths";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  ErrorPanel,
  Field,
  Icon,
  Input,
  PageHeader,
  Text,
} from "../shared/ui";

/** Cada cuánto se muestrea un fotograma. 12/s se siente instantáneo sin
 *  calentar el teléfono ni vaciar la batería en una jornada. */
const INTERVALO_MS = 80;
/** Tras leer un código, se ignora ese mismo valor durante este tiempo: evita
 *  la ráfaga de lecturas repetidas mientras la caja sigue en el encuadre. */
const REPETICION_MS = 1500;
/** Lecturas fallidas seguidas a partir de las cuales se avisa de etiqueta ilegible. */
const UMBRAL_AVISO = 3;

const TIPO_ICONO: Record<string, "producto" | "ubicacion" | "lote" | "caja"> = {
  PRODUCTO: "producto",
  UBICACION: "ubicacion",
  LOTE: "lote",
  CAJA: "caja",
};

/**
 * Escáner global (SPEC §14.3).
 *
 * Una sola pantalla para las dos formas de leer que existen en un almacén: la
 * cámara del teléfono y el lector de mano, que se comporta como un teclado.
 * El campo de texto siempre está listo y enfocado, así que un lector de mano
 * funciona sin tocar nada — la cámara es opcional y se enciende a voluntad,
 * nunca sola: encender la cámara de alguien sin que lo pida es una falta de
 * respeto, y además gasta batería.
 *
 * El escaneo **no crea ni modifica nada** (SPEC §14.3). Resuelve el código,
 * deja constancia del intento y ofrece a dónde ir.
 */
export function EscanearPage() {
  const t = useT();
  const [searchParams] = useSearchParams();
  const proposito = (searchParams.get("proposito") as PropositoEscaneo | null) ?? "CONSULTA";

  const [codigo, setCodigo] = useState("");
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [motor, setMotor] = useState<string | null>(null);
  const [ultimo, setUltimo] = useState<ResultadoEscaneo | null>(null);
  // El código tal cual se leyó: es lo que se precarga en el formulario de alta
  // cuando no existe en el catálogo.
  const [codigoUltimo, setCodigoUltimo] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lienzoRef = useRef<HTMLCanvasElement | null>(null);
  const entradaRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Evita disparar el mismo código dos veces mientras sigue en el encuadre.
  const ultimoValorRef = useRef<{ valor: string; momento: number }>({ valor: "", momento: 0 });

  const mutacion = useMutation({
    mutationFn: escanear,
    onSuccess: (resultado, variables) => {
      // El acuse de recibo llega por el oído y por la mano: quien escanea está
      // mirando la caja, no la pantalla.
      confirmarLectura(resultado.resultado === "RESUELTO");
      setUltimo(resultado);
      setCodigoUltimo(variables.codigo);
      setCodigo("");
      entradaRef.current?.focus();
    },
    onError: () => confirmarLectura(false),
  });
  const { mutate } = mutacion;

  const enviar = useCallback(
    (valor: string, origen: "CAMARA" | "TECLADO", formato?: string) => {
      const limpio = valor.trim();
      if (!limpio) return;
      mutate({
        codigo: limpio,
        origen,
        formato: formato ?? null,
        proposito,
        ruta: `${window.location.pathname}${window.location.search}`,
        dispositivo: navigator.userAgent,
      });
    },
    [mutate, proposito],
  );

  // El lector de mano escribe y pulsa Enter: el campo está siempre enfocado
  // para que funcione sin que nadie toque la pantalla.
  useEffect(() => {
    entradaRef.current?.focus();
  }, []);

  // Si el foco se pierde (alguien pulsa un botón), la escucha global sigue
  // capturando la ráfaga del lector y la entrega aquí en vez de navegar a
  // otra pantalla: estando en el escáner, los códigos son suyos.
  useCapturaEscaneo(useCallback((codigo: string) => enviar(codigo, "TECLADO"), [enviar]));

  // Ciclo de vida de la cámara. Se apaga siempre al salir de la pantalla:
  // una cámara encendida en segundo plano es una cámara olvidada.
  useEffect(() => {
    if (!camaraActiva) return;
    let cancelado = false;
    let temporizador: number | undefined;
    let decodificador: Decodificador | null = null;

    async function arrancar() {
      try {
        const [stream, dec] = await Promise.all([abrirCamara(), crearDecodificador()]);
        if (cancelado) {
          cerrarCamara(stream);
          return;
        }
        streamRef.current = stream;
        decodificador = dec;
        setMotor(dec.motor);
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        temporizador = window.setInterval(muestrear, INTERVALO_MS);
      } catch (error) {
        if (!cancelado) {
          setErrorCamara(mensajeCamara(error));
          setCamaraActiva(false);
        }
      }
    }

    async function muestrear() {
      const video = videoRef.current;
      const lienzo = lienzoRef.current;
      if (!video || !lienzo || !decodificador || video.readyState < 2) return;
      lienzo.width = video.videoWidth;
      lienzo.height = video.videoHeight;
      const contexto = lienzo.getContext("2d", { willReadFrequently: true });
      if (!contexto) return;
      contexto.drawImage(video, 0, 0, lienzo.width, lienzo.height);
      try {
        const leido = await decodificador.leer(lienzo);
        if (!leido || cancelado) return;
        const previo = ultimoValorRef.current;
        const ahora = Date.now();
        // Mismo código todavía en el encuadre: se ignora. Sin esto, una caja
        // apoyada frente a la cámara generaría una lectura cada 80 ms.
        if (leido.valor === previo.valor && ahora - previo.momento < REPETICION_MS) return;
        ultimoValorRef.current = { valor: leido.valor, momento: ahora };
        enviar(leido.valor, "CAMARA", leido.formato);
      } catch {
        // Un fotograma ilegible es lo normal: se descarta y se sigue.
      }
    }

    void arrancar();
    return () => {
      cancelado = true;
      if (temporizador) window.clearInterval(temporizador);
      cerrarCamara(streamRef.current);
      streamRef.current = null;
      ultimoValorRef.current = { valor: "", momento: 0 };
    };
  }, [camaraActiva, enviar]);

  const lectorDetectado = useEscanerGlobal((s) => s.detectado);
  const resuelto = ultimo?.resuelto ?? null;
  const avisoIlegible = (ultimo?.fallos_recientes ?? 0) >= UMBRAL_AVISO;

  return (
    <>
      <PageHeader
        title={t.escaner.titulo}
        description={t.escaner.descripcion}
        actions={
          soportaCamara() ? (
            <Button
              variant={camaraActiva ? "secondary" : "primary"}
              icon={camaraActiva ? "cerrarPanel" : "codigoBarras"}
              onClick={() => {
                setErrorCamara(null);
                setCamaraActiva((v) => !v);
              }}
            >
              {camaraActiva ? t.escaner.apagarCamara : t.escaner.usarCamara}
            </Button>
          ) : null
        }
      />

      {errorCamara ? <ErrorPanel title={t.escaner.noSePudoCamara}>{errorCamara}</ErrorPanel> : null}

      {camaraActiva ? (
        <Card title={t.escaner.camara}>
          <Card.Body>
            <div className="escaner__visor">
              <video ref={videoRef} className="escaner__video" muted playsInline />
              <div className="escaner__mira" aria-hidden="true" />
            </div>
            <canvas ref={lienzoRef} className="escaner__lienzo" aria-hidden="true" />
            <Text as="p" size="sm" color="muted" className="mt-2">
              {t.escaner.encuadra}
              {motor === "wasm" ? t.escaner.motorRespaldo : ""}
            </Text>
          </Card.Body>
        </Card>
      ) : null}

      <Card title={t.escaner.codigo}>
        <Card.Body>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              enviar(codigo, "TECLADO");
            }}
          >
            <Field label={t.escaner.codigo} htmlFor="codigo" help={t.escaner.codigoAyuda}>
              <Input
                id="codigo"
                ref={entradaRef}
                value={codigo}
                autoComplete="off"
                code
                placeholder={t.escaner.codigoMarcador}
                onChange={(e) => setCodigo(e.target.value)}
              />
            </Field>
            <div>
              <Button
                type="submit"
                variant="primary"
                disabled={mutacion.isPending || !codigo.trim()}
              >
                {mutacion.isPending ? t.escaner.resolviendo : t.escaner.resolver}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>

      {mutacion.error ? (
        <ErrorPanel title={t.escaner.noSePudoEscanear}>{mensajeError(mutacion.error)}</ErrorPanel>
      ) : null}

      {ultimo ? (
        <Card title={t.escaner.ultimaLectura}>
          <Card.Body>
            <div className="escaner__resultado">
              <Icon
                name={resuelto ? (TIPO_ICONO[resuelto.tipo] ?? "caja") : "alerta"}
                size={20}
                className="escaner__resultado-icono"
                aria-hidden="true"
              />
              <div className="escaner__resultado-texto">
                <Badge tone={resuelto ? "success" : "warning"}>
                  {resuelto ? resuelto.tipo : t.escaner.sinCoincidencia}
                </Badge>
                <p className="escaner__resultado-etiqueta">
                  {resuelto ? resuelto.etiqueta : ultimo.motivo}
                </p>
              </div>
            </div>

            {/* Las acciones y sus destinos los decide el backend, que sabe qué
                existe y qué permisos tiene quien escanea. Ofrecerlas desde aquí
                acabaría proponiendo cosas que luego se deniegan. */}
            {ultimo.acciones.length > 0 ? (
              <div className="escaner__acciones">
                {ultimo.acciones.map((accion) => (
                  <ButtonLink
                    key={accion.clave}
                    variant={accion.principal ? "primary" : "secondary"}
                    href={
                      accion.clave.startsWith("alta_")
                        ? `${accion.href}?codigo=${encodeURIComponent(ultimo.resuelto?.etiqueta ?? codigoUltimo)}`
                        : accion.href
                    }
                  >
                    {accion.etiqueta}
                  </ButtonLink>
                ))}
              </div>
            ) : null}

            {avisoIlegible ? (
              <Text as="p" size="sm" color="muted" className="mt-4">
                {t.escaner.avisoIlegible({ fallos: ultimo?.fallos_recientes ?? 0 })}
              </Text>
            ) : null}
          </Card.Body>
        </Card>
      ) : null}

      <Card title={t.escaner.queSePuedeLeer}>
        <Card.Body>
          <Text as="p" size="sm" color="muted">
            {t.escaner.ordenDeResolucion}
          </Text>
          <Text as="p" size="sm" color="muted" className="mt-2">
            {lectorDetectado ? t.escaner.lectorDetectado : t.escaner.lectorNoDetectado}
          </Text>
          <div className="mt-4">
            <ButtonLink variant="secondary" href={PATH.movimientosNuevo}>
              {t.escaner.registrarMovimiento}
            </ButtonLink>
          </div>
        </Card.Body>
      </Card>
    </>
  );
}
