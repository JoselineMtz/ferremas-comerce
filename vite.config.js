import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';  // Este es el plugin correcto para Vite y Tailwind

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()  // Asegúrate de que TailwindCSS se haya instalado correctamente
  ],
  server: {
    port: 3000,  // Asegúrate de que el puerto sea el adecuado para el frontend
    proxy: {
      '/api': {
        target: 'http://localhost:5003', // Asumiendo que tu servidor de inventarios está en 5003
        changeOrigin: true,
        secure: false
      },
      '/server-api': {
        target: 'http://localhost:3006', // Asumiendo que tu servidor principal está en 3006
        changeOrigin: true,
        secure: false
      }
    }
  }
});
