import React, { useState } from 'react';
import CardProducto from './components/CardProducto'; // Asegúrate de que el path sea correcto
import Navbar from './components/Navbar';
import './app.css';

const ClienteVista = () => {
  // Datos ficticios para los productos
  const productosFicticios = [
    {
      id: 1,
      nombre: 'Producto 1',
      imagen: 'https://via.placeholder.com/150',
      descripcion: 'Descripción del producto 1',
      precio: 100
    },
    {
      id: 2,
      nombre: 'Producto 2',
      imagen: 'https://via.placeholder.com/150',
      descripcion: 'Descripción del producto 2',
      precio: 150
    },
    {
      id: 3,
      nombre: 'Producto 3',
      imagen: 'https://via.placeholder.com/150',
      descripcion: 'Descripción del producto 3',
      precio: 200
    },
    {
      id: 4,
      nombre: 'Producto 4',
      imagen: 'https://via.placeholder.com/150',
      descripcion: 'Descripción del producto 4',
      precio: 250
    },
    {
      id: 5,
      nombre: 'Producto 5',
      imagen: 'https://via.placeholder.com/150',
      descripcion: 'Descripción del producto 5',
      precio: 300
    },
  ];

  const [productos, setProductos] = useState(productosFicticios);
  const [carrito, setCarrito] = useState([]);
  const [menuCarrito, setMenuCarrito] = useState(false);

  // Función para agregar productos al carrito
  const agregarAlCarrito = (producto) => {
    setCarrito([...carrito, producto]);
  };

  // Función para abrir/cerrar el menú del carrito
  const toggleCarritoMenu = () => {
    setMenuCarrito(!menuCarrito);
  };

  const botonesNavbar = ['Ferretería', 'Electricidad', 'Herramientas', 'Materiales', 'Sanitarios'];

  return (
    <div className="bg-white text-gray-800">
      {/* Navbar */}
      <Navbar botones={botonesNavbar} toggleCarritoMenu={toggleCarritoMenu} />

      {/* Carrito de compras desplegable */}
      {menuCarrito && (
        <div className="absolute top-16 right-4 bg-white shadow-lg p-4 w-64 z-50">
          <h4 className="font-bold mb-2">Carrito de Compras</h4>
          {carrito.length === 0 ? (
            <p>No hay productos en el carrito.</p>
          ) : (
            carrito.map((item, index) => (
              <div key={index} className="mb-2">
                <p>{item.nombre} - ${item.precio}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Catálogo de productos */}
      <div className="container mx-auto py-6">
        <h2 className="text-2xl font-semibold mb-6">Catálogo de Productos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {productos.map((producto) => (
            <CardProducto key={producto.id} producto={producto} agregarAlCarrito={agregarAlCarrito} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClienteVista;
