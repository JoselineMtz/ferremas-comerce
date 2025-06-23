import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiSave, FiX, FiRefreshCcw } from 'react-icons/fi'; // Iconos para guardar y cerrar
import { useNavigate } from 'react-router-dom'; // Importar useNavigate

// Componente actualizado para manejar tanto la adición como la edición de productos
const AgregarProducto = ({ productToEdit, onProductSaved, onCloseForm }) => {
  const navigate = useNavigate(); // Inicializar useNavigate

  const [formulario, setFormulario] = useState({
    sku: '',
    titulo: '',
    descripcion: '',
    precio: '',
    stock: '0',
    categoria_id: '',
    imagen: null,
  });

  const [categorias, setCategorias] = useState([]);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(Date.now()); // Para resetear el input de archivo
  const [isEditMode, setIsEditMode] = useState(false); // Nuevo estado para controlar el modo edición
  const [currentImagePreview, setCurrentImagePreview] = useState(null); // Para mostrar la imagen actual en modo edición

  // Cargar categorías al cargar el componente
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const response = await axios.get('http://localhost:5003/api/categorias');
        setCategorias(response.data);
      } catch (error) {
        console.error('Error al obtener las categorías', error);
        mostrarMensaje('danger', 'Error al obtener las categorías. Intente recargar la página.');
      }
    };

    fetchCategorias();
  }, []);

  // Efecto para pre-llenar el formulario si se está editando un producto
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
        stock: productToEdit.stock !== undefined ? String(productToEdit.stock) : '0',
        categoria_id: productToEdit.categoria_id || '',
        imagen: null, 
      };
      console.log("[AgregarProducto] Modo edición. Seteando formulario a:", newFormState);
      setFormulario(newFormState);
      setCurrentImagePreview(productToEdit.imagen_url);
    } else {
      console.log("[AgregarProducto] Modo agregar. Reseteando formulario.");
      setIsEditMode(false);
      resetFormulario(); 
    }
  }, [productToEdit]); // Se ejecuta cuando productToEdit cambia

  // Función para mostrar mensajes (ya existente)
  const mostrarMensaje = (tipo, texto, tiempo = 5000) => {
    setMensaje({ tipo, texto });
    if (tiempo) {
      setTimeout(() => setMensaje({ tipo: '', texto: '' }), tiempo);
    }
  };

  // Manejar cambios en los inputs (ya existente)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormulario(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manejar cambio de imagen (ya existente, con mejora para previsualización)
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    
    if (file) {
      const tiposPermitidos = ['image/jpeg', 'image/png', 'image/gif'];
      if (!tiposPermitidos.includes(file.type)) {
        mostrarMensaje('danger', 'Solo se permiten imágenes (JPEG, PNG, GIF)');
        e.target.value = null; // Limpiar el input de archivo
        setFormulario(prev => ({ ...prev, imagen: null }));
        setCurrentImagePreview(productToEdit?.imagen_url || null); // Volver a la preview original si existía
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        mostrarMensaje('danger', 'La imagen no debe superar los 5MB');
        e.target.value = null; // Limpiar el input de archivo
        setFormulario(prev => ({ ...prev, imagen: null }));
        setCurrentImagePreview(productToEdit?.imagen_url || null); // Volver a la preview original si existía
        return;
      }
      
      setFormulario(prev => ({
        ...prev,
        imagen: file
      }));
      // Crear URL de previsualización para la nueva imagen seleccionada
      setCurrentImagePreview(URL.createObjectURL(file));
    } else {
      setFormulario(prev => ({ ...prev, imagen: null }));
      // Si se deselecciona, volver a la imagen original si estaba en modo edición
      setCurrentImagePreview(productToEdit?.imagen_url || null); 
    }
  };

  // Validar formulario (ya existente)
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
    if (isNaN(formulario.stock) || parseInt(formulario.stock) < 0) {
      mostrarMensaje('danger', 'El stock debe ser un número válido mayor o igual a 0');
      return false;
    }
    if (!formulario.categoria_id) {
      mostrarMensaje('danger', 'Debe seleccionar una categoría');
      return false;
    }
    return true;
  };

  // Enviar formulario (MODIFICADO para Add/Edit)
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
    formData.append('stock', parseInt(formulario.stock));
    formData.append('categoria_id', parseInt(formulario.categoria_id));
    
    if (formulario.imagen) {
      formData.append('imagen', formulario.imagen);
    }

    try {
      let response;
      if (isEditMode) {
        // Enviar PATCH o PUT para actualizar el producto
        console.log("[AgregarProducto] Enviando PUT para actualizar producto ID:", formulario.id, "con datos:", Object.fromEntries(formData.entries()));
        response = await axios.put(`http://localhost:5003/api/productos/${formulario.id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        mostrarMensaje('success', 'Producto actualizado correctamente!');
      } else {
        // Enviar POST para crear un nuevo producto
        console.log("[AgregarProducto] Enviando POST para agregar nuevo producto con datos:", Object.fromEntries(formData.entries()));
        response = await axios.post('http://localhost:5003/api/productos', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        mostrarMensaje('success', 'Producto agregado correctamente!');
      }
      
      // Llamar al callback para notificar al componente padre
      onProductSaved?.(response.data); 

      resetFormulario();
      
    } catch (error) {
      console.error('Error al guardar producto:', error);
      
      let errorMsg = 'Error al guardar el producto';
      if (error.response) {
        if (error.response.data.message) { // Priorizar 'message' del backend
          errorMsg = error.response.data.message;
        } else if (error.response.data.error) {
          errorMsg = error.response.data.error;
        }
      }
      
      mostrarMensaje('danger', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para resetear todo el formulario
  const resetFormulario = () => {
    setFormulario({
      sku: '',
      titulo: '',
      descripcion: '',
      precio: '',
      stock: '0',
      categoria_id: '',
      imagen: null,
    });
    // Forzar la recreación del input de archivo para limpiarlo visualmente
    setTimeout(() => setFileInputKey(Date.now()), 0); 
    setCurrentImagePreview(null);
    setMensaje({ tipo: '', texto: '' }); // Limpiar mensajes
    setIsEditMode(false); // Asegurar que el modo edición se desactive
  };

  // Eliminar imagen seleccionada (también resetea la key del input)
  const quitarImagen = () => {
    setFormulario(prev => ({ ...prev, imagen: null }));
    setTimeout(() => setFileInputKey(Date.now()), 0);
    setCurrentImagePreview(null); // Limpiar la previsualización
  };

  return (
    <div className="container px-4 py-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          {isEditMode ? 'Editar Producto' : 'Agregar Nuevo Producto'}
        </h2>
        <button
          onClick={() => { 
            console.log("[AgregarProducto] Clic en botón 'Cerrar formulario'.");
            if (onCloseForm) { // Verificar si la prop onCloseForm existe
              console.log("[AgregarProducto] Llamando a onCloseForm (prop).");
              onCloseForm(); 
            } else {
              console.log("[AgregarProducto] onCloseForm no definido, navegando a /admin.");
              navigate('/admin'); // Navegar de vuelta al panel de admin
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
            {/* SKU no debería cambiarse en edición si es clave única */}
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

          {/* Stock */}
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Stock <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              name="stock"
              value={formulario.stock}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Categoría */}
          <div className="col-span-2">
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
            onClick={resetFormulario} // Botón para resetear el formulario (vaciar campos)
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
    </div>
  );
};

export default AgregarProducto;
