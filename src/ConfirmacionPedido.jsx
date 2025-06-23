import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './components/Navbar'; // Asegúrate de la ruta correcta a Navbar
import { FiMapPin, FiShoppingCart, FiCreditCard, FiTrash2 } from 'react-icons/fi'; // Iconos para estética y eliminar

const ConfirmacionPedido = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Inicializamos el estado del carrito con los items pasados por la navegación o un array vacío.
  // Es crucial que este sea un estado para poder modificarlo (eliminar items).
  const [carritoItems, setCarritoItems] = useState(location.state?.carritoItems || []);

  const [sucursales, setSucursales] = useState([]);
  const [selectedSucursalId, setSelectedSucursalId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

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

  // Cargar sucursales al montar el componente
  useEffect(() => {
    const fetchSucursales = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get('http://localhost:5003/api/sucursales'); 
        const rawSucursales = response.data.data || response.data;
        if (Array.isArray(rawSucursales)) {
          setSucursales(rawSucursales.map(s => ({
            sucursal_id: s.sucursal_id || s.id, 
            nombre: s.nombre || s.name,
            direccion: s.direccion
          })));
        } else {
          throw new Error('Formato de datos de sucursales inesperado.');
        }
      } catch (err) {
        console.error('Error al cargar sucursales:', err);
        setError('Error al cargar las sucursales disponibles. Intente recargar.');
      } finally {
        setLoading(false);
      }
    };

    fetchSucursales();

    // Redirigir si el carrito está vacío al cargar la página.
    // Usamos el estado `carritoItems` aquí.
    if (carritoItems.length === 0) {
      // Usamos un setTimeout para evitar el warning de estado síncrono
      setTimeout(() => {
        alert("Tu carrito está vacío. Redirigiendo al catálogo.");
        navigate('/cliente');
      }, 0);
    }
  }, [navigate, carritoItems.length]); // Dependencia en carritoItems.length para re-evaluar si el carrito se vacía

  // Efecto para actualizar localStorage cuando carritoItems cambia en esta vista
  useEffect(() => {
    if (carritoItems.length > 0) {
      localStorage.setItem('carrito', JSON.stringify(carritoItems));
    } else {
      localStorage.removeItem('carrito');
    }
  }, [carritoItems]); // Se ejecuta cada vez que carritoItems cambia

  // Función para eliminar un producto del carrito
  const handleRemoveItem = (itemId) => {
    const updatedCarrito = carritoItems.filter(item => item.id !== itemId);
    setCarritoItems(updatedCarrito); // Actualiza el estado local del carrito
    // La actualización de localStorage se maneja en el useEffect anterior
    alert("Producto eliminado del pedido.");
  };

  // Calcular el total del carrito, usando el estado `carritoItems`
  const totalCarrito = carritoItems.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

  const handleMercadoPagoPayment = async () => {
    if (!selectedSucursalId) {
      alert("Por favor, selecciona una sucursal de retiro antes de pagar.");
      return;
    }
    if (carritoItems.length === 0) {
      alert("El carrito está vacío. No se puede procesar el pago.");
      return;
    }

    setProcessingPayment(true);
    setError(null);

    try {
      // Prepara los ítems para la preferencia de Mercado Pago
      const itemsForMP = carritoItems.map(item => ({
        title: item.titulo,
        quantity: item.cantidad,
        unit_price: parseFloat(item.precio), // Asegúrate de que sea un número
      }));

      const response = await axios.post('http://localhost:3001/crear-preferencia', {
        items: itemsForMP,
      });

      if (response.data && response.data.init_point) {
        // Redirige al usuario al punto de inicio de Mercado Pago
        window.location.href = response.data.init_point;
        // Opcional: Limpiar el carrito en localStorage después de redirigir exitosamente
        // Aunque Mercado Pago maneja el éxito/fallo con redirecciones de retorno,
        // podrías querer limpiarlo aquí si confías en la redirección.
        // localStorage.removeItem('carrito'); 
      } else {
        throw new Error('No se recibió el punto de inicio de Mercado Pago.');
      }
    } catch (err) {
      console.error('Error al procesar el pago con Mercado Pago:', err);
      setError(`Error al iniciar el pago: ${err.response?.data?.error || err.message || 'Error desconocido'}`);
    } finally {
      setProcessingPayment(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-700">Cargando sucursales y confirmando pedido...</p>
      </div>
    );
  }

  // Si el carrito está vacío después de la carga inicial o por una eliminación
  if (carritoItems.length === 0 && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-700">No hay productos en el carrito para confirmar.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen font-inter pt-16"> {/* Añadir padding-top para Navbar */}
      <Navbar botones={['Ferretería', 'Electricidad', 'Herramientas']} toggleCarritoMenu={() => {}} /> {/* Navbar simple */}

      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
          <FiShoppingCart className="mr-3 text-blue-600" /> Confirmar Pedido y Pagar
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna de Detalles del Pedido */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Productos en tu Carrito</h2>
            <div className="space-y-4">
              {carritoItems.map((item) => (
                <div key={item.id} className="flex items-center border-b pb-4 last:border-b-0 last:pb-0">
                  <img 
                    src={item.imagen_url || `https://placehold.co/80x80/E0E0E0/333333?text=Producto`} 
                    alt={item.titulo} 
                    className="w-20 h-20 object-cover rounded-md mr-4" 
                    onError={(e) => { e.target.onerror = null; e.target.src=`https://placehold.co/80x80/E0E0E0/333333?text=Error`; }}
                  />
                  <div className="flex-grow">
                    <h3 className="text-lg font-medium">{item.titulo}</h3>
                    <p className="text-gray-600 text-sm">{formatCurrencyCLP(item.precio)} x {item.cantidad}</p>
                  </div>
                  <div className="flex items-center ml-4"> {/* Contenedor para precio y botón */}
                    <div className="font-bold text-lg mr-4">{formatCurrencyCLP(item.precio * item.cantidad)}</div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-red-500 hover:text-red-700 transition-colors p-2 rounded-full hover:bg-red-100"
                      title="Eliminar producto"
                    >
                      <FiTrash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-right text-2xl font-bold mt-6 pt-4 border-t border-gray-200">
              Total del Pedido: {formatCurrencyCLP(totalCarrito)}
            </div>
          </div>

          {/* Columna de Opciones de Retiro y Pago */}
          <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FiMapPin className="mr-2 text-blue-600" /> Opciones de Retiro
            </h2>
            <div className="mb-6">
              <label htmlFor="sucursal-select" className="block text-gray-700 font-medium mb-2">
                Selecciona una sucursal de retiro:
              </label>
              <select
                id="sucursal-select"
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedSucursalId}
                onChange={(e) => setSelectedSucursalId(e.target.value)}
              >
                <option value="">-- Selecciona --</option>
                {sucursales.length > 0 ? (
                  sucursales.map(s => (
                    <option key={s.sucursal_id} value={s.sucursal_id}>
                      {s.nombre} - {s.direccion}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No hay sucursales disponibles</option>
                )}
              </select>
              {sucursales.length === 0 && !loading && !error && (
                <p className="text-sm text-gray-500 mt-2">No se encontraron sucursales.</p>
              )}
            </div>

            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FiCreditCard className="mr-2 text-blue-600" /> Método de Pago
            </h2>
            <button
              onClick={handleMercadoPagoPayment}
              disabled={processingPayment || !selectedSucursalId || carritoItems.length === 0}
              className={`w-full py-3 px-4 rounded-md text-white font-bold transition-colors flex items-center justify-center
                ${processingPayment || !selectedSucursalId || carritoItems.length === 0
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {processingPayment ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando pago...
                </>
              ) : (
                <>
                  Pagar con Mercado Pago
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">Serás redirigido a la plataforma de Mercado Pago.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmacionPedido;
