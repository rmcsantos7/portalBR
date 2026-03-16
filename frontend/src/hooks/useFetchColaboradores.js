/**
 * Hook customizado: useFetchColaboradores
 * Gerencia estado de busca e filtros de colaboradores
 */

import { useState, useCallback, useEffect } from 'react';
import { colaboradoresAPI } from '../services/api';

export const useFetchColaboradores = (clienteId) => {
  const [colaboradores, setColaboradores] = useState([]);
  const [setores, setSetores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ limit: 50, offset: 0, page: 0 });

  // Fetch inicial de setores/categorias
  useEffect(() => {
    if (!clienteId) return;

    const buscarSetores = async () => {
      try {
        const response = await colaboradoresAPI.obterSetores(clienteId);
        setSetores(response.data.data);
      } catch (err) {
        console.error('Erro ao buscar setores:', err);
      }
    };

    buscarSetores();
  }, [clienteId]);

  /**
   * Busca colaboradores com filtros
   */
  const buscar = useCallback(async (search = '', setorId = null, limit = 50, offset = 0) => {
    if (!clienteId) {
      setError('cliente_id não fornecido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await colaboradoresAPI.listar(clienteId, {
        search,
        setor_id: setorId,
        limit,
        offset
      });

      setColaboradores(response.data.data);
      setTotal(response.data.total);
      setPagination({
        limit: response.data.limit,
        offset: response.data.offset,
        page: response.data.page
      });
    } catch (err) {
      const mensagem = err.response?.data?.error || 'Erro ao buscar colaboradores';
      setError(mensagem);
      console.error('Erro ao buscar:', err);
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  /**
   * Importa arquivo Excel
   */
  const importarExcel = useCallback(async (file) => {
    if (!clienteId) {
      setError('cliente_id não fornecido');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await colaboradoresAPI.importarExcel(clienteId, file);
      return response.data;
    } catch (err) {
      const mensagem = err.response?.data?.error || 'Erro ao importar arquivo';
      setError(mensagem);
      console.error('Erro ao importar:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  return {
    colaboradores,
    setores,
    loading,
    error,
    total,
    pagination,
    buscar,
    importarExcel,
    setColaboradores
  };
};
