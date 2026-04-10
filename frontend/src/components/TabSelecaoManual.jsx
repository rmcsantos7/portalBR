/**
 * Componente: TabSelecaoManual
 * Seleção de colaboradores com filtros e valores editáveis na grade
 */

import React, { useState, useRef, useEffect } from 'react';
import TableColaboradores from './TableColaboradores';

const TabSelecaoManual = ({ clienteId, colaboradoresHook, onProximo, onVoltar, onFechar }) => {
  const [search, setSearch] = useState('');
  const [setorId, setSetorId] = useState('');
  const [selecionados, setSelecionados] = useState({});
  const [valores, setValores] = useState({});
  const debounceRef = useRef(null);

  /**
   * Busca com debounce (300ms)
   */
  const handleSearch = (valor) => {
    setSearch(valor);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      colaboradoresHook.buscar(valor, setorId || null);
    }, 300);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  /**
   * Filtra por setor/categoria (imediato, sem debounce)
   */
  const handleSetor = (valor) => {
    setSetorId(valor);
    colaboradoresHook.buscar(search, valor || null);
  };

  /**
   * Seleciona/desseleciona colaborador
   */
  const toggleSelecao = (id) => {
    setSelecionados(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  /**
   * Atualiza valor de um colaborador
   */
  const handleValorChange = (id, valor) => {
    setValores(prev => ({
      ...prev,
      [id]: valor
    }));
  };

  /**
   * Seleciona todos
   */
  const selecionarTodos = () => {
    const novo = {};
    colaboradoresHook.colaboradores.forEach(colab => {
      novo[colab.id] = true;
    });
    setSelecionados(novo);
  };

  /**
   * Desseleciona todos
   */
  const desselecionarTodos = () => {
    setSelecionados({});
  };

  /**
   * Conta selecionados
   */
  const totalSelecionados = Object.values(selecionados).filter(Boolean).length;

  /**
   * Calcula total dos valores preenchidos
   */
  const totalValor = colaboradoresHook.colaboradores
    .filter(c => selecionados[c.id])
    .reduce((acc, c) => acc + (parseFloat(valores[c.id]) || 0), 0);

  /**
   * Monta array de colaboradores selecionados com valores
   */
  const colaboradoresArray = colaboradoresHook.colaboradores
    .filter(colab => selecionados[colab.id])
    .map(colab => ({
      id: colab.id,
      nome: colab.nome,
      cpf: colab.cpf,
      categoria: colab.categoria,
      valor: valores[colab.id] || ''
    }));

  return (
    <div className="tab-selecao-manual">
      {/* Filtros */}
      <div className="filtros">
        <div className="filtro-grupo">
          <label>Buscar por nome ou CPF:</label>
          <input
            type="text"
            placeholder="Digite parte do nome ou CPF..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {colaboradoresHook.setores && colaboradoresHook.setores.length > 0 && (
          <div className="filtro-grupo">
            <label>Categoria:</label>
            <select
              value={setorId}
              onChange={(e) => handleSetor(e.target.value)}
            >
              <option value="">Todos</option>
              {colaboradoresHook.setores.map(setor => (
                <option key={setor.id} value={setor.id}>
                  {setor.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="filtro-grupo">
          <label>&nbsp;</label>
          <div className="botoes-selecao">
            <button
              className="btn-secundario"
              onClick={selecionarTodos}
              disabled={colaboradoresHook.colaboradores.length === 0}
            >
              Selecionar Todos
            </button>
            <button
              className="btn-secundario"
              onClick={desselecionarTodos}
              disabled={totalSelecionados === 0}
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      {/* Carregamento */}
      {colaboradoresHook.loading && (
        <div className="loading">Carregando...</div>
      )}

      {/* Erro */}
      {colaboradoresHook.error && (
        <div className="alert alert-erro">
          {colaboradoresHook.error}
        </div>
      )}

      {/* Tabela */}
      {!colaboradoresHook.loading && colaboradoresHook.colaboradores.length > 0 && (
        <>
          <TableColaboradores
            colaboradores={colaboradoresHook.colaboradores}
            selecionados={selecionados}
            onToggle={toggleSelecao}
            valores={valores}
            onValorChange={handleValorChange}
            pagination={colaboradoresHook.pagination}
            total={colaboradoresHook.total}
          />

          {/* Rodapé com info e botão */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
              {totalSelecionados} selecionado(s)
              {totalValor > 0 && (
                <span style={{ marginLeft: '16px', fontWeight: '600', color: '#4A1D4F' }}>
                  Total: R$ {totalValor.toFixed(2)}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {onVoltar && (
                <button className="btn-voltar" onClick={onVoltar}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Voltar
                </button>
              )}
              {onFechar && (
                <button className="btn-secundario" onClick={onFechar}>
                  Fechar
                </button>
              )}
              <button
                className="btn-primario"
                onClick={() => onProximo(colaboradoresArray)}
                disabled={totalSelecionados === 0}
              >
                Próximo
              </button>
            </div>
          </div>
        </>
      )}

      {/* Vazio */}
      {!colaboradoresHook.loading && colaboradoresHook.colaboradores.length === 0 && !colaboradoresHook.error && (
        <div className="vazio">
          <p>Nenhum colaborador encontrado.</p>
        </div>
      )}
    </div>
  );
};

export default TabSelecaoManual;
