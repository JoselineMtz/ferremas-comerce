import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const Login = () => {
  const { login, isAuthenticated, user } = useAuth();
  const [rut, setRut] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(rut, password);
    } catch (error) {
      setError(
        error.message === "Credenciales incorrectas"
          ? "RUT o contraseña incorrectos"
          : "Error al conectar con el servidor. Intente nuevamente."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Redirección basada en autenticación y rol
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.esAdmin) {
        navigate("/admin");
      } else {
        navigate("/cliente");
      }
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="bg-dark-blue min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-dark-blue text-center mb-6">Iniciar sesión</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="rut" className="block text-dark-blue text-lg">
              RUT
            </label>
            <input
              type="text"
              id="rut"
              className="w-full p-3 mt-2 border border-dark-blue rounded-md"
              placeholder="Ingresa tu RUT"
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-dark-blue text-lg">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              className="w-full p-3 mt-2 border border-dark-blue rounded-md"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className={`w-full py-3 text-white text-lg font-semibold rounded-md ${
              isLoading ? "bg-gray-400" : "bg-dark-blue hover:bg-black"
            }`}
            disabled={isLoading}
          >
            {isLoading ? "Cargando..." : "Iniciar sesión"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-dark-blue">
            ¿No tienes cuenta?{" "}
            <a href="/registro" className="text-yellow hover:text-black">
              Regístrate
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login