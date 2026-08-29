/**
 * Diccionario en castellano (SPEC §17).
 *
 * **Es la fuente de verdad.** El resto de idiomas se declaran con el tipo que
 * se deriva de este objeto, así que TypeScript exige las mismas claves y las
 * mismas firmas: una traducción que falte no compila.
 *
 * Las entradas que llevan datos son funciones, no plantillas con marcadores.
 * Eso da comprobación de tipos en el punto de uso —olvidar un parámetro es un
 * error de compilación— y permite que cada idioma ordene la frase como le
 * corresponda en vez de rellenar huecos en un orden impuesto por el castellano.
 */

export const es = {
  // ============ Transversal ============
  comun: {
    guardar: "Guardar",
    guardando: "Guardando…",
    cancelar: "Cancelar",
    eliminar: "Eliminar",
    editar: "Editar",
    crear: "Crear",
    duplicar: "Duplicar",
    volver: "Volver",
    cerrar: "Cerrar",
    buscar: "Buscar",
    filtrar: "Filtrar",
    limpiar: "Limpiar",
    aplicar: "Aplicar",
    exportar: "Exportar",
    imprimir: "Imprimir",
    ver: "Ver",
    todos: "Todos",
    ninguno: "Ninguno",
    si: "Sí",
    no: "No",
    activo: "Activo",
    inactivo: "Inactivo",
    cargando: "Cargando…",
    sinDatos: "Sin datos",
    opcional: "Opcional",
    requerido: "Obligatorio",
    acciones: "Acciones",
    estado: "Estado",
    codigo: "Código",
    nombre: "Nombre",
    descripcion: "Descripción",
    fecha: "Fecha",
    cantidad: "Cantidad",
    tipo: "Tipo",
    notas: "Notas",
    de: "de",
    mostrando: (p: { desde: number; hasta: number; total: number }) =>
      `Mostrando ${p.desde}–${p.hasta} de ${p.total}`,
    pagina: (p: { actual: number; total: number }) => `Página ${p.actual} de ${p.total}`,
    anterior: "Anterior",
    siguiente: "Siguiente",
  },

  // ============ Navegación ============
  nav: {
    grupos: {
      operacion: "Operación",
      catalogos: "Catálogos",
      analisis: "Análisis",
      administracion: "Administración",
      manual: "Manual",
      ayuda: "Ayuda",
      sistema: "Sistema",
    },
    dashboard: "Dashboard",
    dashboardDesc: "KPIs, movimientos recientes y alertas activas",
    movimientos: "Movimientos",
    movimientosDesc: "Entradas, salidas, traslados y ajustes de stock",
    escaner: "Escáner",
    escanerDesc: "Leer un código con la cámara o el lector de mano",
    etiquetas: "Etiquetas",
    etiquetasDesc: "Generar e imprimir códigos de barras y QR",
    capturaRapida: "Captura rápida",
    capturaRapidaDesc: "Recepción y despacho guiados por escáner",
    inventario: "Inventario físico",
    inventarioDesc: "Sesiones de conteo, diferencias y precisión",
    alertas: "Alertas",
    alertasDesc: "Stock bajo, vencimientos y pendientes de aprobación",
    almacenes: "Almacenes",
    almacenesDesc: "Zonas, racks y secciones del árbol físico",
    zonas: "Zonas",
    zonasDesc: "Divisiones lógicas o físicas dentro de un almacén",
    pasillos: "Pasillos",
    pasillosDesc: "Pasillos físicos que agrupan racks dentro de una zona",
    racks: "Racks",
    racksDesc: "Estructuras de almacenamiento dentro de una zona",
    secciones: "Secciones",
    seccionesDesc: "Subdivisiones de un rack (niveles, bahías)",
    ubicaciones: "Ubicaciones",
    ubicacionesDesc: "Puntos de almacenamiento y su contenido",
    cajas: "Cajas",
    cajasDesc: "Contenedores dentro de una ubicación que agrupan stock",
    productos: "Productos",
    productosDesc: "SKU, códigos de barras y unidades de medida",
    lotes: "Lotes",
    lotesDesc: "Origen, vencimientos y trazabilidad",
    categorias: "Categorías",
    categoriasDesc: "Clasificación jerárquica de productos",
    uoms: "Unidades de medida",
    uomsDesc: "UOM y factores de conversión",
    proveedores: "Proveedores",
    proveedoresDesc: "Origen de compras y recepciones",
    clientes: "Clientes",
    clientesDesc: "Destino de despachos y devoluciones",
    reportes: "Reportes",
    reportesDesc: "Stock, movimientos, vencimientos y auditoría",
    escaneos: "Escaneos",
    escaneosDesc: "Quién escaneó qué, etiquetas rotas e intentos fuera de rol",
    historial: "Historial",
    historialDesc: "Centro de actividad: tracking total, análisis y auditoría",
    usuarios: "Usuarios y roles",
    usuariosDesc: "Cuentas, permisos y matriz de acceso",
    sucursales: "Sucursales",
    sucursalesDesc: "Puntos de operación y su ubicación",
    reglas: "Reglas de negocio",
    reglasDesc: "Topes de peso, límites por pasillo y prohibiciones propias",
    configuracion: "Configuración",
    configuracionDesc: "Parámetros del sistema y preferencias",
    manualCliente: "Manual del Cliente",
    manualClienteDesc: "Guía completa de la lógica de negocio — 8 partes, 50 términos",
    guiaUso: "Guía de uso",
    guiaUsoDesc: "Todos los módulos, acciones y glosario de términos",
  },

  // ============ Shell ============
  shell: {
    buscarGlobal: "Buscar en todo Rustock",
    buscarGlobalAria: "Buscar en todo Rustock (Ctrl+K)",
    abrirNavegacion: "Abrir navegación",
    cerrarNavegacion: "Cerrar navegación",
    colapsarNavegacion: "Colapsar navegación",
    expandirNavegacion: "Expandir navegación",
    navegacionPrincipal: "Navegación principal",
    saltarAlContenido: "Saltar al contenido",
    migasDePan: "Migas de pan",
    escanearCodigo: "Escanear un código",
    miPerfil: (p: { nombre: string }) => `Mi perfil — ${p.nombre}`,
    alertasActivas: (p: { total: number }) =>
      p.total === 1 ? "1 alerta activa" : `${p.total} alertas activas`,
    idioma: "Idioma",
  },

  // ============ Roles ============
  roles: {
    ADMIN: "Administrador",
    GERENTE: "Gerente",
    ENCARGADO_ALMACEN: "Encargado de almacén",
    OPERADOR: "Operador",
    LECTOR: "Lector",
  },

  // ============ Acceso ============
  auth: {
    iniciarSesion: "Iniciar sesión",
    iniciarSesionDesc: "Accede con tu usuario de esta instalación de Rustock.",
    usuario: "Usuario",
    contrasena: "Contraseña",
    confirmarContrasena: "Confirmar contraseña",
    nombreCompleto: "Nombre completo",
    ingresar: "Ingresar",
    ingresando: "Ingresando…",
    noSePudoIniciar: "No se pudo iniciar sesión",
    primeraVez: "¿Primera vez usando Rustock?",
    configurarAdmin: "Configurar el administrador",
    volverAIniciar: "Volver a iniciar sesión",
    crearAdmin: "Configurar el administrador",
    crearAdminDesc:
      "Crea el usuario administrador de esta instalación. Si ya existe uno, este formulario no lo altera e inicia sesión con las credenciales indicadas.",
    crearAdminAccion: "Crear administrador e ingresar",
    creando: "Creando…",
    noSePudoCrearAdmin: "No se pudo crear el administrador",
    minimoOchoCaracteres: "Mínimo 8 caracteres.",
    mostrarContrasena: "Mostrar la contraseña",
    ocultarContrasena: "Ocultar la contraseña",
    errores: {
      usuarioObligatorio: "El usuario es obligatorio",
      contrasenaObligatoria: "La contraseña es obligatoria",
      nombreObligatorio: "El nombre completo es obligatorio",
      minimoOcho: "Mínimo 8 caracteres",
      confirmaContrasena: "Confirma la contraseña",
      noCoinciden: "Las contraseñas no coinciden",
    },
  },

  // ============ Metadatos de página (SEO) ============
  seo: {
    loginTitulo: "Iniciar sesión — Rustock",
    loginDesc:
      "Accede a tu almacén Rustock. WMS self-hosted: stock, lotes y trazabilidad en tu infraestructura.",
    adminTitulo: "Configurar administrador — Rustock",
    adminDesc: "Primer arranque de Rustock: crea el administrador y toma el control de tu almacén.",
  },

  // ============ Plataforma (PWA) ============
  plataforma: {
    sinConexion:
      "Sin conexión con el servidor. Se muestran los últimos datos cargados; los cambios no se guardarán hasta recuperar la conexión.",
    versionNueva: "Hay una versión nueva de Rustock lista para usarse.",
    actualizarAhora: "Actualizar ahora",
    aplicacion: "Aplicación",
    yaInstalada:
      "Rustock ya está instalado en este dispositivo: se abre en su propia ventana, arranca sin esperar a la red y conserva la sesión entre usos.",
    instalarDesc:
      "Instale Rustock en este dispositivo para abrirlo en su propia ventana, con arranque inmediato y sin la barra del navegador.",
    instalar: "Instalar Rustock",
    noInstalable:
      "Este navegador no ofrece la instalación de Rustock como aplicación. En Chrome o Edge aparecerá aquí un botón para instalarla en el dispositivo.",
  },
} as const satisfies Record<string, unknown>;

/**
 * Forma del diccionario. Los literales se ensanchan a `string` para que otros
 * idiomas puedan traducir sin que el tipo los ate al texto castellano.
 */
export type Diccionario = {
  [K in keyof typeof es]: {
    [S in keyof (typeof es)[K]]: (typeof es)[K][S] extends (...args: infer A) => string
      ? (...args: A) => string
      : (typeof es)[K][S] extends string
        ? string
        : {
            [T in keyof (typeof es)[K][S]]: (typeof es)[K][S][T] extends (
              ...args: infer B
            ) => string
              ? (...args: B) => string
              : string;
          };
  };
};
