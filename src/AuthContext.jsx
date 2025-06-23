import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false, // Indicates if the user is authenticated
    user: null, // Stores user information
    debeCambiarPassword: false, // Indicates if the user needs to change their password on first login
    loading: true // State to handle initial authentication loading
  });

  const navigate = useNavigate();

  // --- Auxiliary and authentication handling functions ---

  // Function to log out, wrapped in useCallback for stability
  const cerrarSesion = useCallback(() => {
    console.log("Cerrando sesión y redirigiendo a /cliente...");
    setAuthState({
      isAuthenticated: false,
      user: null,
      debeCambiarPassword: false,
      loading: false // Initial loading is complete after logging out
    });
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    console.log("[cerrarSesion] Token en localStorage DESPUÉS de removeItem:", localStorage.getItem("token"));
    console.log("[cerrarSesion] Usuario en localStorage DESPUÉS de removeItem:", localStorage.getItem("user"));
    navigate("/cliente"); // Adjusted: Explicitly navigate to cliente
  }, [navigate]); // navigate is a stable dependency

  // Function to verify the token with the backend, wrapped in useCallback
  const verificarToken = useCallback(async (token) => {
    console.log("[verificarToken] Intentando verificar token con backend...");
    try {
      const response = await fetch('http://localhost:3006/api/verify-token', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log("[verificarToken] Respuesta del backend (response.ok):", response.ok, "Status:", response.status);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'No JSON response' }));
        console.error("[verificarToken] Error en la respuesta del backend:", errorData.message || 'Error desconocido');
      }
      return response.ok;
    } catch (error) {
      console.error("Error al verificar el token (fetch fallido):", error);
      return false; // In case of network error or similar
    }
  }, []); // No external dependencies

  // Function to handle post-login redirection, wrapped in useCallback
  const manejarRedireccionPostLogin = useCallback((usuario) => {
    console.log("[manejarRedireccionPostLogin] Redirigiendo según el rol:", usuario);
    if (usuario.esAdmin && usuario.primerInicio) {
      navigate("/cambiar-password");
    } else if (usuario.esAdmin) {
      navigate("/admin");
    } else if (usuario.esBodeguero) { // NUEVA CONDICIÓN: Si es bodeguero, redirigir a /bodeguero-panel
      navigate("/bodeguero-panel");
    } else if (usuario.esEmpleado) { // Si es empleado (pero no bodeguero, ej. vendedor), redirigir a /vendedor-panel
      navigate("/vendedor-panel");
    } else {
      navigate("/cliente"); // Default redirect for clients (e.g., esCliente o otros roles no especificados)
    }
  }, [navigate]); // navigate is a stable dependency

  // Effect to initialize authentication on application load
  useEffect(() => {
    const inicializarAutenticacion = async () => {
      console.log("[inicializarAutenticacion] Iniciando proceso de autenticación...");
      // Ensure 'loading' is true at the beginning of this check
      setAuthState(prev => ({ ...prev, loading: true }));

      const token = localStorage.getItem("token");
      const usuarioAlmacenado = localStorage.getItem("user");
      console.log("[inicializarAutenticacion] Token encontrado en localStorage:", token ? "Sí" : "No");
      console.log("[inicializarAutenticacion] Usuario encontrado en localStorage:", usuarioAlmacenado ? "Sí" : "No");

      if (token && usuarioAlmacenado) {
        try {
          const usuarioParseado = JSON.parse(usuarioAlmacenado);
          console.log("[inicializarAutenticacion] Usuario parseado:", usuarioParseado);
          
          // Verify the token with your backend
          const esValido = await verificarToken(token);
          console.log("[inicializarAutenticacion] Token válido según backend:", esValido);

          if (esValido) {
            setAuthState({
              isAuthenticated: true,
              user: usuarioParseado,
              debeCambiarPassword: usuarioParseado.esAdmin && usuarioParseado.primerInicio,
              loading: false // End loading
            });
            console.log("[inicializarAutenticacion] Autenticación establecida, usuario:", usuarioParseado.rut);
          } else {
            console.log("[inicializarAutenticacion] Token no válido o expirado. Llamando a cerrarSesion().");
            cerrarSesion(); // Call the stable function
          }
        } catch (error) {
          console.error("[inicializarAutenticacion] Error al inicializar la autenticación (user parsing or verification):", error);
          cerrarSesion(); // In case of error, log out
        }
      } else {
        // If no token or user in localStorage, end loading
        setAuthState(prev => ({ ...prev, loading: false }));
        console.log("[inicializarAutenticacion] No hay token o usuario en localStorage. Verificando redirección.");
        
        // AJUSTE CRÍTICO: Permitir permanecer en /login o /registro si no autenticado
        if (window.location.pathname === '/login' || window.location.pathname === '/registro') {
            console.log("[inicializarAutenticacion] Estamos en /login o /registro, no redirigiendo (permitiendo acceso a formularios públicos).");
        } else if (window.location.pathname !== '/cliente') {
            console.log("[inicializarAutenticacion] Redirigiendo a /cliente (no autenticado y no en ruta pública permitida).");
            navigate('/cliente');
        } else { // window.location.pathname === '/cliente'
            console.log("[inicializarAutenticacion] Ya estamos en /cliente, no redirigiendo.");
        }
      }
    };

    inicializarAutenticacion();
    // Re-evaluates only if these functions change (they are stable due to useCallback) or navigate changes
  }, [verificarToken, cerrarSesion, navigate]); 

  // Function to log in (your existing logic, no major functional changes)
  const login = async (rut, password) => {
    console.log("[login] Intentando iniciar sesión para RUT:", rut);
    try {
      const response = await fetch('http://localhost:3006/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ rut, password })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error("[login] Error: Invalid server response. Not JSON. Content-Type:", contentType);
        throw new Error('Invalid server response. Not JSON.');
      }

      const data = await response.json();
      console.log("[login] Server response:", data);

      if (!response.ok) {
        console.error("[login] Server authentication error:", data.message || 'Unknown error');
        throw new Error(data.message || 'Authentication error');
      }

      if (!data.success || !data.usuario || !data.token) {
        console.error("[login] Error: Incomplete login response structure.");
        throw new Error('Incomplete login response structure');
      }

      if (!data.usuario.rut || !data.usuario.nombre ||
        typeof data.usuario.esAdmin === 'undefined') {
        console.error("[login] Error: Incomplete user data in login response.");
        throw new Error('Incomplete user data in login response');
      }

      setAuthState({
        isAuthenticated: true,
        user: data.usuario,
        debeCambiarPassword: data.usuario.esAdmin && data.usuario.primerInicio,
        loading: false
      });
      console.log("[login] Authentication successful. Saving token and user to localStorage.");
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.usuario));

      manejarRedireccionPostLogin(data.usuario); // Call the stable function

      return data;
    } catch (error) {
      console.error("Error in login (catch block):", {
        message: error.message,
        stack: error.stack
      });
      throw new Error(error.message || 'Error logging in');
    }
  };

  // Function to change password (your existing logic, no major functional changes)
  const cambiarPassword = async (nuevaPassword) => {
    console.log("[cambiarPassword] Attempting to change password...");
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
        console.error("[cambiarPassword] Error in server response:", errorData.message || 'Unknown error');
        throw new Error(errorData.message || 'Error changing password');
      }

      const data = await response.json();
      console.log("[cambiarPassword] Password changed successfully:", data);

      setAuthState(prev => ({
        ...prev,
        user: {
          ...prev.user,
          primerInicio: false
        },
        debeCambiarPassword: false
      }));

      const usuarioActualizado = {
        ...authState.user,
        primerInicio: false
      };
      localStorage.setItem("user", JSON.stringify(usuarioActualizado));
      console.log("[cambiarPassword] State and localStorage updated.");

      if (authState.user.esAdmin) {
        navigate("/admin");
      } else {
        navigate("/cliente");
      }

      return data;
    } catch (error) {
      console.error("Error changing password (catch block):", error);
      throw error;
    }
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
      {/* Show a loading indicator while authentication initializes */}
      {authState.loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '24px', color: '#333' }}>
          Cargando autenticación...
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

// Hook to use the authentication context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
