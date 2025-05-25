import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import db from './conexion.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

dotenv.config();
const app = express();

// Configuración middleware mejorada
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware de logging mejorado
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Función para generar token JWT
const generateToken = (user) => {
  return jwt.sign(
    { 
      rut: user.rut, 
      nombre: user.nombre,
      esAdmin: user.esAdmin 
    },
    process.env.JWT_SECRET || 'secret-key',
    { expiresIn: '24h' }
  );
};

// Ruta de login optimizada y actualizada
app.post("/api/login", async (req, res) => {
  const { rut, password } = req.body;
  console.log("Intento de login para RUT:", rut);

  if (!rut || !password) {
    return res.status(400).json({
      success: false,
      message: "RUT y contraseña son obligatorios",
      errorCode: "MISSING_CREDENTIALS"
    });
  }

  try {
    // 1. Verificar administradores
    const [adminRows] = await db.query(
      "SELECT rut, nombre, contraseña, primer_inicio FROM administradores WHERE rut = ?", 
      [rut]
    );

    if (adminRows.length > 0) {
      const admin = adminRows[0];
      const hashedInput = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");

      if (hashedInput === admin.contraseña) {
        const userData = {
          rut: admin.rut,
          nombre: admin.nombre,
          esAdmin: true,
          esCliente: false,
          primerInicio: admin.primer_inicio || false
        };
        
        // Generar token JWT
        const token = jwt.sign(userData, process.env.JWT_SECRET || 'secret-key', {
          expiresIn: '24h'
        });

        return res.json({
          success: true,
          token: token,
          usuario: userData,
          message: "Autenticación exitosa"
        });
      }
    }

    // 2. Verificar clientes
    const [clientRows] = await db.query(
      "SELECT rut, nombre, apellido, correo, password FROM clientes WHERE rut = ?", 
      [rut]
    );

    if (clientRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
        errorCode: "USER_NOT_FOUND"
      });
    }

    const client = clientRows[0];
    const passwordMatch = await bcrypt.compare(password, client.password);
    
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Credenciales incorrectas",
        errorCode: "INVALID_CREDENTIALS"
      });
    }

    const userData = {
      rut: client.rut,
      nombre: client.nombre,
      apellido: client.apellido,
      correo: client.correo,
      esAdmin: false,
      esCliente: true,
      primerInicio: false
    };

    // Generar token JWT
    const token = jwt.sign(userData, process.env.JWT_SECRET || 'secret-key', {
      expiresIn: '24h'
    });

    res.json({
      success: true,
      token: token,
      usuario: userData,
      message: "Autenticación exitosa"
    });

  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({
      success: false,
      message: "Error en el servidor",
      errorCode: "SERVER_ERROR"
    });
  }
});

// Endpoint para listar clientes (nuevo)
app.get('/api/clientes', async (req, res) => {
  try {
    // Obtener parámetros de paginación
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Consulta para obtener los clientes
    const [clientes] = await db.query(
      `SELECT rut, nombre, apellido, correo, telefono, fecha_registro 
       FROM clientes 
       ORDER BY fecha_registro DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // Consulta para contar el total de clientes
    const [total] = await db.query(
      'SELECT COUNT(*) AS total FROM clientes'
    );

    res.json({
      success: true,
      data: clientes,
      pagination: {
        total: total[0].total,
        page,
        limit,
        totalPages: Math.ceil(total[0].total / limit)
      }
    });

  } catch (err) {
    console.error('Error al obtener clientes:', err);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la lista de clientes',
      errorCode: 'CLIENT_LIST_ERROR'
    });
  }
});

// Endpoint para buscar clientes por nombre o RUT (nuevo)
app.get('/api/clientes/buscar', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'La búsqueda debe tener al menos 3 caracteres',
        errorCode: 'INVALID_SEARCH_QUERY'
      });
    }

    const [clientes] = await db.query(
      `SELECT rut, nombre, apellido, correo, telefono 
       FROM clientes 
       WHERE nombre LIKE ? OR apellido LIKE ? OR rut LIKE ?
       LIMIT 10`,
      [`%${query}%`, `%${query}%`, `%${query}%`]
    );

    res.json({
      success: true,
      data: clientes
    });

  } catch (err) {
    console.error('Error en búsqueda de clientes:', err);
    res.status(500).json({
      success: false,
      message: 'Error en la búsqueda de clientes',
      errorCode: 'CLIENT_SEARCH_ERROR'
    });
  }
});

const PORT = process.env.SERVER_PORT || 3006;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});