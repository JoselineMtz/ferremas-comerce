import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import axios from "axios";
import { FiEdit, FiTrash2, FiPlus, FiSearch } from "react-icons/fi"; // Importar FiSearch
import AgregarProducto from "./AgregarProducto"; // Importar el componente AgregarProducto

const VistaAdmin = () => {
  const { user } = useAuth(); // Usar el hook useAuth para obtener el usuario
  const [activeTab, setActiveTab] = useState("productos");
  const [productos, setProductos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [categorias, setCategorias] = useState([]); // Nuevo estado para categorías
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para el formulario de sucursal
  const [showSucursalForm, setShowSucursalForm] = useState(false);
  const [nuevaSucursal, setNuevaSucursal] = useState({
    nombre: "",
    direccion: "",
    comuna: "", 
    region: "", 
    telefono: "",
    horario_apertura: "09:00",
    horario_cierre: "19:00",   
    activa: true,             
  });

  // NUEVOS ESTADOS para el formulario de producto (agregar/editar)
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // Almacena el producto a editar

  // Estados para el buscador de productos
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('nombre'); // Default search by nombre

  // Cargar datos según la pestaña activa y también las categorías
  const fetchData = async (tab) => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "productos") {
        const productsResponse = await axios.get("http://localhost:5003/api/productos");
        setProductos(productsResponse.data);
        
        const categoriesResponse = await axios.get("http://localhost:5003/api/categorias");
        setCategorias(categoriesResponse.data);
      } else if (tab === "sucursales") {
        const sucursalesResponse = await axios.get("http://localhost:5003/api/sucursales");
        setSucursales(sucursalesResponse.data);
      }
    } catch (err) {
      setError(`Error al cargar ${tab}: ${err.message}`);
      console.error(`Error al cargar ${tab}:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  // Manejador para el botón de "Agregar Producto"
  const handleAddNewProduct = () => {
    console.log("[VistaAdmin] Clic en 'Agregar Producto'. Estado ANTES: showProductForm:", showProductForm, "editingProduct:", editingProduct);
    setEditingProduct(null); // Asegura que no estamos en modo edición
    setShowProductForm(true); // Muestra el formulario
    console.log("[VistaAdmin] Clic en 'Agregar Producto'. Estado DESPUÉS: showProductForm:", true, "editingProduct:", null); // El log después muestra el valor futuro
  };

  // Manejador para el botón de "Editar Producto"
  const handleEditProduct = (product) => {
    console.log("[VistaAdmin] Clic en 'Editar Producto'. Producto recibido:", product);
    setEditingProduct(product); // Establece el producto a editar
    setShowProductForm(true); // Muestra el formulario
  };

  // Callback para cuando el formulario de producto se guarda exitosamente
  const handleProductSaved = () => {
    console.log("[VistaAdmin] Producto guardado exitosamente en AgregarProducto. Recargando productos.");
    setShowProductForm(false); // Cierra el formulario
    setEditingProduct(null); // Limpia el producto en edición
    fetchData("productos"); // Recarga la lista de productos
  };

  // Callback para cerrar el formulario de producto sin guardar
  const handleCloseProductForm = () => {
    console.log("[VistaAdmin] handleCloseProductForm llamado. Estado ANTES: showProductForm:", showProductForm, "editingProduct:", editingProduct);
    setShowProductForm(false);
    setEditingProduct(null);
    console.log("[VistaAdmin] handleCloseProductForm finalizado. Estado DESPUÉS: showProductForm:", false, "editingProduct:", null); // El log después muestra el valor futuro
  };


  const handleDelete = async (type, id) => {
    const confirmationMessage = `¿Está seguro que desea eliminar este ${type} (ID: ${id})? Esta acción no se puede deshacer.`;
    if (!window.confirm(confirmationMessage)) {
        console.log(`[Frontend DELETE] Eliminación de ${type} cancelada por el usuario.`);
        return; 
    }

    try {
      await axios.delete(`http://localhost:5003/api/${type}/${id}`);
      
      if (type === "productos") {
        setProductos(productos.filter(item => item.id !== id));
      } else if (type === "sucursales") {
        setSucursales(sucursales.filter(item => (item.id || item.sucursal_id) !== id)); 
      }
      console.log(`[Frontend DELETE] ${type} con ID ${id} eliminado exitosamente del estado.`);
    } catch (err) {
      setError(`Error al eliminar ${type}: ${err.message}`);
      console.error(`Error al eliminar ${type}:`, err.response?.data || err);
    }
  };

  const handleSucursalInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNuevaSucursal(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleAddSucursal = async () => {
    setError(null); 
    if (!nuevaSucursal.nombre || !nuevaSucursal.direccion || !nuevaSucursal.comuna || 
        !nuevaSucursal.region || !nuevaSucursal.telefono || 
        !nuevaSucursal.horario_apertura || !nuevaSucursal.horario_cierre) {
      setError("Por favor, complete todos los campos obligatorios para la sucursal.");
      return;
    }

    try {
      const response = await axios.post("http://localhost:5003/api/sucursales", nuevaSucursal);
      setSucursales(prev => [...prev, response.data]); 
      setNuevaSucursal({ 
        nombre: "",
        direccion: "",
        comuna: "",
        region: "",
        telefono: "",
        horario_apertura: "09:00",
        horario_cierre: "19:00",
        activa: true,
      });
      setShowSucursalForm(false);
    } catch (err) {
      setError(`Error al agregar sucursal: ${err.response?.data?.message || err.message}`);
      console.error("Error al agregar sucursal:", err.response?.data || err);
    }
  };

  // Lógica de filtrado de productos
  const filteredProductos = productos.filter(producto => {
    const term = searchTerm.toLowerCase();
    
    if (searchBy === 'sku') {
      return producto.sku.toLowerCase().includes(term);
    } else if (searchBy === 'nombre') {
      return producto.titulo.toLowerCase().includes(term);
    } else if (searchBy === 'categoria') {
      const categoriaNombre = categorias.find(cat => cat.id === producto.categoria_id)?.nombre;
      return categoriaNombre ? categoriaNombre.toLowerCase().includes(term) : false;
    }
    return true; 
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Panel de Administración</h1>
      
      {/* Pestañas */}
      <div className="flex border-b mb-6">
        <button
          className={`px-6 py-3 font-medium ${activeTab === "productos" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-600"}`}
          onClick={() => { setActiveTab("productos"); setShowProductForm(false); /* Ocultar formulario al cambiar de pestaña */ }} 
        >
          Gestión de Productos
        </button>
        <button
          className={`px-6 py-3 font-medium ${activeTab === "sucursales" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-600"}`}
          onClick={() => { setActiveTab("sucursales"); setShowProductForm(false); /* Ocultar formulario al cambiar de pestaña */ }} 
        >
          Sucursales
        </button>
      </div>

      {/* Mensajes de estado */}
      {loading && <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded">Cargando...</div>}
      {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}

      {/* Contenido de las pestañas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {activeTab === "productos" && (
          <>
            {!showProductForm ? (
              <>
                <div className="flex justify-between items-center p-4 border-b">
                  <h2 className="text-xl font-semibold">Lista de Productos</h2>
                  {/* Botón "Agregar Producto" REMOVIDO según la solicitud del usuario */}
                  {/* <button
                    onClick={handleAddNewProduct} 
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
                  >
                    <FiPlus className="mr-2" />
                    Agregar Producto
                  </button> */}
                </div>

                {/* Sección de Buscador de Productos */}
                <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                  <h3 className="text-xl font-semibold mb-3 flex items-center">
                    <FiSearch className="mr-2" /> Buscar Productos
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
                        <option value="sku">SKU</option>
                        <option value="categoria">Categoría</option>
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

                <ProductosTab 
                  productos={filteredProductos} 
                  onDelete={(id) => handleDelete("productos", id)} 
                  onEdit={handleEditProduct} // Pasa la función de edición 
                  categorias={categorias} 
                />
              </>
            ) : (
              // Aquí se renderiza AgregarProducto. Ahora logueamos el valor de productToEdit.
              console.log("[VistaAdmin] Renderizando AgregarProducto con productToEdit:", editingProduct),
              <AgregarProducto 
                productToEdit={editingProduct} 
                onProductSaved={handleProductSaved} 
                onCloseForm={handleCloseProductForm} 
              />
            )}
          </>
        )}

        {activeTab === "sucursales" && (
          <div>
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold">Lista de Sucursales</h2>
              <button
                onClick={() => setShowSucursalForm(!showSucursalForm)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
              >
                <FiPlus className="mr-2" />
                {showSucursalForm ? "Cancelar" : "Agregar Sucursal"}
              </button>
            </div>

            {showSucursalForm && (
              <div className="p-4 border-b">
                <h3 className="text-lg font-medium mb-3">Nueva Sucursal</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Campo Nombre */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre*</label>
                    <input
                      type="text"
                      name="nombre"
                      value={nuevaSucursal.nombre}
                      onChange={handleSucursalInputChange}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  {/* Campo Dirección */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección*</label>
                    <input
                      type="text"
                      name="direccion"
                      value={nuevaSucursal.direccion}
                      onChange={handleSucursalInputChange}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  {/* Campo Comuna */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Comuna*</label>
                    <input
                      type="text"
                      name="comuna"
                      value={nuevaSucursal.comuna}
                      onChange={handleSucursalInputChange}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  {/* Campo Región */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Región*</label>
                    <input
                      type="text"
                      name="region"
                      value={nuevaSucursal.region}
                      onChange={handleSucursalInputChange}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  {/* Campo Teléfono */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono*</label>
                    <input
                      type="text"
                      name="telefono"
                      value={nuevaSucursal.telefono}
                      onChange={handleSucursalInputChange}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  {/* Campo Horario Apertura */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Horario Apertura*</label>
                    <input
                      type="time"
                      name="horario_apertura"
                      value={nuevaSucursal.horario_apertura}
                      onChange={handleSucursalInputChange}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  {/* Campo Horario Cierre */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Horario Cierre*</label>
                    <input
                      type="time"
                      name="horario_cierre"
                      value={nuevaSucursal.horario_cierre}
                      onChange={handleSucursalInputChange}
                      className="w-full border border-gray-300 rounded-md p-2"
                      required
                    />
                  </div>
                  {/* Campo Activa (Checkbox) */}
                  <div className="col-span-full md:col-span-1 flex items-center">
                    <input
                      type="checkbox"
                      name="activa"
                      checked={nuevaSucursal.activa}
                      onChange={handleSucursalInputChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 block text-sm font-medium text-gray-700">Activa</label>
                  </div>
                </div>
                <button
                  onClick={handleAddSucursal}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                >
                  Guardar Sucursal
                </button>
              </div>
            )}

            <SucursalesTab 
              sucursales={sucursales} 
              onDelete={(id) => handleDelete("sucursales", id)} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Componente para la pestaña de Productos
// Recibe 'categorias' como prop para mostrar el nombre de la categoría en la tabla
const ProductosTab = ({ productos, onDelete, onEdit, categorias }) => ( // Añadir onEdit como prop
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th> 
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {productos.length === 0 ? (
          <tr>
            <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
              No hay productos registrados o no coinciden con la búsqueda.
            </td>
          </tr>
        ) : (
          productos.map((producto) => (
            <tr key={producto.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  {producto.imagen_url && (
                    <div className="flex-shrink-0 h-10 w-10">
                      <img className="h-10 w-10 rounded-full" src={producto.imagen_url} alt={producto.titulo} />
                    </div>
                  )}
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{producto.titulo}</div>
                    <div className="text-sm text-gray-500">{producto.sku}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${producto.precio}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{producto.stock}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {categorias.find(cat => cat.id === producto.categoria_id)?.nombre || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button 
                  onClick={() => onEdit(producto)} // Llama a onEdit con el objeto completo del producto
                  className="text-blue-600 hover:text-blue-900 mr-4"
                >
                  <FiEdit />
                </button>
                <button 
                  onClick={() => onDelete(producto.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <FiTrash2 />
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

// Componente para la pestaña de Sucursales
const SucursalesTab = ({ sucursales, onDelete }) => {
  if (sucursales.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No hay sucursales registradas
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dirección</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comuna</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Región</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horario</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activa</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sucursales.map((sucursal) => (
            <tr key={sucursal.id || sucursal.sucursal_id}> 
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sucursal.nombre}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sucursal.direccion}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sucursal.comuna || 'N/A'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sucursal.region || 'N/A'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sucursal.telefono || 'N/A'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {`${sucursal.horario_apertura?.substring(0, 5) || 'N/A'} - ${sucursal.horario_cierre?.substring(0, 5) || 'N/A'}`}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {sucursal.activa ? 'Sí' : 'No'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button className="text-blue-600 hover:text-blue-900 mr-4">
                  <FiEdit />
                </button>
                <button 
                  onClick={() => onDelete(sucursal.id || sucursal.sucursal_id)}
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
  );
};

export default VistaAdmin;
