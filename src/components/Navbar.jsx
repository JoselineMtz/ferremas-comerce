import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

// Es crucial que 'onLogoClick' esté aquí en las props del componente
const Navbar = ({ botones, toggleCarritoMenu, onCategoryClick, onLogoClick }) => {
  const { isAuthenticated, cerrarSesion, user } = useAuth();
  const navigate = useNavigate();

  // *** AÑADIDO PARA DEPURACIÓN ***
  // Esto te mostrará en la consola del navegador todas las props que Navbar recibe.
  // Revisa si 'onLogoClick' aparece aquí.
  console.log("[Navbar Debug] Props recibidas:", { botones, toggleCarritoMenu, onCategoryClick, onLogoClick });

  const handleAuthClick = () => {
    if (isAuthenticated) {
      cerrarSesion();
    } else {
      navigate("/login");
    }
  };

  const redirectBasedOnRole = () => {
    if (user) {
      if (user.esAdmin) {
        navigate("/admin");
      } else if (user.esCliente) {
        navigate("/cliente");
      } else if (user.esEmpleado) {
        if (user.cargo === 'Bodeguero') {
          navigate("/bodeguero-panel");
        } else {
          navigate("/vendedor-panel");
        }
      } else {
        navigate("/perfil");
      }
    }
  };

  return (
    <nav className="bg-dark-blue p-4 flex items-center justify-between fixed top-0 left-0 w-full z-50">
      {/* AHORA: Llamamos a la función onLogoClick dentro de un manejador de eventos anónimo */}
      <div className="logo cursor-pointer" onClick={() => {
        // Añadimos un log adicional aquí para verificar si el manejador se invoca
        console.log("[Navbar Debug] Clic en logo. Intentando llamar onLogoClick.");
        if (onLogoClick) {
          onLogoClick();
        } else {
          console.warn("[Navbar Debug] onLogoClick no está definido. No se puede ejecutar.");
        }
      }}> 
        <img src="/imagenes/logof.png" alt="Logo" />
      </div>
      <div className="flex space-x-6">
        {botones.map((boton, index) => (
          <button 
            key={index} 
            className="text-white"
            onClick={() => onCategoryClick(boton)}
          >
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
