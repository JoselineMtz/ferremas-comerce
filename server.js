import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import db from './conexion.js';
import bcrypt from 'bcrypt'; // Importar bcrypt para hashing de contraseñas
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

dotenv.config();
const app = express();

// ================== CONFIGURACIÓN INICIAL ==================
const PORT = process.env.SERVER_PORT || 3006;
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ================== MIDDLEWARES ==================
app.use(express.json());
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Incluido PATCH para consistencia
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware de logging mejorado
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Inicio`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// ================== FUNCIONES AUXILIARES ==================
const generateToken = (user) => {
  return jwt.sign(
    {
      rut: user.rut,
      nombre: user.nombre,
      esAdmin: user.esAdmin,
      esCliente: user.esCliente,
      esEmpleado: Boolean(user.esEmpleado), // Asegurar que sea booleano
      esBodeguero: user.esBodeguero || false, // Añadir esBodeguero basado en el cargo
      id: user.id || null, // Asegurarse de que el ID del empleado/cliente esté en el token
      cargo: user.cargo || null, // Asegurar que el cargo esté en el token para empleados
      sucursal_id: user.sucursal_id || null, // Si aplica para empleados
      // Asegurarse de que primerInicio sea un booleano al generar el token
      primerInicio: Boolean(user.primerInicio) 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Middleware de autenticación (solo valida el token y adjunta el usuario)
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: "Token de autorización no proporcionado o formato incorrecto"
    });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("Error al verificar token JWT:", err.message); // Log detallado del error JWT
      return res.status(403).json({
        success: false,
        message: "Token inválido o expirado"
      });
    }
    // Si la verificación es exitosa, adjunta el payload del token a req.user
    req.user = user;
    next(); // Procede al siguiente middleware o manejador de ruta
  });
};

// Middleware de autorización (verifica rol de administrador)
const authorizeAdmin = (req, res, next) => {
  // Se asume que authenticateJWT ya se ejecutó y req.user está disponible
  if (req.user && req.user.esAdmin) {
    next(); // El usuario es administrador, permite el acceso
  } else {
    // Si no es administrador o req.user no está definido (aunque authenticateJWT debería manejarlo)
    return res.status(403).json({
      success: false,
      message: "Acceso denegado. Se requiere rol de administrador."
    });
  }
};

// Middleware de autorización (verifica rol de empleado)
const authorizeEmpleado = (req, res, next) => {
  if (req.user && req.user.esEmpleado) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Acceso denegado. Se requiere rol de empleado."
    });
  }
};

// Middleware de autorización para Vendedores
const authorizeVendedor = (req, res, next) => {
  console.log("[authorizeVendedor] Checking authorization for Vendedor. req.user:", req.user);
  if (req.user && req.user.esEmpleado && req.user.cargo === 'Vendedor') {
    next();
  } else {
    console.log("[authorizeVendedor] Access denied: Not a Vendedor or user not found.");
    return res.status(403).json({ success: false, message: "Acceso denegado. Se requiere rol de Vendedor." });
  }
};


// ================== RUTAS DE AUTENTICACIÓN ==================

// NUEVA RUTA: Endpoint para verificar la validez del token
app.get('/api/verify-token', authenticateJWT, (req, res) => {
  res.json({ success: true, message: "Token válido", user: req.user });
});

app.post("/api/login", async (req, res) => {
  const { rut, password } = req.body;
  console.log("Intento de login para RUT:", rut);

  if (!rut || !password) {
    console.log("[Login Debug] Faltan RUT o contraseña.");
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
      [rut.trim()] 
    );
    console.log("[Login Debug] adminRows (después de query para administradores):", adminRows); 

    if (adminRows.length > 0) {
      const admin = adminRows[0];
      const hashedInput = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");
      console.log(`[Login Debug] Administrador encontrado. Hash de entrada: ${hashedInput}, Hash de DB: ${admin.contraseña}`);

      if (hashedInput === admin.contraseña) {
        const userData = {
          rut: admin.rut,
          nombre: admin.nombre,
          esAdmin: true,
          esCliente: false,
          esEmpleado: false,
          esBodeguero: false, 
          primerInicio: admin.primer_inicio // Usar el valor directamente de la DB para primerInicio
        };

        const token = generateToken(userData);
        console.log("[Login Debug] Autenticación exitosa como administrador.");
        return res.json({
          success: true,
          token: token,
          usuario: userData,
          message: "Autenticación exitosa como administrador"
        });
      } else {
        console.log("[Login Debug] Contraseña de administrador incorrecta.");
      }
    }

    // 2. Verificar empleados
    const [empleadoRows] = await db.query(
      "SELECT id, rut, nombre, email, cargo, contraseña, sucursal_id FROM empleados WHERE rut = ?",
      [rut.trim()] 
    );
    console.log("[Login Debug] empleadoRows (después de query para empleados):", empleadoRows); 

    if (empleadoRows.length > 0) {
      const empleado = empleadoRows[0];
      const passwordMatch = await bcrypt.compare(password, empleado.contraseña);
      console.log(`[Login Debug] Empleado encontrado. Contraseña coincide: ${passwordMatch}`);

      if (passwordMatch) {
        const userData = {
          id: empleado.id, 
          rut: empleado.rut,
          nombre: empleado.nombre,
          email: empleado.email,
          cargo: empleado.cargo,
          sucursal_id: empleado.sucursal_id, 
          esAdmin: false,
          esCliente: false,
          esEmpleado: true, 
          esBodeguero: empleado.cargo === 'Bodeguero' 
        };
        const token = generateToken(userData);
        console.log(`[Login Debug] Autenticación exitosa como empleado (${empleado.cargo}).`);
        return res.json({
          success: true,
          token: token,
          usuario: userData,
          message: `Autenticación exitosa como ${empleado.cargo}`
        });
      } else {
        console.log("[Login Debug] Contraseña de empleado incorrecta.");
      }
    }

    // 3. Verificar clientes
    const [clientRows] = await db.query(
      "SELECT id, rut, nombre, apellido, correo, password FROM clientes WHERE rut = ?",
      [rut.trim()] 
    );
    console.log("[Login Debug] clientRows (después de query para clientes):", clientRows); 

    if (clientRows.length === 0) {
      console.log("[Login Debug] Usuario no encontrado en ninguna tabla.");
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
        errorCode: "USER_NOT_FOUND"
      });
    }

    const client = clientRows[0];
    const passwordMatch = await bcrypt.compare(password, client.password);
    console.log(`[Login Debug] Cliente encontrado. Contraseña coincide: ${passwordMatch}`);

    if (!passwordMatch) {
      console.log("[Login Debug] Contraseña de cliente incorrecta.");
      return res.status(401).json({
        success: false,
        message: "Credenciales incorrectas",
        errorCode: "INVALID_CREDENTIALS"
      });
    }

    const userData = {
      id: client.id, 
      rut: client.rut,
      nombre: client.nombre,
      apellido: client.apellido,
      correo: client.correo,
      esAdmin: false,
      esCliente: true,
      esEmpleado: false,
      esBodeguero: false, 
      primerInicio: false
    };

    const token = generateToken(userData);
    console.log("[Login Debug] Autenticación exitosa como cliente.");
    res.json({
      success: true,
      token: token,
      usuario: userData,
      message: "Autenticación exitosa como cliente"
    });

  } catch (err) {
    console.error("Error en login (catch block):", err);
    res.status(500).json({
      success: false,
      message: "Error en el servidor",
      errorCode: "SERVER_ERROR"
    });
  }
});

// Endpoint para cambiar la contraseña (solo para administradores en primer inicio)
app.post('/api/cambiar-password', authenticateJWT, async (req, res) => {
  const { rut, nuevaPassword } = req.body;
  const user = req.user; // Usuario del token

  // DEBUG LOGS CLAVE
  console.log("[CambiarPassword DEBUG] Datos de usuario del token (req.user):", user);
  console.log("[CambiarPassword DEBUG] user.esAdmin:", user.esAdmin, "Tipo:", typeof user.esAdmin);
  console.log("[CambiarPassword DEBUG] user.primerInicio:", user.primerInicio, "Tipo:", typeof user.primerInicio);

  // Asegurar que user.primerInicio sea tratado como un booleano (0 o 1 de la DB)
  // Se compara directamente con true (ya que generateToken ahora lo convierte a booleano)
  const requiresPasswordChange = user.primerInicio === true; 

  if (!user || !user.esAdmin || !requiresPasswordChange) {
    console.log("[CambiarPassword] Acceso denegado: !user =", !user, ", !user.esAdmin =", !user.esAdmin, ", !requiresPasswordChange =", !requiresPasswordChange);
    console.log("[CambiarPassword] Motivo del acceso denegado:", 
      !user ? "Usuario no encontrado en el token." :
      !user.esAdmin ? "El usuario no es administrador." :
      !requiresPasswordChange ? "El usuario administrador no requiere cambio de contraseña (primer inicio ya es falso)." : "Motivo desconocido"
    );
    return res.status(403).json({ success: false, message: "Acceso denegado o no se requiere cambio de contraseña." });
  }

  if (user.rut !== rut) {
    console.log("[CambiarPassword] Error: El RUT en el token no coincide con el RUT de la solicitud. Token RUT:", user.rut, "Request RUT:", rut);
    return res.status(403).json({ success: false, message: "RUT no autorizado para el cambio de contraseña." });
  }

  if (!nuevaPassword || nuevaPassword.length < 6) { // Ejemplo de validación de longitud mínima
    console.log("[CambiarPassword] Error: Contraseña nueva inválida.");
    return res.status(400).json({ success: false, message: "La nueva contraseña debe tener al menos 6 caracteres." });
  }

  try {
    const hashedPassword = crypto.createHash("sha256").update(nuevaPassword).digest("hex");

    const [result] = await db.query(
      "UPDATE administradores SET contraseña = ?, primer_inicio = ? WHERE rut = ?",
      [hashedPassword, false, rut.trim()]
    );

    if (result.affectedRows === 0) {
      console.log("[CambiarPassword] Error: No se encontró el administrador para actualizar.");
      return res.status(404).json({ success: false, message: "Administrador no encontrado para actualizar contraseña." });
    }

    console.log("[CambiarPassword] Contraseña actualizada exitosamente para RUT:", rut);
    res.json({ success: true, message: "Contraseña actualizada y primer inicio deshabilitado." });

  } catch (error) {
    console.error("Error al cambiar la contraseña:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor al cambiar la contraseña." });
  }
});


// Ruta para registrar un nuevo cliente
app.post("/api/registro", async (req, res) => {
  const { rut, nombre, apellido, correo, telefono, password } = req.body;

  if (!rut || !nombre || !apellido || !correo || !telefono || !password) {
    return res.status(400).json({
      success: false,
      message: "Todos los campos son obligatorios",
    });
  }

  try {
    const [existingUser] = await db.query(
      "SELECT rut FROM clientes WHERE rut = ? OR correo = ?",
      [rut.trim(), correo.trim()] 
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: "El RUT o el correo electrónico ya están registrados.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO clientes (rut, nombre, apellido, correo, telefono, password) VALUES (?, ?, ?, ?, ?, ?)",
      [rut.trim(), nombre.trim(), apellido.trim(), correo.trim(), telefono.trim(), hashedPassword] 
    );

    const [newClient] = await db.query('SELECT id, rut, nombre, apellido, correo, telefono FROM clientes WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: "Cliente registrado exitosamente",
      data: newClient[0], 
    });
  } catch (error) {
    console.error("Error en el registro:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor al registrar cliente.",
      error: error.message,
    });
  }
});

// ================== RUTAS DE EMPLEADOS (AHORA PROTEGIDAS CON authorizeAdmin) ==================

// Las rutas de empleados ahora requieren tanto autenticación como autorización de administrador
app.get('/api/empleados', authenticateJWT, authorizeAdmin, async (req, res) => {
  try {
    console.log('Accediendo a /api/empleados (como administrador)');

    const [empleados] = await db.query(`
      SELECT e.id, e.rut, e.nombre, e.email, e.cargo, e.sucursal_id, e.fecha_contratacion, e.telefono, s.nombre as sucursal_nombre
      FROM empleados e
      LEFT JOIN sucursales s ON e.sucursal_id = s.sucursal_id
    `);

    console.log('Empleados encontrados:', empleados);

    res.json({
      success: true,
      data: empleados
    });
  } catch (error) {
    console.error('Error en /api/empleados:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener empleados',
      error: error.message
    });
  }
});

app.get('/api/empleados/public', async (req, res) => {
  // Esta ruta es pública y no necesita autenticación/autorización
  try {
    const [empleados] = await db.query(`
      SELECT e.id, e.nombre, e.cargo, s.nombre as sucursal_nombre
      FROM empleados e
      JOIN sucursales s ON e.sucursal_id = s.sucursal_id
    `);

    res.json({
      success: true,
      data: empleados
    });
  } catch (error) {
    console.error('Error al obtener empleados públicos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener empleados públicos'
    });
  }
});

// CORRECCIÓN CLAVE: La ruta /api/empleados/perfil ahora usa authorizeEmpleado
app.get('/api/empleados/perfil', authenticateJWT, authorizeEmpleado, async (req, res) => {
  console.log("[/api/empleados/perfil] Usuario validado como EMPLEADO. Procediendo con la consulta.");
  try {
    const empleadoId = req.user.id;
    const [empleado] = await db.query(`
      SELECT e.id, e.rut, e.nombre, e.email, e.cargo, e.sucursal_id, e.fecha_contratacion, e.telefono, s.nombre as sucursal_nombre
      FROM empleados e
      LEFT JOIN sucursales s ON e.sucursal_id = s.sucursal_id
      WHERE e.id = ?
    `, [empleadoId]);

    if (empleado.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Perfil de empleado no encontrado'
      });
    }

    res.json({
      success: true,
      data: empleado[0]
    });
  } catch (error) {
    console.error('Error al obtener perfil del empleado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil del empleado'
    });
  }
});


app.get('/api/empleados/:id', authenticateJWT, authorizeAdmin, async (req, res) => {
  try {
    const [empleado] = await db.query(`
      SELECT e.id, e.rut, e.nombre, e.email, e.cargo, e.sucursal_id, e.fecha_contratacion, e.telefono, s.nombre as sucursal_nombre
      FROM empleados e
      JOIN sucursales s ON e.sucursal_id = s.sucursal_id
      WHERE e.id = ?
    `, [req.params.id]);

    if (empleado.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empleado no encontrado'
      });
    }

    res.json({
      success: true,
      data: empleado[0]
    });
  } catch (error) {
    console.error('Error al obtener empleado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener empleado'
    });
  }
});

app.post('/api/empleados', authenticateJWT, authorizeAdmin, async (req, res) => {
  const { rut, nombre, email, cargo, sucursal_id, fecha_contratacion, telefono, password } = req.body;

  if (!rut || !nombre || !email || !cargo || !sucursal_id || !fecha_contratacion || !password) {
    return res.status(400).json({
      success: false,
      message: 'Faltan campos obligatorios: rut, nombre, email, cargo, sucursal_id, fecha_contratacion, y password son requeridos.'
    });
  }

  try {
    const [sucursal] = await db.query('SELECT * FROM sucursales WHERE sucursal_id = ?', [sucursal_id]);
    if (sucursal.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'La sucursal especificada no existe.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO empleados (rut, nombre, email, cargo, sucursal_id, fecha_contratacion, telefono, contraseña) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [rut.trim(), nombre.trim(), email.trim(), cargo.trim(), sucursal_id, fecha_contratacion, telefono.trim(), hashedPassword] 
    );

    const [nuevoEmpleado] = await db.query('SELECT * FROM empleados WHERE id = ?', [result.insertId]);

    const empleadoSinPassword = { ...nuevoEmpleado[0] };
    delete empleadoSinPassword.contraseña;

    res.status(201).json({
      success: true,
      data: empleadoSinPassword,
      message: 'Empleado creado exitosamente.'
    });
  } catch (error) {
    console.error('Error al crear empleado:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'El RUT o email ya están registrados.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al crear empleado.'
    });
  }
});

app.put('/api/empleados/:id', authenticateJWT, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre, email, cargo, sucursal_id, fecha_contratacion, telefono, password } = req.body;

  if (!nombre || !email || !cargo || !sucursal_id || !fecha_contratacion) {
    return res.status(400).json({
      success: false,
      message: 'Faltan campos obligatorios: nombre, email, cargo, sucursal_id, fecha_contratacion son requeridos.'
    });
  }

  try {
    const [empleadoExistente] = await db.query('SELECT * FROM empleados WHERE id = ?', [id]);
    if (empleadoExistente.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empleado no encontrado.'
      });
    }

    const [sucursal] = await db.query('SELECT * FROM sucursales WHERE sucursal_id = ?', [sucursal_id]);
    if (sucursal.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'La sucursal especificada no existe.'
      });
    }

    let updateQuery = 'UPDATE empleados SET nombre = ?, email = ?, cargo = ?, sucursal_id = ?, fecha_contratacion = ?, telefono = ?';
    const queryParams = [nombre.trim(), email.trim(), cargo.trim(), sucursal_id, fecha_contratacion, telefono.trim()]; 

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', contraseña = ?';
      queryParams.push(hashedPassword);
    }

    updateQuery += ' WHERE id = ?';
    queryParams.push(id);

    await db.query(updateQuery, queryParams);

    const [empleadoActualizado] = await db.query('SELECT * FROM empleados WHERE id = ?', [id]);

    const empleadoSinPassword = { ...empleadoActualizado[0] };
    delete empleadoSinPassword.contraseña;

    res.json({
      success: true,
      data: empleadoSinPassword,
      message: 'Empleado actualizado exitosamente.'
    });
  } catch (error) {
    console.error('Error al actualizar empleado:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado para otro empleado.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al actualizar empleado.'
    });
  }
});

app.delete('/api/empleados/:id', authenticateJWT, authorizeAdmin, async (req, res) => {
  try {
    const [empleado] = await db.query('SELECT * FROM empleados WHERE id = ?', [req.params.id]);
    if (empleado.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empleado no encontrado'
      });
    }

    await db.query('DELETE FROM empleados WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Empleado eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar empleado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar empleado'
    });
  }
});

// ================== RUTAS DE CLIENTES ==================

// NUEVA RUTA: Endpoint para obtener un cliente por RUT (público, para verificación)
app.get('/api/clientes/by-rut/:rut', async (req, res) => {
  try {
    const { rut } = req.params;
    const [rows] = await db.query('SELECT id, rut, nombre, apellido, correo, telefono FROM clientes WHERE rut = ?', [rut.trim()]); 
    if (rows.length > 0) {
      res.json({ success: true, exists: true, data: rows[0] });
    } else {
      res.json({ success: true, exists: false, message: "Cliente no encontrado." });
    }
  } catch (error) {
    console.error('Error al verificar RUT de cliente:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor al verificar RUT.' });
  }
});

// ================== INICIAR SERVIDOR ==================
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log("\n==== RUTAS REGISTRADAS EN EXPRESS AL INICIAR ====");
  app._router.stack.forEach(function(middleware){
    if(middleware.route){ // Rutas normales (GET, POST, etc.)
      console.log(`Ruta: ${middleware.route.path}, Métodos: ${Object.keys(middleware.route.methods).join(', ').toUpperCase()}`);
    } else if (middleware.name === 'router' && middleware.handle && middleware.handle.stack) { // Sub-routers (si los hubiera)
      middleware.handle.stack.forEach(function(handler){
        if(handler.route){
          console.log(`  Sub-Ruta: ${handler.route.path}, Métodos: ${Object.keys(handler.route.methods).join(', ').toUpperCase()}`);
        }
      });
    }
  });
  console.log("=================================================\n");
});
