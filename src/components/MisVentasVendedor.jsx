import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext'; // Ajusta la ruta a AuthContext
import { FiList } from 'react-icons/fi'; // Importar icono

const MisVentasVendedor = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const [ventas, setVentas] = useState([]);
  const [isLoadingVentas, setIsLoadingVentas] = useState(true);
  const [errorVentas, setErrorVentas] = useState(null);

  // Función auxiliar para formatear a moneda chilena (CLP)
  const formatCurrencyCLP = (amount) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
      return 'N/A';
    }
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericAmount);
  };

  useEffect(() => {
    const fetchMisVentas = async () => {
      if (!loading && isAuthenticated && user && user.esEmpleado && user.id) {
        setIsLoadingVentas(true);
        setErrorVentas(null);
        try {
          const token = localStorage.getItem('token');
          // Llamada a la ruta del backend que filtra por empleado_id
          const response = await axios.get(`http://localhost:5004/api/pedidos/empleado/${user.id}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          setVentas(response.data);
        } catch (err) {
          console.error('Error al cargar mis ventas:', err);
          setErrorVentas('Error al cargar tus ventas: ' + (err.response?.data?.message || err.message));
        } finally {
          setIsLoadingVentas(false);
        }
      } else if (!loading && (!isAuthenticated || !user || !user.esEmpleado || !user.id)) {
        setErrorVentas("No autenticado o no es un empleado válido para ver las ventas.");
        setIsLoadingVentas(false);
      }
    };

    fetchMisVentas();
  }, [loading, isAuthenticated, user]); // Dependencias del useEffect

  if (isLoadingVentas) {
    return <div className="text-center text-lg mt-10">Cargando tus ventas...</div>;
  }

  if (errorVentas) {
    return <div className="p-4 bg-red-100 text-red-700 rounded mb-4 mt-10">{errorVentas}</div>;
  }

  return (
    <div className="flex-1 p-8 bg-gray-100">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
        <FiList className="mr-3" /> Mis Ventas
      </h1>

      <div className="bg-white p-6 rounded-lg shadow-md">
        {ventas.length === 0 ? (
          <p className="text-gray-500">No has registrado ninguna venta aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Pedido</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método Pago</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sucursal (Venta/Retiro)</th> {/* Columna unificada */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ventas.map(venta => (
                  <tr key={venta.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{venta.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(venta.fecha).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrencyCLP(venta.total)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{venta.metodo_pago}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {venta.cliente_nombre ? `${venta.cliente_nombre} (${venta.cliente_rut})` : 'Consumidor Final'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {/* Muestra la sucursal del empleado y, si es diferente, la de retiro */}
                      {venta.sucursal_nombre} 
                      {venta.sucursal_nombre_retiro && venta.sucursal_nombre_retiro !== venta.sucursal_nombre ? ` (Retiro: ${venta.sucursal_nombre_retiro})` : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{venta.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MisVentasVendedor;
