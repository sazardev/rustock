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

  // ============ Etiquetas de campo compartidas ============
  // Las mismas columnas aparecen en trece catálogos: se declaran una vez.
  campos: {
    almacen: "Almacén",
    alturaZ: "Altura (Z)",
    baseDeFamilia: "Base de familia",
    capacidadMaxima: "Capacidad máxima",
    categoria: "Categoría",
    categoriaPadre: "Categoría padre",
    contacto: "Contacto",
    control: "Control",
    controlaLote: "Controla lote",
    controlaVencimiento: "Controla vencimiento",
    creado: "Creado",
    codigo: "Código",
    codigoBarras: "Código de barras",
    descripcion: "Descripción",
    direccion: "Dirección",
    email: "Email",
    esBaseDeFamilia: "Es base de su familia",
    estado: "Estado",
    etiqueta: "Etiqueta",
    factor: "Factor",
    factorConversion: "Factor de conversión",
    fechaFabricacion: "Fecha de fabricación",
    fechaVencimiento: "Fecha de vencimiento",
    loteRestringido: "Lote restringido",
    lote: "Lote",
    nivel: "Nivel",
    nombre: "Nombre",
    notas: "Notas",
    numero: "Número",
    origen: "Origen",
    pasillo: "Pasillo",
    perecedero: "Perecedero",
    pesoUnitario: "Peso unitario (kg)",
    posicionXY: "Posición (X, Y)",
    producto: "Producto",
    productoRestringido: "Producto restringido",
    rack: "Rack",
    sku: "SKU",
    stockMaximo: "Stock máximo",
    stockMinimo: "Stock mínimo",
    telefono: "Teléfono",
    tipo: "Tipo",
    uomBase: "UOM base",
    uomCompra: "UOM compra",
    uomVenta: "UOM venta",
    ubicacion: "Ubicación",
    vencimiento: "Vencimiento",
    volumenUnitario: "Volumen unitario (m³)",
    zona: "Zona",
    ultimaActualizacion: "Última actualización",
  },

  // ============ Catálogos ============
  catalogos: {
    almacenesTitulo: "Almacenes",
    almacenesDesc: "Catálogo de almacenes y su estado operativo.",
    almacenSingular: "Almacén",
    zonasTitulo: "Zonas",
    zonasDesc: "Divisiones dentro de un almacén.",
    zonaSingular: "Zona",
    pasillosTitulo: "Pasillos",
    pasillosDesc: "Pasillos que agrupan racks dentro de una zona.",
    pasilloSingular: "Pasillo",
    racksTitulo: "Racks",
    racksDesc: "Estructuras de almacenamiento dentro de una zona.",
    rackSingular: "Rack",
    seccionesTitulo: "Secciones",
    seccionesDesc: "Subdivisiones de un rack: niveles y bahías.",
    seccionSingular: "Sección",
    ubicacionesTitulo: "Ubicaciones",
    ubicacionesDesc: "Puntos de almacenamiento y su capacidad.",
    ubicacionSingular: "Ubicación",
    cajasTitulo: "Cajas",
    cajasDesc: "Contenedores dentro de una ubicación.",
    cajaSingular: "Caja",
    productosTitulo: "Productos",
    productosDesc: "Catálogo de productos, SKU y unidades de medida.",
    productoSingular: "Producto",
    lotesTitulo: "Lotes",
    lotesDesc: "Lotes con su origen y sus fechas de vencimiento.",
    loteSingular: "Lote",
    categoriasTitulo: "Categorías",
    categoriasDesc: "Clasificación jerárquica de productos.",
    categoriaSingular: "Categoría",
    uomsTitulo: "Unidades de medida",
    uomsDesc: "Unidades y factores de conversión.",
    uomSingular: "Unidad de medida",
    proveedoresTitulo: "Proveedores",
    proveedoresDesc: "Origen de compras y recepciones.",
    proveedorSingular: "Proveedor",
    clientesTitulo: "Clientes",
    clientesDesc: "Destino de despachos y devoluciones.",
    clienteSingular: "Cliente",
  },

  // ============ Listados y fichas de catálogo ============
  listado: {
    buscar: (p: { entidad: string }) => `Buscar ${p.entidad}…`,
    buscarAria: (p: { entidad: string }) => `Buscar ${p.entidad}`,
    nuevo: (p: { entidad: string }) => `Nuevo ${p.entidad}`,
    nueva: (p: { entidad: string }) => `Nueva ${p.entidad}`,
    sinRegistros: (p: { entidad: string }) => `No hay ${p.entidad} todavía`,
    sinRegistrosGenerico: "No hay registros todavía",
    creePrimero: (p: { articulo: string; entidad: string }) =>
      `Cree ${p.articulo} ${p.entidad} para comenzar a operar.`,
    noSePudoCargar: "No se pudo cargar el catálogo",
    noSePudoDesactivar: "No se pudo desactivar",
    desactivando: "Desactivando…",
    eliminarEntidad: (p: { entidad: string }) => `Eliminar ${p.entidad}`,
    eliminarDefinitivamente: "Eliminar definitivamente",
    avisoDesactivacion:
      "Rustock no borra físicamente entidades con historial: esta acción desactiva el registro. No se elimina su historial ni los movimientos asociados.",
    datosGenerales: "Datos generales",
    abrirDetalle: "Abrir detalle",
    seleccionarFila: "Seleccionar fila",
    seleccionarTodos: "Seleccionar todos",
    ordenarPor: (p: { columna: string }) => `Ordenar por ${p.columna}`,
    noEncontrado: (p: { entidad: string }) => `${p.entidad} no encontrado`,
    noEncontrada: (p: { entidad: string }) => `${p.entidad} no encontrada`,
    volverAlListado: "Volver al listado",
    noSeEncontroRegistro: "No se encontró el registro solicitado.",
  },

  // ============ Favoritos de filtro ============
  favoritos: {
    nombre: "Nombre del favorito",
    marcador: "Nombre del filtro…",
    quitar: (p: { nombre: string }) => `Quitar favorito ${p.nombre}`,
  },

  // ============ Comentarios ============
  comentarios: {
    titulo: "Comentarios",
    nuevo: "Nuevo comentario",
    marcador: "Agregar un comentario…",
    enviar: "Comentar",
    enviando: "Enviando…",
  },

  usuarios: {
    rol: "Rol",
  },

  movimientos: {
    singular: "Movimiento",
    historialCaja: "Historial de la caja",
  },

  // ============ Vocabulario del dominio ============
  // Los estados y tipos que el backend guarda como códigos y la interfaz
  // muestra como palabras. Se traducen aquí, no en el backend: el código es
  // el dato, la palabra es presentación.
  dominio: {
    tipoMovimiento: {
      ENTRADA: "Entrada",
      SALIDA: "Salida",
      TRASLADO: "Traslado",
      AJUSTE: "Ajuste",
      CONSUMO: "Consumo",
    },
    subTipoMovimiento: {
      COMPRA: "Compra",
      DEVOLUCION_CLIENTE: "Devolución de cliente",
      AJUSTE_POSITIVO: "Ajuste positivo",
      INICIAL: "Inicial",
      TRASLADO_ENTRADA: "Traslado (entrada)",
      CLIENTE: "Cliente",
      DEVOLUCION_PROVEEDOR: "Devolución a proveedor",
      MERMA: "Merma",
      AJUSTE_NEGATIVO: "Ajuste negativo",
      TRASLADO_SALIDA: "Traslado (salida)",
    },
    estadoMovimiento: {
      BORRADOR: "Borrador",
      PENDIENTE_APROBACION: "Pendiente de aprobación",
      APROBADO: "Aprobado",
      ANULADO: "Anulado",
    },
    estadoAlerta: {
      ABIERTA: "Abierta",
      RESUELTA: "Resuelta",
      IGNORADA: "Archivada",
    },
    tipoAlerta: {
      STOCK_BAJO: "Stock bajo",
      STOCK_EXCEDIDO: "Stock excedido",
      UBICACION_SOBRECAPACIDAD: "Ubicación sobrecapacidad",
      LOTE_POR_VENCER: "Lote por vencer",
      LOTE_VENCIDO: "Lote vencido",
      DIFERENCIA_INVENTARIO: "Diferencia de inventario",
      MOVIMIENTO_PENDIENTE: "Movimiento pendiente",
    },
    estadoSesion: {
      PLANEADA: "Planeada",
      EN_CURSO: "En curso",
      CERRADA: "Cerrada",
      ANULADA: "Anulada",
    },
    tipoSesion: {
      COMPLETO: "Completo",
      CICLICO: "Cíclico",
    },
    tipoDiferencia: {
      conciliado: "Conciliado",
      sobrante: "Sobrante",
      faltante: "Faltante",
    },
  },

  // ============ Movimientos ============
  mov: {
    titulo: "Movimientos",
    descripcion: "Entradas, salidas, traslados y ajustes de stock.",
    nuevo: "Nuevo movimiento",
    crearPrimero: "Crear movimiento",
    sinMovimientos: "No hay movimientos todavía",
    sinMovimientosDesc: "Registre el primer movimiento para comenzar a operar.",
    noSePudoCargar: "No se pudieron cargar los movimientos",
    todosLosTipos: "Todos los tipos",
    todosLosEstados: "Todos los estados",
    filtrarPorTipo: "Filtrar por tipo",
    filtrarPorEstado: "Filtrar por estado",
    numero: "Número",
    subTipo: "Sub-tipo",
    documento: "Documento",
    nota: "Los movimientos se aprueban en su página de detalle. Cada anulación genera un movimiento inverso.",
  },

  // ============ Errores del backend (SPEC §17.3) ============
  // La clave es el código estable que devuelve Rust; nunca cambia aunque se
  // reescriba el texto.
  errores: {
    SALDO_INSUFICIENTE: (p: { ubicacion: string; disponible: number; intentado: number }) =>
      `Saldo insuficiente en ${p.ubicacion}: ${p.disponible} disponibles, se intentaron ${p.intentado}.`,
    SALDO_NEGATIVO: (p: { ubicacion: string; producto: string }) =>
      `El saldo no puede quedar negativo en ${p.ubicacion} (producto ${p.producto}).`,
    CODIGO_DUPLICADO: (p: { codigo: string }) => `El código «${p.codigo}» ya existe.`,
    CAMPO_REQUERIDO: (p: { campo: string }) => `Falta un dato obligatorio: ${p.campo}.`,
    CAMPO_INVALIDO: (p: { campo: string }) => `Valor no válido: ${p.campo}.`,
    PASSWORD_ACTUAL_INCORRECTA: () => "La contraseña actual no coincide.",
    ULTIMO_ADMIN: () => "No se puede desactivar al último administrador activo.",
    MOTIVO_REQUERIDO: () => "El motivo es obligatorio (mínimo 3 caracteres).",
    LOTE_VENCIDO: (p: { lote: string }) =>
      `El lote ${p.lote} está vencido: no puede salir a cliente ni devolverse al proveedor.`,
    LOTE_REQUERIDO: (p: { producto: string }) =>
      `El producto ${p.producto} controla lote: todo movimiento debe indicarlo.`,
    NO_ENCONTRADO: (p: { entidad: string; id: string }) =>
      `No se encontró ${p.entidad} con identificador «${p.id}».`,
    DESACTIVAR_CON_SALDO: (p: { entidad: string }) =>
      `No se puede desactivar ${p.entidad}: todavía tiene saldo.`,
    REGLA_INCUMPLIDA: (p: { regla: string; detalle: string }) =>
      `Regla de negocio «${p.regla}»: ${p.detalle}`,
    CAPACIDAD_EXCEDIDA: (p: { ubicacion: string }) =>
      `La ubicación ${p.ubicacion} supera su capacidad máxima.`,
    SIN_PERMISO: (p: { permiso: string }) =>
      `Acción no autorizada: se requiere el permiso «${p.permiso}».`,
    NO_AUTENTICADO: () => "No hay una sesión activa: inicia sesión para continuar.",
    CREDENCIALES_INVALIDAS: () => "Usuario o contraseña incorrectos.",
    PASSWORD_DEBIL: () => "La contraseña debe tener al menos 8 caracteres.",
    FILTRO_INVALIDO: (p: { filtro: string }) =>
      `El filtro «${p.filtro}» no es válido para este recurso.`,
    CAJA_RESTRINGIDA: (p: { caja: string }) =>
      `La caja ${p.caja} está restringida a otro producto o lote.`,
    AJUSTE_BLOQUEADO_POR_INVENTARIO: (p: { ubicacion: string }) =>
      `No se puede ajustar ${p.ubicacion}: hay una sesión de inventario en curso en ese almacén. Regístralo como diferencia de la sesión.`,
    ENTIDAD_INACTIVA: (p: { entidad: string }) =>
      `${p.entidad} está inactiva y no admite esta operación.`,
    MOVIMIENTO_APROBADO_NO_EDITABLE: () => "Un movimiento aprobado no puede editarse.",
    MOVIMIENTO_APROBADO: () =>
      "Un movimiento aprobado solo puede anularse; se generará el movimiento inverso.",
    MOVIMIENTO_ANULADO: () => "Un movimiento anulado no puede volver a aprobarse.",
    TRANSICION_INVALIDA: (p: { destino: string; origen: string }) =>
      `No se puede pasar de «${p.origen}» a «${p.destino}».`,
    CON_HISTORIAL: (p: { entidad: string }) =>
      `No se puede eliminar ${p.entidad}: tiene historial asociado.`,
    CICLO_CATEGORIA: () => "La categoría no puede tener ciclos en su jerarquía.",
    SOLAPE_MAPA: (p: { tipoA: string; codigoA: string; tipoB: string; codigoB: string }) =>
      `${p.tipoA} ${p.codigoA} se solapa con ${p.tipoB} ${p.codigoB} en el mapa. Ajusta la posición o el tamaño.`,
    DIMENSION_INVALIDA: (p: { entidad: string; minimo: number }) =>
      `El tamaño de ${p.entidad} no es válido: ancho y profundidad deben superar ${p.minimo} unidades.`,
    ERROR_BASE_DE_DATOS: (p: { detalle: string }) => `Error de base de datos: ${p.detalle}`,
    ERROR_SERIALIZACION: (p: { detalle: string }) => `Error de datos: ${p.detalle}`,
    DESCONOCIDO: () => "Ha ocurrido un error inesperado.",
    sinConexion: (p: { destino: string }) =>
      `No se pudo conectar con el backend en ${p.destino}. ¿Está corriendo la aplicación?`,
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
