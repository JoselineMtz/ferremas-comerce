import React from "react";
import { useAuth } from "./AuthContext"; // Asegúrate de que la ruta sea correcta
import MenuLateral from "./MenuLateral"; // Importar el menú lateral

const VistaAdmin = () => {
  const { user } = useAuth(); // Usar el hook useAuth

  return (
    <div className="flex min-h-screen">
      {/* Menú lateral */}
      <MenuLateral />

      {/* Contenido principal */}
      <div className="flex-1 p-8 bg-gray-100">
        <h1 className="text-3xl font-bold text-dark-blue">Vista de Administrador</h1>
        <p className="mt-4 text-lg text-dark-blue">Bienvenido, {user?.nombre}!</p>
        <p className="mt-2 text-dark-blue">Aquí puedes gestionar tu panel de administración.</p>
      </div>
    </div>
  );
};

export default VistaAdmin;