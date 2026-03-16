/**
 * Componente: ListaRecargas
 * Tela inicial — lista de recargas/remessas com busca e detalhes
 */

import React, { useState, useEffect } from 'react';
import { creditosAPI } from '../services/api';
import DetalheRecarga from './DetalheRecarga';

const ListaRecargas = ({ clienteId, onNovaRecarga }) => {
  const [todasRecargas, setTodasRecargas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [remessaAberta, setRemessaAberta] = useState(null);
  const limit = 15;

  const carregarRecargas = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await creditosAPI.obterHistorico(clienteId, { limit: 500, offset: 0 });
      setTodasRecargas(response.data.data || []);
      setTotal(response.data.total || 0);
      setPage(0);
    } catch (err) {
      setError('Erro ao carregar recargas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clienteId) carregarRecargas();
  }, [clienteId]);

  // Funções auxiliares (declaradas ANTES do uso em recargasFiltradas)
  const formatarData = (data) => {
    if (!data) return '-';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR');
  };

  const formatarMoeda = (valor) => {
    return (parseFloat(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleSearch = (valor) => {
    setSearch(valor);
    setPage(0);
  };

  // Filtra recargas pelo texto de busca (remessa, restaurante, operador, data)
  const recargasFiltradas = todasRecargas.filter((r) => {
    if (!search.trim()) return true;
    const termo = search.toLowerCase().trim();
    const data = formatarData(r.data_criacao).toLowerCase();
    const remessa = String(r.remessa_id);
    const restaurante = (r.restaurante || '').toLowerCase();
    const operador = (r.criado_por || '').toLowerCase();
    const titulo = (r.titulo || '').toLowerCase();
    return data.includes(termo) || remessa.includes(termo) || restaurante.includes(termo) || operador.includes(termo) || titulo.includes(termo);
  });

  // Paginação sobre os filtrados
  const totalFiltrados = recargasFiltradas.length;
  const totalPaginasFiltradas = Math.ceil(totalFiltrados / limit);
  const recargasPagina = recargasFiltradas.slice(page * limit, (page + 1) * limit);

  // Calcula líquido a partir do bruto e taxa
  const calcularLiquido = (valorBruto, taxa) => {
    const bruto = parseFloat(valorBruto) || 0;
    const t = parseFloat(taxa) || 0;
    if (t > 0) return Math.round((bruto - (bruto * t / 100)) * 100) / 100;
    return bruto;
  };

  // totalPaginas calculado acima como totalPaginasFiltradas

  // Se tem remessa aberta, mostra detalhe
  if (remessaAberta) {
    return (
      <DetalheRecarga
        clienteId={clienteId}
        remessaId={remessaAberta}
        onVoltar={() => setRemessaAberta(null)}
      />
    );
  }

  return (
    <div className="lista-recargas">
      <div className="page-header">
        <div>
          <h2 className="page-title">Histórico de recargas</h2>
          <p className="page-subtitle">Acompanhe todas as recargas realizadas</p>
        </div>
        <div className="page-header-actions">
          <button className="btn-selecionar" onClick={onNovaRecarga} style={{ padding: '12px 24px', fontSize: '0.9rem', borderRadius: '8px' }}>
            + Nova Recarga
          </button>
        </div>
      </div>

      {/* Barra de busca */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        alignItems: 'center'
      }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--cinza-500)' }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por remessa, data ou palavra-chave..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ paddingLeft: '38px', borderRadius: '8px', height: '42px' }}
          />
        </div>
        <button
          className="btn-secundario"
          onClick={() => carregarRecargas(0)}
          style={{ height: '42px', padding: '0 20px' }}
        >
          Atualizar
        </button>
      </div>

      {/* Erro */}
      {error && <div className="alert alert-erro">{error}</div>}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--cinza-500)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>...</div>
          Carregando recargas...
        </div>
      )}

      {/* Tabela */}
      {!loading && recargasPagina.length > 0 && (
        <>
          <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--cinza-300)' }}>
            <table style={{ minWidth: '800px' }}>
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Data</th>
                  <th style={{ width: '90px' }}>Remessa</th>
                  <th>Empresa</th>
                  <th>Descrição</th>
                  <th className="align-right" style={{ width: '70px' }}>Colab.</th>
                  <th className="align-right" style={{ width: '110px' }}>Bruto</th>
                  <th className="align-right" style={{ width: '90px' }}>Tar. Conv.</th>
                  <th className="align-right" style={{ width: '120px' }}>Líquido</th>
                </tr>
              </thead>
              <tbody>
                {recargasPagina.map((r) => {
                  const taxa = parseFloat(r.taxa) || 0;
                  const valorBruto = parseFloat(r.valor_bruto) || 0;
                  const valorLiquido = calcularLiquido(valorBruto, taxa);

                  return (
                    <tr key={r.remessa_id} style={{ cursor: 'pointer' }} onClick={() => setRemessaAberta(r.remessa_id)}>
                      <td style={{ fontWeight: '500' }}>{formatarData(r.data_criacao)}</td>
                      <td>
                        <span style={{
                          background: 'var(--cinza-100)',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontWeight: '700',
                          fontSize: '0.85rem',
                          color: 'var(--roxo)'
                        }}>
                          #{r.remessa_id}
                        </span>
                      </td>
                      <td style={{ fontWeight: '500' }}>{r.restaurante || '-'}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--cinza-600)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.titulo || '-'}
                      </td>
                      <td className="align-right">
                        <span style={{
                          background: '#f3e8ff',
                          color: 'var(--roxo)',
                          padding: '2px 10px',
                          borderRadius: '999px',
                          fontWeight: '600',
                          fontSize: '0.8rem'
                        }}>
                          {r.total_colaboradores}
                        </span>
                      </td>
                      <td className="align-right" style={{ fontWeight: '500', color: 'var(--cinza-800)' }}>
                        {formatarMoeda(valorBruto)}
                      </td>
                      <td className="align-right" style={{ fontSize: '0.8rem', color: taxa > 0 ? 'var(--erro)' : 'var(--cinza-500)' }}>
                        {taxa > 0 ? `${taxa}%` : '-'}
                      </td>
                      <td className="align-right" style={{ fontWeight: '700', color: '#491d4e', fontSize: '0.95rem' }}>
                        {formatarMoeda(valorLiquido)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPaginasFiltradas > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '16px',
              padding: '0 4px'
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--cinza-600)' }}>
                {totalFiltrados} registro(s) &middot; Página {page + 1} de {totalPaginasFiltradas}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-secundario"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  Anterior
                </button>
                <button
                  className="btn-secundario"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPaginasFiltradas - 1}
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Vazio */}
      {!loading && recargasPagina.length === 0 && !error && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--cinza-100)',
          borderRadius: '12px',
          border: '1px solid var(--cinza-300)'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.4 }}>📋</div>
          <p style={{ margin: '0 0 8px', fontWeight: '600', color: 'var(--cinza-800)' }}>
            Nenhuma recarga encontrada
          </p>
          <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--cinza-600)' }}>
            Comece gerando sua primeira recarga de crédito
          </p>
          <button className="btn-selecionar" onClick={onNovaRecarga} style={{ padding: '10px 24px' }}>
            + Nova Recarga
          </button>
        </div>
      )}
    </div>
  );
};

export default ListaRecargas;
