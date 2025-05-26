import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AgregarProducto = () => {
  const [formulario, setFormulario] = useState({
    sku: '',
    titulo: '',
    descripcion: '',
    precio: '',
    stock: '',
    categoria_id: '',
    imagen: null,  // Agregar campo para la imagen
  });

  const [categorias, setCategorias] = useState([]);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // Obtener las categorías al cargar el componente
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const response = await axios.get('http://localhost:5003/api/categorias');
        console.log('Categorías:', response.data); // <--- Aqu
        setCategorias(response.data);
      } catch (error) {
        console.error('Error al obtener las categorías', error);
        setMensaje({ tipo: 'danger', texto: 'Error al obtener las categorías.' });
      }
    };

    fetchCategorias();
  }, []);

  const handleChange = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  // Actualizar estado para el archivo de imagen
  const handleImageChange = (e) => {
    setFormulario({ ...formulario, imagen: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('sku', formulario.sku);
    formData.append('titulo', formulario.titulo);
    formData.append('descripcion', formulario.descripcion);
    formData.append('precio', parseFloat(formulario.precio));
    formData.append('stock', parseInt(formulario.stock));
    formData.append('categoria_id', parseInt(formulario.categoria_id));
    if (formulario.imagen) {
      formData.append('imagen', formulario.imagen);
    }

    try {
      await axios.post('http://localhost:5003/api/productos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMensaje({ tipo: 'success', texto: 'Producto agregado correctamente.' });
      setFormulario({ sku: '', titulo: '', descripcion: '', precio: '', stock: '', categoria_id: '', imagen: null });
    } catch (error) {
      setMensaje({ tipo: 'danger', texto: 'Error al agregar el producto.' });
    }
  };

  return (
    <div className="container px-4 py-6">
      <h2 className="text-2xl font-semibold mb-6 text-dark-blue">Agregar Nuevo Producto</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-dark-blue font-medium mb-1">SKU</label>
          <input
            type="text"
            name="sku"
            value={formulario.sku}
            onChange={handleChange}
            className="w-full border border-dark-blue p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-dark-blue font-medium mb-1">Título</label>
          <input
            type="text"
            name="titulo"
            value={formulario.titulo}
            onChange={handleChange}
            className="w-full border border-dark-blue p-2 rounded"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-dark-blue font-medium mb-1">Descripción</label>
          <textarea
            name="descripcion"
            value={formulario.descripcion}
            onChange={handleChange}
            rows="3"
            className="w-full border border-dark-blue p-2 rounded"
          />
        </div>

        <div>
          <label className="block text-dark-blue font-medium mb-1">Precio</label>
          <input
            type="number"
            step="0.01"
            name="precio"
            value={formulario.precio}
            onChange={handleChange}
            className="w-full border border-dark-blue p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-dark-blue font-medium mb-1">Stock</label>
          <input
            type="number"
            name="stock"
            value={formulario.stock}
            onChange={handleChange}
            className="w-full border border-dark-blue p-2 rounded"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-dark-blue font-medium mb-1">Categoría</label>
          <select
            name="categoria_id"
            value={formulario.categoria_id}
            onChange={handleChange}
            className="w-full border border-dark-blue p-2 rounded"
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

        <div className="md:col-span-2">
          <label className="block text-dark-blue font-medium mb-1">Imagen</label>
          <input
            type="file"
            name="imagen"
            onChange={handleImageChange}  // Manejar el cambio de imagen
            className="w-full border border-dark-blue p-2 rounded"
          />
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button type="submit" className="hover:bg-black transition duration-200">
            Agregar Producto
          </button>
        </div>
      </form>

      {mensaje.texto && (
        <div
          className={`mt-4 p-3 rounded text-white ${
            mensaje.tipo === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {mensaje.texto}
        </div>
      )}
    </div>
  );
};

export default AgregarProducto;
