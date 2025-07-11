import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import db from './conexion.js'; // Asegúrate de que la ruta a tu archivo de conexión a la DB sea correcta
import jwt from 'jsonwebtoken';

dotenv.config();
const app = express();

// ================== CONFIGURACIÓN INICIAL ==================
const PEDIDOS_PORT = process.env.PEDIDOS_PORT || 5004;
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ================== MIDDLEWARES ==================
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Para manejar datos de formularios URL-encoded
app.use(cors({
  origin: FRONTEND_URL, // Usar la variable de entorno para el origen del frontend
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware de logging mejorado
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Inicio (Servicio Pedidos)`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms) (Servicio Pedidos)`);
  });
  next();
});

// Middleware de autenticación (solo valida el token y adjunta el usuario)
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log("[authenticateJWT - Pedidos] Token no proporcionado o formato incorrecto.");
    return res.status(401).json({
      success: false,
      message: "Token de autorización no proporcionado o formato incorrecto"
    });
  }

  const token = authHeader.split(' ')[1];
  console.log("[authenticateJWT - Pedidos] Token recibido. Verificando...");

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("[authenticateJWT - Pedidos] Error al verificar token JWT:", err.message);
      return res.status(403).json({
        success: false,
        message: "Token inválido o expirado"
      });
    }
    req.user = user;
    console.log("[authenticateJWT - Pedidos] Token verificado exitosamente. req.user:", req.user);
    next();
  });
};

// Middleware de autorización para Bodegueros
const authorizeBodeguero = (req, res, next) => {
  console.log("[authorizeBodeguero - Pedidos] Verificando autorización para Bodeguero. req.user:", req.user);
  if (req.user && req.user.esEmpleado && req.user.cargo === 'Bodeguero') {
    console.log("[authorizeBodeguero - Pedidos] Autorización CONCEDIDA: Es un Bodeguero.");
    next();
  } else {
    console.log("[authorizeBodeguero - Pedidos] Autorización DENEGADA: No es Bodeguero o usuario no encontrado.");
    return res.status(403).json({ success: false, message: "Acceso denegado. Se requiere rol de Bodeguero." });
  }
};

// Middleware de autorización para Vendedores
const authorizeVendedor = (req, res, next) => {
  console.log("[authorizeVendedor - Pedidos] Verificando autorización para Vendedor. req.user:", req.user);
  if (req.user && req.user.esEmpleado && req.user.cargo === 'Vendedor') {
    console.log("[authorizeVendedor - Pedidos] Autorización CONCEDIDA: Es un Vendedor.");
    next();
  } else {
    console.log("[authorizeVendedor - Pedidos] Autorización DENEGADA: No es Vendedor o usuario no encontrado.");
    return res.status(403).json({ success: false, message: "Acceso denegado. Se requiere rol de Vendedor." });
  }
};

// Middleware de autorización (verifica rol de empleado - general para cualquier empleado)
const authorizeEmpleado = (req, res, next) => {
  console.log("[authorizeEmpleado - Pedidos] Verificando autorización para Empleado. req.user:", req.user);
  if (req.user && req.user.esEmpleado) {
    console.log("[authorizeEmpleado - Pedidos] Autorización CONCEDIDA: Es un Empleado.");
    next();
  } else {
    console.log("[authorizeEmpleado - Pedidos] Autorización DENEGADA: No es Empleado o usuario no encontrado.");
    return res.status(403).json({
      success: false,
      message: "Acceso denegado. Se requiere rol de empleado."
    });
  }
};

// ================== RUTAS DE PEDIDOS ==================

// Health Check para pedidosServices
app.get('/api/health', async (req, res) => {
  try {
    const [dbResult] = await db.query('SELECT 1 AS db_status');
    res.json({
      status: 'healthy',
      db: dbResult[0].db_status === 1 ? 'connected' : 'unexpected_response',
      uptime: process.uptime()
    });
  } catch (err) {
    res.status(500).json({
      status: 'unhealthy',
      error: err.message
    });
  }
});

// RUTA PARA REGISTRAR UN NUEVO PEDIDO (usada por VendedorPanel.jsx)
app.post('/api/pedidos', authenticateJWT, authorizeVendedor, async (req, res) => {
  const { cliente_id, cliente_rut, metodo_pago, items, sucursal_retiro_id, estado } = req.body; // Añadido cliente_rut y estado
  const empleado_id = req.user.id; // ID del empleado que registra la venta (del token)
  const sucursal_empleado_id = req.user.sucursal_id; // Sucursal del empleado (del token)

  let final_estado_pedido = estado; // Por defecto, usa el estado enviado por el frontend
  let stock_update_sucursal_id; // Variable para la sucursal de la que se descontará el stock

  // Si sucursal_retiro_id es null o undefined, asumimos que es una venta presencial
  // y forzamos el estado a 'completado'.
  if (sucursal_retiro_id === null || sucursal_retiro_id === undefined) {
    final_estado_pedido = 'Completado'; // Usar 'Completado' con mayúscula inicial si tus estados son así
    stock_update_sucursal_id = sucursal_empleado_id; // Para venta presencial, descontar de la sucursal del empleado
    console.log("Detectada venta presencial (sucursal_retiro_id es null/undefined), forzando estado a 'Completado' y descontando stock de la sucursal del empleado.");
  } else {
    console.log("Detectado pedido con sucursal de retiro, usando estado recibido:", estado);
    stock_update_sucursal_id = sucursal_retiro_id; // Para pedidos con retiro, descontar de la sucursal de retiro
    // Asegurarse de que el estado enviado para pedidos con retiro sea válido, si no, usar 'Pendiente'
    const estadosValidosPedido = ['Pendiente', 'Preparando', 'Listo para retiro', 'En despacho', 'Entregado', 'Cancelado', 'procesado']; // Añadido 'procesado'
    if (!estadosValidosPedido.includes(final_estado_pedido)) {
        final_estado_pedido = 'Pendiente';
        console.warn(`Estado inválido recibido para pedido con retiro (${estado}). Estableciendo a 'Pendiente'.`);
    }
  }

  if (!empleado_id || !metodo_pago || !items || items.length === 0) {
    return res.status(400).json({ success: false, message: "Datos de pedido incompletos." });
  }

  // Validar que tenemos una sucursal para descontar stock
  if (!stock_update_sucursal_id) {
    return res.status(400).json({ success: false, message: "No se pudo determinar la sucursal para descontar el stock." });
  }

  // Calcular el total de la venta
  let total = 0;
  // Validar ítems y calcular monto total
  for (const item of items) {
    if (!item.producto_id || item.cantidad === undefined || item.precio_unitario === undefined) {
      return res.status(400).json({ success: false, message: 'Cada item del pedido debe tener producto_id, cantidad y precio_unitario.' });
    }
    if (item.cantidad <= 0) {
      return res.status(400).json({ success: false, message: 'La cantidad de cada producto debe ser mayor a cero.' });
    }
    total += item.cantidad * item.precio_unitario;
  }

  let connection;
  try {
    connection = await db.getConnection(); // Obtener una conexión del pool
    await connection.beginTransaction(); // Iniciar transacción

    // 1. Insertar el pedido en la tabla 'pedidos'
    const [pedidoResult] = await connection.query(
      `INSERT INTO pedidos (cliente_id, cliente_rut, empleado_id, sucursal_id, sucursal_retiro_id, fecha, total, metodo_pago, estado) 
       VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [cliente_id, cliente_rut, empleado_id, sucursal_empleado_id, sucursal_retiro_id || null, total, metodo_pago, final_estado_pedido]
    );
    const pedido_id = pedidoResult.insertId;

    // 2. Insertar los ítems del pedido en 'detalle_pedido' y actualizar el stock de productos
    for (const item of items) {
      // Verificar stock actual y precio del producto en la tabla sucursal_productos_stock
      const [productStockRows] = await connection.query(
        `SELECT sps.stock_cantidad, p.precio 
         FROM sucursal_productos_stock sps
         JOIN productos p ON sps.producto_id = p.id
         WHERE sps.producto_id = ? AND sps.sucursal_id = ?`,
        [item.producto_id, stock_update_sucursal_id] // Usar la sucursal_id determinada
      );

      if (productStockRows.length === 0) {
        throw new Error(`Producto con ID ${item.producto_id} no encontrado en la sucursal ${stock_update_sucursal_id} o no tiene stock registrado.`);
      }

      const currentStock = productStockRows[0].stock_cantidad; // Leer stock_cantidad
      const productPrice = productStockRows[0].precio;

      if (currentStock < item.cantidad) {
        throw new Error(`Stock insuficiente para el producto ID ${item.producto_id} en la sucursal ${stock_update_sucursal_id}. Stock actual: ${currentStock}, Solicitado: ${item.cantidad}`);
      }
      
      // Verificar si el precio unitario del frontend coincide con el precio del producto en DB
      if (parseFloat(item.precio_unitario) !== parseFloat(productPrice)) {
          console.warn(`Discrepancia de precio para producto ID ${item.producto_id}: Frontend ${item.precio_unitario}, DB ${productPrice}. Usando precio de DB.`);
          item.precio_unitario = productPrice; // Usar el precio de la base de datos
      }

      await connection.query(
        `INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unitario) 
         VALUES (?, ?, ?, ?)`,
        [pedido_id, item.producto_id, item.cantidad, item.precio_unitario]
      );

      // Descontar stock de la tabla 'sucursal_productos_stock'
      console.log(`Attempting to update stock: product_id=${item.producto_id}, sucursal_id=${stock_update_sucursal_id}, quantity_to_subtract=${item.cantidad}`); // Log para depuración
      await connection.query(
        `UPDATE sucursal_productos_stock SET stock_cantidad = stock_cantidad - ? 
         WHERE producto_id = ? AND sucursal_id = ?`,
        [Number(item.cantidad), item.producto_id, stock_update_sucursal_id] // CAMBIO: Conversión explícita a Number
      );
    }

    // 3. Insertar el pago en la tabla 'pagos'
    await connection.query(
      `INSERT INTO pagos (pedido_id, cliente_id, monto, metodo_pago, fecha, estado, referencia)
       VALUES (?, ?, ?, ?, NOW(), ?, ?)`,
      [pedido_id, cliente_id, total, metodo_pago, 'Completado', `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`] // Estado de pago 'Completado'
    );

    await connection.commit();
    res.status(201).json({ success: true, message: "Pedido registrado exitosamente.", pedido_id });

  } catch (error) {
    if (connection) {
        await connection.rollback(); // Revertir la transacción en caso de error
        console.error('Transacción de pedido/pago revertida.');
    }
    console.error("Error al registrar el pedido:", error);
    res.status(500).json({ success: false, message: "Error al registrar el pedido: " + error.message });
  } finally {
    if (connection) {
        connection.release(); // Liberar la conexión
    }
  }
});


// RUTA PARA QUE EL BODEGUERO VEA LOS PEDIDOS DE SU SUCURSAL
app.get('/api/pedidos/sucursal/:sucursal_id', authenticateJWT, authorizeBodeguero, async (req, res) => {
  console.log(`[GET /api/pedidos/sucursal/:sucursal_id] Solicitud recibida para sucursal_id: ${req.params.sucursal_id}`);
  const { sucursal_id } = req.params;
  const user = req.user; // Usuario autenticado

  // Asegurarse de que el bodeguero solo pueda ver pedidos de su propia sucursal
  if (user.cargo === 'Bodeguero' && user.sucursal_id !== parseInt(sucursal_id)) {
    console.log(`[GET /api/pedidos/sucursal/:sucursal_id] Acceso denegado: sucursal_id del usuario (${user.sucursal_id}) no coincide con la solicitada (${sucursal_id}).`);
    return res.status(403).json({ success: false, message: "Acceso denegado. Solo puede ver pedidos de su propia sucursal." });
  }

  try {
    console.log(`[GET /api/pedidos/sucursal/:sucursal_id] Realizando consulta a la base de datos para sucursal_id: ${sucursal_id}`);
    const [pedidos] = await db.query(
      `SELECT 
          p.id, 
          p.cliente_id, 
          p.cliente_rut, 
          p.empleado_id, 
          p.sucursal_id, 
          p.sucursal_retiro_id,
          p.fecha, 
          p.total, 
          p.metodo_pago, 
          p.estado,
          c.nombre as cliente_nombre, 
          c.apellido as cliente_apellido,
          s.nombre as sucursal_nombre,
          sr.nombre as sucursal_nombre_retiro,
          e.nombre as empleado_nombre,
          e.cargo as empleado_cargo
        FROM pedidos p
        LEFT JOIN clientes c ON p.cliente_id = c.id
        LEFT JOIN sucursales s ON p.sucursal_id = s.sucursal_id
        LEFT JOIN sucursales sr ON p.sucursal_retiro_id = sr.sucursal_id -- Para la sucursal de retiro si es diferente
        LEFT JOIN empleados e ON p.empleado_id = e.id
        WHERE p.sucursal_id = ? OR p.sucursal_retiro_id = ? -- Pedidos de sucursal o pedidos con retiro en sucursal
        ORDER BY p.fecha DESC`,
      [sucursal_id, sucursal_id]
    );
    console.log(`[GET /api/pedidos/sucursal/:sucursal_id] Pedidos encontrados (cantidad): ${pedidos.length}`);

    // Para cada pedido, obtener los detalles de los productos
    for (let pedido of pedidos) {
      const [detalle] = await db.query(
        `SELECT dp.producto_id, dp.cantidad, dp.precio_unitario, pr.titulo as producto_titulo, pr.sku as producto_sku
          FROM detalle_pedidos dp -- CAMBIO APLICADO AQUÍ: de detalle_pedido a detalle_pedidos
          JOIN productos pr ON dp.producto_id = pr.id
          WHERE dp.pedido_id = ?`,
        [pedido.id]
      );
      pedido.items = detalle;
    }
    console.log(`[GET /api/pedidos/sucursal/:sucursal_id] Pedidos con detalles de productos listos.`);
    res.json(pedidos);
  } catch (error) {
    console.error("[GET /api/pedidos/sucursal/:sucursal_id] Error al obtener pedidos por sucursal:", error);
    res.status(500).json({ success: false, message: "Error al obtener pedidos." });
  }
});


// RUTA PARA ACTUALIZAR EL ESTADO DE UN PEDIDO (para bodeguero)
app.patch('/api/pedidos/:id/estado', authenticateJWT, authorizeBodeguero, async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  const user = req.user; // Bodeguero del token

  if (!estado) {
    return res.status(400).json({ success: false, message: "El estado es obligatorio." });
  }

  // Validar estados permitidos (ejemplo)
  const estadosValidos = ['Pendiente', 'Preparando', 'Listo para retiro', 'En despacho', 'Entregado', 'Cancelado', 'Completado']; // Añadir 'Completado'
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ success: false, message: "Estado no válido." });
  }

  try {
    // Verificar que el pedido pertenece a la sucursal del bodeguero
    const [pedido] = await db.query(
      `SELECT sucursal_id, sucursal_retiro_id FROM pedidos WHERE id = ?`,
      [id]
    );

    if (pedido.length === 0) {
      return res.status(404).json({ success: false, message: "Pedido no encontrado." });
    }

    // Un bodeguero solo puede actualizar pedidos que sean de su sucursal de origen o de retiro
    if (pedido[0].sucursal_id !== user.sucursal_id && pedido[0].sucursal_retiro_id !== user.sucursal_id) {
        return res.status(403).json({ success: false, message: "Acceso denegado. Este pedido no corresponde a su sucursal." });
    }


    const [result] = await db.query(
      `UPDATE pedidos SET estado = ? WHERE id = ?`,
      [estado, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Pedido no encontrado o no se pudo actualizar." });
    }

    res.json({ success: true, message: "Estado del pedido actualizado exitosamente." });
  } catch (error) {
    console.error("Error al actualizar el estado del pedido:", error);
    res.status(500).json({ success: false, message: "Error al actualizar el estado del pedido." });
  }
});

// RUTA PARA QUE CUALQUIER EMPLEADO VEA SUS PROPIAS VENTAS REGISTRADAS
app.get('/api/pedidos/empleado/:empleado_id', authenticateJWT, authorizeEmpleado, async (req, res) => {
  const { empleado_id } = req.params;
  const user = req.user; // Usuario del token

  // Asegurarse de que un empleado solo pueda ver sus propias ventas
  // o que un administrador pueda ver las ventas de cualquiera
  if (!user.esAdmin && user.id !== parseInt(empleado_id)) {
    return res.status(403).json({ success: false, message: "Acceso denegado. Solo puede ver sus propias ventas." });
  }

  try {
    const [pedidos] = await db.query(
      `SELECT 
          p.id, 
          p.cliente_id, 
          p.cliente_rut, 
          p.empleado_id, 
          p.sucursal_id, 
          p.sucursal_retiro_id,
          p.fecha, 
          p.total, 
          p.metodo_pago, 
          p.estado,
          c.nombre as cliente_nombre, 
          c.apellido as cliente_apellido,
          s_origen.nombre as sucursal_nombre,
          s_retiro.nombre as sucursal_nombre_retiro
        FROM pedidos p
        LEFT JOIN clientes c ON p.cliente_id = c.id
        LEFT JOIN sucursales s_origen ON p.sucursal_id = s_origen.sucursal_id
        LEFT JOIN sucursales s_retiro ON p.sucursal_retiro_id = s_retiro.sucursal_id
        LEFT JOIN empleados e ON p.empleado_id = e.id
        WHERE p.empleado_id = ?
        ORDER BY p.fecha DESC`,
      [empleado_id]
    );

    res.json(pedidos); // No se devuelve el detalle de productos para esta vista, solo la info del pedido
  } catch (error) {
    console.error("Error al obtener ventas del empleado:", error);
    res.status(500).json({ success: false, message: "Error al obtener ventas del empleado." });
  }
});


// RUTA para obtener un pedido específico y sus productos
app.get('/api/pedidos/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener el pedido, cliente, sucursal, empleado y detalles del pago
        const [pedido] = await db.query(
            `SELECT p.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.rut as cliente_rut,
                    s_empleado.nombre as sucursal_nombre_empleado, s_empleado.direccion as sucursal_direccion_empleado, 
                    s_empleado.comuna as sucursal_comuna_empleado, s_empleado.region as sucursal_region_empleado, 
                    s_empleado.telefono as sucursal_telefono_empleado, s_empleado.horario_apertura as sucursal_horario_apertura_empleado, s_empleado.horario_cierre as sucursal_horario_cierre_empleado,
                    s_retiro.nombre as sucursal_nombre_retiro, s_retiro.direccion as sucursal_direccion_retiro,
                    s_retiro.comuna as sucursal_comuna_retiro, s_retiro.region as sucursal_region_retiro,
                    s_retiro.telefono as sucursal_telefono_retiro, s_retiro.horario_apertura as sucursal_horario_apertura_retiro, s_retiro.horario_cierre as sucursal_horario_cierre_retiro,
                    e.nombre as empleado_nombre, e.rut as empleado_rut, e.cargo as empleado_cargo,
                    pg.monto as pago_monto, pg.metodo_pago as pago_metodo, pg.fecha as pago_fecha, 
                    pg.estado as pago_estado, pg.referencia as pago_referencia
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN sucursales s_empleado ON p.sucursal_id = s_empleado.sucursal_id -- Sucursal del empleado
            LEFT JOIN sucursales s_retiro ON p.sucursal_retiro_id = s_retiro.sucursal_id -- Sucursal de retiro (nueva unión)
            LEFT JOIN empleados e ON p.empleado_id = e.id
            LEFT JOIN pagos pg ON p.id = pg.pedido_id
            WHERE p.id = ?`,
            [id]
        );

        if (pedido.length === 0) {
            return res.status(404).json({ message: "Pedido no encontrado" });
        }

        // Obtener los detalles de los productos de este pedido
        const [detalleProductos] = await db.query(
            `SELECT dp.producto_id, dp.cantidad, dp.precio_unitario,
                    prod.sku, prod.titulo, prod.descripcion, prod.imagen
            FROM detalle_pedidos dp
            JOIN productos prod ON dp.producto_id = prod.id
            WHERE dp.pedido_id = ?`,
            [id]
        );

        const response = {
            id: pedido[0].id,
            total: pedido[0].total,
            fecha: pedido[0].fecha,
            estado: pedido[0].estado,
            cliente_info: pedido[0].cliente_id ? {
                id: pedido[0].cliente_id,
                rut: pedido[0].cliente_rut,
                nombre: pedido[0].cliente_nombre,
                apellido: pedido[0].cliente_apellido
            } : null,
            empleado_info: pedido[0].empleado_id ? {
                id: pedido[0].empleado_id,
                rut: pedido[0].empleado_rut,
                nombre: pedido[0].empleado_nombre,
                cargo: pedido[0].empleado_cargo
            } : null,
            sucursal_empleado_info: pedido[0].sucursal_id ? { // Sucursal del empleado que registró
                id: pedido[0].sucursal_id,
                nombre: pedido[0].sucursal_nombre_empleado,
                direccion: pedido[0].sucursal_direccion_empleado,
                comuna: pedido[0].sucursal_comuna_empleado,
                region: pedido[0].sucursal_region_empleado,
                telefono: pedido[0].sucursal_telefono_empleado,
                horario_apertura: pedido[0].sucursal_horario_apertura_empleado,
                horario_cierre: pedido[0].sucursal_horario_cierre_empleado
            } : null,
            sucursal_retiro_info: pedido[0].sucursal_retiro_id ? { // Sucursal de retiro
                id: pedido[0].sucursal_retiro_id,
                nombre: pedido[0].sucursal_nombre_retiro,
                direccion: pedido[0].sucursal_direccion_retiro,
                comuna: pedido[0].sucursal_comuna_retiro,
                region: pedido[0].sucursal_region_retiro,
                telefono: pedido[0].sucursal_telefono_retiro,
                horario_apertura: pedido[0].sucursal_horario_apertura_retiro,
                horario_cierre: pedido[0].sucursal_horario_cierre_retiro
            } : null,
            items: detalleProductos.map(item => ({
                sku: item.sku,
                titulo: item.titulo,
                descripcion: item.descripcion,
                imagen: item.imagen,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                total_item: item.cantidad * item.precio_unitario
            }))
        };

        res.json(response);
    } catch (err) {
        console.error("Error al obtener el pedido:", err);
        res.status(500).json({
            error: err.message || "Error al obtener el pedido y sus productos"
        });
    }
});

// RUTA para listar todos los pedidos
app.get('/api/pedidos', async (req, res) => {
    try {
        const [pedidos] = await db.query(
            `SELECT p.id, p.total, p.fecha, p.estado,
                    c.nombre as cliente_nombre, c.apellido as cliente_apellido, c.rut as cliente_rut,
                    s_empleado.nombre as sucursal_nombre_empleado, -- Sucursal del empleado que hizo la venta
                    s_retiro.nombre as sucursal_nombre_retiro, -- Sucursal de retiro
                    e.nombre as empleado_nombre, e.rut as empleado_rut,
                    pg.metodo_pago as pago_metodo, pg.estado as pago_estado
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN sucursales s_empleado ON p.sucursal_id = s_empleado.sucursal_id
            LEFT JOIN sucursales s_retiro ON p.sucursal_retiro_id = s_retiro.sucursal_id -- Nueva unión
            LEFT JOIN empleados e ON p.empleado_id = e.id
            LEFT JOIN pagos pg ON p.id = pg.pedido_id
            ORDER BY p.fecha DESC`
        );

        if (pedidos.length === 0) {
            return res.status(404).json({ message: "No se encontraron pedidos" });
        }

        res.json(pedidos);
    } catch (err) {
        console.error("Error al obtener los pedidos:", err);
        res.status(500).json({
            error: err.message || "Error al obtener los pedidos"
        });
    }
});

// RUTA para listar los pedidos de un cliente por cliente_rut
app.get('/api/pedidos/cliente/:cliente_rut', async (req, res) => {
    try {
        const { cliente_rut } = req.params;

        const [clienteRows] = await db.query('SELECT id FROM clientes WHERE rut = ?', [cliente_rut]);
        if (clienteRows.length === 0) {
            return res.status(404).json({ message: "Cliente no encontrado para el RUT proporcionado." });
        }
        const cliente_id = clienteRows[0].id;

        const [pedidos] = await db.query(
            `SELECT p.id, p.total, p.fecha, p.estado,
                    s_empleado.nombre as sucursal_nombre_empleado,
                    s_retiro.nombre as sucursal_nombre_retiro, -- Nueva columna
                    e.nombre as empleado_nombre, e.rut as empleado_rut,
                    pg.metodo_pago as pago_metodo, pg.estado as pago_estado
            FROM pedidos p
            LEFT JOIN sucursales s_empleado ON p.sucursal_id = s_empleado.sucursal_id
            LEFT JOIN sucursales s_retiro ON p.sucursal_retiro_id = s_retiro.sucursal_id -- Nueva unión
            LEFT JOIN empleados e ON p.empleado_id = e.id
            LEFT JOIN pagos pg ON p.id = pg.pedido_id
            WHERE p.cliente_id = ?
            ORDER BY p.fecha DESC`,
            [cliente_id]
        );

        if (pedidos.length === 0) {
            return res.status(404).json({ message: "No se encontraron pedidos para este cliente" });
        }

        res.json(pedidos);
    } catch (err) {
        console.error("Error al obtener los pedidos del cliente:", err);
        res.status(500).json({
            error: err.message || "Error al obtener los pedidos del cliente"
        });
    }
});

// RUTA para listar los pedidos hechos por un empleado específico (solo para empleados/vendedores)
app.get('/api/pedidos/empleado/:empleado_id', authenticateJWT, authorizeEmpleado, async (req, res) => {
  const { empleado_id } = req.params;
  const user = req.user; // Usuario del token

  // Asegurarse de que un empleado solo pueda ver sus propias ventas
  // o que un administrador pueda ver las ventas de cualquiera
  if (!user.esAdmin && user.id !== parseInt(empleado_id)) {
    return res.status(403).json({ success: false, message: "Acceso denegado. Solo puede ver sus propias ventas." });
  }

  try {
    const [pedidos] = await db.query(
      `SELECT 
          p.id, 
          p.cliente_id, 
          p.cliente_rut, 
          p.empleado_id, 
          p.sucursal_id, 
          p.sucursal_retiro_id,
          p.fecha, 
          p.total, 
          p.metodo_pago, 
          p.estado,
          c.nombre as cliente_nombre, 
          c.apellido as cliente_apellido,
          s_origen.nombre as sucursal_nombre,
          s_retiro.nombre as sucursal_nombre_retiro
        FROM pedidos p
        LEFT JOIN clientes c ON p.cliente_id = c.id
        LEFT JOIN sucursales s_origen ON p.sucursal_id = s_origen.sucursal_id
        LEFT JOIN sucursales s_retiro ON p.sucursal_retiro_id = s_retiro.sucursal_id
        LEFT JOIN empleados e ON p.empleado_id = e.id
        WHERE p.empleado_id = ?
        ORDER BY p.fecha DESC`,
      [empleado_id]
    );

    res.json(pedidos); // No se devuelve el detalle de productos para esta vista, solo la info del pedido
  } catch (error) {
    console.error("Error al obtener ventas del empleado:", error);
    res.status(500).json({ success: false, message: "Error al obtener ventas del empleado." });
  }
});

// NUEVA RUTA: Para que los bodegueros obtengan pedidos para retiro (protegida con authorizeBodeguero)
// NOTA: Esta ruta utiliza JSON_AGG y JSON_OBJECT, que son funciones de MySQL 8+.
// Si tu versión de MySQL es anterior, necesitarás un enfoque diferente para agregar detalles de productos.
app.get('/api/pedidos/retiro', authenticateJWT, authorizeBodeguero, async (req, res) => {
  try {
    const userSucursalId = req.user.sucursal_id; // Sucursal del bodeguero desde el token

    if (!userSucursalId) {
      return res.status(400).json({ success: false, message: "No se pudo determinar la sucursal del bodeguero desde el token." });
    }

    let query = `
      SELECT 
        p.id AS pedido_id,
        p.fecha AS fecha_pedido,
        p.estado,
        p.total AS total_pedido,
        c.nombre AS cliente_nombre,
        c.apellido AS cliente_apellido,
        c.correo AS cliente_correo,
        s.nombre AS sucursal_nombre,
        s.direccion AS sucursal_direccion,
        JSON_AGG(
          JSON_OBJECT(
            'producto_id', dp.producto_id,
            'sku', prod.sku,
            'titulo', prod.titulo,
            'cantidad', dp.cantidad,
            'precio_unitario', dp.precio_unitario
          )
        ) AS detalles_productos
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      JOIN sucursales s ON p.sucursal_retiro_id = s.sucursal_id
      LEFT JOIN detalle_pedidos dp ON p.id = dp.pedido_id
      LEFT JOIN productos prod ON dp.producto_id = prod.id
      WHERE p.sucursal_retiro_id = ? AND p.estado IN ('Pendiente', 'Preparando', 'Listo para retiro', 'procesado') -- Añadido 'procesado'
      GROUP BY p.id, p.fecha, p.estado, p.total, c.nombre, c.apellido, c.correo, s.nombre, s.direccion
      ORDER BY p.fecha DESC`;
    
    const queryParams = [userSucursalId];

    console.log("[GET /api/pedidos/retiro] Consulta SQL:", query);
    console.log("[GET /api/pedidos/retiro] Parámetros:", queryParams);

    const [pedidos] = await db.query(query, queryParams);
    res.json({ success: true, data: pedidos });
  } catch (error) {
    console.error('Error al obtener pedidos de retiro:', error);
    res.status(500).json({ success: false, message: 'Error al obtener pedidos de retiro.' });
  }
});

// RUTA para que los bodegueros actualicen el estado de un pedido
app.put('/api/pedidos/:id/estado', authenticateJWT, authorizeBodeguero, async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  const user = req.user; // Bodeguero del token
  const estadosValidos = ['Pendiente', 'Preparando', 'Listo para retiro', 'En despacho', 'Entregado', 'Cancelado', 'Completado'];

  if (!estado || !estadosValidos.includes(estado)) {
    return res.status(400).json({ success: false, message: 'Estado de pedido inválido.' });
  }

  try {
    let query = `UPDATE pedidos SET estado = ? WHERE id = ?`;
    const queryParams = [estado, id];

    // Restricción adicional: si el bodeguero tiene una sucursal_id, solo puede actualizar pedidos de esa sucursal
    if (user.sucursal_id) {
      query += ` AND (sucursal_id = ? OR sucursal_retiro_id = ?)`; // Puede ser de su sucursal de origen o de retiro
      queryParams.push(user.sucursal_id, user.sucursal_id);
    }

    const [result] = await db.query(query, queryParams);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado o no autorizado para actualizar.' });
    }
    res.json({ success: true, message: `Estado del pedido ${id} actualizado a ${estado}.` });
  } catch (error) {
    console.error('Error al actualizar estado del pedido:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar estado del pedido.' });
  }
});

// Endpoint básico de verificación (ruta raíz)
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    service: 'Pedidos Service',
    version: '1.0.0',
    endpoints: {
      post_pedido: '/api/pedidos',
      get_pedido_by_id: '/api/pedidos/:id',
      get_all_pedidos: '/api/pedidos',
      get_pedidos_by_client_rut: '/api/pedidos/cliente/:cliente_rut',
      get_pedidos_by_empleado_id: '/api/pedidos/empleado/:empleado_id',
      get_pedidos_for_bodeguero_sucursal: '/api/pedidos/sucursal/:sucursal_id', // Esta es la ruta actual del frontend
      get_pedidos_retiro_for_bodeguero: '/api/pedidos/retiro', // Esta es la nueva ruta con JSON_AGG
      update_pedido_estado: '/api/pedidos/:id/estado'
    }
  });
});

// Iniciar servidor
app.listen(PEDIDOS_PORT, () => {
  console.log(`🚀 Servicio de pedidos/pagos corriendo en http://localhost:${PEDIDOS_PORT}`);
  console.log("\n==== RUTAS REGISTRADAS EN EXPRESS AL INICIAR ====");
  app._router.stack.forEach(function(r){
    if (r.route && r.route.path){
      console.log(`Ruta: ${r.route.path}, Métodos: ${Object.keys(r.route.methods).join(', ').toUpperCase()}`);
    } else if (r.name === 'router') {
      if (r.handle && r.handle.stack) {
        r.handle.stack.forEach(function(hr) {
          if (hr.route && hr.route.path){
            console.log(`   Sub-Ruta: ${hr.route.path}, Métodos: ${Object.keys(hr.route.methods).join(', ').toUpperCase()}`);
          }
        });
      }
    }
  });
});
