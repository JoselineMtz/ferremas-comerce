import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import axios from "axios";
import { FiEdit, FiTrash2, FiPlus, FiSearch } from "react-icons/fi";
import AgregarProducto from "./AgregarProducto";

const VistaAdmin = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("productos");
  const [productos, setProductos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('nombre');

  const fetchData = async (tab) => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "productos") {
        // Primero obtenemos las sucursales
        const sucursalesResponse = await axios.get("http://localhost:5003/api/sucursales");
        setSucursales(sucursalesResponse.data);
        
        // Luego obtenemos los productos
        const productsResponse = await axios.get("http://localhost:5003/api/productos");
        
        // Para cada producto, obtenemos su stock por sucursal
        const productosConStock = await Promise.all(
          productsResponse.data.map(async (producto) => {
            try {
              const stockResponse = await axios.get(
                `http://localhost:5003/api/productos/${producto.id}/stock-por-sucursal`
              );
              return {
                ...producto,
                stock_por_sucursal: stockResponse.data
              };
            } catch (error) {
              console.error(`Error al obtener stock para producto ${producto.id}:`, error);
              return {
                ...producto,
                stock_por_sucursal: []
              };
            }
          })
        );
        
        setProductos(productosConStock);
        console.log("[VistaAdmin] Productos con stock recibidos:", productosConStock);

        // Fetch categories
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

  const handleAddNewProduct = () => {
    setEditingProduct(null);
    setShowProductForm(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleProductSaved = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    fetchData("productos");
  };

  const handleCloseProductForm = () => {
    setShowProductForm(false);
    setEditingProduct(null);
  };

  const handleDelete = async (type, id) => {
    const isConfirmed = await new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
          <h3 class="text-lg font-semibold mb-4">Confirmar Eliminación</h3>
          <p class="text-gray-700 mb-6">¿Está seguro que desea eliminar este ${type} (ID: ${id})? Esta acción no se puede deshacer.</p>
          <div class="flex justify-end space-x-4">
            <button id="cancelButton" class="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100">Cancelar</button>
            <button id="confirmButton" class="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700">Eliminar</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('cancelButton').onclick = () => {
        document.body.removeChild(modal);
        resolve(false);
      };
      document.getElementById('confirmButton').onclick = () => {
        document.body.removeChild(modal);
        resolve(true);
      };
    });

    if (!isConfirmed) return;

    try {
      await axios.delete(`http://localhost:5003/api/${type}/${id}`);

      if (type === "productos") {
        setProductos(productos.filter(item => item.id !== id));
      } else if (type === "sucursales") {
        setSucursales(sucursales.filter(item => (item.id || item.sucursal_id) !== id));
      }
    } catch (err) {
      setError(`Error al eliminar ${type}: ${err.message}`);
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
    }
  };

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

      <div className="flex border-b mb-6">
        <button
          className={`px-6 py-3 font-medium ${activeTab === "productos" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-600"}`}
          onClick={() => { setActiveTab("productos"); setShowProductForm(false); }}
        >
          Gestión de Productos
        </button>
        <button
          className={`px-6 py-3 font-medium ${activeTab === "sucursales" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-600"}`}
          onClick={() => { setActiveTab("sucursales"); setShowProductForm(false); }}
        >
          Sucursales
        </button>
      </div>

      {loading && <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded">Cargando...</div>}
      {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {activeTab === "productos" && (
          <>
            {!showProductForm ? (
              <>
                <div className="flex justify-between items-center p-4 border-b">
                  <h2 className="text-xl font-semibold">Lista de Productos</h2>
                  <button
                    onClick={handleAddNewProduct}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
                  >
                    <FiPlus className="mr-2" />
                    Agregar Producto
                  </button>
                </div>

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
                  onEdit={handleEditProduct}
                  categorias={categorias}
                  sucursales={sucursales}
                />
              </>
            ) : (
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

const ProductosTab = ({ productos, onDelete, onEdit, categorias, sucursales }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
          {sucursales.map(sucursal => (
            <th key={sucursal.sucursal_id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Stock ({sucursal.nombre})
            </th>
          ))}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {productos.length === 0 ? (
          <tr>
            <td colSpan={4 + sucursales.length} className="px-6 py-4 text-center text-gray-500">
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
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {categorias.find(cat => cat.id === producto.categoria_id)?.nombre || 'N/A'}
              </td>
              {sucursales.map(sucursal => {
                const stock = producto.stock_por_sucursal?.find(s => s.sucursal_id === sucursal.sucursal_id);
                return (
                  <td key={`${producto.id}-${sucursal.sucursal_id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stock ? stock.stock_cantidad : 0}
                  </td>
                );
              })}
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  onClick={() => onEdit(producto)}
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