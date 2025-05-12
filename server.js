import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import db from './conexion.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken'; // Añadir esta importación

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

// Función para generar token JWT (Esta función es redundante si se genera el token directamente en el login)
// Puedes mantenerla si se planea usar en otros lugares o para mejor modularidad.
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
          usuario: userData, // Asegurar nombre de propiedad 'usuario'
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
      usuario: userData, // Asegurar nombre de propiedad 'usuario'
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

// Resto de endpoints permanecen igual...
const PORT = process.env.SERVER_PORT || 3006;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});