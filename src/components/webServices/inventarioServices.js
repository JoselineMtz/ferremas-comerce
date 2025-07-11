import express from 'express';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './conexion.js'; // Asegúrate de que esta ruta sea correcta
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configuración inicial
dotenv.config();
const app = express();
const INVENTARIO_PORT = process.env.INVENTARIO_PORT || 5003;

// Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middlewares básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configuración de directorio de uploads
const uploadDir = path.join(__dirname, 'uploads');

// Crear directorio si no existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`📁 Directorio de uploads creado: ${uploadDir}`);
}

// Configuración de Multer para imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileName = `${Date.now()}${path.extname(file.originalname)}`;
    cb(null, fileName);
  }
});

const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Error: Solo se permiten imágenes (jpeg, jpg, png, gif)'));
};

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
  fileFilter
});

// Middleware de timeout
app.use((req, res, next) => {
  req.setTimeout(10000, () => {
    if (!res.headersSent) {
      res.status(503).json({ error: "Timeout del servidor" });
    }
  });
  next();
});

// Servir archivos estáticos
app.use('/uploads', express.static(uploadDir));

// Endpoint básico de verificación
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    version: '1.0.0',
    endpoints: {
      productos: '/api/productos',
      categorias: '/api/categorias',
      sucursales: '/api/sucursales',
      actualizar_stock_sucursal: '/api/productos/:id/sucursal/:sucursalId/stock (PATCH)',
      obtener_stock_por_sucursal: '/api/productos/:id/stock-por-sucursal (GET)' // Nuevo endpoint
    },
    uploadsPath: uploadDir
  });
});

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    // Verificar conexión a la base de datos
    const [dbResult] = await db.query('SELECT 1 AS db_status');
    
    // Verificar acceso al directorio de uploads
    let uploadsAccess = true;
    try {
      fs.accessSync(uploadDir, fs.constants.R_OK | fs.constants.W_OK);
    } catch (err) {
      uploadsAccess = false;
    }

    res.json({
      status: 'healthy',
      db: dbResult[0].db_status === 1 ? 'connected' : 'unexpected_response',
      uploads: uploadsAccess ? 'accessible' : 'no_access',
      uptime: process.uptime()
    });
  } catch (err) {
    res.status(500).json({
      status: 'unhealthy',
      error: err.message
    });
  }
});

// CRUD de Productos
app.post('/api/productos', (req, res) => {
  upload.single('imagen')(req, res, async (err) => {
    console.log('Inicio de la solicitud POST /api/productos');

    try {
      if (err instanceof multer.MulterError) {
        console.error('Error de Multer:', err);
        return res.status(400).json({ message: err.message });
      } else if (err) {
        console.error('Error en upload:', err);
        return res.status(400).json({ message: err.message });
      }

      console.log('Body recibido:', req.body);
      console.log('Archivo recibido:', req.file);

      // 'stock' ya no se usa aquí para la tabla de productos
      const { sku, titulo, descripcion, precio, categoria_id } = req.body; 
      const imagen = req.file?.filename || null;

      if (!sku || !titulo || !precio || !categoria_id) {
        console.log('Validación fallida - Campos obligatorios faltantes');
        if (req.file) {
          fs.unlinkSync(path.join(uploadDir, req.file.filename));
        }
        return res.status(400).json({ message: "Faltan campos obligatorios (sku, titulo, precio, categoria_id)" });
      }

      console.log('Datos a insertar en productos:', { sku, titulo, descripcion, precio, categoria_id, imagen });

      const [result] = await db.query(
        `INSERT INTO productos 
          (sku, titulo, descripcion, precio, categoria_id, imagen) 
          VALUES (?, ?, ?, ?, ?, ?)`,
        [sku, titulo, descripcion, precio, categoria_id, imagen]
      );

      const newProductId = result.insertId;
      console.log('Producto creado exitosamente con ID:', newProductId);

      // --- NUEVA LÓGICA: Inicializar stock en 0 para todas las sucursales ---
      const [sucursales] = await db.query('SELECT sucursal_id FROM sucursales');
      if (sucursales.length > 0) {
        const stockInsertPromises = sucursales.map(s => 
          db.query(
            'INSERT INTO sucursal_productos_stock (producto_id, sucursal_id, stock_cantidad) VALUES (?, ?, ?)',
            [newProductId, s.sucursal_id, 0] // Inicializar stock en 0 para cada sucursal
          )
        );
        await Promise.all(stockInsertPromises);
        console.log(`Stock inicializado en 0 para el producto ${newProductId} en ${sucursales.length} sucursales.`);
      } else {
        console.warn(`No se encontraron sucursales para inicializar el stock del producto ${newProductId}.`);
      }
      // --- FIN NUEVA LÓGICA ---

      res.status(201).json({
        message: "Producto creado exitosamente y stock inicializado en sucursales",
        id: newProductId,
        sku,
        imagen_url: imagen ? `${req.protocol}://${req.get('host')}/uploads/${imagen}` : null
      });
    } catch (err) {
      console.error("Error completo al crear producto:", err);
      if (req.file) {
        fs.unlinkSync(path.join(uploadDir, req.file.filename));
      }
      res.status(500).json({
        error: "Error al crear producto",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  });
});

app.get('/api/productos', async (req, res) => {
  try {
    const { categoria_id, sku, titulo, sucursal_id } = req.query;
    let sql;
    let params = [];
    let conditions = [];

    if (sucursal_id) {
      // Caso 1: Obtener productos para una sucursal específica (usado por VendedorPanel)
      sql = `
        SELECT
            p.*,
            c.nombre as categoria,
            COALESCE(sps.stock_cantidad, 0) AS stock_total -- Obtener stock para la sucursal específica
        FROM
            productos p
        LEFT JOIN
            categorias c ON p.categoria_id = c.id
        LEFT JOIN
            sucursal_productos_stock sps ON p.id = sps.producto_id AND sps.sucursal_id = ?
      `;
      params.push(sucursal_id); // sucursal_id es el primer parámetro para esta consulta
      conditions.push("sps.sucursal_id = ?"); // Asegurarse de que solo se obtenga stock de esta sucursal
      params.push(sucursal_id); // Añadirlo de nuevo para la cláusula WHERE

      // Aplicar filtros de stock_min/stock_max si sucursal_id está presente
      if (req.query.stock_min) {
        conditions.push("sps.stock_cantidad >= ?");
        params.push(req.query.stock_min);
      }
      if (req.query.stock_max) {
        conditions.push("sps.stock_cantidad <= ?");
        params.push(req.query.stock_max);
      }

    } else {
      // Caso 2: Obtener todos los productos con stock total consolidado (usado por ClienteVista)
      sql = `
        SELECT
            p.id,
            p.titulo,
            p.descripcion,
            p.precio,
            p.imagen,
            p.sku,
            p.categoria_id,
            c.nombre as categoria,
            COALESCE(SUM(sps.stock_cantidad), 0) AS stock_total -- Sumar stock de todas las sucursales
        FROM
            productos p
        LEFT JOIN
            categorias c ON p.categoria_id = c.id
        LEFT JOIN
            sucursal_productos_stock sps ON p.id = sps.producto_id
      `;
      // No hay sucursal_id en los parámetros para esta parte inicial de la consulta
    }

    // Filtros comunes para ambos casos
    if (categoria_id) {
      conditions.push("p.categoria_id = ?");
      params.push(categoria_id);
    }
    
    if (sku) {
      conditions.push("p.sku LIKE ?");
      params.push(`%${sku}%`);
    }
    
    if (titulo) {
      conditions.push("p.titulo LIKE ?");
      params.push(`%${titulo}%`);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    if (!sucursal_id) {
      // Agrupar solo para la consulta de stock consolidado
      sql += ` GROUP BY p.id, p.titulo, p.descripcion, p.precio, p.imagen, p.sku, p.categoria_id, c.nombre`;
    }

    sql += " ORDER BY p.id DESC";

    console.log('Consulta SQL FINAL:', sql); // Log de la consulta final
    console.log('Parámetros FINAL:', params); // Log de los parámetros finales

    const [productos] = await db.query(sql, params);
    
    const response = productos.map(p => ({
      ...p,
      imagen_url: p.imagen ? `${req.protocol}://${req.get('host')}/uploads/${p.imagen}` : null,
      // stock_total ahora siempre estará presente debido a la consulta SQL refactorizada
    }));

    console.log('Productos devueltos por la API (con stock_total):', response.map(p => ({ id: p.id, titulo: p.titulo, stock_total: p.stock_total }))); // Log para verificar stock_total
    res.json(response);
  } catch (err) {
    console.error("Error al obtener productos:", err);
    res.status(500).json({ 
      error: "Error al obtener productos",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// --- NUEVO ENDPOINT: Obtener stock de un producto por sucursal ---
app.get('/api/productos/:id/stock-por-sucursal', async (req, res) => {
  try {
    const { id: productId } = req.params;
    const [stockData] = await db.query(
      `SELECT sps.sucursal_id, sps.stock_cantidad, s.nombre as sucursal_nombre
       FROM sucursal_productos_stock sps
       JOIN sucursales s ON sps.sucursal_id = s.sucursal_id
       WHERE sps.producto_id = ?`,
      [productId]
    );
    res.json(stockData);
  } catch (err) {
    console.error("Error al obtener stock por sucursal para el producto:", err);
    res.status(500).json({
      error: "Error al obtener stock por sucursal",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});
// --- FIN NUEVO ENDPOINT ---


app.put('/api/productos/:id', (req, res) => {
  upload.single('imagen')(req, res, async (err) => {
    console.log(`[Inventario PUT /api/productos/${req.params.id}] Inicio de la solicitud PUT.`);
    try {
      if (err instanceof multer.MulterError) {
        console.error('[Inventario PUT] Error de Multer:', err);
        return res.status(400).json({ message: err.message });
      } else if (err) {
        console.error('[Inventario PUT] Error en upload:', err);
        return res.status(400).json({ message: err.message });
      }

      const { id } = req.params;
      // 'stock' ya no se espera en el body para actualizar la tabla de productos
      const { sku, titulo, descripcion, precio, categoria_id } = req.body; 
      const newImageFilename = req.file?.filename || null; // Nombre de archivo de la nueva imagen subida

      console.log(`[Inventario PUT /api/productos/${id}] Body recibido:`, req.body);
      console.log(`[Inventario PUT /api/productos/${id}] Archivo subido (si existe):`, req.file);

      // 1. Obtener imagen actual del producto existente
      const [currentProducts] = await db.query(
        'SELECT imagen FROM productos WHERE id = ?', 
        [id]
      );

      if (currentProducts.length === 0) {
        console.log(`[Inventario PUT /api/productos/${id}] Producto no encontrado en la DB.`);
        if (newImageFilename) { // Si se subió un nuevo archivo pero el producto no se encontró, eliminar el nuevo archivo
          fs.unlinkSync(path.join(uploadDir, newImageFilename));
          console.log(`[Inventario PUT /api/productos/${id}] Eliminada nueva imagen subida (${newImageFilename}) porque el producto no existe.`);
        }
        return res.status(404).json({ message: "Producto no encontrado" });
      }

      const currentImageInDB = currentProducts[0].imagen; // Nombre de archivo de la imagen actual en DB

      // 2. Determinar qué filename de imagen se guardará
      const imageToSaveInDB = newImageFilename || currentImageInDB;
      console.log(`[Inventario PUT /api/productos/${id}] Imagen actual en DB: ${currentImageInDB || 'Ninguna'}. Nueva imagen subida: ${newImageFilename || 'Ninguna'}. Imagen a guardar en DB: ${imageToSaveInDB || 'Ninguna'}.`);

      // 3. Realizar la actualización en la base de datos (sin el campo 'stock')
      const [result] = await db.query(
        `UPDATE productos 
          SET sku = ?, titulo = ?, descripcion = ?, precio = ?, 
            categoria_id = ?, imagen = ?
          WHERE id = ?`,
        [
          sku,          
          titulo,         
          descripcion,    
          precio,         
          categoria_id,   
          imageToSaveInDB, 
          id              
        ]
      );

      console.log(`[Inventario PUT /api/productos/${id}] Resultado de la actualización en DB:`, result);

      if (result.affectedRows === 0) {
        console.log(`[Inventario PUT /api/productos/${id}] Producto no encontrado o no se realizaron cambios en la DB.`);
        // Si no se afectaron filas pero se subió un nuevo archivo, eliminarlo
        if (newImageFilename) {
          fs.unlinkSync(path.join(uploadDir, newImageFilename));
          console.log(`[Inventario PUT /api/productos/${id}] Eliminada nueva imagen subida (${newImageFilename}) porque no se actualizó el producto.`);
        }
        return res.status(404).json({ message: "Producto no encontrado o no se realizaron cambios" });
      }

      // 4. Eliminar la imagen anterior si se subió una nueva y es diferente
      if (newImageFilename && currentImageInDB && currentImageInDB !== newImageFilename) {
        try {
          fs.unlinkSync(path.join(uploadDir, currentImageInDB));
          console.log(`[Inventario PUT /api/productos/${id}] Eliminada imagen antigua: ${currentImageInDB}`);
        } catch (unlinkErr) {
          console.warn(`[Inventario PUT /api/productos/${id}] No se pudo eliminar la imagen anterior (${currentImageInDB}):`, unlinkErr.message);
        }
      }

      res.json({ 
        message: "Producto actualizado exitosamente",
        imagen_url: imageToSaveInDB ? `${req.protocol}://${req.get('host')}/uploads/${imageToSaveInDB}` : null
      });
      console.log(`[Inventario PUT /api/productos/${id}] Solicitud PUT finalizada con éxito.`);

    } catch (err) {
      console.error(`[Inventario PUT /api/productos/${id}] Error COMPLETO en la solicitud PUT:`, err);
      // Asegurarse de que cualquier archivo recién cargado se elimine si se produce un error más adelante en el proceso
      if (req.file) { // req.file contiene la información del *nuevo* archivo
        try {
          fs.unlinkSync(path.join(uploadDir, req.file.filename));
          console.log(`[Inventario PUT /api/productos/${id}] Se intentó eliminar la imagen recién subida (${req.file.filename}) debido a un error en el proceso.`);
        } catch (unlinkErr) {
          console.error(`[Inventario PUT /api/productos/${id}] Error al limpiar archivo recién cargado después de un fallo en la actualización:`, unlinkErr);
        }
      }
      res.status(500).json({ 
        error: "Error al actualizar producto",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  });
});

// --- NUEVO ENDPOINT: Actualizar stock de un producto en una sucursal específica ---
app.patch('/api/productos/:id/sucursal/:sucursalId/stock', async (req, res) => {
  try {
    const { id: productId, sucursalId } = req.params;
    const { stock_cantidad } = req.body;

    // Validaciones
    if (isNaN(stock_cantidad) || stock_cantidad < 0) {
      return res.status(400).json({ 
        message: "La cantidad de stock debe ser un número válido y mayor o igual a 0" 
      });
    }

    // Verificar si el producto y la sucursal existen (opcional pero recomendado)
    const [productExists] = await db.query('SELECT id FROM productos WHERE id = ?', [productId]);
    if (productExists.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    const [sucursalExists] = await db.query('SELECT sucursal_id FROM sucursales WHERE sucursal_id = ?', [sucursalId]);
    if (sucursalExists.length === 0) {
      return res.status(404).json({ message: "Sucursal no encontrada" });
    }

    // Intentar actualizar el stock existente o insertarlo si no existe
    const [result] = await db.query(
      `INSERT INTO sucursal_productos_stock (producto_id, sucursal_id, stock_cantidad)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE stock_cantidad = ?`,
      [productId, sucursalId, stock_cantidad, stock_cantidad]
    );

    // affectedRows será 1 para INSERT, 2 para UPDATE (si el valor cambia)
    if (result.affectedRows === 0) {
      return res.status(500).json({ message: "No se pudo actualizar/crear el stock para el producto en la sucursal." });
    }

    res.json({ message: "Stock actualizado exitosamente para la sucursal" });
  } catch (err) {
    console.error("Error al actualizar stock por sucursal:", err);
    res.status(500).json({ 
      error: "Error al actualizar stock por sucursal",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});
// --- FIN NUEVO ENDPOINT ---

// El endpoint PATCH /api/productos/:id/stock ya no es relevante para stock global, fue reemplazado.
// Si aún lo necesitas para otro propósito, ajústalo.
// Por ahora, lo dejaré comentado o lo eliminaré si no es necesario.
/*
app.patch('/api/productos/:id/stock', async (req, res) => {
  // Esta ruta ahora sería ambigua o incorrecta si el stock es por sucursal.
  // Deberías usar la nueva ruta PATCH /api/productos/:id/sucursal/:sucursalId/stock
  res.status(400).json({ message: "Esta ruta no es válida para actualizar stock por sucursal. Use /api/productos/:id/sucursal/:sucursalId/stock" });
});
*/

app.delete('/api/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener información del producto para eliminar imagen
    const [producto] = await db.query(
      'SELECT imagen FROM productos WHERE id = ?',
      [id]
    );

    if (producto.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    // Eliminar producto (ON DELETE CASCADE en DB se encargará de sucursal_productos_stock)
    const [result] = await db.query(
      'DELETE FROM productos WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    // Eliminar la imagen asociada si existe
    if (producto[0].imagen) {
      try {
        fs.unlinkSync(path.join(uploadDir, producto[0].imagen));
      } catch (err) {
        console.warn("No se pudo eliminar la imagen del producto:", err.message);
      }
    }

    res.json({ message: "Producto eliminado exitosamente" });
  } catch (err) {
    console.error("Error al eliminar producto:", err);
    res.status(500).json({ 
      error: "Error al eliminar producto",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// CRUD de Categorías
app.get('/api/categorias', async (req, res) => {
  try {
    const [categorias] = await db.query(
      'SELECT * FROM categorias ORDER BY nombre'
    );
    res.json(categorias);
  } catch (err) {
    console.error("Error al obtener categorías:", err);
    res.status(500).json({ 
      error: "Error al obtener categorías",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.post('/api/categorias', async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;

    if (!nombre) {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }

    const [result] = await db.query(
      'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion]
    );

    res.status(201).json({ 
      message: "Categoría creada exitosamente",
      id: result.insertId
    });
  } catch (err) {
    console.error("Error al crear categoría:", err);
    res.status(500).json({ 
      error: "Error al crear categoría",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// CRUD de Sucursales
app.get('/api/sucursales', async (req, res) => {
  try {
    // Seleccionar explícitamente todos los campos de la tabla sucursales para asegurar consistencia
    const [sucursales] = await db.query('SELECT sucursal_id, nombre, direccion, comuna, region, telefono, horario_apertura, horario_cierre, activa, fecha_creacion FROM sucursales ORDER BY nombre');
    res.json(sucursales);
  } catch (err) {
    console.error("Error al obtener sucursales:", err);
    res.status(500).json({ 
      error: "Error al obtener sucursales",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.post('/api/sucursales', async (req, res) => {
  // Desestructurar todos los campos, incluyendo los nuevos de comuna, region, horarios y activa
  const { nombre, direccion, comuna, region, telefono, horario_apertura, horario_cierre, activa } = req.body;

  // Validar campos obligatorios
  if (!nombre || !direccion || !comuna || !region || !telefono || !horario_apertura || !horario_cierre) {
    return res.status(400).json({ message: "Nombre, dirección, comuna, región, teléfono, horario de apertura y cierre son obligatorios." });
  }

  try {
    // Insertar todos los campos en la tabla sucursales
    const [result] = await db.query(
      `INSERT INTO sucursales 
        (nombre, direccion, comuna, region, telefono, horario_apertura, horario_cierre, activa) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, direccion, comuna, region, telefono, horario_apertura, horario_cierre, activa]
    );

    // Obtener la sucursal recién creada para devolverla, incluyendo todos sus campos
    const [nuevaSucursal] = await db.query(
      'SELECT sucursal_id, nombre, direccion, comuna, region, telefono, horario_apertura, horario_cierre, activa, fecha_creacion FROM sucursales WHERE sucursal_id = ?', 
      [result.insertId]
    );

    // Devolver el objeto de la nueva sucursal con el ID generado y otros campos
    res.status(201).json(nuevaSucursal[0]); 
  } catch (err) {
    console.error("Error al crear sucursal:", err);
    res.status(500).json({ 
      error: "Error al crear sucursal",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.delete('/api/sucursales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[Backend DELETE Sucursal] Intentando eliminar sucursal con ID recibido: ${id}`); // Debug log para el ID
    
    // Usar 'sucursal_id' para la eliminación, ya que es la clave primaria en tu tabla
    const [result] = await db.query(
      'DELETE FROM sucursales WHERE sucursal_id = ?',
      [id]
    );

    console.log(`[Backend DELETE Sucursal] Resultado de la operación en DB:`, result); // Debug log para el resultado de la DB

    if (result.affectedRows === 0) {
      console.log(`[Backend DELETE Sucursal] Sucursal con sucursal_id ${id} no encontrada en la base de datos.`); // Debug log
      return res.status(404).json({ message: "Sucursal no encontrada" });
    }

    console.log(`[Backend DELETE Sucursal] Sucursal con sucursal_id ${id} eliminada exitosamente.`); // Debug log
    res.json({ message: "Sucursal eliminada exitosamente" });
  } catch (err) {
    console.error("[Backend DELETE Sucursal] Error al eliminar sucursal:", err);
    res.status(500).json({ 
      error: "Error al eliminar sucursal",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(INVENTARIO_PORT, () => {
  console.log(`🚀 Servidor de inventarios corriendo en http://localhost:${INVENTARIO_PORT}`);
  console.log(`📁 Directorio de uploads: ${uploadDir}`);
  console.log(`🌍 CORS permitido para: ${process.env.ALLOWED_ORIGINS || 'Todos los orígenes (*)'}`);
});
