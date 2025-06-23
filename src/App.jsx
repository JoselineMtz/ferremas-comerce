import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import ClienteVista from "./ClienteVista";
import Login from "./Login";
import Registro from "./Registro";
import CambiarPassword from "./CambiarPassword";
import VistaAdmin from "./VistaAdmin";
import AgregarProducto from "./AgregarProducto"; // CORREGIDO: Asume que AgregarProducto.jsx está directamente en src/
import AgregarEmpleado from "./AgregarEmpleado";
import LayoutAdmin from "./components/LayoutAdmin"; 
import GestionEmpleados from "./components/GestionEmpleados"; 
import VendedorPanel from "./VendedorPanel";
import LayoutVendedor from "./components/LayoutVendedor"; 
import MisVentasVendedor from "./components/MisVentasVendedor"; 
import BodegueroPanel from "./components/BodegueroPanel"; 
import LayoutBodeguero from "./components/LayoutBodeguero"; 
import ErrorBoundary from './ErrorBoundary';
import ConfirmacionPedido from './ConfirmacionPedido';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Rutas públicas */}
            <Route path="/" element={<ClienteVista />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/cliente" element={<ClienteVista />} />
            <Route path="/cambiar-password" element={<CambiarPassword />} />
            {/* Ruta para la confirmación del pedido */}
            <Route path="/confirmar-pedido" element={<ConfirmacionPedido />} />

            {/* Ruta específica para el panel del vendedor con su propio layout */}
            <Route path="/vendedor-panel" element={<LayoutVendedor />}>
              <Route index element={<VendedorPanel />} />
              <Route path="mis-ventas" element={<MisVentasVendedor />} />
            </Route>

            {/* NUEVA RUTA: Panel del Bodeguero con su propio layout */}
            <Route path="/bodeguero-panel" element={<LayoutBodeguero />}>
              <Route index element={<BodegueroPanel />} />
              {/* Puedes añadir más rutas específicas del bodeguero aquí */}
              <Route path="historial-pedidos" element={<div>Historial de Pedidos del Bodeguero aquí</div>} />
            </Route>

            {/* Rutas administrativas con layout común */}
            <Route path="/admin" element={<LayoutAdmin />}>
              <Route index element={<VistaAdmin />} />
              <Route path="agregar-empleado" element={<AgregarEmpleado />} />
              <Route path="agregar-producto" element={<AgregarProducto />} /> 
              <Route path="empleados" element={<GestionEmpleados />} /> 
              {/* Otras rutas administrativas anidadas aquí */}
            </Route>

            {/* Ruta de respaldo para errores 404 */}
            <Route path="*" element={<div>Página no encontrada</div>} />
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
