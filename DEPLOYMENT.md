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

Rustock no trae planificador: usa el del sistema, que ya sabes operar.

```cron
0 2 * * * curl -sf -X POST http://127.0.0.1:1421/api/crear_copia_seguridad \
  -H "x-rustock-sesion: $RUSTOCK_TOKEN" || logger -t rustock "copia fallida"
```

Con `backup.retener = 7` se conservan las siete últimas y las viejas se van
solas.

### Restaurar

Restaurar **no se aplica en caliente**. `restaurar_copia_seguridad` guarda
primero una copia del estado actual (por si la copia elegida no era la que
creías), deja la restauración preparada y devuelve las instrucciones. Después:

```bash
systemctl stop rustock
mv ~/.local/share/com.rustock.app/rustock.db.restaurar \
   ~/.local/share/com.rustock.app/rustock.db
systemctl start rustock
```

Intercambiar el fichero bajo un pool de conexiones abiertas es justo el tipo de
listeza que corrompe una base, así que Rustock se niega a hacerlo por ti.

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

`datos.pool` es el número de conexiones simultáneas. SQLite en WAL admite
varios lectores a la vez y serializa las escrituras por su cuenta, así que
subirlo da concurrencia real de lectura. Ocho cubre de sobra un almacén con
decenas de terminales.

Si aparecen errores de *database is locked* con mucha carga de escritura, sube
`busy_timeout_ms` antes que el pool: el problema es la espera, no las
conexiones.

---

## 9. Qué NO hace Rustock todavía

Dicho aquí para que nadie lo descubra en producción:

- **Solo SQLite.** `datos.motor` acepta únicamente `sqlite`. PostgreSQL está
  declarado en la configuración para que un fichero existente siga siendo
  válido el día que exista, pero pedirlo falla al arrancar con un mensaje
  claro. La capa de datos son 439 sentencias SQL contra `rusqlite`; portarla es
  un proyecto en sí mismo, no un cambio de driver.
- **Sin replicación ni alta disponibilidad.** Una instancia, un fichero. Tu
  plan de continuidad son las copias del punto 5.
- **Sin planificador de copias integrado** (usa cron, punto 5).
- **Empaquetado solo `deb` y `rpm`.** Sin Windows ni macOS.
- **La interfaz no oculta lo que tu rol no puede hacer.** El backend rechaza
  con `SIN_PERMISO` y lo registra en auditoría —la seguridad es real—, pero un
  operador ve botones que al pulsarlos le dirán que no. Es una carencia de
  usabilidad, no de seguridad.
