import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

const CambiarPassword = () => {
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, debeCambiarPassword, cambiarPassword, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  // Redirigir si el usuario no es un administrador o no necesita cambiar la contraseña
  if (!user || !user.esAdmin || !debeCambiarPassword) {
    navigate('/login'); // O a otra ruta si no tiene permiso o ya cambió la contraseña
    return null; // No renderizar nada hasta la redirección
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensajeExito('');
    setLoading(true);

    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden.');
      setLoading(false);
      return;
    }

    if (nuevaPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      await cambiarPassword(nuevaPassword);
      setMensajeExito('Contraseña actualizada exitosamente. Redirigiendo...');
      // La redirección ahora es manejada por el AuthContext después de un cambio exitoso.
    } catch (err) {
      console.error("Error en handleSubmit de CambiarPassword:", err);
      setError(err.message || 'Error al cambiar la contraseña. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Cambiar Contraseña Inicial</h2>
        <p className="text-gray-600 text-center mb-4">
          Hola, {user?.nombre}! Por seguridad, debes cambiar tu contraseña.
        </p>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        {mensajeExito && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{mensajeExito}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nuevaPassword">
              Nueva Contraseña
            </label>
            <input
              type="password"
              id="nuevaPassword"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={nuevaPassword}
              onChange={(e) => setNuevaPassword(e.target.value)}
              placeholder="********"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmarPassword">
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              id="confirmarPassword"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              placeholder="********"
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={loading}
            >
              {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
            </button>
            <button
              type="button"
              onClick={cerrarSesion}
              className="inline-block align-baseline font-bold text-sm text-red-500 hover:text-red-800"
            >
              Cerrar Sesión
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CambiarPassword;
