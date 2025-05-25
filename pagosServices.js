import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './conexion.js';  // Tu conexión a la base de datos

dotenv.config();

const app = express();
const PAGOS_PORT = process.env.PAGOS_PORT || 6000;

app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Registrar un pago
app.post('/api/pagos', async (req, res) => {
  try {
    const { pedido_id, cliente_id, monto, metodo_pago, estado = 'pendiente', referencia } = req.body;

    if (!pedido_id || !cliente_id || !monto || !metodo_pago) {
      return res.status(400).json({ message: 'Faltan datos obligatorios: pedido_id, cliente_id, monto, metodo_pago' });
    }

    const [result] = await db.query(
      `INSERT INTO pagos (pedido_id, cliente_id, monto, metodo_pago, estado, referencia)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [pedido_id, cliente_id, monto, metodo_pago, estado, referencia || null]
    );

    res.status(201).json({
      message: 'Pago registrado exitosamente',
      pago_id: result.insertId
    });
  } catch (err) {
    console.error('Error al registrar pago:', err);
    res.status(500).json({ error: 'Error al registrar el pago' });
  }
});

// Listar pagos (opcionalmente filtrar por pedido_id, cliente_id o estado)
app.get('/api/pagos', async (req, res) => {
  try {
    let sql = 'SELECT * FROM pagos WHERE 1=1';
    const params = [];

    if (req.query.pedido_id) {
      sql += ' AND pedido_id = ?';
      params.push(req.query.pedido_id);
    }

    if (req.query.cliente_id) {
      sql += ' AND cliente_id = ?';
      params.push(req.query.cliente_id);
    }

    if (req.query.estado) {
      sql += ' AND estado = ?';
      params.push(req.query.estado);
    }

    sql += ' ORDER BY fecha DESC';

    const [pagos] = await db.query(sql, params);

    res.json(pagos);
  } catch (err) {
    console.error('Error al listar pagos:', err);
    res.status(500).json({ error: 'Error al listar pagos' });
  }
});

// Obtener pago por id
app.get('/api/pagos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [pagos] = await db.query(
      'SELECT * FROM pagos WHERE id = ?',
      [id]
    );

    if (pagos.length === 0) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    res.json(pagos[0]);
  } catch (err) {
    console.error('Error al obtener pago:', err);
    res.status(500).json({ error: 'Error al obtener el pago' });
  }
});

// Iniciar servidor pagos
app.listen(PAGOS_PORT, () => {
  console.log(`🚀 Servidor de pagos corriendo en http://localhost:${PAGOS_PORT}`);
});
