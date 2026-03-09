/**
 * Aplicação Principal - App.jsx
 * Setup de rotas e provider
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CreditoPage from './pages/CreditoPage';
import './styles/CreditoForm.css';
import './pages/CreditoPage.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Rota principal */}
        <Route path="/credito" element={<CreditoPage />} />
        <Route path="/" element={<CreditoPage />} />

        {/* 404 */}
        <Route path="*" element={
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            flexDirection: 'column'
          }}>
            <h1>404 - Página não encontrada</h1>
            <p>Acesse: <code>/?cliente_id=1</code></p>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
