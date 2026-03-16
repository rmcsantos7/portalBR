/**
 * Hook customizado: useCredito
 * Gerencia estado e lógica de geração de crédito
 */

import { useState, useCallback, useMemo } from 'react';
import { creditosAPI } from '../services/api';

export const useCredito = (clienteId, login = 'sistema') => {
  const [creditoLoading, setCreditoLoading] = useState(false);
  const [creditoError, setCreditoError] = useState(null);
  const [creditoSucesso, setCreditoSucesso] = useState(null);

  const [tiposCredito, setTiposCredito] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);

  /**
   * Carrega tipos de crédito
   * Tipos fixos conforme sistema legado BRG
   */
  const carregarTiposCredito = useCallback(async () => {
    try {
      setTiposCredito([
        'Crédito Manual',
        'Promoção',
        'Bônus',
        'Ajuste',
        'Reembolso'
      ]);
    } catch (err) {
      console.error('Erro ao carregar tipos:', err);
    }
  }, []);

  /**
   * Carrega histórico de gerações
   */
  const carregarHistorico = useCallback(async (params = {}) => {
    if (!clienteId) return;

    setHistoricoLoading(true);
    try {
      const response = await creditosAPI.obterHistorico(clienteId, params);
      setHistorico(response.data.data);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setHistoricoLoading(false);
    }
  }, [clienteId]);

  /**
   * Gera crédito
   */
  const gerar = useCallback(async (payload) => {
    if (!clienteId) {
      setCreditoError('cliente_id não fornecido');
      return false;
    }

    // Validações básicas
    if (!payload.colaboradores || payload.colaboradores.length === 0) {
      setCreditoError('Mínimo 1 colaborador obrigatório');
      return false;
    }

    const colaboradoresValidos = payload.colaboradores.every(
      c => (c.id > 0 || (c.cpf && c.cpf.length >= 11)) && c.valor && parseFloat(c.valor) > 0
    );

    if (!colaboradoresValidos) {
      setCreditoError('Todos os colaboradores devem ter valor > 0');
      return false;
    }

    setCreditoLoading(true);
    setCreditoError(null);
    setCreditoSucesso(null);

    try {
      const response = await creditosAPI.gerar(clienteId, payload, login);
      const dados = response.data.data;
      setCreditoSucesso(dados);

      return dados;
    } catch (err) {
      const mensagem = err.response?.data?.error || 'Erro ao gerar crédito';
      setCreditoError(mensagem);
      console.error('Erro ao gerar:', err);
      return false;
    } finally {
      setCreditoLoading(false);
    }
  }, [clienteId, login]);

  /**
   * Calcula resumo dos créditos
   */
  const resumo = useMemo(() => ({
    calcularTotal: (colaboradores) => {
      return colaboradores.reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);
    },
    
    formatarMoeda: (valor) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(valor);
    }
  }), []);

  return {
    creditoLoading,
    creditoError,
    creditoSucesso,
    tiposCredito,
    historico,
    historicoLoading,
    carregarTiposCredito,
    carregarHistorico,
    gerar,
    resumo,
    limparErro: () => setCreditoError(null),
    limparSucesso: () => setCreditoSucesso(null)
  };
};
