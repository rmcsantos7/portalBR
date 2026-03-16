/**
 * Contexto de Autenticação
 * Gerencia token JWT, dados do usuário e estado de login
 * - sessionStorage (padrão): token expira ao fechar aba/navegador
 * - localStorage (Lembrar-me): token persiste entre sessões
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

// Helpers para gerenciar storage (sessionStorage ou localStorage)
const getToken = () => {
  return sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
};

const setToken = (token, lembrar = false) => {
  if (lembrar) {
    localStorage.setItem('auth_token', token);
    sessionStorage.removeItem('auth_token');
  } else {
    sessionStorage.setItem('auth_token', token);
    localStorage.removeItem('auth_token');
  }
};

const removeToken = () => {
  localStorage.removeItem('auth_token');
  sessionStorage.removeItem('auth_token');
};

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [senhaTemporaria, setSenhaTemporaria] = useState(false);
  const [carregando, setCarregando] = useState(true);

  // Verifica token salvo ao montar (com cleanup para evitar memory leak)
  useEffect(() => {
    let cancelado = false;
    const token = getToken();

    if (token) {
      // Decodificar JWT para verificar flag de senha temporária
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.senha_temporaria) {
          if (!cancelado) setSenhaTemporaria(true);
        }
      } catch { /* ignore */ }

      api.get('/auth/me')
        .then(res => {
          if (!cancelado) setUsuario(res.data.data.usuario);
        })
        .catch(() => {
          if (!cancelado) {
            removeToken();
            setUsuario(null);
            setSenhaTemporaria(false);
          }
        })
        .finally(() => {
          if (!cancelado) setCarregando(false);
        });
    } else {
      setCarregando(false);
    }

    return () => { cancelado = true; };
  }, []);

  const login = useCallback(async (loginStr, senha, lembrar = false) => {
    const res = await api.post('/auth/login', { login: loginStr, senha });
    const { token, senha_temporaria: senhaTemp, usuario: usr } = res.data.data;
    setToken(token, lembrar);
    setUsuario(usr);
    setSenhaTemporaria(!!senhaTemp);
    return { usuario: usr, senhaTemporaria: !!senhaTemp };
  }, []);

  const atualizarToken = useCallback((novoToken) => {
    const lembrar = !!localStorage.getItem('auth_token');
    setToken(novoToken, lembrar);
    setSenhaTemporaria(false);
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setUsuario(null);
    setSenhaTemporaria(false);
  }, []);

  // Escutar evento de logout disparado pelo interceptor da API (evita hard reload)
  useEffect(() => {
    const handleLogoutEvento = () => logout();
    window.addEventListener('auth:logout', handleLogoutEvento);
    return () => window.removeEventListener('auth:logout', handleLogoutEvento);
  }, [logout]);

  // Memoizar o value para evitar re-renders desnecessários
  const value = useMemo(() => ({
    usuario, carregando, login, logout, atualizarToken, autenticado: !!usuario, senhaTemporaria
  }), [usuario, carregando, login, logout, atualizarToken, senhaTemporaria]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
