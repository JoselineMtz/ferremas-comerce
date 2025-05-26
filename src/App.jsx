import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import ClienteVista from "./ClienteVista";
import Login from "./Login"; // Asegúrate de tener un componente Login
import Registro from "./Registro";
import CambiarPassword from "./CambiarPassword";
import VistaAdmin from "./VistaAdmin";
import AgregarProducto from "./AgregarProducto";
import ErrorBoundary from './ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>  {/* Mueve AuthProvider dentro de Router */}
          <Routes>
            <Route path="/" element={<ClienteVista />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/cliente" element={<ClienteVista />} />
            <Route path="/cambiar-password" element={<CambiarPassword />} />
            <Route path="/admin" element={<VistaAdmin />} />
            <Route path="/admin" element={<VistaAdmin />} />
            <Route path="/agregarproducto" element={<AgregarProducto />} />
            

            

          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
