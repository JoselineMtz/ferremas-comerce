import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiSave, FiX, FiRefreshCcw, FiPackage } from 'react-icons/fi'; // Añadido FiPackage para stock
import { useNavigate } from 'react-router-dom';

const AgregarProducto = ({ productToEdit, onProductSaved, onCloseForm }) => {
  const navigate = useNavigate();

  const [formulario, setFormulario] = useState({
    sku: '',
    titulo: '',
    descripcion: '',
    precio: '',
    categoria_id: '',
    imagen: null,
  });

  const [categorias, setCategorias] = useState([]);
  const [sucursales, setSucursales] = useState([]); // Nuevo estado para sucursales
  // Almacena el stock de este producto por cada sucursal
  const [productStockPerBranch, setProductStockPerBranch] = useState({}); 
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingStock, setIsUpdatingStock] = useState(false); // Nuevo estado para la actualización de stock
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentImagePreview, setCurrentImagePreview] = useState(null);
  const [currentImageObjectURL, setCurrentImageObjectURL] = useState(null); // Para revocar URL.createObjectURL

  // Cargar categorías y sucursales al cargar el componente
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriasRes, sucursalesRes] = await Promise.all([
          axios.get('http://localhost:5003/api/categorias'),
          axios.get('http://localhost:5003/api/sucursales') // Cargar sucursales
        ]);
        setCategorias(categoriasRes.data);
        setSucursales(sucursalesRes.data);
      } catch (error) {
        console.error('Error al obtener datos iniciales (categorías/sucursales)', error);
        mostrarMensaje('danger', 'Error al obtener datos. Intente recargar la página.');
      }
    };
    fetchData();
  }, []);

  // Efecto para inicializar el stock por sucursal cuando las sucursales se cargan
  // o cuando se cambia entre modo edición y agregar.
  useEffect(() => {
    if (sucursales.length > 0 && !isEditMode) {
      // Si estamos en modo "agregar nuevo producto" y las sucursales ya cargaron,
      // inicializamos el stock de todas las sucursales a 0.
      const initialStockMap = sucursales.reduce((acc, sucursal) => {
          // Si ya hay un valor para esta sucursal (ej. por un reset), úsalo, sino 0.
          acc[sucursal.sucursal_id] = productStockPerBranch[sucursal.sucursal_id] !== undefined 
                                      ? productStockPerBranch[sucursal.sucursal_id] 
                                      : 0;
          return acc;
      }, {});
      setProductStockPerBranch(initialStockMap);
      console.log("Stock por sucursal inicializado/asegurado para nuevo producto:", initialStockMap);
    }
  }, [sucursales, isEditMode]); // Depende de sucursales y de isEditMode

  // Efecto para pre-llenar el formulario y cargar stock por sucursal si se está editando un producto
  useEffect(() => {
    console.log("[AgregarProducto] useEffect [productToEdit] disparado. productToEdit:", productToEdit);
    if (productToEdit) {
      setIsEditMode(true);
      const newFormState = {
        id: productToEdit.id, 
        sku: productToEdit.sku || '',
        titulo: productToEdit.titulo || '',
        descripcion: productToEdit.descripcion || '',
        precio: productToEdit.precio ? parseFloat(productToEdit.precio).toFixed(2) : '',
        categoria_id: productToEdit.categoria_id || '',
        imagen: null, 
      };
      console.log("[AgregarProducto] Modo edición. Seteando formulario a:", newFormState);
      setFormulario(newFormState);
      setCurrentImagePreview(productToEdit.imagen_url); // Esto es una URL directa, no un ObjectURL
      
      // Limpiar cualquier ObjectURL previo si se cambia a modo edición
      if (currentImageObjectURL) {
        URL.revokeObjectURL(currentImageObjectURL);
        setCurrentImageObjectURL(null);
      }

      // Cargar stock por sucursal para el producto en edición
      const fetchProductStock = async () => {
        try {
          const response = await axios.get(`http://localhost:5003/api/productos/${productToEdit.id}/stock-por-sucursal`);
          // Mapear la respuesta a un objeto para fácil acceso por sucursal_id
          const stockMap = response.data.reduce((acc, item) => {
            acc[item.sucursal_id] = item.stock_cantidad;
            return acc;
          }, {});
          setProductStockPerBranch(stockMap);
          console.log("Stock por sucursal cargado para edición:", stockMap);
        } catch (error) {
          console.error('Error al obtener stock por sucursal del producto:', error);
          mostrarMensaje('danger', 'Error al cargar el stock por sucursal.');
        }
      };
      fetchProductStock();

    } else {
      console.log("[AgregarProducto] Modo agregar. Reseteando formulario.");
      setIsEditMode(false);
      resetFormulario(); 
      // La inicialización del stock para el nuevo producto se maneja en el useEffect separado.
    }
  }, [productToEdit]); // Depende solo de productToEdit para esta lógica.

  // Efecto para revocar el ObjectURL cuando el componente se desmonta o el ObjectURL cambia
  useEffect(() => {
    return () => {
      if (currentImageObjectURL) {
        URL.revokeObjectURL(currentImageObjectURL);
        console.log("ObjectURL revocado:", currentImageObjectURL);
      }
    };
  }, [currentImageObjectURL]);

  const mostrarMensaje = (tipo, texto, tiempo = 5000) => {
    setMensaje({ tipo, texto });
    if (tiempo) {
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), tiempo);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormulario(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manejar cambio de stock para una sucursal específica
  const handleStockChange = (sucursalId, value) => {
    setProductStockPerBranch(prev => ({
      ...prev,
      [sucursalId]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    
    // Revocar el ObjectURL previo si existe
    if (currentImageObjectURL) {
      URL.revokeObjectURL(currentImageObjectURL);
      setCurrentImageObjectURL(null);
    }

    if (file) {
      const tiposPermitidos = ['image/jpeg', 'image/png', 'image/gif'];
      if (!tiposPermitidos.includes(file.type)) {
        mostrarMensaje('danger', 'Solo se permiten imágenes (JPEG, PNG, GIF)');
        e.target.value = null; // Limpiar input de archivo
        setFormulario(prev => ({ ...prev, imagen: null }));
        setCurrentImagePreview(productToEdit?.imagen_url || null); // Volver a la imagen original o null
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        mostrarMensaje('danger', 'La imagen no debe superar los 5MB');
        e.target.value = null; // Limpiar input de archivo
        setFormulario(prev => ({ ...prev, imagen: null }));
        setCurrentImagePreview(productToEdit?.imagen_url || null); // Volver a la imagen original o null
        return;
      }
      
      setFormulario(prev => ({
        ...prev,
        imagen: file
      }));
      
      // Intentar crear el Object URL y manejar posibles errores
      try {
        console.log("Intentando crear Object URL para el archivo:", file);
        const newObjectURL = URL.createObjectURL(file);
        setCurrentImageObjectURL(newObjectURL); // Almacenar para revocar
        setCurrentImagePreview(newObjectURL); // Mostrar la previsualización
      } catch (error) {
        console.error("Error al crear Object URL para la imagen:", error);
        mostrarMensaje('danger', 'Error al previsualizar la imagen. Intente con otra o un formato diferente.');
        // Asegurarse de que el estado de la imagen y la previsualización se limpien en caso de error
        setFormulario(prev => ({ ...prev, imagen: null }));
        e.target.value = null; 
        setCurrentImagePreview(productToEdit?.imagen_url || null);
      }

    } else {
      setFormulario(prev => ({ ...prev, imagen: null }));
      setCurrentImagePreview(productToEdit?.imagen_url || null); 
    }
  };

  const validarFormulario = () => {
    if (!formulario.sku.trim()) {
      mostrarMensaje('danger', 'El SKU es obligatorio');
      return false;
    }
    if (!formulario.titulo.trim()) {
      mostrarMensaje('danger', 'El título es obligatorio');
      return false;
    }
    if (!formulario.precio || isNaN(formulario.precio) || parseFloat(formulario.precio) <= 0) {
      mostrarMensaje('danger', 'El precio debe ser un número válido mayor a 0');
      return false;
    }
    if (!formulario.categoria_id) {
      mostrarMensaje('danger', 'Debe seleccionar una categoría');
      return false;
    }
    // Validar stock de cada sucursal
    for (const sucursal of sucursales) {
      const stockValue = productStockPerBranch[sucursal.sucursal_id];
      // Permite string vacío si se convierte a 0, pero no otros no-numéricos
      if (stockValue === undefined || isNaN(parseInt(stockValue)) || parseInt(stockValue) < 0) {
        mostrarMensaje('danger', `El stock para la sucursal "${sucursal.nombre}" debe ser un número válido mayor o igual a 0.`);
        return false;
      }
    }
    return true;
  };

  // Función refactorizada para actualizar stock en sucursales
  const updateStockForProductInBranches = async (productId, stockData) => {
    let successCount = 0;
    let errorCount = 0;
    for (const sucursal of sucursales) {
      const sucursalId = sucursal.sucursal_id;
      const stockValue = parseInt(stockData[sucursalId]); // Asegura que sea un entero

      // Ya validado en validarFormulario, pero se mantiene aquí como doble seguridad
      if (isNaN(stockValue) || stockValue < 0) {
        console.warn(`Stock inválido para sucursal ${sucursal.nombre} (${sucursalId}): ${stockData[sucursalId]}. Saltando actualización.`);
        errorCount++;
        continue;
      }

      try {
        await axios.patch(`http://localhost:5003/api/productos/${productId}/sucursal/${sucursalId}/stock`, {
          stock_cantidad: stockValue
        });
        successCount++;
      } catch (error) {
        console.error(`Error al actualizar stock para sucursal ${sucursal.nombre} (${sucursalId}):`, error);
        errorCount++;
      }
    }
    return { successCount, errorCount };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (!validarFormulario()) {
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append('sku', formulario.sku.trim());
    formData.append('titulo', formulario.titulo.trim());
    formData.append('descripcion', formulario.descripcion.trim());
    formData.append('precio', parseFloat(formulario.precio).toFixed(2)); 
    formData.append('categoria_id', parseInt(formulario.categoria_id));
    
    if (formulario.imagen) {
      formData.append('imagen', formulario.imagen);
    }

    try {
      let response;
      let productIdToUpdateStock = formulario.id; // Para modo edición

      if (isEditMode) {
        console.log("[AgregarProducto] Enviando PUT para actualizar producto ID:", formulario.id, "con datos:", Object.fromEntries(formData.entries()));
        response = await axios.put(`http://localhost:5003/api/productos/${formulario.id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        mostrarMensaje('success', 'Producto actualizado correctamente!');
      } else {
        console.log("[AgregarProducto] Enviando POST para agregar nuevo producto con datos:", Object.fromEntries(formData.entries()));
        response = await axios.post('http://localhost:5003/api/productos', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        productIdToUpdateStock = response.data.id; // Obtener el ID del nuevo producto
        mostrarMensaje('success', 'Producto agregado correctamente. Guardando stock por sucursal...');
      }
      
      // Después de que el producto es creado/actualizado, actualiza su stock en las sucursales
      const { successCount, errorCount } = await updateStockForProductInBranches(productIdToUpdateStock, productStockPerBranch);

      if (isEditMode) {
         if (errorCount > 0) {
             mostrarMensaje('warning', `Producto actualizado. Hubo errores al actualizar stock en ${errorCount} sucursales.`);
         } else {
             mostrarMensaje('success', 'Producto y stock por sucursal actualizados correctamente!');
         }
      } else {
          if (errorCount > 0) {
              mostrarMensaje('warning', `Producto agregado. Hubo errores al inicializar stock en ${errorCount} sucursales.`);
          } else {
              mostrarMensaje('success', 'Producto agregado y stock por sucursal inicializado correctamente!');
          }
      }

      onProductSaved?.(response.data); 
      resetFormulario();
      
    } catch (error) {
      console.error('Error al guardar producto:', error);
      let errorMsg = 'Error al guardar el producto.';
      if (error.response) {
        // La solicitud fue hecha y el servidor respondió con un código de estado
        // que cae fuera del rango de 2xx
        if (error.response.data && error.response.data.message) {
          errorMsg = error.response.data.message;
        } else if (error.response.data && error.response.data.error) {
          errorMsg = error.response.data.error;
        } else {
          errorMsg = `Error del servidor: ${error.response.status} - ${error.response.statusText || 'Mensaje desconocido'}`;
        }
      } else if (error.request) {
        // La solicitud fue hecha pero no se recibió respuesta
        // `error.request` es una instancia de XMLHttpRequest en el navegador y una instancia de
        // http.ClientRequest en node.js
        errorMsg = 'Error de red: No se pudo conectar con el servidor. Asegúrate de que el backend esté funcionando.';
      } else {
        // Algo sucedió al configurar la solicitud que provocó un error
        errorMsg = `Error inesperado: ${error.message}`;
      }
      mostrarMensaje('danger', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Esta función ahora solo se llamará desde el botón "Actualizar Stock por Sucursal"
  // en modo edición, o si se desea una actualización manual.
  const handleManualStockUpdate = async () => {
    if (!formulario.id) {
      mostrarMensaje('danger', 'Debe seleccionar un producto existente para actualizar su stock por sucursal.');
      return;
    }
    setIsUpdatingStock(true);
    const { successCount, errorCount } = await updateStockForProductInBranches(formulario.id, productStockPerBranch);

    if (successCount > 0 && errorCount === 0) {
      mostrarMensaje('success', 'Stock por sucursal actualizado exitosamente!');
    } else if (successCount > 0 && errorCount > 0) {
      mostrarMensaje('warning', `Stock actualizado en ${successCount} sucursales, pero hubo errores en ${errorCount} sucursales.`);
    } else {
      mostrarMensaje('danger', 'No se pudo actualizar el stock en ninguna sucursal.');
    }
    setIsUpdatingStock(false);
  };

  const resetFormulario = () => {
    setFormulario({
      sku: '',
      titulo: '',
      descripcion: '',
      precio: '',
      categoria_id: '',
      imagen: null,
    });
    setProductStockPerBranch({}); // Limpiar stock por sucursal
    setTimeout(() => setFileInputKey(Date.now()), 0); 
    setCurrentImagePreview(null);
    // Revocar ObjectURL al resetear el formulario
    if (currentImageObjectURL) {
      URL.revokeObjectURL(currentImageObjectURL);
      setCurrentImageObjectURL(null);
    }
    setMensaje({ tipo: '', texto: '' });
    setIsEditMode(false);
  };

  const quitarImagen = () => {
    setFormulario(prev => ({ ...prev, imagen: null }));
    setTimeout(() => setFileInputKey(Date.now()), 0);
    setCurrentImagePreview(null);
    // Revocar ObjectURL cuando la imagen es quitada
    if (currentImageObjectURL) {
      URL.revokeObjectURL(currentImageObjectURL);
      setCurrentImageObjectURL(null);
    }
  };

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          {isEditMode ? 'Editar Producto' : 'Agregar Nuevo Producto'}
        </h2>
        <button
          onClick={() => { 
            if (onCloseForm) {
              onCloseForm(); 
            } else {
              navigate('/admin');
            }
          }} 
          className="text-gray-500 hover:text-gray-700"
          title="Cerrar formulario"
        >
          <FiX size={24} />
        </button>
      </div>

      {mensaje.texto && (
        <div className={`mb-4 p-3 rounded ${mensaje.tipo === 'success' 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : mensaje.tipo === 'warning'
          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
          : 'bg-red-100 text-red-800 border border-red-200'}`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SKU */}
          <div className="col-span-2">
            <label className="block text-gray-700 font-medium mb-2">
              SKU <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="sku"
              value={formulario.sku}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Ej: PROD-001"
              maxLength="50"
              disabled={isEditMode} 
            />
            {isEditMode && <p className="text-sm text-gray-500 mt-1">El SKU no se puede modificar.</p>}
          </div>

          {/* Título */}
          <div className="col-span-2">
            <label className="block text-gray-700 font-medium mb-2">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="titulo"
              value={formulario.titulo}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Nombre del producto"
              maxLength="255"
            />
          </div>

          {/* Descripción */}
          <div className="col-span-2">
            <label className="block text-gray-700 font-medium mb-2">Descripción</label>
            <textarea
              name="descripcion"
              value={formulario.descripcion}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descripción detallada del producto"
            />
          </div>

          {/* Precio */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Precio <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="precio"
                value={formulario.precio}
                onChange={handleChange}
                className="w-full pl-8 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Categoría */}
          <div className="col-span-1"> {/* Ajustado a col-span-1 para que quede al lado del precio */}
            <label className="block text-gray-700 font-medium mb-2">
              Categoría <span className="text-red-500">*</span>
            </label>
            <select
              name="categoria_id"
              value={formulario.categoria_id}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecciona una categoría</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Imagen */}
          <div className="col-span-2">
            <label className="block text-gray-700 font-medium mb-2">Imagen del Producto</label>
            {currentImagePreview && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-1">Imagen actual:</p>
                <img 
                  src={currentImagePreview} 
                  alt="Previsualización" 
                  className="w-32 h-32 object-cover rounded-md border border-gray-300" 
                />
              </div>
            )}
            <div className="flex items-center">
              <label className="flex flex-col items-center px-4 py-6 bg-white text-blue-500 rounded-lg border border-blue-500 cursor-pointer hover:bg-blue-50 transition-colors">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 12V5h12v10H4zm3-5a1 1 0 11-2 0 1 1 0 012 0zm5 0a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="mt-2 text-sm text-center">
                  {formulario.imagen 
                    ? formulario.imagen.name 
                    : (isEditMode ? 'Haz clic para cambiar imagen' : 'Haz clic para seleccionar una imagen')}
                </span>
                <input 
                  type="file" 
                  key={fileInputKey}
                  name="imagen"
                  onChange={handleImageChange}
                  className="hidden"
                  accept="image/jpeg, image/png, image/gif"
                />
              </label>
              {(formulario.imagen || currentImagePreview) && (
                <button
                  type="button"
                  onClick={quitarImagen}
                  className="ml-4 text-red-500 hover:text-red-700 transition-colors flex items-center"
                >
                  <FiX className="mr-1" /> Quitar imagen
                </button>
              )}
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {formulario.imagen && (
                <div className="mb-1">
                  Tamaño: {(formulario.imagen.size / 1024).toFixed(2)} KB
                </div>
              )}
              <p>Tamaño máximo: 5MB. Formatos: JPG, PNG, GIF</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={resetFormulario}
            className="px-6 py-2 rounded-md text-gray-700 font-medium bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors flex items-center"
          >
            <FiRefreshCcw className="mr-2" />
            Reiniciar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2 rounded-md text-white font-medium ${
              isSubmitting 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </>
            ) : (
              <>
                <FiSave className="mr-2" />
                {isEditMode ? 'Actualizar Producto' : 'Agregar Producto'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Sección para actualizar stock por sucursal (siempre visible) */}
      <div className="bg-white p-6 rounded-lg shadow-md mt-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <FiPackage className="mr-2" /> Stock por Sucursal
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {isEditMode 
            ? 'Actualiza la cantidad de stock de este producto para cada sucursal.'
            : 'Establece la cantidad de stock inicial para este producto en cada sucursal.'
          }
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sucursales.length > 0 ? (
            sucursales.map(sucursal => (
              <div key={sucursal.sucursal_id} className="border border-gray-200 rounded-md p-4">
                <label className="block text-gray-700 font-medium mb-2">
                  {sucursal.nombre} (ID: {sucursal.sucursal_id})
                </label>
                <input
                  type="number"
                  min="0"
                  value={productStockPerBranch[sucursal.sucursal_id] || 0}
                  onChange={(e) => handleStockChange(sucursal.sucursal_id, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Cantidad de stock"
                />
              </div>
            ))
          ) : (
            <p className="col-span-full text-gray-500">No hay sucursales disponibles para gestionar el stock.</p>
          )}
        </div>
        {/* El botón de actualización manual solo es relevante en modo edición */}
        {isEditMode && (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleManualStockUpdate} // Llamada a la función de actualización manual
              disabled={isUpdatingStock}
              className={`px-6 py-2 rounded-md text-white font-medium ${
                isUpdatingStock 
                  ? 'bg-green-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'
              } focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex items-center`}
            >
              {isUpdatingStock ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Actualizando stock...
                </>
              ) : (
                <>
                  <FiSave className="mr-2" />
                  Actualizar Stock por Sucursal
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgregarProducto;
