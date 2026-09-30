/** Constantes de la caminata en primera persona. Distancias en cm (unidad del
 * modelo) y tiempos en segundos, salvo que se indique otra cosa. */

/** Radio del cuerpo para colisionar (cm). */
export const RADIO_CUERPO_CM = 30;
/** Velocidades (cm/s): paso normal y carrera. */
export const VELOCIDAD_CAMINAR_CMS = 140;
export const VELOCIDAD_CORRER_CMS = 250;
/** Al ir agachado se avanza más despacio (fracción de la velocidad). */
export const FACTOR_VELOCIDAD_AGACHADO = 0.6;
/** Aceleración al pulsar y frenado al soltar (cm/s²). */
export const ACELERACION_CMS2 = 700;
export const FRENADO_CMS2 = 1100;
/** Distancia máxima por subpaso de colisión (cm): menor que el radio, así no
 * se atraviesa un rack ni en diagonal a la velocidad máxima. */
export const SUBPASO_MAX_CM = 10;

/** Los ojos están `altura_persona - 10` cm; agachado bajan a esta fracción. */
export const DESCUENTO_OJOS_CM = 10;
export const FACTOR_AGACHADO = 0.55;
/** Suavizado de la altura de ojos (1/s). */
export const SUAVIZADO_OJOS = 9;

/** Límite de cabeceo (radianes): +-85 grados. */
export const LIMITE_CABECEO = (85 * Math.PI) / 180;
/** Sensibilidad base del ratón (rad por píxel) y del mirar táctil/mando. */
export const RAD_POR_PIXEL = 0.0022;
export const FACTOR_MIRAR_TACTIL = 1.6;
export const VELOCIDAD_MIRAR_MANDO = 2.4;

/** Las ubicaciones de piso más altas que esto (cm) bloquean el paso. */
export const ALTURA_OBSTACULO_CM = 100;
/** Margen alrededor del layout por el que se puede caminar (cm). */
export const MARGEN_LIMITE_CM = 100;

/** Alcance del rótulo de lo que se mira (cm) y frecuencia de la consulta (s). */
export const ALCANCE_MIRADA_CM = 600;
export const PERIODO_CONSULTA_S = 0.1;

/** Duración de la vuelta a la cámara previa al salir (s). */
export const DURACION_SALIDA_S = 0.7;
/** Zona muerta de sticks y joystick (0-1). */
export const ZONA_MUERTA = 0.15;

/** Entorno de la caminata (metros): la niebla empieza a `NIEBLA_CERCA_M` y lo
 * tapa todo a `NIEBLA_LEJOS_M`, de modo que el horizonte se funde con el cielo. */
export const NIEBLA_CERCA_M = 16;
export const NIEBLA_LEJOS_M = 85;
/** Radio del cielo y del piso infinito (menor que el plano lejano de la camara). */
export const RADIO_CIELO_M = 420;
/** Muro perimetral bajo: altura y grosor (m). */
export const ALTO_MURO_M = 1.1;
export const GROSOR_MURO_M = 0.14;
