/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // Asegúrate de que todas tus rutas de archivos donde usas clases de Tailwind estén aquí.
  ],
  theme: {
    extend: {
      // Puedes extender tu tema aquí si es necesario
    },
  },
  plugins: [],
}