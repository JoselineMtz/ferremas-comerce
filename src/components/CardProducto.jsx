import React, { useState } from 'react';

const CardProducto = ({ producto, agregarAlCarrito }) => {
  const [cantidad, setCantidad] = useState(1); // Estado para la cantidad

  // Función auxiliar para formatear a moneda chilena (CLP)
  const formatCurrencyCLP = (amount) => {
    // Asegurarse de que el monto sea un número
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
      return 'N/A'; // O un valor por defecto si no es un número válido
    }
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0, // Mínimo de decimales (0 para enteros chilenos)
      maximumFractionDigits: 0, // Máximo de decimales (0 para enteros chilenos)
    }).format(numericAmount);
  };

  const handleCantidadChange = (e) => {
    const value = parseInt(e.target.value);
    // Asegurarse de que la cantidad no sea menor que 1
    setCantidad(value > 0 ? value : 1);
  };

  const handleAgregarClick = () => {
    agregarAlCarrito(producto, cantidad); // Pasa el producto y la cantidad
    setCantidad(1); // Reiniciar el contador a 1 después de agregar al carrito
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden flex flex-col">
      <img
        src={producto.imagen_url || `https://placehold.co/150x150/E0E0E0/333333?text=${producto.titulo}`}
        alt={producto.titulo}
        className="w-full h-48 object-cover"
        onError={(e) => { e.target.onerror = null; e.target.src=`https://placehold.co/150x150/E0E0E0/333333?text=Error`; }}
      />
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold mb-1">{producto.titulo}</h3>
        <p className="text-sm text-gray-600 mb-2 flex-grow">{producto.descripcion}</p>
        <p className="font-bold text-blue-600 mb-3">{formatCurrencyCLP(producto.precio)}</p>
        
        {/* Contador de Cantidad */}
        <div className="mb-3 flex items-center">
          <label htmlFor={`cantidad-${producto.id}`} className="text-sm font-medium text-gray-700 mr-2">Cantidad:</label>
          <input
            id={`cantidad-${producto.id}`}
            type="number"
            min="1"
            value={cantidad}
            onChange={handleCantidadChange}
            className="w-20 px-2 py-1 border border-gray-300 rounded-md text-center"
          />
        </div>

        <button
          onClick={handleAgregarClick}
          className="mt-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors duration-200"
          disabled={producto.stock <= 0} // Deshabilitar si no hay stock
        >
          {producto.stock > 0 ? 'Agregar al carrito' : 'Sin stock'}
        </button>
        {producto.stock <= 5 && producto.stock > 0 && (
          <p className="text-xs text-red-500 mt-1">¡Pocas unidades! Quedan {producto.stock}.</p>
        )}
        {producto.stock === 0 && (
          <p className="text-xs text-red-700 mt-1">Producto agotado.</p>
        )}
      </div>
    </div>
  );
};

export default CardProducto;
