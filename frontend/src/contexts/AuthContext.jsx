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

  /**
   * Etapa 1 do login — valida credenciais. Retorna dados do challenge 2FA.
   */
  const iniciarLogin = useCallback(async (loginStr, senha) => {
    const res = await api.post('/auth/login', { login: loginStr, senha });
    return res.data.data; // { challenge_token, awaiting_2fa, contato }
  }, []);

  /**
   * Etapa 2 — solicita envio do código de 6 dígitos via sms ou email.
   */
  const enviar2FA = useCallback(async (challengeToken, metodo) => {
    const res = await api.post('/auth/2fa/enviar', { challenge_token: challengeToken, metodo });
    return res.data.data; // { challenge_token, metodo }
  }, []);

  // Auth pendente — segura token+usuário entre verificar2FA e a seleção de restaurante
  const [authPendente, setAuthPendente] = useState(null);

  /**
   * Etapa 3 — valida o código. Se o usuário tem múltiplos restaurantes e a senha
   * não é temporária, NÃO efetiva o login ainda — guarda em authPendente até o
   * usuário escolher o restaurante. Caso contrário, persiste imediatamente.
   */
  const verificar2FA = useCallback(async (challengeToken, codigo, lembrar = false) => {
    const res = await api.post('/auth/2fa/verificar', { challenge_token: challengeToken, codigo });
    const { token, senha_temporaria: senhaTemp, terms_accepted: termsAccepted, usuario: usr, restaurantes } = res.data.data;
    const precisaTermos = !senhaTemp && !termsAccepted;
    const precisaEscolher = !senhaTemp && termsAccepted && (usr?.total_restaurantes || 1) > 1;

    if (precisaTermos || precisaEscolher) {
      setAuthPendente({ token, usuario: usr, lembrar, restaurantes: restaurantes || [], termsAccepted: !!termsAccepted });
      return {
        usuario: usr,
        senhaTemporaria: false,
        precisaAceitarTermos: precisaTermos,
        precisaEscolherRestaurante: precisaEscolher,
        restaurantes: restaurantes || []
      };
    }
    setToken(token, lembrar);
    setUsuario(usr);
    setSenhaTemporaria(!!senhaTemp);
    return { usuario: usr, senhaTemporaria: !!senhaTemp };
  }, []);

  /**
   * Registra o aceite dos termos no backend usando o token pendente.
   * Não efetiva o login ainda — o LoginPage decide o próximo passo.
   */
  const aceitarTermos = useCallback(async () => {
    if (!authPendente) throw new Error('Não há login pendente');
    const { token, lembrar } = authPendente;
    setToken(token, lembrar);
    try {
      await api.post('/auth/aceitar-termos');
      const next = { ...authPendente, termsAccepted: true };
      setAuthPendente(next);
      const precisaEscolher = (next.usuario?.total_restaurantes || 1) > 1;
      if (!precisaEscolher) {
        // só 1 restaurante — já efetiva o login
        setUsuario(next.usuario);
        setSenhaTemporaria(false);
        setAuthPendente(null);
      }
      return { precisaEscolherRestaurante: precisaEscolher };
    } catch (err) {
      removeToken();
      throw err;
    }
  }, [authPendente]);

  /**
   * Conclui o login depois que o usuário escolheu um restaurante.
   * Se o escolhido é o default já no token pendente, só persiste.
   * Senão, chama /auth/trocar-cliente usando o token pendente.
   */
  const finalizarLoginComRestaurante = useCallback(async (clienteId) => {
    if (!authPendente) throw new Error('Não há login pendente');
    const { token, usuario: usr, lembrar } = authPendente;
    if (clienteId === usr.crd_cli_id) {
      setToken(token, lembrar);
      setUsuario(usr);
      setSenhaTemporaria(false);
      setAuthPendente(null);
      return usr;
    }
    // Persiste o token pendente antes da chamada (axios interceptor pega de getToken)
    setToken(token, lembrar);
    try {
      const res = await api.post('/auth/trocar-cliente', { cliente_id: clienteId });
      const { token: novoToken, usuario: novoUsuario } = res.data.data;
      setToken(novoToken, lembrar);
      setUsuario(novoUsuario);
      setSenhaTemporaria(false);
      setAuthPendente(null);
      return novoUsuario;
    } catch (err) {
      // se falhar, desfaz a persistência do token pendente
      removeToken();
      throw err;
    }
  }, [authPendente]);

  const cancelarAuthPendente = useCallback(() => {
    setAuthPendente(null);
  }, []);

  const atualizarToken = useCallback((novoToken) => {
    const lembrar = !!localStorage.getItem('auth_token');
    setToken(novoToken, lembrar);
    setSenhaTemporaria(false);
  }, []);

  /**
   * Troca o cliente ativo (apenas admins).
   * Chama /auth/trocar-cliente no back, salva o novo token e atualiza usuário.
   */
  const trocarCliente = useCallback(async (clienteId) => {
    const res = await api.post('/auth/trocar-cliente', { cliente_id: clienteId });
    const { token: novoToken, usuario: novoUsuario } = res.data.data;
    const lembrar = !!localStorage.getItem('auth_token');
    setToken(novoToken, lembrar);
    setUsuario(novoUsuario);
    return novoUsuario;
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
    usuario, carregando,
    iniciarLogin, enviar2FA, verificar2FA,
    aceitarTermos, finalizarLoginComRestaurante, cancelarAuthPendente, authPendente,
    logout, atualizarToken, trocarCliente,
    autenticado: !!usuario, senhaTemporaria
  }), [usuario, carregando, iniciarLogin, enviar2FA, verificar2FA, aceitarTermos, finalizarLoginComRestaurante, cancelarAuthPendente, authPendente, logout, atualizarToken, trocarCliente, senhaTemporaria]);

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
