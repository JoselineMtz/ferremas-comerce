import React, { Component } from 'react';

// Componente de Error Boundary
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }; // Actualiza el estado para mostrar el UI de fallback
  }

  componentDidCatch(error, info) {
    this.setState({ error, info }); // Guarda detalles del error
    console.log("Error:", error);
    console.log("Info:", info);
  }

  render() {
    if (this.state.hasError) {
      // Puedes personalizar este UI con un mensaje de error o redirigir
      return <h1>Algo salió mal. Inténtalo de nuevo más tarde.</h1>;
    }

    return this.props.children; // Renderiza los componentes hijos si no hay error
  }
}

export default ErrorBoundary;
