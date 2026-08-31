# Despliegue de Rustock

Guía para quien instala y opera Rustock, no para quien lo programa. Si vienes
a tocar el código, empieza por `AGENTS.md`.

Rustock es **self-hosted**: corre en tu infraestructura, sin cuentas en la nube
ni telemetría, y los datos no salen de la máquina donde lo pongas.

---

## 1. Elige tu forma de usarlo

Rustock tiene dos caras sobre el mismo backend, y la que necesitas depende de
cuánta gente lo va a usar.

| | Para quién | Cómo se arranca |
|---|---|---|
| **Aplicación de escritorio** | Una persona, un equipo | Instala el `.deb`/`.rpm` y ábrela |
| **Servidor + navegador** | Varias personas, varios equipos | `rustock` con `RUSTOCK_WEB_ONLY=1` |

Las dos comparten la misma base de datos y las mismas reglas de negocio. La
diferencia es el transporte, no el comportamiento.

El paquete `.deb` de 0.7.0 se ha instalado y abierto: la ventana arranca, crea
el administrador por IPC de Tauri —no por HTTP— y el dashboard responde. El
paquete declara `libwebkit2gtk-4.1-0` y `libgtk-3-0`, y no deja ninguna
biblioteca sin resolver.

---

## 2. Arranque mínimo

Sin configurar nada, Rustock arranca con la base en la ruta estándar del
sistema y el API escuchando **solo en `127.0.0.1:1421`**:

```bash
RUSTOCK_WEB_ONLY=1 rustock
```

Eso es todo lo que hace falta para un equipo. La primera vez, la aplicación te
pedirá crear la cuenta de administración.

---

## 3. Configuración

Tres fuentes, de menos a más prioridad:

1. Los valores por defecto (arrancan sin tocar nada).
2. Un fichero TOML: `RUSTOCK_CONFIG`, o `rustock.toml` junto a la base.
3. Las variables de entorno `RUSTOCK_*`.

Ese orden es lo que permite hornear la configuración en una imagen de
contenedor y aun así cambiar el puerto desde el orquestador, sin reconstruir.

Copia [`rustock.example.toml`](rustock.example.toml) — está entero comentado —
y quédate con lo que necesites. **Un campo mal escrito impide arrancar y dice
cuál es**: es preferible morir en el arranque, con el operador delante, que
funcionar con un ajuste que nunca se aplicó.

### Referencia rápida

| TOML | Variable | Por defecto |
|---|---|---|
| `datos.motor` | `RUSTOCK_DB_MOTOR` | `sqlite` |
| `datos.ruta` | `RUSTOCK_DB_PATH` | ruta estándar del sistema |
| `datos.pool` | `RUSTOCK_DB_POOL` | `8` |
| `datos.busy_timeout_ms` | `RUSTOCK_DB_BUSY_TIMEOUT_MS` | `5000` |
| `http.host` | `RUSTOCK_HTTP_HOST` | `127.0.0.1` |
| `http.puerto` | `RUSTOCK_HTTP_PORT` | `1421` |
| `http.tls_cert` | `RUSTOCK_TLS_CERT` | — |
| `http.tls_key` | `RUSTOCK_TLS_KEY` | — |
| `http.cors_origenes` | `RUSTOCK_CORS_ORIGENES` | vacío |
| `sesion.ttl_minutos` | `RUSTOCK_SESION_TTL_MINUTOS` | `480` |
| `backup.directorio` | `RUSTOCK_BACKUP_DIR` | `copias/` junto a la base |
| `backup.retener` | `RUSTOCK_BACKUP_RETENER` | `7` |
| `backup.cada_horas` | `RUSTOCK_BACKUP_CADA_HORAS` | `0` (desactivado) |
| `backup.replica` | `RUSTOCK_BACKUP_REPLICA` | — |

---

## 4. Abrirlo a la red

Por defecto Rustock **no sale de la máquina**. Que otros equipos del almacén
entren es una decisión consciente, en dos pasos que van juntos:

```toml
[http]
host = "0.0.0.0"
tls_cert = "/etc/rustock/fullchain.pem"
tls_key  = "/etc/rustock/privkey.pem"
```

**Los dos pasos, no uno.** Sin TLS, las contraseñas de tu gente viajan en claro
por la red del almacén. Rustock arranca igual si omites el certificado —hay
despliegues legítimos tras un proxy inverso que ya cifra— pero lo dirá por
`stderr` en cada arranque:

```
[server] AVISO: escuchando en 0.0.0.0 SIN TLS: el tráfico, incluidas las
contraseñas, viaja en claro.
```

Si ese aviso aparece y no tienes un proxy delante, tienes un problema que
arreglar hoy.

### Con proxy inverso

Si ya tienes nginx o Caddy terminando TLS, deja Rustock en loopback y apunta el
proxy ahí. Es la opción recomendada si ya operas uno:

```nginx
location / {
    proxy_pass http://127.0.0.1:1421;
    proxy_set_header Host $host;
}
```

### CORS

Solo hace falta si el frontend lo sirve **otro** host distinto del API. Enumera
los orígenes; nunca uses `*` fuera de desarrollo:

```toml
cors_origenes = ["https://almacen.miempresa.com"]
```

---

## 5. Copias de seguridad

En un WMS el histórico de movimientos *es* el activo: el stock se puede
recontar en una tarde, la trazabilidad de quién movió qué no se reconstruye.

Desde la aplicación, con permiso `configuracion:editar` (por defecto solo
ADMIN), o por API:

```bash
curl -X POST http://127.0.0.1:1421/api/crear_copia_seguridad \
  -H "x-rustock-sesion: $TOKEN"
```

- `crear_copia_seguridad` — copia coherente sin detener la operación
- `listar_copias_seguridad` — de la más reciente a la más antigua
- `restaurar_copia_seguridad` — prepara la restauración (ver abajo)

Las copias usan la **API de backup de SQLite**, no una copia del fichero. Con
WAL activo, el `.db` en disco no contiene por sí solo el estado completo: hay
transacciones confirmadas viviendo aún en el `-wal`. Un `cp` del `.db` produce
un fichero que abre perfectamente y al que le faltan los últimos movimientos —
la peor forma de fallo, la silenciosa.

### Programarlas

Rustock las hace solo:

```toml
[backup]
cada_horas = 12
retener = 7
replica = "/mnt/nas/rustock"
```

La primera copia se hace al arrancar —con un intervalo de 24 h y un equipo que
se apaga cada noche, si no fuera así no se dispararía nunca— y luego cada
`cada_horas`. Con `retener = 7` se conservan las siete últimas y las viejas se
van solas, tanto en el directorio principal como en la réplica.

No es un cron completo a propósito: «cada N horas» es lo que una instalación
self-hosted necesita, y una sintaxis propia sería una cosa más que aprender,
que configurar mal y que mantener. Si necesitas un horario exacto, ahí está el
cron del sistema llamando a la misma operación:

```cron
0 2 * * * curl -sf -X POST http://127.0.0.1:1421/api/crear_copia_seguridad \
  -H "x-rustock-sesion: $RUSTOCK_TOKEN" || logger -t rustock "copia fallida"
```

### Réplica en otro disco

`backup.replica` deja una segunda copia en otra carpeta según se crea cada una:
otro disco, o un recurso de red montado. Una copia en el mismo disco que la
base no protege del fallo más común, que es que ese disco muera; Rustock avisa
al arrancar si la réplica apunta dentro del propio directorio de copias.

La réplica se escribe copiando el fichero ya terminado, no volcando la base dos
veces, para que las dos copias sean byte a byte la misma y no dos instantes
distintos de una base viva. Si la réplica falla, la copia principal sigue
siendo válida: se avisa por `stderr` y la operación no se pierde.

**Esto no es alta disponibilidad.** No hay réplica en caliente, ni relevo
automático, ni segunda instancia atendiendo. Es recuperación ante desastre: que
la copia sobreviva al equipo.

### Restaurar

Restaurar **no se aplica en caliente**. `restaurar_copia_seguridad` guarda
primero una copia del estado actual (por si la copia elegida no era la que
creías), deja la restauración preparada y devuelve las instrucciones. Después:

```bash
systemctl stop rustock
cd ~/.local/share/com.rustock.app
mv rustock.db.restaurar rustock.db
rm -f rustock.db-wal rustock.db-shm   # sobras de la base anterior
systemctl start rustock
```

Intercambiar el fichero bajo un pool de conexiones abiertas es justo el tipo de
listeza que corrompe una base, así que Rustock se niega a hacerlo por ti.

El `rm` del `-wal` y el `-shm` es higiene, no un requisito: cada WAL lleva una
marca que lo ata a su base, y SQLite descarta el que no le corresponde
(comprobado dejándolo a propósito: la restauración salió correcta igual).
Borrarlos evita arrastrar cientos de kilobytes de un fichero que ya no
describe nada.

### Ensayo completo, hecho

El ciclo se ha probado de punta a punta sobre una instalación con datos, no
solo en los tests:

| | Productos | Movimientos | Saldo |
|---|---|---|---|
| Estado A, antes de copiar | 4 | 7 | 13 465 |
| Estado B, tras seguir operando | 7 | 7 | 13 465 |
| **Tras restaurar la copia de A** | **4** | **7** | **13 465** |
| Tras deshacer con la copia de seguridad automática | 7 | 7 | 13 465 |

Los tres productos creados después de la copia desaparecen al restaurar y
vuelven al deshacer. `PRAGMA integrity_check` y `PRAGMA foreign_key_check`
salen limpios en ambas direcciones.

### Comprueba que tus copias sirven

Una copia que nunca se ha restaurado no es una copia, es una esperanza.
Restaura en un directorio aparte de vez en cuando:

```bash
RUSTOCK_DB_PATH=/tmp/prueba.db RUSTOCK_WEB_ONLY=1 rustock
```

---

## 6. Sesiones

Caducan por **inactividad**, no por antigüedad: a quien está trabajando no se
le corta la sesión a media tarde, pero un equipo que quedó abierto deja de
valer solo. Por defecto, 480 minutos (un turno).

```toml
[sesion]
ttl_minutos = 480
```

Los tokens viven en memoria: reiniciar Rustock cierra todas las sesiones. Es lo
correcto para una herramienta self-hosted — no hay nada que persistir ni que
revocar en otro sitio.

---

## 7. Como servicio systemd

```ini
[Unit]
Description=Rustock WMS
After=network.target

[Service]
Type=simple
User=rustock
Environment=RUSTOCK_WEB_ONLY=1
Environment=RUSTOCK_CONFIG=/etc/rustock/rustock.toml
ExecStart=/usr/bin/rustock
Restart=on-failure

# La base y las copias son lo único que Rustock necesita escribir.
ProtectSystem=strict
ReadWritePaths=/var/lib/rustock
PrivateTmp=true
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

---

## 8. Dimensionar

`datos.pool` es el número de conexiones simultáneas **y también el de hilos que
atienden peticiones**: más hilos que conexiones solo esperarían turno, y menos
dejarían conexiones ociosas. Ocho cubre de sobra un almacén con decenas de
terminales.

Si aparecen errores de *database is locked* con mucha carga de escritura, sube
`busy_timeout_ms` antes que el pool: el problema es la espera, no las
conexiones.

### Medido, no estimado

Prueba de carga real contra el binario de release, con sesiones concurrentes
haciendo lo que hace un turno —listados, dashboard, y una salida de stock del
**mismo hueco** para forzar la carrera— y comprobando al final que el saldo
cuadra:

| Usuarios a la vez | Peticiones/s | p95 lectura | p95 escritura | Errores | Saldo |
|---|---|---|---|---|---|
| 5 | 1 277 | 4–9 ms | 4–5 ms | 0 | cuadra al dígito |
| 25 | 1 243 | 26–30 ms | 26–28 ms | 0 | cuadra al dígito |

El techo (~1 250 operaciones/s) lo pone SQLite serializando escrituras, no el
número de clientes: por eso 25 usuarios rinden casi lo mismo que 5. Para
situarlo, una persona en el almacén hace del orden de una acción cada diez
segundos.

La comprobación que importa no es la velocidad sino la última columna: 12 768
salidas concurrentes del mismo hueco dejaron el saldo exacto (41 280 − 12 768 =
28 512), sin un solo negativo, y `PRAGMA integrity_check` limpio después.

El punto más lento es `obtener_dashboard` (41 ms de media con 25 usuarios,
frente a 15 ms del resto). Es el que más agrega; si algún día molesta, es el
primero a mirar.

---

## 9. Qué NO hace Rustock todavía

Dicho aquí para que nadie lo descubra en producción:

- **Solo SQLite.** `datos.motor` acepta únicamente `sqlite`. PostgreSQL está
  declarado en la configuración para que un fichero existente siga siendo
  válido el día que exista, pero pedirlo falla al arrancar con un mensaje
  claro. La capa de datos son 389 sentencias SQL y 233 firmas contra
  `rusqlite`; portarla es un proyecto en sí mismo, no un cambio de driver — el
  plan medido y por fases está en [POSTGRES.md](POSTGRES.md). Para la mayoría
  de instalaciones SQLite no es la opción pobre, es la correcta.
- **Sin alta disponibilidad.** Una instancia atendiendo, un fichero. Hay
  réplica de las copias (punto 5), que es recuperación ante desastre, no
  continuidad: si el equipo cae, Rustock deja de estar disponible hasta que lo
  levantes.
- **El planificador es «cada N horas»**, no un cron completo. Para un horario
  exacto, el cron del sistema (punto 5).
