import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext'; // CORRECCIÓN CLAVE: Ruta a AuthContext
import { FiUser, FiLogOut, FiList } from 'react-icons/fi'; // Importar FiList para el icono

const LayoutVendedor = () => {
  const { cerrarSesion, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    cerrarSesion(); // Esta función ya redirige a /cliente
  };

  // Renderiza el layout solo si el usuario está autenticado como empleado
  if (!user || !user.esEmpleado) {
    // Fallback: la redirección principal ya debería haber ocurrido en VendedorPanel
    return <div className="text-center text-lg mt-10 text-red-600">Acceso denegado.</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Menú Lateral para Vendedor */}
      <aside className="bg-dark-blue text-white w-64 p-5 flex flex-col shadow-lg">
        <h2 className="text-2xl font-bold mb-6">Panel de Vendedor</h2>
        
        <ul className="space-y-2 flex-grow">
          {/* Opción "Mi Perfil" */}
          <li
            className="flex items-center text-lg p-3 rounded hover:bg-yellow hover:text-dark-blue cursor-pointer transition-colors duration-200"
            onClick={() => navigate("/vendedor-panel")} // Navega a la ruta principal del panel de vendedor
          >
            <FiUser className="mr-3" />
            Mi Perfil
          </li>
          {/* NUEVA OPCIÓN: Mis Ventas */}
          <li
            className="flex items-center text-lg p-3 rounded hover:bg-yellow hover:text-dark-blue cursor-pointer transition-colors duration-200"
            onClick={() => navigate("/vendedor-panel/mis-ventas")} // Navega a la nueva ruta de ventas
          >
            <FiList className="mr-3" />
            Mis Ventas
          </li>
        </ul>

        <div className="mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center text-lg p-3 rounded hover:bg-yellow hover:text-dark-blue cursor-pointer transition-colors duration-200"
          >
            <FiLogOut className="mr-3" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal del panel del vendedor */}
      <main className="flex-1 flex flex-col">
        <Outlet /> {/* Aquí se renderizará el VendedorPanel.jsx o MisVentasVendedor.jsx */}
      </main>
    </div>
  );
};

export default LayoutVendedor;
