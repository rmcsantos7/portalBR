/**
 * API Service
 * Configuração centralizada de chamadas HTTP
 */

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Cria instância do axios com configurações padrão
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para adicionar token de autenticação (se disponível)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirecionar para login se não autenticado
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Colaboradores API
 */
export const colaboradoresAPI = {
  /**
   * Lista colaboradores com filtros
   */
  listar: (clienteId, params = {}) => {
    return api.get('/colaboradores', {
      params: {
        cliente_id: clienteId,
        ...params
      }
    });
  },

  /**
   * Obtém setores/cargos disponíveis
   */
  obterSetores: (clienteId) => {
    return api.get('/colaboradores/setores', {
      params: { cliente_id: clienteId }
    });
  },

  /**
   * Importa arquivo Excel
   */
  importarExcel: (clienteId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    return api.post('/colaboradores/import', formData, {
      params: { cliente_id: clienteId },
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /**
   * Baixa planilha padrão com colaboradores ativos
   */
  baixarPlanilha: (clienteId) => {
    return api.get('/colaboradores/planilha', {
      params: { cliente_id: clienteId },
      responseType: 'blob'
    });
  }
};

/**
 * Créditos API
 */
export const creditosAPI = {
  /**
   * Gera crédito para colaboradores
   */
  gerar: (clienteId, payload) => {
    return api.post('/creditos/gerar', payload, {
      params: { cliente_id: clienteId }
    });
  },

  /**
   * Obtém histórico de gerações
   */
  obterHistorico: (clienteId, params = {}) => {
    return api.get('/creditos/historico', {
      params: {
        cliente_id: clienteId,
        ...params
      }
    });
  }
};

export default api;
