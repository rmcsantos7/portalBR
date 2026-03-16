/**
 * Aplicação Principal - App.jsx
 * Setup de rotas com autenticação e layout
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import EsqueciSenhaPage from './pages/EsqueciSenhaPage';
import TrocarSenhaPage from './pages/TrocarSenhaPage';
import DashboardPage from './pages/DashboardPage';
import CreditoPage from './pages/CreditoPage';
import ColaboradoresPage from './pages/ColaboradoresPage';
import RelatoriosPage from './pages/RelatoriosPage';
import AlterarSenhaPage from './pages/AlterarSenhaPage';

// Rota protegida - redireciona para login se não autenticado
// Se senha temporária, redireciona para trocar senha
function RotaProtegida({ children }) {
  const { autenticado, carregando, senhaTemporaria } = useAuth();
  if (carregando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: '#888' }}>
        Carregando...
      </div>
    );
  }
  if (!autenticado) return <Navigate to="/login" replace />;
  if (senhaTemporaria) return <Navigate to="/trocar-senha" replace />;
  return children;
}

// Rota pública - redireciona para dashboard se já autenticado
function RotaPublica({ children }) {
  const { autenticado, carregando, senhaTemporaria } = useAuth();
  if (carregando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: '#888' }}>
        Carregando...
      </div>
    );
  }
  if (autenticado && senhaTemporaria) return <Navigate to="/trocar-senha" replace />;
  return autenticado ? <Navigate to="/dashboard" replace /> : children;
}

// Rota de troca de senha — só acessível se autenticado COM senha temporária
function RotaTrocarSenha({ children }) {
  const { autenticado, carregando, senhaTemporaria } = useAuth();
  if (carregando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: '#888' }}>
        Carregando...
      </div>
    );
  }
  if (!autenticado) return <Navigate to="/login" replace />;
  if (!senhaTemporaria) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Login */}
      <Route path="/login" element={
        <RotaPublica><LoginPage /></RotaPublica>
      } />

      {/* Esqueci minha senha */}
      <Route path="/esqueci-senha" element={
        <RotaPublica><EsqueciSenhaPage /></RotaPublica>
      } />

      {/* Trocar senha (obrigatório após senha temporária) */}
      <Route path="/trocar-senha" element={
        <RotaTrocarSenha><TrocarSenhaPage /></RotaTrocarSenha>
      } />

      {/* Rotas protegidas dentro do Layout */}
      <Route element={
        <RotaProtegida><Layout /></RotaProtegida>
      }>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/colaboradores" element={<ColaboradoresPage />} />
        <Route path="/credito" element={<CreditoPage />} />
        <Route path="/relatorios" element={<RelatoriosPage />} />
        <Route path="/alterar-senha" element={<AlterarSenhaPage />} />
      </Route>

      {/* Redirect raiz para dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
