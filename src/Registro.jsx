import React, { useState } from "react";

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }

    try {
      const response = await fetch("http://localhost:3006/api/registro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      alert(data.message);
    } catch (error) {
      console.error("Error en el registro:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-dark-blue mb-4">Registro de Cliente</h2>
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
