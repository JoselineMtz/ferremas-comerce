import express from 'express';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './conexion.js';

// Configuración inicial
dotenv.config();
const app = express();
const INVENTARIO_PORT = process.env.INVENTARIO_PORT || 5003;

// Middlewares básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configuración de Multer para imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const fileName = `${Date.now()}${path.extname(file.originalname)}`;
    cb(null, fileName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB
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
app.use('/uploads', express.static('uploads'));

// Endpoint básico de verificación
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    version: '1.0.0',
    endpoints: {
      productos: '/api/productos',
      categorias: '/api/categorias'
    }
  });
});

// Health Check
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

// CRUD de Productos
app.post('/api/productos', upload.single('imagen'), async (req, res) => {
  try {
    const { sku, titulo, descripcion, precio, stock, categoria_id } = req.body;
    const imagen = req.file?.filename || null;

    // Validación básica
    if (!sku || !titulo || !precio || !categoria_id) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    const [result] = await db.query(
      `INSERT INTO productos 
       (sku, titulo, descripcion, precio, stock, categoria_id, imagen) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sku, titulo, descripcion, precio, stock, categoria_id, imagen]
    );

    res.status(201).json({ 
      message: "Producto creado exitosamente",
      id: result.insertId,
      sku
    });
  } catch (err) {
    console.error("Error al crear producto:", err);
    res.status(500).json({ 
      error: "Error al crear producto",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.get('/api/productos', async (req, res) => {
  try {
    let sql = `SELECT p.*, c.nombre as categoria 
               FROM productos p 
               LEFT JOIN categorias c ON p.categoria_id = c.id`;
    const params = [];
    
    // Filtro por categoría
    if (req.query.categoria_id) {
      sql += " WHERE p.categoria_id = ?";
      params.push(req.query.categoria_id);
    }
    
    // Filtro por SKU (versión mejorada)
    if (req.query.sku) {
      sql += (params.length ? " AND" : " WHERE") + " p.sku LIKE ?";
      params.push(`%${req.query.sku}%`); // Usamos LIKE para búsqueda parcial
    }
    
    // Filtro por stock mínimo
    if (req.query.stock_min) {
      sql += (params.length ? " AND" : " WHERE") + " p.stock >= ?";
      params.push(req.query.stock_min);
    }

    sql += " ORDER BY p.id DESC";

    console.log('Consulta SQL:', sql); // Para depuración
    console.log('Parámetros:', params); // Para depuración

    const [productos] = await db.query(sql, params);
    
    const response = productos.map(p => ({
      ...p,
      imagen_url: p.imagen ? `${req.protocol}://${req.get('host')}/uploads/${p.imagen}` : null
    }));

    res.json(response);
  } catch (err) {
    console.error("Error al obtener productos:", err);
    res.status(500).json({ 
      error: "Error al obtener productos",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});
app.put('/api/productos/:id', upload.single('imagen'), async (req, res) => {
  try {
    const { id } = req.params;
    const { sku, titulo, descripcion, precio, stock, categoria_id } = req.body;
    const imagen = req.file?.filename || null;

    // Obtener imagen actual
    const [current] = await db.query(
      'SELECT imagen FROM productos WHERE id = ?', 
      [id]
    );

    if (current.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    const updateData = {
      sku, 
      titulo, 
      descripcion, 
      precio, 
      stock, 
      categoria_id,
      imagen: imagen || current[0].imagen
    };

    const [result] = await db.query(
      `UPDATE productos 
       SET sku = ?, titulo = ?, descripcion = ?, precio = ?, 
           stock = ?, categoria_id = ?, imagen = ?
       WHERE id = ?`,
      [...Object.values(updateData), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    res.json({ message: "Producto actualizado exitosamente" });
  } catch (err) {
    console.error("Error al actualizar producto:", err);
    res.status(500).json({ 
      error: "Error al actualizar producto",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});
app.patch('/api/productos/:id/stock', async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    // Validación corregida - paréntesis balanceados
    if (isNaN(stock) || stock < 0) {
      return res.status(400).json({ 
        message: "El stock debe ser un número válido y mayor o igual a 0" 
      });
    }

    const [result] = await db.query(
      'UPDATE productos SET stock = ? WHERE id = ?',
      [stock, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    res.json({ message: "Stock actualizado exitosamente" });
  } catch (err) {
    console.error("Error al actualizar stock:", err);
    res.status(500).json({ 
      error: "Error al actualizar stock",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

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

    // Eliminar producto
    const [result] = await db.query(
      'DELETE FROM productos WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    // Aquí podrías agregar lógica para eliminar la imagen del filesystem si es necesario
    // if (producto[0].imagen) {
    //   fs.unlinkSync(path.join('uploads', producto[0].imagen));
    // }

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

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(INVENTARIO_PORT, () => {
  console.log(`🚀 Servidor de inventarios corriendo en http://localhost:${INVENTARIO_PORT}`);
});