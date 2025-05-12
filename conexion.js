import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'Ferremax',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000, // 10 segundos para conexión
  acquireTimeout: 10000, // 10 segundos para obtener conexión
  timeout: 10000 // 10 segundos para consultas
});

// Verificación activa de conexión
setInterval(async () => {
  try {
    const [rows] = await pool.query('SELECT 1');
    console.log('🟢 Conexión a DB activa', new Date().toISOString());
  } catch (err) {
    console.error('🔴 Error en conexión DB:', err.message);
  }
}, 30000); // Cada 30 segundos

console.log('✅ Pool de conexiones MySQL creado');
export default pool;