import express from 'express';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './conexion.js';  // Conexión a la base de datos

dotenv.config();

const app = express();
const INVENTARIO_PORT = process.env.INVENTARIO_PORT || 5003;

console.log('INVENTARIO_PORT:', INVENTARIO_PORT);

// Middleware
app.use(express.json());
app.use(cors());

// Configurar multer para subir imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const fileName = Date.now() + path.extname(file.originalname);
    cb(null, fileName);
  }
});
const upload = multer({ storage });

// Servir imágenes estáticas
app.use('/uploads', express.static('uploads'));

// Rutas API

// Crear producto
app.post('/api/productos', upload.single('imagen'), (req, res) => {
  const { sku, titulo, descripcion, precio, stock, categoria_id } = req.body;
  const imagen = req.file ? req.file.filename : null;

  const sql = `INSERT INTO productos (sku, titulo, descripcion, precio, stock, categoria_id, imagen) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const values = [sku, titulo, descripcion, parseFloat(precio), parseInt(stock), parseInt(categoria_id), imagen];

  db.query(sql, values, (err) => {
    if (err) {
      console.error("❌ Error al agregar producto:", err);
      return res.status(500).json({ message: "Error en el servidor al agregar el producto" });
    }
    res.json({ message: "Producto agregado exitosamente" });
  });
});

// Obtener todos los productos
app.get('/api/productos', (req, res) => {
  const sql = "SELECT * FROM productos";
  db.query(sql, (err, result) => {
    if (err) {
      console.error("❌ Error al obtener los productos:", err);
      return res.status(500).json({ message: "Error al obtener los productos" });
    }
    res.json(result);
  });
});

// Actualizar stock
app.put('/api/productos/stock/:id', (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;

  if (typeof stock !== "number" || stock < 0) {
    return res.status(400).json({ message: "El stock debe ser un número válido y mayor o igual a 0" });
  }

  const sql = "UPDATE productos SET stock = ? WHERE id = ?";
  db.query(sql, [stock, id], (err, result) => {
    if (err) {
      console.error("❌ Error al actualizar stock:", err);
      return res.status(500).json({ message: "Error en el servidor al actualizar el stock" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    res.json({ message: "Stock actualizado exitosamente" });
  });
});

// Eliminar producto
app.delete('/api/productos/:id', (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM productos WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("❌ Error al eliminar el producto:", err);
      return res.status(500).json({ message: "Error al eliminar el producto" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    res.json({ message: "Producto eliminado exitosamente" });
  });
});

// Obtener categorías
app.get('/api/categorias', (req, res) => {
  const sql = "SELECT * FROM categorias";
  db.query(sql, (err, result) => {
    if (err) {
      console.error("❌ Error al obtener categorías:", err);
      return res.status(500).json({ message: "Error al obtener categorías" });
    }
    res.json(result);
  });
});

// Iniciar servidor
app.listen(INVENTARIO_PORT, () => {
  console.log(`🚀 Servidor de inventarios corriendo en http://localhost:${INVENTARIO_PORT}`);
});
