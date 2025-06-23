import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import MenuLateral from './MenuLateral';
import { useAuth } from '../AuthContext';
import { FiMenu, FiX } from 'react-icons/fi';

const LayoutAdmin = () => {
  const { user, logout } = useAuth(); // Asegúrate que useAuth devuelva logout
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const navigate = useNavigate();

  // Verificar autenticación y permisos
  useEffect(() => {
    if (!user || !user.esAdmin) {
      if (logout && typeof logout === 'function') {
        logout();
      }
      navigate('/login'); // Redirigir al login si no está autenticado
    }
  }, [user, logout, navigate]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Menú lateral siempre visible en desktop */}
      <div className="hidden md:block">
        <MenuLateral />
      </div>

      {/* Menú móvil */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative bg-white w-64 h-full shadow-xl">
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <FiX size={24} />
            </button>
            <MenuLateral mobile />
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex-1 overflow-auto">
        {/* Botón de menú flotante para móviles */}
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden fixed top-4 left-4 z-30 bg-white p-2 rounded-full shadow-md text-gray-500 hover:text-gray-700"
        >
          <FiMenu size={24} />
        </button>

        <Outlet />
      </div>
    </div>
  );
};

export default LayoutAdmin;