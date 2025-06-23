import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext'; // CORREGIDO: Subir un nivel para encontrar AuthContext
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiPackage, FiTruck, FiCheckCircle, FiXCircle, FiInfo } from 'react-icons/fi';

const BodegueroPanel = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [empleadoProfile, setEmpleadoProfile] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [isLoadingPedidos, setIsLoadingPedidos] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [detallePedidoModal, setDetallePedidoModal] = useState(null); // Estado para el modal de detalle

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
    const fetchData = async () => {
      if (!loading) {
        if (!isAuthenticated || !user || user.cargo !== 'Bodeguero') {
          setError("Acceso denegado. Por favor, inicie sesión como Bodeguero.");
          navigate('/cliente'); // Redirigir si no es un bodeguero autenticado
          return;
        }

        try {
          // Obtener perfil del empleado (para obtener sucursal_id)
          const profileResponse = await axios.get('http://localhost:3006/api/empleados/perfil', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setEmpleadoProfile(profileResponse.data.data);

          const bodegueroSucursalId = profileResponse.data.data.sucursal_id;
          if (!bodegueroSucursalId) {
            setError("No se pudo obtener la sucursal del bodeguero.");
            setIsLoadingPedidos(false);
            return;
          }

          // Obtener pedidos para la sucursal del bodeguero
          const pedidosResponse = await axios.get(`http://localhost:5004/api/pedidos/sucursal/${bodegueroSucursalId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setPedidos(pedidosResponse.data);
          setIsLoadingPedidos(false);

        } catch (err) {
          console.error('Error al cargar datos del bodeguero:', err);
          setError('Error al cargar el panel de bodega: ' + (err.response?.data?.message || err.message));
          setIsLoadingPedidos(false);
        }
      }
    };
    fetchData();
  }, [isAuthenticated, user, loading, navigate]);

  const handleUpdateEstadoPedido = async (pedidoId, nuevoEstado) => {
    try {
      setMensaje('');
      setError('');
      const token = localStorage.getItem('token');
      const response = await axios.patch(`http://localhost:5004/api/pedidos/${pedidoId}/estado`, { estado: nuevoEstado }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setMensaje(`Estado del pedido ${pedidoId} actualizado a "${nuevoEstado}"`);
        // Actualizar el estado local de los pedidos para reflejar el cambio
        setPedidos(pedidos.map(p => p.id === pedidoId ? { ...p, estado: nuevoEstado } : p));
      } else {
        setError(response.data.message || 'Error al actualizar el estado del pedido.');
      }
    } catch (err) {
      console.error('Error al actualizar estado del pedido:', err);
      setError('Error al actualizar estado: ' + (err.response?.data?.message || err.message));
    }
  };

  const openDetalleModal = (pedido) => {
    setDetallePedidoModal(pedido);
  };

  const closeDetalleModal = () => {
    setDetallePedidoModal(null);
  };

  if (loading || isLoadingPedidos) {
    return <div className="text-center text-lg mt-10">Cargando panel de bodega...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-100 text-red-700 rounded mb-4 mt-10">{error}</div>;
  }

  if (!empleadoProfile) {
    return <div className="text-center text-lg mt-10">No se pudo cargar el perfil del bodeguero.</div>;
  }

  return (
    <div className="flex-1 p-8 bg-gray-100">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
        <FiPackage className="mr-3" /> Panel de Bodega
      </h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-3">Bienvenido, {empleadoProfile.nombre} ({empleadoProfile.cargo})</h2>
        <p>Sucursal: {empleadoProfile.sucursal_nombre}</p>
        <p>Teléfono: {empleadoProfile.telefono}</p>
        <p>Email: {empleadoProfile.email}</p>
      </div>

      {mensaje && <div className="p-4 bg-green-100 text-green-700 rounded mb-4">{mensaje}</div>}
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Pedidos de la Sucursal: {empleadoProfile.sucursal_nombre}</h2>
        
        {pedidos.length === 0 ? (
          <p className="text-gray-500">No hay pedidos pendientes o activos en esta sucursal.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Pedido</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pedidos.map(pedido => (
                  <tr key={pedido.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pedido.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(pedido.fecha).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {pedido.cliente_nombre ? `${pedido.cliente_nombre} ${pedido.cliente_apellido} (${pedido.cliente_rut})` : 'Consumidor Final'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrencyCLP(pedido.total)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        pedido.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        pedido.estado === 'Preparando' ? 'bg-blue-100 text-blue-800' :
                        pedido.estado === 'Listo para retiro' ? 'bg-green-100 text-green-800' :
                        pedido.estado === 'En despacho' ? 'bg-purple-100 text-purple-800' :
                        pedido.estado === 'Entregado' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {pedido.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => openDetalleModal(pedido)}
                        className="text-blue-600 hover:text-blue-900 mr-2"
                        title="Ver Detalles"
                      >
                        <FiInfo />
                      </button>
                      {pedido.estado === 'Pendiente' && (
                        <button 
                          onClick={() => handleUpdateEstadoPedido(pedido.id, 'Preparando')}
                          className="text-blue-600 hover:text-blue-900"
                          title="Marcar como Preparando"
                        >
                          <FiTruck />
                        </button>
                      )}
                      {pedido.estado === 'Preparando' && (
                        <button 
                          onClick={() => handleUpdateEstadoPedido(pedido.id, 'Listo para retiro')}
                          className="text-green-600 hover:text-green-900"
                          title="Marcar como Listo para Retiro"
                        >
                          <FiCheckCircle />
                        </button>
                      )}
                      {/* Otros botones de acción según el estado */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalles del Pedido */}
      {detallePedidoModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full relative">
            <h3 className="text-2xl font-bold mb-4">Detalles del Pedido #{detallePedidoModal.id}</h3>
            <button
              onClick={closeDetalleModal}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
            >
              <FiXCircle size={24} />
            </button>
            <div className="mb-4 text-gray-700">
              <p><strong>Fecha:</strong> {new Date(detallePedidoModal.fecha).toLocaleDateString()}</p>
              <p><strong>Cliente:</strong> {detallePedidoModal.cliente_nombre ? `${detallePedidoModal.cliente_nombre} ${detallePedidoModal.cliente_apellido} (${detallePedidoModal.cliente_rut})` : 'Consumidor Final'}</p>
              <p><strong>Empleado que registró:</strong> {detallePedidoModal.empleado_nombre} ({detallePedidoModal.empleado_cargo})</p>
              <p><strong>Sucursal de Origen:</strong> {detallePedidoModal.sucursal_nombre}</p>
              {detallePedidoModal.sucursal_retiro_id && (
                 <p><strong>Sucursal de Retiro:</strong> {detallePedidoModal.sucursal_nombre_retiro}</p>
              )}
              <p><strong>Método de Pago:</strong> {detallePedidoModal.metodo_pago}</p>
              <p><strong>Estado:</strong> {detallePedidoModal.estado}</p>
              <p className="text-xl font-bold mt-2">Total: {formatCurrencyCLP(detallePedidoModal.total)}</p>
            </div>
            <h4 className="text-lg font-semibold mb-2">Productos:</h4>
            {detallePedidoModal.items && detallePedidoModal.items.length > 0 ? (
              <ul className="list-disc list-inside bg-gray-50 p-4 rounded-md">
                {detallePedidoModal.items.map((item, index) => (
                  <li key={index} className="mb-1">
                    {item.producto_titulo} ({item.producto_sku}) - Cantidad: {item.cantidad} - {formatCurrencyCLP(item.precio_unitario)} c/u
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No hay detalles de productos para este pedido.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BodegueroPanel;
