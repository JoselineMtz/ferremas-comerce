import express from 'express';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './conexion.js';  // Importando la conexión a la base de datos

// Configuración inicial
dotenv.config();
const app = express();
const PEDIDOS_PORT = process.env.PEDIDOS_PORT || 5004;

// Middlewares básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Ruta para obtener un pedido específico y sus productos
app.get('/api/pedidos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener el pedido y la sucursal asociada
    const [pedido] = await db.query(
      `SELECT p.*, c.nombre as cliente, s.nombre as sucursal, 
              s.direccion as sucursal_direccion, s.comuna as sucursal_comuna, 
              s.region as sucursal_region, s.telefono as sucursal_telefono, 
              s.horario_apertura, s.horario_cierre
       FROM pedidos p
       LEFT JOIN clientes c ON p.cliente_id = c.id
       LEFT JOIN sucursales s ON p.sucursal_id = s.sucursal_id
       WHERE p.id = ?`,
      [id]
    );

    if (pedido.length === 0) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    // Obtener todos los productos disponibles
    const [productos] = await db.query(
      `SELECT * FROM productos`
    );

    // Respuesta combinada con los productos del pedido
    const response = {
      ...pedido[0], // Pedido
      sucursal: {
        nombre: pedido[0].sucursal,
        direccion: pedido[0].sucursal_direccion,
        comuna: pedido[0].sucursal_comuna,
        region: pedido[0].sucursal_region,
        telefono: pedido[0].sucursal_telefono,
        horario_apertura: pedido[0].horario_apertura,
        horario_cierre: pedido[0].horario_cierre
      },
      productos: productos.map(p => ({
        sku: p.sku,
        titulo: p.titulo,
        cantidad: p.stock,  // Suponiendo que 'stock' se usa como cantidad
        precio_unitario: p.precio,
        total_producto: p.stock * p.precio // Total del producto calculado
      })),
      total_pedido: productos.reduce((acc, p) => acc + (p.stock * p.precio), 0) // Total del pedido
    };

    res.json(response);
  } catch (err) {
    console.error("Error al obtener el pedido:", err);
    res.status(500).json({
      error: err.message || "Error al obtener el pedido y sus productos"
    });
  }
});

// Ruta para listar todos los pedidos
app.get('/api/pedidos', async (req, res) => {
  try {
    // Obtener todos los pedidos con la información de la sucursal
    const [pedidos] = await db.query(
      `SELECT p.*, c.nombre as cliente, s.nombre as sucursal, 
              s.direccion as sucursal_direccion, s.comuna as sucursal_comuna, 
              s.region as sucursal_region, s.telefono as sucursal_telefono, 
              s.horario_apertura, s.horario_cierre
       FROM pedidos p
       LEFT JOIN clientes c ON p.cliente_id = c.id
       LEFT JOIN sucursales s ON p.sucursal_id = s.sucursal_id`
    );

    if (pedidos.length === 0) {
      return res.status(404).json({ message: "No se encontraron pedidos" });
    }

    // Respuesta con todos los pedidos
    res.json(pedidos);
  } catch (err) {
    console.error("Error al obtener los pedidos:", err);
    res.status(500).json({
      error: err.message || "Error al obtener los pedidos"
    });
  }
});

// Ruta para listar los pedidos de un cliente por cliente_id
app.get('/api/pedidos/cliente/:cliente_id', async (req, res) => {
  try {
    const { cliente_id } = req.params;

    // Obtener los pedidos de un cliente específico con la información de la sucursal
    const [pedidos] = await db.query(
      `SELECT p.*, c.nombre as cliente, s.nombre as sucursal, 
              s.direccion as sucursal_direccion, s.comuna as sucursal_comuna, 
              s.region as sucursal_region, s.telefono as sucursal_telefono, 
              s.horario_apertura, s.horario_cierre
       FROM pedidos p
       LEFT JOIN clientes c ON p.cliente_id = c.id
       LEFT JOIN sucursales s ON p.sucursal_id = s.sucursal_id
       WHERE p.cliente_id = ?`,
      [cliente_id]
    );

    if (pedidos.length === 0) {
      return res.status(404).json({ message: "No se encontraron pedidos para este cliente" });
    }

    // Respuesta con los pedidos del cliente
    res.json(pedidos);
  } catch (err) {
    console.error("Error al obtener los pedidos del cliente:", err);
    res.status(500).json({
      error: err.message || "Error al obtener los pedidos del cliente"
    });
  }
});

// Ruta para listar pedidos por sucursal_id
app.get('/api/pedidos/sucursal/:sucursal_id', async (req, res) => {
  try {
    const { sucursal_id } = req.params;

    // Obtener los pedidos de una sucursal específica con la información de la sucursal
    const [pedidos] = await db.query(
      `SELECT p.*, c.nombre as cliente, s.nombre as sucursal, 
              s.direccion as sucursal_direccion, s.comuna as sucursal_comuna, 
              s.region as sucursal_region, s.telefono as sucursal_telefono, 
              s.horario_apertura, s.horario_cierre
       FROM pedidos p
       LEFT JOIN clientes c ON p.cliente_id = c.id
       LEFT JOIN sucursales s ON p.sucursal_id = s.sucursal_id
       WHERE p.sucursal_id = ?`,
      [sucursal_id]
    );

    if (pedidos.length === 0) {
      return res.status(404).json({ message: "No se encontraron pedidos para esta sucursal" });
    }

    // Respuesta con los pedidos de la sucursal
    res.json(pedidos);
  } catch (err) {
    console.error("Error al obtener los pedidos de la sucursal:", err);
    res.status(500).json({
      error: err.message || "Error al obtener los pedidos de la sucursal"
    });
  }
});

// Ruta para listar todas las sucursales
app.get('/api/sucursales', async (req, res) => {
  try {
    // Obtener todas las sucursales
    const [sucursales] = await db.query(
      `SELECT * FROM sucursales`
    );

    if (sucursales.length === 0) {
      return res.status(404).json({ message: "No se encontraron sucursales" });
    }

    // Respuesta con todas las sucursales
    res.json(sucursales);
  } catch (err) {
    console.error("Error al obtener las sucursales:", err);
    res.status(500).json({
      error: err.message || "Error al obtener las sucursales"
    });
  }
});
app.put('/api/pedidos/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    console.log("Estado recibido:", estado);  // Imprimir el estado recibido en el servidor

    // Verificar si el estado es válido
    const estadosValidos = ['pendiente', 'procesado', 'enviado', 'entregado', 'cancelado'];

    if (!estado || !estadosValidos.includes(estado)) {
      return res.status(400).json({ message: `Estado inválido. Los valores permitidos son: ${estadosValidos.join(', ')}` });
    }

    // Realizar la actualización del estado
    const [result] = await db.query(
      `UPDATE pedidos SET estado = ? WHERE id = ?`,
      [estado, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    res.json({ message: `Estado del pedido ${id} actualizado a ${estado}` });
  } catch (err) {
    console.error("Error al actualizar el estado del pedido:", err);
    res.status(500).json({
      error: err.message || "Error al actualizar el estado del pedido"
    });
  }
});


// Iniciar servidor
app.listen(PEDIDOS_PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PEDIDOS_PORT}`);
});
