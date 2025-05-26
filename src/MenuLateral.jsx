import React from "react";
import { useAuth } from "./AuthContext"; // Asegúrate de que la ruta sea correcta
import { useNavigate } from "react-router-dom"; // Para redireccionar

const MenuLateral = () => {
  const { logout } = useAuth(); // Usar el hook useAuth
  const navigate = useNavigate(); // Para redireccionar

  return (
    <div className="bg-dark-blue text-white w-64 min-h-screen p-5">
      <h2 className="text-2xl font-bold mb-6">Menú</h2>
      <ul className="space-y-4">
        <li
          className="text-lg p-3 rounded hover:bg-yellow hover:text-dark-blue cursor-pointer transition-colors"
          onClick={() => navigate("/mi-perfil")}
        >
          Mi perfil
        </li>
        <li
          className="text-lg p-3 rounded hover:bg-yellow hover:text-dark-blue cursor-pointer transition-colors"
          onClick={() => navigate("/agregar-empleado")}
        >
          Agregar empleado
        </li>
        <li
          className="text-lg p-3 rounded hover:bg-yellow hover:text-dark-blue cursor-pointer transition-colors"
          onClick={logout}
        >
          Cerrar sesión
        </li>
      </ul>
    </div>
  );
};

export default MenuLateral;