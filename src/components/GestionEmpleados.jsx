import React, { useState, useEffect } from 'react';
import axios from 'axios';
// No importamos 'AgregarEmpleado' ni 'useAuth' ni 'useNavigate' en esta versión simplificada,
// para aislar el problema a la carga de sucursales.

const GestionEmpleados = () => {
  const [sucursales, setSucursales] = useState([]);
  const [loadingSucursales, setLoadingSucursales] = useState(true);
  const [errorSucursales, setErrorSucursales] = useState(null);

  useEffect(() => {
    const cargarSucursalesSimplificado = async () => {
      console.log('Iniciando carga de sucursales...');
      try {
        setLoadingSucursales(true);
        setErrorSucursales(null);

        // *** LLAMADA A LA API DE SUCURSALES ***
        // Usamos el puerto 5003, que es donde dices que funciona en VistaAdmin.
        const response = await axios.get('http://localhost:5003/api/sucursales');

        // *** DEPURACIÓN: Muestra la respuesta COMPLETA de la API ***
        console.log('Respuesta COMPLETA de la API de sucursales:', response);
        
        // También, muestra los datos brutos que axios extrae
        console.log('Datos de sucursales ANTES de formatear (response.data):', response.data);

        const rawSucursales = response.data.data || response.data;

        if (!Array.isArray(rawSucursales)) {
          console.error('La respuesta de sucursales NO ES UN ARRAY o el formato es inesperado:', rawSucursales);
          throw new Error('Formato de datos de sucursales inesperado de la API.');
        }

        const formattedSucursales = rawSucursales.map(s => ({
          sucursal_id: s.sucursal_id || s.id, 
          nombre: s.nombre || s.name
        }));

        console.log('Sucursales formateadas y listas para el estado:', formattedSucursales);
        setSucursales(formattedSucursales);

      } catch (err) {
        // Capturamos CUALQUIER error que ocurra durante la carga
        console.error('*** ERROR CRÍTICO al cargar sucursales (GestionEmpleados SIMPLIFICADO):', err);
        setErrorSucursales(err.message || 'Error desconocido al cargar sucursales. Revisa la consola.');
      } finally {
        setLoadingSucursales(false);
        console.log('Carga de sucursales finalizada.');
      }
    };

    cargarSucursalesSimplificado();
  }, []); // Se ejecuta solo una vez al montar el componente

  // Renderizado muy simplificado para solo mostrar el estado de la carga
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Estado de Carga de Sucursales (Versión Simplificada)</h1>

      {loadingSucursales ? (
        <div className="text-center py-4 text-gray-600">Intentando cargar sucursales...</div>
      ) : errorSucursales ? (
        <div className="bg-red-100 text-red-800 p-4 rounded mb-4 border border-red-300">
          Error: {errorSucursales}
          <p className="mt-2 text-sm">
            Verifica la consola para más detalles sobre este error.
          </p>
        </div>
      ) : (
        <div className="p-4 bg-green-100 text-green-800 rounded">
          Sucursales cargadas exitosamente (ver consola para los datos). Total: {sucursales.length}
        </div>
      )}
      {/* Ya no renderizamos AgregarEmpleado en esta versión simplificada */}
    </div>
  );
};

export default GestionEmpleados;
