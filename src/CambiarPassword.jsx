import { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

const CambiarPassword = () => {
  const { user, cambiarPassword } = useAuth();
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validar que las contraseñas coincidan
    if (nuevaPassword !== confirmarPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setIsLoading(true);

    try {
      await cambiarPassword(nuevaPassword);
      navigate("/admin"); // Redirigir al panel de administrador después de cambiar la contraseña
    } catch (error) {
      setError(error.message || "Error al cambiar la contraseña");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-dark-blue min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-dark-blue text-center mb-6">Cambiar contraseña</h2>

        {error && <p className="text-red-500">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="nuevaPassword" className="block text-dark-blue text-lg">Nueva contraseña</label>
            <input
              type="password"
              id="nuevaPassword"
              className="w-full p-3 mt-2 border border-dark-blue rounded-md"
              placeholder="Ingresa tu nueva contraseña"
              value={nuevaPassword}
              onChange={(e) => setNuevaPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="confirmarPassword" className="block text-dark-blue text-lg">Confirmar contraseña</label>
            <input
              type="password"
              id="confirmarPassword"
              className="w-full p-3 mt-2 border border-dark-blue rounded-md"
              placeholder="Confirma tu nueva contraseña"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-dark-blue text-white text-lg font-semibold rounded-md hover:bg-black"
            disabled={isLoading}
          >
            {isLoading ? "Cargando..." : "Cambiar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CambiarPassword;