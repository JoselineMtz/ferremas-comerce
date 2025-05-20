import mercadopago from 'mercadopago';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Configura el access token directamente en el objeto importado
mercadopago.configurations = mercadopago.configurations || {}; // Para evitar undefined
if (typeof mercadopago.configurations.setAccessToken === 'function') {
  mercadopago.configurations.setAccessToken(process.env.MERCADO_PAGO_ACCESS_TOKEN);
} else {
  // Para versiones nuevas, el token se pasa en cada llamada (esto no es común)
  console.warn('setAccessToken no disponible, revisa la versión del SDK');
}

app.post('/crear-preferencia', async (req, res) => {
  try {
    const preference = {
      items: [
        {
          title: 'Producto prueba sandbox',
          quantity: 1,
          unit_price: 100,
        },
      ],
      back_urls: {
        success: 'https://tu-web.com/exito',
        failure: 'https://tu-web.com/fallo',
        pending: 'https://tu-web.com/pendiente',
      },
      auto_return: 'approved',
    };

    const response = await mercadopago.preferences.create(preference, {
      access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    });

    res.json({ init_point: response.body.init_point });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
