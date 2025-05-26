import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext"; // Asegúrate de que la ruta sea correcta

const Navbar = ({ botones, toggleCarritoMenu }) => {
  const { isAuthenticated, logout, user } = useAuth();  // Ahora también accedemos al usuario
  const navigate = useNavigate();

  const handleAuthClick = () => {
    if (isAuthenticated) {
      logout();  // Cierra sesión
      navigate("/");  // Redirige a la página principal
    } else {
      navigate("/login");  // Redirige al login si no está autenticado
    }
  };

  const redirectBasedOnRole = () => {
    if (user) {
      switch (user.role) {
        case "cliente":
          navigate("/cliente");  // Redirige a la vista de cliente
          break;
        case "administrador":
          navigate("/admin");  // Redirige a la vista de administrador
          break;
        // Agrega más casos según los roles
        default:
          navigate("/perfil");  // Redirige a la vista por defecto si no se encuentra el rol
      }
    }
  };

  return (
    <nav className="bg-dark-blue p-4 flex items-center justify-between fixed top-0 left-0 w-full z-10">
      <div className="logo">
      <img src="/imagenes/logof.png" alt="Logo" className="w-12 h-12" />

      </div>
      <div className="flex space-x-6">
        {botones.map((boton, index) => (
          <button key={index} className="text-white">
            {boton}
          </button>
        ))}
      </div>
      <div className="flex items-center space-x-4">
        {isAuthenticated && (
          <button onClick={redirectBasedOnRole} className="text-white">
            Ver Perfil
          </button>
        )}
        <button onClick={handleAuthClick} className="text-white">
          {isAuthenticated ? "Cerrar Sesión" : "Iniciar Sesión"}
        </button>
        <button onClick={toggleCarritoMenu} className="text-white">
          🛒 Carrito
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
