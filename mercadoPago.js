import mercadopago from 'mercadopago';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'; // Importar cors

dotenv.config();

const app = express();
app.use(express.json());

// Configurar CORS para permitir solicitudes desde tu frontend
// Asegúrate de que process.env.FRONTEND_URL coincida con el puerto de tu frontend (ej. http://localhost:3000)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para loguear todas las solicitudes entrantes
app.use((req, res, next) => {
  console.log(`[MercadoPago Backend] Incoming request: ${req.method} ${req.url}`);
  next();
});

// Configura el access token directamente en el objeto importado
mercadopago.configurations = mercadopago.configurations || {}; // Para evitar undefined
if (typeof mercadopago.configurations.setAccessToken === 'function') {
  mercadopago.configurations.setAccessToken(process.env.MERCADO_PAGO_ACCESS_TOKEN);
} else {
  // Para versiones nuevas, el token se pasa en cada llamada (esto no es común)
  console.warn('setAccessToken no disponible, revisa la versión del SDK');
}

// *** RUTA DE PRUEBA ACTUALIZADA ***
app.get('/test', (req, res) => {
  console.log('[MercadoPago Backend] /test endpoint hit. Server is reachable!');
  
  let cartContent = null;
  const carritoQuery = req.query.carrito; // Obtener el parámetro de consulta 'carrito'

  if (carritoQuery) {
    try {
      cartContent = JSON.parse(carritoQuery); // Intentar parsear el JSON
      console.log("[MercadoPago Backend] Cart content received in test:", cartContent);
    } catch (e) {
      console.error("[MercadoPago Backend] Error parsing carrito query parameter:", e.message);
      cartContent = "Error: Invalid JSON in 'carrito' query parameter.";
    }
  } else {
    console.log("[MercadoPago Backend] No 'carrito' query parameter provided for test.");
  }

  res.status(200).json({ 
    message: 'Mercado Pago Backend is running and reachable!',
    cart_test_data: cartContent // Incluir el contenido del carrito en la respuesta
  });
});


app.post('/crear-preferencia', async (req, res) => {
  // NUEVO LOG CRÍTICO: ¿Estamos ejecutando este código?
  console.log('[MercadoPago Backend] Executing /crear-preferencia POST handler.'); 

  try {
    // Los ítems se recibirán desde el frontend en req.body.items
    const { items } = req.body; 

    // Validación básica de ítems recibidos
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error("Error: Ítems no proporcionados o formato incorrecto en la solicitud.");
      return res.status(400).json({ error: "Debe proporcionar al menos un ítem para crear la preferencia." });
    }

    // Adaptar los ítems al formato de Mercado Pago
    const formattedItems = items.map(item => ({
      title: item.title,
      quantity: Number(item.quantity), // Asegurar que sea número
      unit_price: Number(item.unit_price), // Asegurar que sea número
      currency_id: "CLP" // Asumimos pesos chilenos
    }));

    const preference = {
      items: formattedItems, // Usamos los ítems recibidos y formateados
      // --- CAMBIO DIAGNÓSTICO: Usar una URL pública temporal para back_urls.success ---
      // Si la preferencia se crea con esta URL, significa que Mercado Pago
      // tiene un problema con las URLs de 'localhost' cuando auto_return es 'approved'.
      back_urls: {
        success: 'http://localhost:3000/pago-exitoso', // Cambiado a una URL de tu frontend
        failure: 'http://localhost:3000/fallo-pago', 
        pending: 'http://localhost:3000/pendiente-pago'
      },
      auto_return: 'approved',
      statement_descriptor: "FERREMAS_TEST", // Nombre que aparecerá en el estado de cuenta
      external_reference: `ferremas_order_${Date.now()}` // Referencia externa para tu sistema
    };

    console.log("Preferencia enviada a Mercado Pago:", JSON.stringify(preference, null, 2)); // Log para depuración

    const response = await mercadopago.preferences.create(preference, {
      access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN, // Se mantiene, aunque el SDK permite setearlo globalmente
    });

    console.log("Respuesta de Mercado Pago:", response.body); // Log para depuración

    res.json({ init_point: response.body.init_point });
  } catch (error) {
    console.error("Error al crear la preferencia de Mercado Pago:", error.message);
    
    // Log detallado del error de Mercado Pago si existe en error.cause (SDK >= 2.0.0)
    if (error.cause) {
      console.error("Detalles del error.cause (Mercado Pago SDK):", JSON.stringify(error.cause, null, 2));
    }
    // Si el error es una instancia de la clase de errores de la librería o contiene una respuesta HTTP anidada.
    if (error.status && error.response) { 
        console.error("Detalles de la respuesta de error HTTP (status, data):", error.status, JSON.stringify(error.response.data, null, 2));
    } else if (error.toJSON) { // Algunos errores de Axios tienen toJSON()
      console.error("Detalles completos del objeto de error (toJSON):", error.toJSON());
    } else { // Fallback para cualquier otro tipo de error
      console.error("Detalles completos del objeto de error:", error);
    }

    res.status(500).json({ 
      error: "Error interno al procesar el pago",
      details: error.message 
    });
  }
});

// PUERTO AJUSTADO: Ahora será 3001 por defecto
const PORT = process.env.PORT || 3001; 
app.listen(PORT, () => {
  console.log(`Servidor de Mercado Pago corriendo en http://localhost:${PORT}`);
});
