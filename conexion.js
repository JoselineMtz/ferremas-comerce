import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Configuración de entorno
dotenv.config();

// Configuración de conexión con valores por defecto
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'Ferremas',
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000, // 10 segundos para conexión inicial
  idleTimeout: 60000, // 60 segundos para cerrar conexiones inactivas
  enableKeepAlive: true, // Mantener conexiones activas
  keepAliveInitialDelay: 10000 // Delay inicial para keepalive
};

// Creación del pool con manejo de errores
let pool;
try {
  pool = mysql.createPool(dbConfig);
  console.log('✅ Pool de conexiones MySQL creado exitosamente');
  
  // Verificación inmediata de conexión
  (async () => {
    try {
      const [result] = await pool.query('SELECT 1 AS connection_test');
      console.log('🟢 Verificación inicial de conexión exitosa');
    } catch (error) {
      console.error('🔴 Fallo en verificación inicial de conexión:', error.message);
    }
  })();
} catch (error) {
  console.error('❌ Error crítico al crear el pool de conexiones:', error.message);
  process.exit(1);
}

// Health check periódico
const healthCheckInterval = setInterval(async () => {
  try {
    const [result] = await pool.query('SELECT 1 AS health_check');
    console.log(`🟢 Health check OK a las ${new Date().toLocaleTimeString()}`);
  } catch (error) {
    console.error(`🔴 Health check fallido: ${error.message}`);
    
    // Intento de reconexión
    try {
      await pool.end();
      pool = mysql.createPool(dbConfig);
      console.log('🔄 Pool recreado exitosamente después de fallo');
    } catch (reconnectError) {
      console.error('❌ Error al recrear el pool:', reconnectError.message);
    }
  }
}, 30000); // Cada 30 segundos

// Limpieza al cerrar la aplicación
process.on('SIGINT', async () => {
  clearInterval(healthCheckInterval);
  try {
    await pool.end();
    console.log('🛑 Pool cerrado correctamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al cerrar el pool:', error.message);
    process.exit(1);
  }
});

export default pool;