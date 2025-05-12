// CardProducto.jsx
import React from 'react';

const CardProducto = ({ producto, agregarAlCarrito }) => {
  return (
    <div className="border border-gray-300 rounded-lg shadow-lg p-4">
      <img src={producto.imagen} alt={producto.titulo} className="w-full h-48 object-cover rounded-md" />
      <div className="mt-4">
        <h3 className="text-lg font-semibold">{producto.titulo}</h3>
        <p className="text-gray-600 mt-2">{producto.descripcion}</p>
        <div className="flex justify-between items-center mt-4">
          <p className="text-xl font-bold">${producto.precio}</p>
          <button
            onClick={() => agregarAlCarrito(producto)}
            className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
          >
            Agregar al Carrito
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardProducto;
