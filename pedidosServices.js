// pedidosServices.js
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

// Ruta para obtener pedidos por sucursal
app.get('/api/pedidos/sucursal/:sucursal_id', async (req, res) => {
  try {
    const { sucursal_id } = req.params;

    // Obtener los pedidos asociados a la sucursal
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
    const response = pedidos.map(p => ({
      id: p.id,
      total: p.total,
      fecha: p.fecha,
      estado: p.estado,
      cliente: p.cliente,
      sucursal: {
        nombre: p.sucursal,
        direccion: p.sucursal_direccion,
        comuna: p.sucursal_comuna,
        region: p.sucursal_region,
        telefono: p.sucursal_telefono,
        horario_apertura: p.horario_apertura,
        horario_cierre: p.horario_cierre
      }
    }));

    res.json(response);
  } catch (err) {
    console.error("Error al obtener pedidos por sucursal:", err);
    res.status(500).json({
      error: err.message || "Error al obtener los pedidos por sucursal"
    });
  }
});

// Iniciar servidor
app.listen(PEDIDOS_PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PEDIDOS_PORT}`);
});
