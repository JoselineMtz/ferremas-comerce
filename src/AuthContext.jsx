import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false, // Indica si el usuario está autenticado
    user: null, // Almacena la información del usuario
    debeCambiarPassword: false, // Indica si el usuario debe cambiar su contraseña en el primer inicio de sesión
    loading: true // Nuevo estado para manejar la carga inicial
  });

  const navigate = useNavigate();

  // Efecto para cargar el estado de autenticación al inicio
  useEffect(() => {
    const inicializarAutenticacion = async () => {
      try {
        const token = localStorage.getItem("token");
        const usuarioAlmacenado = localStorage.getItem("user");

        if (token && usuarioAlmacenado) {
          const usuarioParseado = JSON.parse(usuarioAlmacenado);

          // Verificar token con el backend (opcional)
          const esValido = await verificarToken(token);

          if (esValido) {
            setAuthState({
              isAuthenticated: true,
              user: usuarioParseado,
              debeCambiarPassword: usuarioParseado.esAdmin && usuarioParseado.primerInicio,
              loading: false
            });
          } else {
            cerrarSesion();
          }
        } else {
          setAuthState(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error("Error al inicializar la autenticación:", error);
        cerrarSesion();
      }
    };

    inicializarAutenticacion();
  }, []);

  // Función para verificar token con el backend
  const verificarToken = async (token) => {
    try {
      const response = await fetch('http://localhost:3006/api/verify-token', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    } catch (error) {
      console.error("Error al verificar el token:", error);
      return false;
    }
  };

  // Función para iniciar sesión
  const login = async (rut, password) => {
    try {
      const response = await fetch('http://localhost:3006/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ rut, password })
      });

      // Verificar tipo de contenido
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Respuesta no válida del servidor');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error en la autenticación');
      }

      // Validar estructura de la respuesta
      if (!data.success || !data.usuario || !data.token) {
        throw new Error('Estructura de respuesta incompleta');
      }

      // Validar campos obligatorios del usuario
      if (!data.usuario.rut || !data.usuario.nombre ||
        typeof data.usuario.esAdmin === 'undefined') {
        throw new Error('Datos de usuario incompletos');
      }

      // Actualizar estado de autenticación
      setAuthState({
        isAuthenticated: true,
        user: data.usuario,
        debeCambiarPassword: data.usuario.esAdmin && data.usuario.primerInicio,
        loading: false
      });

      // Guardar en localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.usuario));

      // Redirección basada en el rol
      manejarRedireccionPostLogin(data.usuario);

      return data;
    } catch (error) {
      console.error("Error en el inicio de sesión:", {
        message: error.message,
        stack: error.stack
      });
      throw new Error(error.message || 'Error al iniciar sesión');
    }
  };

  // Función para manejar la redirección después del inicio de sesión
  const manejarRedireccionPostLogin = (usuario) => {
    if (usuario.esAdmin && usuario.primerInicio) {
      navigate("/cambiar-password");
    } else if (usuario.esAdmin) {
      navigate("/admin");
    } else {
      navigate("/cliente");
    }
  };

  // Función para cambiar la contraseña
  const cambiarPassword = async (nuevaPassword) => {
    try {
      const response = await fetch('http://localhost:3006/api/cambiar-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          rut: authState.user.rut,
          nuevaPassword
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cambiar la contraseña');
      }

      const data = await response.json();

      // Actualizar estado
      setAuthState(prev => ({
        ...prev,
        user: {
          ...prev.user,
          primerInicio: false
        },
        debeCambiarPassword: false
      }));

      // Actualizar localStorage
      const usuarioActualizado = {
        ...authState.user,
        primerInicio: false
      };
      localStorage.setItem("user", JSON.stringify(usuarioActualizado));

      // Redirigir según el rol
      if (authState.user.esAdmin) {
        navigate("/admin");
      } else {
        navigate("/cliente");
      }

      return data;
    } catch (error) {
      console.error("Error al cambiar la contraseña:", error);
      throw error;
    }
  };

  // Función para cerrar sesión
  const cerrarSesion = () => {
    // Limpiar estado
    setAuthState({
      isAuthenticated: false,
      user: null,
      debeCambiarPassword: false,
      loading: false
    });

    // Limpiar almacenamiento
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Redirigir a la página de inicio de sesión
    navigate("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        cerrarSesion,
        cambiarPassword
      }}
    >
      {!authState.loading && children}
    </AuthContext.Provider>
  );
};

// Hook para usar el contexto de autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
