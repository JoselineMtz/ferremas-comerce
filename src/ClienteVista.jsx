import React, { useState, useEffect, useMemo } from 'react'; // Importar useMemo
import axios from 'axios';
import CardProducto from './components/CardProducto';
import Navbar from './components/Navbar';
import './app.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { FiSearch } from 'react-icons/fi'; // Importar icono de búsqueda

// Importar el carrusel y sus estilos
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css'; // Estilos del carrusel

const ClienteVista = () => {
  const [productos, setProductos] = useState([]); // Todos los productos sin filtrar
  const [categorias, setCategorias] = useState([]); 
  const [carrito, setCarrito] = useState([]);
  const [menuCarrito, setMenuCarrito] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // Estados para el buscador de productos
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('nombre');
  // Estado para la categoría seleccionada por el Navbar
  const [selectedCategoryName, setSelectedCategoryName] = useState(null);
  // Estado para controlar la visibilidad del carrusel
  const [showCarousel, setShowCarousel] = useState(true);
  // NUEVO ESTADO: Para controlar la visualización de los últimos 15 productos
  const [showLatestProducts, setShowLatestProducts] = useState(true);

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

  // Cargar todos los productos y categorías reales desde el backend al montar el componente
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const productsResponse = await axios.get('http://localhost:5003/api/productos');
        setProductos(productsResponse.data); // Guarda todos los productos
        console.log("Productos cargados:", productsResponse.data.length);

        const categoriesResponse = await axios.get('http://localhost:5003/api/categorias');
        setCategorias(categoriesResponse.data);
      } catch (error) {
        console.error('Error al cargar productos o categorías:', error);
      }
    };
    fetchInitialData();
  }, []); // Se ejecuta solo una vez al montar

  // Efecto para cargar el carrito desde localStorage
  useEffect(() => {
    try {
      const storedCarrito = localStorage.getItem('carrito');
      if (storedCarrito) {
        setCarrito(JSON.parse(storedCarrito));
      } else {
        setCarrito([]);
      }
    } catch (error) {
      console.error("Error al parsear carrito de localStorage:", error);
      localStorage.removeItem('carrito');
      setCarrito([]);
    }
  }, [isAuthenticated]);

  // Efecto para guardar el carrito en localStorage
  useEffect(() => {
    if (carrito.length > 0) {
      localStorage.setItem('carrito', JSON.stringify(carrito));
    } else {
      localStorage.removeItem('carrito'); // Eliminar si el carrito está vacío
    }
  }, [carrito]);

  // Modificación de agregarAlCarrito para manejar cantidades
  const agregarAlCarrito = (producto, cantidadAAgregar) => {
    const cantidad = Number(cantidadAAgregar);
    if (cantidad <= 0 || isNaN(cantidad)) {
      alert("Por favor, ingresa una cantidad válida (mayor a 0).");
      return;
    }

    const productoEnCatalogo = productos.find(p => p.id === producto.id);
    if (!productoEnCatalogo || productoEnCatalogo.stock < cantidad) {
      alert(`Stock insuficiente para "${producto.titulo}". Disponible: ${productoEnCatalogo?.stock || 0}`);
      return;
    }

    const productoExistenteIndex = carrito.findIndex(item => item.id === producto.id);

    if (productoExistenteIndex !== -1) {
      const carritoActualizado = carrito.map((item, index) => {
        if (index === productoExistenteIndex) {
          const nuevaCantidadEnCarrito = item.cantidad + cantidad;
          if (productoEnCatalogo.stock < nuevaCantidadEnCarrito) {
            alert(`No se puede agregar más. Stock máximo para "${producto.titulo}" alcanzado. Stock total: ${productoEnCatalogo.stock}`);
            return item;
          }
          return { ...item, cantidad: nuevaCantidadEnCarrito };
        }
        return item;
      });
      setCarrito(carritoActualizado);
    } else {
      setCarrito([...carrito, { ...producto, cantidad: cantidad }]);
    }
    alert(`"${producto.titulo}" x ${cantidad} agregado(s) al carrito.`);
  };

  const quitarDelCarrito = (productoId) => {
    setCarrito(carrito.filter(item => item.id !== productoId));
  };

  const toggleCarritoMenu = () => {
    setMenuCarrito(!menuCarrito);
  };

  // Función para manejar el clic en el botón de pagar
  const handlePagarCarrito = () => {
    if (carrito.length === 0) {
      alert("Tu carrito está vacío. Agrega productos antes de pagar.");
      return;
    }
    if (!isAuthenticated) {
      alert("Debes iniciar sesión para completar tu compra. Tu carrito se ha guardado.");
      navigate("/login");
      return;
    }
    navigate("/confirmar-pedido", { state: { carritoItems: carrito } });
    setMenuCarrito(false);
  };

  // Manejador para el clic en las categorías del Navbar
  const handleCategoryClick = (categoryName) => {
    setSelectedCategoryName(categoryName);
    setSearchTerm('');
    setShowCarousel(false); // Ocultar carrusel al seleccionar categoría
    setShowLatestProducts(false); // Ocultar últimos 15 al seleccionar categoría
  };

  // NUEVA FUNCIÓN: Manejador para el clic en el logo del Navbar
  const handleLogoClick = () => {
    setSelectedCategoryName(null); // Limpiar filtro de categoría
    setSearchTerm(''); // Limpiar término de búsqueda
    setShowCarousel(true); // Mostrar carrusel
    setShowLatestProducts(true); // Mostrar últimos 15 productos
  };

  // Calcular el total del carrito
  const totalCarrito = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

  // === AJUSTE AQUÍ: Botones del Navbar ===
  const botonesNavbar = ['Electricidad', 'Herramientas', 'Materiales', 'Gasfitería'];

  // Lógica para filtrar y ordenar productos para la visualización
  const displayedProducts = useMemo(() => {
    let currentProducts = [...productos]; // Comenzar con todos los productos

    // Si showLatestProducts es true y no hay otros filtros activos, mostrar los últimos 15
    if (showLatestProducts && !searchTerm && !selectedCategoryName) {
      // Asumiendo que 'últimos' significa por ID descendente.
      // Si tienes un campo 'fecha_creacion' en tu DB, sería mejor ordenar por eso.
      return [...currentProducts].sort((a, b) => b.id - a.id).slice(0, 15);
    }

    // 1. Aplicar filtro por término de búsqueda
    if (searchTerm) {
      currentProducts = currentProducts.filter(producto => {
        const term = searchTerm.toLowerCase();
        if (searchBy === 'nombre') {
          return producto.titulo.toLowerCase().includes(term);
        } else if (searchBy === 'categoria') {
          const categoriaNombre = categorias.find(cat => cat.id === producto.categoria_id)?.nombre;
          return categoriaNombre ? categoriaNombre.toLowerCase().includes(term) : false;
        }
        return true;
      });
    }

    // 2. Aplicar filtro por categoría seleccionada
    if (selectedCategoryName) {
      const selectedCategoryObject = categorias.find(cat => cat.nombre === selectedCategoryName);
      if (selectedCategoryObject) {
        currentProducts = currentProducts.filter(producto => producto.categoria_id === selectedCategoryObject.id);
      } else {
        currentProducts = []; // Si la categoría no se encuentra, no hay productos
      }
    }

    return currentProducts; // Retornar productos filtrados
  }, [productos, searchTerm, searchBy, selectedCategoryName, categorias, showLatestProducts]);


  // Array de imágenes para el carrusel, usando rutas relativas a la carpeta 'public'
  const carouselImages = [
    { src: '/imagenes/PROMO1.png', alt: 'Banner Promocional 1' },
    { src: '/imagenes/PROMO2.png', alt: 'Banner Promocional 2' },
    { src: '/imagenes/PROMO3.png', alt: 'Banner Promocional 3' },
  ];

  return (
    <div className="bg-white text-gray-800 font-inter">
      <Navbar
        botones={botonesNavbar}
        toggleCarritoMenu={toggleCarritoMenu}
        onCategoryClick={handleCategoryClick}
        onLogoClick={handleLogoClick}
      />

      {/* Div espaciador para asegurar espacio debajo del Navbar */}
      <div className="h-36 w-full"></div>

      {menuCarrito && (
        <div className="absolute top-16 right-4 bg-white shadow-lg p-4 w-64 z-50 rounded-lg">
          <h4 className="font-bold mb-2">Carrito de Compras</h4>
          {carrito.length === 0 ? (
            <p>No hay productos en el carrito.</p>
          ) : (
            <>
              {carrito.map((item) => (
                <div key={item.id} className="mb-2 border-b border-gray-200 pb-1 last:border-b-0 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{item.titulo} x {item.cantidad}</p>
                    <p className="text-xs text-gray-600">{formatCurrencyCLP(item.precio * item.cantidad)}</p>
                  </div>
                  <button 
                    onClick={() => quitarDelCarrito(item.id)}
                    className="text-red-500 hover:text-red-700 text-sm ml-2"
                    title="Quitar del carrito"
                  >
                    X
                  </button>
                </div>
              ))}
              <div className="font-bold text-lg mt-4 text-right">
                Total: {formatCurrencyCLP(totalCarrito)}
              </div>
              <button
                onClick={handlePagarCarrito}
                className="mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Pagar
              </button>
            </>
          )}
        </div>
      )}

      {/* Carrusel de Banners (RENDERIZADO CONDICIONALMENTE) */}
      {showCarousel && (
        <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8"> 
          <Carousel
            showArrows={true}
            infiniteLoop={true}
            autoPlay={true}
            interval={5000}
            showThumbs={false}
            showStatus={false}
            className="rounded-lg overflow-hidden shadow-lg"
          >
            {carouselImages.map((image, index) => (
              <div key={index}>
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-auto object-cover rounded-lg"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://placehold.co/1200x400/CCCCCC/333333?text=Error+Cargando+Banner`;
                    console.error(`Error al cargar la imagen: ${image.src}`);
                  }}
                />
              </div>
            ))}
          </Carousel>
        </div>
      )}
      {/* Fin del Carrusel */}

      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold mb-6">Catálogo de Productos</h2>
        
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
                <option value="categoria">Categoría</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Término de búsqueda:</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowLatestProducts(false); // Desactivar mostrar los últimos 15 al buscar
                }}
                placeholder={`Buscar por ${searchBy === 'nombre' ? 'nombre del producto' : 'nombre de la categoría'}...`}
                className="w-full border border-gray-300 rounded-md p-2"
              />
            </div>
          </div>
          {/* Se eliminó el botón "Mostrar Todos los Productos (y últimos 15)" */}
        </div>
        {/* Fin de Sección de Buscador */}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayedProducts.length > 0 ? (
            displayedProducts.map((producto) => (
              <CardProducto key={producto.id} producto={producto} agregarAlCarrito={agregarAlCarrito} />
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500">
              No se encontraron productos que coincidan con su búsqueda o categoría seleccionada.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClienteVista;
