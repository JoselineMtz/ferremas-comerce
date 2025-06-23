import React from "react";
import { useAuth } from "../AuthContext"; // Asegúrate de que esta ruta sea correcta
import { useNavigate } from "react-router-dom";
import { FiUser, FiUserPlus, FiLogOut, FiPackage, FiHome } from "react-icons/fi";

const MenuLateral = () => {
  // CORRECCIÓN: Desestructurar 'cerrarSesion' en lugar de 'logout'
  const { cerrarSesion } = useAuth(); 
  const navigate = useNavigate();

  return (
    <div className="bg-dark-blue text-white w-64 min-h-screen p-5 flex flex-col">
      <h2 className="text-2xl font-bold mb-6">Panel Administrativo</h2>
      
      <ul className="space-y-2 flex-grow">
        <li
          className="flex items-center text-lg p-3 rounded hover:bg-yellow hover:text-dark-blue cursor-pointer transition-colors"
          onClick={() => navigate("/admin")}
        >
          <FiHome className="mr-3" />
          Inicio
        </li>
        <li
          className="flex items-center text-lg p-3 rounded hover:bg-yellow hover:text-dark-blue cursor-pointer transition-colors"
          onClick={() => navigate("/admin/agregar-empleado")}
        >
          <FiUserPlus className="mr-3" />
          Agregar Empleados
        </li>
        <li
          className="flex items-center text-lg p-3 rounded hover:bg-yellow hover:text-dark-blue cursor-pointer transition-colors"
          onClick={() => navigate("/admin/agregar-producto")}
        >
          <FiPackage className="mr-3" />
          Agregar Producto
        </li>
      </ul>

      <div className="mt-auto">
        <button
          // CORRECCIÓN: Llamar a 'cerrarSesion'
          onClick={cerrarSesion} 
          className="w-full flex items-center text-lg p-3 rounded hover:bg-yellow hover:text-dark-blue cursor-pointer transition-colors"
        >
          <FiLogOut className="mr-3" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};

export default MenuLateral;
