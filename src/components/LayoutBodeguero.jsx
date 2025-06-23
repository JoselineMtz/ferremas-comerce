import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { FiPackage, FiLogOut, FiList } from 'react-icons/fi';

const LayoutBodeguero = () => {
  const { cerrarSesion, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    cerrarSesion();
  };

  // Redirige si el usuario no es un bodeguero autenticado
  if (!user || user.cargo !== 'Bodeguero') {
    // La redirección principal ya debería haber ocurrido en BodegueroPanel o AuthContext
    return <div className="text-center text-lg mt-10 text-red-600">Acceso denegado. Solo para Bodegueros.</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Menú Lateral para Bodeguero */}
      <aside className="bg-dark-blue text-white w-64 p-5 flex flex-col shadow-lg">
        <h2 className="text-2xl font-bold mb-6">Panel de Bodega</h2>
        
        <ul className="space-y-2 flex-grow">
          <li
            className="flex items-center text-lg p-3 rounded hover:bg-yellow hover:text-dark-blue cursor-pointer transition-colors duration-200"
            onClick={() => navigate("/bodeguero-panel")} // Ruta principal del panel de bodega
          >
            <FiPackage className="mr-3" />
            Gestión de Pedidos
          </li>
          {/* Aquí podrías añadir más opciones específicas para el bodeguero */}
          <li
            className="flex items-center text-lg p-3 rounded hover:bg-yellow hover:text-dark-blue cursor-pointer transition-colors duration-200"
            onClick={() => navigate("/bodeguero-panel/historial-pedidos")} // Ejemplo de otra ruta
          >
            <FiList className="mr-3" />
            Historial de Pedidos
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

      {/* Contenido principal del panel del bodeguero */}
      <main className="flex-1 flex flex-col">
        <Outlet /> {/* Aquí se renderizará el BodegueroPanel.jsx u otras vistas */}
      </main>
    </div>
  );
};

export default LayoutBodeguero;
