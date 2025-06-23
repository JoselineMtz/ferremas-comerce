import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiUserPlus, FiSave, FiX, FiEdit, FiTrash2, FiSearch } from 'react-icons/fi'; // Agregamos FiSearch
import { useNavigate } from 'react-router-dom';

const AgregarEmpleado = (
  { onEmpleadoAgregado, onEmpleadoActualizado }
) => {
  // Estado local para las sucursales, ahora cargadas dentro de este componente
  const [localSucursales, setLocalSucursales] = useState([]);
  const [loadingLocalSucursales, setLoadingLocalSucursales] = useState(true);
  const [errorLocalSucursales, setErrorLocalSucursales] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [empleado, setEmpleado] = useState({
    rut: '',
    nombre: '',
    email: '',
    cargo: 'Vendedor',
    sucursal_id: '',
    fecha_contratacion: new Date().toISOString().split('T')[0],
    telefono: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Estados para el buscador
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('nombre'); // Default search by nombre

  // useEffect para cargar las sucursales cuando el componente se monta
  useEffect(() => {
    const cargarSucursalesInternamente = async () => {
      setLoadingLocalSucursales(true);
      setErrorLocalSucursales(null);
      console.log('Iniciando carga de sucursales INTERNAMENTE en AgregarEmpleado...');

      try {
        const response = await axios.get('http://localhost:5003/api/sucursales');

        console.log('Respuesta COMPLETA de API sucursales (AgregarEmpleado):', response);
        console.log('Datos ANTES de formatear (AgregarEmpleado):', response.data);

        const rawSucursales = response.data.data || response.data;

        if (!Array.isArray(rawSucursales)) {
          console.error('La respuesta de sucursales no es un array o formato inesperado (AgregarEmpleado):', rawSucursales);
          throw new Error('Formato de datos de sucursales inesperado de la API.');
        }

        const formattedSucursales = rawSucursales.map(s => ({
          sucursal_id: s.sucursal_id || s.id,
          nombre: s.nombre || s.name
        }));

        console.log('Sucursales formateadas y listas para el estado (AgregarEmpleado):', formattedSucursales);
        setLocalSucursales(formattedSucursales);

      } catch (err) {
        console.error('Error al cargar sucursales (AgregarEmpleado):', err.response?.data || err.message || err);
        setErrorLocalSucursales(err.message || 'Error desconocido al cargar sucursales.');
      } finally {
        setLoadingLocalSucursales(false);
        console.log('Carga de sucursales INTERNA finalizada en AgregarEmpleado.');
      }
    };

    cargarSucursalesInternamente();
  }, []);

  // Cargar empleados al montar el componente (esta lógica se mantiene con token)
  useEffect(() => {
    cargarEmpleados();
  }, []);

  const cargarEmpleados = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get('http://localhost:3006/api/empleados', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data && response.data.data) {
        setEmpleados(response.data.data);
      } else {
        setEmpleados([]);
        console.error('Formato de respuesta de empleados inesperado:', response.data);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError(err.response?.data?.message || 'Error al cargar empleados');
        console.error('Error al cargar empleados:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEmpleado(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validarRUT = (rut) => {
    if (!rut) return false;
    const rutLimpio = rut.replace(/[^0-9kK-]/g, '');
    return /^[0-9]+[-|‐]{1}[0-9kK]{1}$/.test(rutLimpio);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validarRUT(empleado.rut)) {
      setError('RUT inválido. Formato: 12345678-9');
      return;
    }

    if (!empleado.nombre || !empleado.email || !empleado.cargo || !empleado.sucursal_id || !empleado.fecha_contratacion) {
      setError('Todos los campos marcados con * son obligatorios');
      return;
    }

    if (!editMode && !empleado.password) {
      setError('La contraseña es obligatoria para nuevos empleados.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      let response;
      if (editMode) {
        response = await axios.put(
          `http://localhost:3006/api/empleados/${empleado.id}`,
          empleado,
          config
        );
        onEmpleadoActualizado?.(response.data.data);
      } else {
        response = await axios.post(
          'http://localhost:3006/api/empleados',
          empleado,
          config
        );
        onEmpleadoAgregado?.(response.data.data);
      }

      resetForm();
      await cargarEmpleados();
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        const errorMsg = err.response?.data?.message ||
          (editMode ? 'Error al actualizar empleado' : 'Error al agregar empleado');
        setError(errorMsg);
        console.error('Error:', err);
      }
    }
  };

  const resetForm = () => {
    setEmpleado({
      rut: '',
      nombre: '',
      email: '',
      cargo: 'Vendedor',
      sucursal_id: '',
      fecha_contratacion: new Date().toISOString().split('T')[0],
      telefono: '',
      password: ''
    });
    setEditMode(false);
    setShowForm(false);
    setError('');
  };

  const handleEditarEmpleado = (emp) => {
    setEmpleado({
      id: emp.id,
      rut: emp.rut,
      nombre: emp.nombre,
      email: emp.email,
      cargo: emp.cargo,
      sucursal_id: emp.sucursal_id,
      fecha_contratacion: emp.fecha_contratacion.split('T')[0],
      telefono: emp.telefono || '',
      password: ''
    });
    setEditMode(true);
    setShowForm(true);
  };

  const handleEliminarEmpleado = async (id) => {
    console.warn('Confirmación: Se está intentando eliminar un empleado. En una UI real, esto sería un modal de confirmación.');
    if (!alert('¿Está seguro que desea eliminar este empleado? Esta acción no se puede deshacer.')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      await axios.delete(`http://localhost:3006/api/empleados/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      await cargarEmpleados();
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setError(err.response?.data?.message || 'Error al eliminar empleado');
        console.error('Error al eliminar empleado:', err);
      }
    }
  };

  // Lógica de filtrado de empleados
  const filteredEmpleados = empleados.filter(emp => {
    const term = searchTerm.toLowerCase();
    
    if (searchBy === 'rut') {
      return emp.rut.toLowerCase().includes(term);
    } else if (searchBy === 'nombre') {
      return emp.nombre.toLowerCase().includes(term);
    } else if (searchBy === 'sucursal') {
      const sucursalNombre = localSucursales.find(s => s.sucursal_id === emp.sucursal_id)?.nombre;
      return sucursalNombre ? sucursalNombre.toLowerCase().includes(term) : false;
    }
    return true; // No filter if searchBy is not matched
  });

  return (
    <div className="mb-8">
      {!showForm ? (
        <div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center mb-4"
          >
            <FiUserPlus className="mr-2" />
            Agregar Empleado
          </button>

          {/* Sección de Buscador */}
          <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <h3 className="text-xl font-semibold mb-3 flex items-center">
              <FiSearch className="mr-2" /> Buscar Empleados
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar por:</label>
                <select
                  value={searchBy}
                  onChange={(e) => setSearchBy(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2"
                >
                  <option value="nombre">Nombre</option>
                  <option value="rut">RUT</option>
                  <option value="sucursal">Sucursal</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Término de búsqueda:</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Buscar por ${searchBy}...`}
                  className="w-full border border-gray-300 rounded-md p-2"
                />
              </div>
            </div>
          </div>


          {/* Lista de empleados */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <h3 className="text-xl font-semibold p-4 border-b">Lista de Empleados</h3>

            {loading ? (
              <div className="p-4 text-center">Cargando...</div>
            ) : filteredEmpleados.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? "No se encontraron empleados con los criterios de búsqueda." : "No hay empleados registrados."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RUT</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sucursal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEmpleados.map(emp => ( // Usamos filteredEmpleados aquí
                      <tr key={emp.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{emp.nombre}</div>
                          <div className="text-sm text-gray-500">{emp.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.rut}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.cargo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {localSucursales?.find(s => s.sucursal_id === emp.sucursal_id)?.nombre || emp.sucursal_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditarEmpleado(emp)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            <FiEdit />
                          </button>
                          <button
                            onClick={() => handleEliminarEmpleado(emp.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">
              {editMode ? 'Editar Empleado' : 'Nuevo Empleado'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700"
            >
              <FiX size={20} />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Campos del formulario */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RUT*</label>
                <input
                  type="text"
                  name="rut"
                  value={empleado.rut}
                  onChange={handleInputChange}
                  placeholder="12345678-9"
                  className="w-full border border-gray-300 rounded-md p-2"
                  required
                  disabled={editMode}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo*</label>
                <input
                  type="text"
                  name="nombre"
                  value={empleado.nombre}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email*</label>
                <input
                  type="email"
                  name="email"
                  value={empleado.email}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  name="telefono"
                  value={empleado.telefono}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo*</label>
                <select
                  name="cargo"
                  value={empleado.cargo}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md p-2"
                  required
                >
                  <option value="Vendedor">Vendedor</option>
                  <option value="Contador">Contador</option>
                  <option value="Bodeguero">Bodeguero</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal*</label>
                {loadingLocalSucursales ? (
                  <div className="text-sm text-gray-500 p-2 border border-gray-300 rounded-md bg-gray-50">Cargando sucursales...</div>
                ) : errorLocalSucursales ? (
                  <div className="text-sm text-red-600 p-2 border border-red-300 rounded-md bg-red-50">Error al cargar: {errorLocalSucursales}</div>
                ) : (
                  <select
                    name="sucursal_id"
                    value={empleado.sucursal_id}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md p-2"
                    required
                  >
                    <option value="">Seleccione una sucursal</option>
                    {localSucursales.length > 0 ? (
                      localSucursales.map(sucursal => (
                        <option
                          key={sucursal.sucursal_id}
                          value={sucursal.sucursal_id}
                        >
                          {sucursal.nombre}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No hay sucursales disponibles</option>
                    )}
                  </select>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña {editMode ? '' : '*'}</label>
                <input
                  type="password"
                  name="password"
                  value={empleado.password}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md p-2"
                  placeholder={editMode ? 'Dejar en blanco para no cambiar' : 'Contraseña'}
                  required={!editMode}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Contratación*</label>
                <input
                  type="date"
                  name="fecha_contratacion"
                  value={empleado.fecha_contratacion}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md p-2"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center"
              >
                <FiSave className="mr-2" />
                {editMode ? 'Actualizar Empleado' : 'Guardar Empleado'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AgregarEmpleado;
