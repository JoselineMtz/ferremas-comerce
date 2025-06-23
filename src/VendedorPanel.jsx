import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiShoppingCart, FiTruck, FiCheckCircle, FiXCircle, FiUserPlus } from 'react-icons/fi'; // Iconos para las pestañas y validación

const VendedorPanel = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [empleadoProfile, setEmpleadoProfile] = useState(null);
  const [productos, setProductos] = useState([]);
  const [sucursalesDisponibles, setSucursalesDisponibles] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  
  // Estados para el cliente y su registro (ahora más específicos para Pedido)
  const [clienteRut, setClienteRut] = useState('');
  const [clienteExiste, setClienteExiste] = useState(null); // null: no verificado, true: existe, false: no existe
  const [clienteData, setClienteData] = useState(null); // Datos del cliente existente o recién registrado
  const [mostrarFormularioNuevoCliente, setMostrarFormularioNuevoCliente] = useState(false);
  const [datosNuevoCliente, setDatosNuevoCliente] = useState({
    nombre: '',
    apellido: '',
    correo: '',
    telefono: '',
    password: '',
  });

  const [ventaItems, setVentaItems] = useState([]);
  const [totalVenta, setTotalVenta] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const [activeForm, setActiveForm] = useState('in_store_sale');
  const [sucursalRetiroId, setSucursalRetiroId] = useState(''); // CORRECCIÓN: Nombre de estado
  
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
    if (!loading) {
      if (!isAuthenticated || !user || !user.esEmpleado) {
        setError("Acceso denegado. Por favor, inicie sesión como empleado.");
        navigate('/cliente');
        return;
      }

      const fetchData = async () => {
        try {
          const profileResponse = await axios.get('http://localhost:3006/api/empleados/perfil', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setEmpleadoProfile(profileResponse.data.data);

          const productsResponse = await axios.get('http://localhost:5003/api/productos');
          setProductos(productsResponse.data);

          const sucursalesResponse = await axios.get('http://localhost:5003/api/sucursales');
          const rawSucursales = sucursalesResponse.data.data || sucursalesResponse.data;
          if (Array.isArray(rawSucursales)) {
            const formattedSucursales = rawSucursales.map(s => ({
              sucursal_id: s.sucursal_id || s.id, 
              nombre: s.nombre || s.name
            }));
            setSucursalesDisponibles(formattedSucursales);
          } else {
            console.error("Formato de sucursales inesperado:", rawSucursales);
            setError("Error al cargar sucursales. Formato inesperado.");
          }

        } catch (err) {
          console.error('Error al cargar datos del vendedor:', err);
          setError('Error al cargar el panel del vendedor: ' + (err.response?.data?.message || err.message));
        }
      };
      fetchData();
    }
  }, [isAuthenticated, user, loading, navigate]);

  const handleAddItem = () => {
    const productToAdd = productos.find(p => p.id === parseInt(selectedProduct));
    if (productToAdd && cantidad > 0) {
      if (productToAdd.stock < cantidad) {
        setError(`Stock insuficiente para ${productToAdd.titulo}. Disponible: ${productToAdd.stock}`);
        return;
      }

      const existingItemIndex = ventaItems.findIndex(item => item.producto_id === productToAdd.id);

      if (existingItemIndex > -1) {
        const updatedItems = ventaItems.map((item, index) =>
          index === existingItemIndex
            ? { ...item, cantidad: item.cantidad + cantidad }
            : item
        );
        setVentaItems(updatedItems);
      } else {
        setVentaItems([...ventaItems, {
          producto_id: productToAdd.id,
          titulo: productToAdd.titulo,
          cantidad: cantidad,
          precio_unitario: productToAdd.precio,
        }]);
      }
      
      setTotalVenta(prevTotal => prevTotal + (productToAdd.precio * cantidad));
      setError('');
    } else {
      setError('Seleccione un producto y una cantidad válida.');
    }
  };

  const handleRemoveItem = (indexToRemove) => {
    const itemToRemove = ventaItems[indexToRemove];
    setTotalVenta(prevTotal => prevTotal - (itemToRemove.precio_unitario * itemToRemove.cantidad));
    setVentaItems(ventaItems.filter((_, index) => index !== indexToRemove));
  };

  const resetFormularioVenta = () => {
    setVentaItems([]);
    setTotalVenta(0);
    setSelectedProduct('');
    setCantidad(1);
    setClienteRut('');
    setSucursalRetiroId(''); // CORRECCIÓN: Nombre de estado
    setClienteExiste(null);
    setClienteData(null);
    setMostrarFormularioNuevoCliente(false);
    setDatosNuevoCliente({
      nombre: '',
      apellido: '',
      correo: '',
      telefono: '',
      password: '',
    });
    setMessage('');
    setError('');
  };

  const handleVerificarCliente = async () => {
    setError('');
    setMessage('');
    setClienteExiste(null);
    setClienteData(null);
    setMostrarFormularioNuevoCliente(false);

    const rutLimpio = clienteRut.trim();
    if (!rutLimpio) {
      setError('Por favor, ingrese un RUT para verificar.');
      return;
    }

    try {
      const response = await axios.get(`http://localhost:3006/api/clientes/by-rut/${rutLimpio}`);
      
      if (response.data.exists) {
        setClienteExiste(true);
        setClienteData(response.data.data);
        setMessage(`Cliente encontrado: ${response.data.data.nombre} ${response.data.data.apellido}`);
      } else {
        setClienteExiste(false);
        setError('Cliente no encontrado. Por favor, registre al nuevo cliente.');
        setMostrarFormularioNuevoCliente(true);
        setDatosNuevoCliente(prev => ({ ...prev, rut: rutLimpio }));
      }
    } catch (err) {
      console.error('Error al verificar cliente:', err);
      setError('Error al verificar cliente: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDatosNuevoClienteChange = (e) => {
    const { name, value } = e.target;
    setDatosNuevoCliente(prev => ({ ...prev, [name]: value }));
  };

  const handleRegistrarNuevoCliente = async () => {
    setError('');
    setMessage('');
    const { nombre, apellido, correo, telefono, password } = datosNuevoCliente;
    if (!clienteRut || !nombre || !apellido || !correo || !telefono || !password) {
      setError('Todos los campos del nuevo cliente (incluido RUT) son obligatorios para el registro.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:3006/api/registro', {
        rut: clienteRut,
        nombre,
        apellido,
        correo,
        telefono,
        password,
      });

      if (response.data.success) {
        setMessage('Nuevo cliente registrado exitosamente. Ahora puede continuar con el pedido.');
        setClienteExiste(true);
        setClienteData({
          id: response.data.data?.id,
          rut: clienteRut,
          nombre,
          apellido,
          correo,
          telefono,
        });
        setMostrarFormularioNuevoCliente(false);
        setDatosNuevoCliente({
          nombre: '', apellido: '', correo: '', telefono: '', password: '',
        });
      } else {
        setError(response.data.message || 'Error desconocido al registrar nuevo cliente.');
      }
    } catch (err) {
      console.error('Error al registrar nuevo cliente:', err);
      setError('Error al registrar nuevo cliente: ' + (err.response?.data?.message || err.message));
    }
  };


  const handleRegisterSale = async () => {
    if (ventaItems.length === 0) {
      setError('Agregue al menos un producto a la venta/pedido.');
      return;
    }

    if (activeForm === 'shipping_order' && !sucursalRetiroId) {
      setError('Seleccione una sucursal de retiro para el pedido.');
      return;
    }

    let id_cliente_para_pedido = null;
    const rutParaEnviar = clienteRut.trim();

    if (activeForm === 'shipping_order') {
        if (rutParaEnviar === '') {
            setError('Para un pedido de retiro/despacho, el RUT del cliente es obligatorio.');
            return;
        }
        if (clienteExiste === true && clienteData && clienteData.id) {
            id_cliente_para_pedido = clienteData.id;
        } else if (clienteExiste === false) {
            setError('El RUT ingresado no está registrado. Por favor, regístrelo antes de continuar con el pedido.');
            setMostrarFormularioNuevoCliente(true);
            return;
        } else if (clienteExiste === null) {
            setError('Debe verificar el RUT del cliente antes de continuar con el pedido.');
            return;
        }
    } else { // activeForm === 'in_store_sale' (Venta Presencial)
        id_cliente_para_pedido = null; 
        setError('');
    }

    try {
      // Determinar el estado del pedido basado en el tipo de formulario
      const pedidoEstado = activeForm === 'in_store_sale' ? 'completado' : 'procesado'; // <-- AJUSTE CLAVE AQUÍ

      const saleData = {
        cliente_id: id_cliente_para_pedido,
        cliente_rut: rutParaEnviar === '' ? null : rutParaEnviar,
        metodo_pago: metodoPago,
        items: ventaItems.map(item => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
        })),
        estado: pedidoEstado, // <-- ENVIAMOS EL ESTADO DEFINIDO
      };

      if (activeForm === 'shipping_order') {
        saleData.sucursal_retiro_id = parseInt(sucursalRetiroId);
      }

      const response = await axios.post('http://localhost:5004/api/pedidos', saleData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setMessage(response.data.message);
      setError('');
      resetFormularioVenta();
    } catch (err) {
      console.error('Error al registrar la venta/pedido:', err);
      setError('Error al registrar la venta/pedido: ' + (err.response?.data?.message || err.message));
      setMessage('');
    }
  };

  if (loading) {
    return <div className="text-center text-lg mt-10">Cargando panel de vendedor...</div>;
  }

  if (!empleadoProfile) {
    return <div className="text-center text-lg mt-10">Cargando perfil del vendedor...</div>;
  }

  return (
    <div className="flex-1 p-8 bg-gray-100">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Panel de Vendedor</h1>
      
      {empleadoProfile && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-3">Bienvenido, {empleadoProfile.nombre} ({empleadoProfile.cargo})</h2>
          <p>Sucursal: {empleadoProfile.sucursal_nombre}</p>
          <p>Teléfono: {empleadoProfile.telefono}</p>
          <p>Email: {empleadoProfile.email}</p>
        </div>
      )}

      {error && <div className="p-4 bg-red-100 text-red-700 rounded mb-4">{error}</div>}
      {message && <div className="p-4 bg-green-100 text-green-700 rounded mb-4">{message}</div>}

      {/* Selector de tipo de operación */}
      <div className="flex border-b mb-6">
        <button
          className={`px-6 py-3 font-medium flex items-center ${activeForm === "in_store_sale" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-600"}`}
          onClick={() => { setActiveForm("in_store_sale"); resetFormularioVenta(); }}
        >
          <FiShoppingCart className="mr-2" /> Venta Presencial
        </button>
        <button
          className={`px-6 py-3 font-medium flex items-center ${activeForm === "shipping_order" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-600"}`}
          onClick={() => { setActiveForm("shipping_order"); resetFormularioVenta(); }}
        >
          <FiTruck className="mr-2" /> Pedido para Retiro/Despacho
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Formulario de Venta Presencial */}
        {activeForm === 'in_store_sale' && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Registrar Venta Presencial</h2>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Cliente RUT (Opcional):
              </label>
              <input
                type="text"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={clienteRut}
                onChange={(e) => { 
                  setClienteRut(e.target.value); 
                  if (error.includes('cliente')) setError(''); 
                }}
                placeholder="Ej: 12.345.678-9"
              />
              <p className="text-xs text-gray-500 mt-1">Si el RUT está vacío, la venta se considerará para "Consumidor Final".</p>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Producto:
              </label>
              <select
                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
              >
                <option value="">Seleccione un producto</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.titulo} - {formatCurrencyCLP(p.precio)} (Stock: {p.stock})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Cantidad:
              </label>
              <input
                type="number"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={cantidad}
                onChange={(e) => setCantidad(parseInt(e.target.value))}
                min="1"
              />
            </div>
            <button
              onClick={handleAddItem}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Agregar Producto a Venta
            </button>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Items de la Venta:</h3>
              {ventaItems.length === 0 ? (
                <p className="text-gray-500">No hay productos en la venta.</p>
              ) : (
                <ul className="border rounded-md p-3 bg-gray-50">
                  {ventaItems.map((item, index) => (
                    <li key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                      <span>{item.titulo} x {item.cantidad} ({formatCurrencyCLP(item.precio_unitario)} c/u)</span>
                      <button 
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Eliminar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="text-right text-xl font-bold mt-4">
                Total: {formatCurrencyCLP(totalVenta)}
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Método de Pago:
              </label>
              <select
                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>

            <button
              onClick={handleRegisterSale}
              className="mt-6 bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded focus:outline-none focus:shadow-outline w-full"
            >
              Registrar Venta Presencial
            </button>
          </div>
        )}

        {/* Formulario de Pedido para Retiro/Despacho */}
        {activeForm === 'shipping_order' && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Generar Pedido para Retiro/Despacho</h2>
            
            {/* Sección de Cliente (con verificación y registro obligatorio) */}
            <div className="mb-6 p-4 border rounded-md bg-gray-50">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <FiUserPlus className="mr-2" /> Información del Cliente
              </h3>
              <div className="mb-4 flex items-end space-x-2">
                <div className="flex-grow">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Cliente RUT: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={clienteRut}
                    onChange={(e) => { 
                      setClienteRut(e.target.value); 
                      setClienteExiste(null); // Resetear estado de verificación al cambiar RUT
                      setClienteData(null);
                      setMostrarFormularioNuevoCliente(false);
                    }}
                    placeholder="Ej: 12.345.678-9"
                    required={activeForm === 'shipping_order'}
                  />
                  <p className="text-xs text-gray-500 mt-1">El RUT del cliente es obligatorio para pedidos con retiro/despacho.</p>
                </div>
                <button
                  onClick={handleVerificarCliente}
                  className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  disabled={!clienteRut.trim()}
                >
                  Verificar RUT
                </button>
              </div>

              {clienteExiste === true && clienteData && (
                <div className="flex items-center text-green-700 mb-4 p-2 bg-green-50 border border-green-200 rounded">
                  <FiCheckCircle className="mr-2 text-xl" />
                  <span>Cliente: {clienteData.nombre} {clienteData.apellido} ({clienteData.correo})</span>
                </div>
              )}
              {clienteExiste === false && (
                <div className="flex items-center text-red-700 mb-4 p-2 bg-red-50 border border-red-200 rounded">
                  <FiXCircle className="mr-2 text-xl" />
                  <span>Cliente no encontrado con este RUT. Por favor, registre los datos a continuación.</span>
                </div>
              )}

              {mostrarFormularioNuevoCliente && clienteExiste === false && (
                <div className="mt-4 p-4 border rounded-md bg-white shadow-sm">
                  <h4 className="text-md font-semibold mb-3">Registrar Nuevo Cliente</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="nombre" value={datosNuevoCliente.nombre} onChange={handleDatosNuevoClienteChange} placeholder="Nombre" className="p-2 border rounded" required />
                    <input type="text" name="apellido" value={datosNuevoCliente.apellido} onChange={handleDatosNuevoClienteChange} placeholder="Apellido" className="p-2 border rounded" required />
                    <input type="email" name="correo" value={datosNuevoCliente.correo} onChange={handleDatosNuevoClienteChange} placeholder="Correo electrónico" className="p-2 border rounded" required />
                    <input type="tel" name="telefono" value={datosNuevoCliente.telefono} onChange={handleDatosNuevoClienteChange} placeholder="Teléfono" className="p-2 border rounded" required />
                    <input type="password" name="password" value={datosNuevoCliente.password} onChange={handleDatosNuevoClienteChange} placeholder="Contraseña (mín. 6 caracteres)" className="p-2 border rounded md:col-span-2" required />
                  </div>
                  <button
                    onClick={handleRegistrarNuevoCliente}
                    className="mt-4 bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                  >
                    Registrar Cliente
                  </button>
                </div>
              )}
            </div>

            {/* Resto del formulario de pedido */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Sucursal de Retiro/Despacho: <span className="text-red-500">*</span>
              </label>
              <select
                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={sucursalRetiroId}
                onChange={(e) => setSucursalRetiroId(e.target.value)} // CORRECCIÓN: Nombre de estado
                required
              >
                <option value="">Seleccione una sucursal</option>
                {sucursalesDisponibles.map(s => (
                  <option key={s.sucursal_id} value={s.sucursal_id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Producto:
              </label>
              <select
                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
              >
                <option value="">Seleccione un producto</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.titulo} - {formatCurrencyCLP(p.precio)} (Stock: {p.stock})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Cantidad:
              </label>
              <input
                type="number"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={cantidad}
                onChange={(e) => setCantidad(parseInt(e.target.value))}
                min="1"
              />
            </div>
            <button
              onClick={handleAddItem}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Agregar Producto a Pedido
            </button>

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Items del Pedido:</h3>
              {ventaItems.length === 0 ? (
                <p className="text-gray-500">No hay productos en el pedido.</p>
              ) : (
                <ul className="border rounded-md p-3 bg-gray-50">
                  {ventaItems.map((item, index) => (
                    <li key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                      <span>{item.titulo} x {item.cantidad} ({formatCurrencyCLP(item.precio_unitario)} c/u)</span>
                      <button 
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Eliminar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="text-right text-xl font-bold mt-4">
                Total: {formatCurrencyCLP(totalVenta)}
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Método de Pago:
              </label>
              <select
                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>

            <button
              onClick={handleRegisterSale}
              className="mt-6 bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded focus:outline-none focus:shadow-outline w-full"
            >
              Generar Pedido
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendedorPanel;
