import React, { useState } from "react";
import { useNavigate } from 'react-router-dom'; // Importado para redireccionar después del registro

const Registro = () => {
  const [formData, setFormData] = useState({
    rut: "",
    nombre: "",
    apellido: "",
    correo: "",
    telefono: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState(''); // Para mensajes de éxito/error
  const [error, setError] = useState(''); // Para errores específicos de validación/API
  const navigate = useNavigate(); // Inicializar useNavigate para redirección

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validarRUT = (rut) => {
    if (!rut) return false;
    const rutLimpio = rut.replace(/[^0-9kK-]/g, '');
    return /^[0-9]+[-|‐]{1}[0-9kK]{1}$/.test(rutLimpio);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (!validarRUT(formData.rut)) {
        setError("Formato de RUT inválido. Ej: 12345678-9");
        return;
    }
    // Puedes añadir más validaciones aquí (ej. formato de correo, teléfono)

    try {
      const response = await fetch("http://localhost:3006/api/registro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
            rut: formData.rut,
            nombre: formData.nombre,
            apellido: formData.apellido,
            correo: formData.correo,
            telefono: formData.telefono,
            password: formData.password, // Solo enviar la contraseña sin la confirmación
        }),
      });

      const data = await response.json();
      if (response.ok) { // Si la respuesta HTTP es 2xx
        setMessage(data.message || "Registro exitoso. Redirigiendo a la vista del cliente...");
        // Limpiar el formulario después de un registro exitoso
        setFormData({
            rut: "", nombre: "", apellido: "", correo: "", 
            telefono: "", password: "", confirmPassword: ""
        });
        // REDIRECCIÓN INSTANTÁNEA A LA VISTA DEL CLIENTE
        navigate('/cliente'); 
      } else {
        setError(data.message || "Error en el registro. Intente nuevamente.");
      }
    } catch (error) {
      console.error("Error en el registro:", error);
      setError("Error de conexión al intentar registrar. Verifique su red.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-dark-blue mb-4">Registro de Cliente</h2>
        
        {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                <span className="block sm:inline">{message}</span>
            </div>
        )}
        {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <span className="block sm:inline">{error}</span>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="rut"
            placeholder="RUT (Ej: 12345678-9)"
            value={formData.rut}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded"
          />
          <input
            type="text"
            name="nombre"
            placeholder="Nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded"
          />
          <input
            type="text"
            name="apellido"
            placeholder="Apellido"
            value={formData.apellido}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded"
          />
          <input
            type="email"
            name="correo"
            placeholder="Correo Electrónico"
            value={formData.correo}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded"
          />
          <div className="flex items-center">
            <span className="p-2 bg-gray-200 border border-gray-300 rounded-l">+56</span>
            <input
              type="tel"
              name="telefono"
              placeholder="Teléfono"
              value={formData.telefono}
              onChange={handleChange}
              required
              className="w-full p-2 border border-gray-300 rounded-r"
            />
          </div>
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded"
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Repetir Contraseña"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded"
          />
          <button
            type="submit"
            className="w-full bg-dark-blue text-white p-2 rounded hover:bg-black"
          >
            Registrarse
          </button>
        </form>
      </div>
    </div>
  );
};

export default Registro;
