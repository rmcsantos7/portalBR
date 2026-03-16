/**
 * ListaColaboradoresGestao
 * Grade de colaboradores — mesmo layout visual de ListaRecargas
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { gestaoColaboradoresAPI } from '../services/api';

const ListaColaboradoresGestao = ({ clienteId, onNovoColaborador, onAbrirColaborador }) => {
  const [todosColaboradores, setTodosColaboradores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [importando, setImportando] = useState(false);
  const [baixandoPlanilha, setBaixandoPlanilha] = useState(false);
  const [resultadoImport, setResultadoImport] = useState(null);
  const fileInputRef = useRef(null);
  const limit = 15;

  const carregarDados = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const response = await gestaoColaboradoresAPI.listarTodos(clienteId);
      setTodosColaboradores(response.data?.data || []);
      setPage(0);
    } catch (err) {
      setErro('Erro ao carregar colaboradores');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Mapeia situação do banco para texto exibido na tela
  const getSituacaoDisplay = (situacao) => {
    const sit = (situacao || '').toUpperCase();
    if (sit === 'ATIVO' || sit === 'ACTIVE') return 'ativo';
    if (sit === 'BLOQUEADO' || sit === 'BLOCKED' || sit === 'INATIVO') return 'inativo';
    return (situacao || '').toLowerCase();
  };

  // Filtro client-side
  const filtrados = todosColaboradores.filter((c) => {
    if (!search.trim()) return true;
    const termo = search.toLowerCase().trim();
    const termoLimpo = search.replace(/\D/g, '');
    const situacaoDisplay = getSituacaoDisplay(c.situacao);
    return (
      c.nome?.toLowerCase().includes(termo) ||
      c.cpf?.toLowerCase().includes(termo) ||
      (termoLimpo && c.cpf?.replace(/\D/g, '').includes(termoLimpo)) ||
      c.restaurante?.toLowerCase().includes(termo) ||
      situacaoDisplay.includes(termo)
    );
  });

  // Paginação sobre os filtrados
  const totalFiltrados = filtrados.length;
  const totalPaginas = Math.ceil(totalFiltrados / limit);
  const colaboradoresPagina = filtrados.slice(page * limit, (page + 1) * limit);

  const handleSearch = (valor) => {
    setSearch(valor);
    setPage(0);
  };

  const formatarCPF = (cpf) => {
    if (!cpf) return '';
    const limpo = cpf.replace(/\D/g, '');
    if (limpo.length === 11) {
      return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
  };

  const getBadgeSituacao = (situacao) => {
    const sit = (situacao || '').toUpperCase();
    if (sit === 'ATIVO' || sit === 'ACTIVE') {
      return <span className="badge badge-ativo">ATIVO</span>;
    }
    if (sit === 'BLOQUEADO' || sit === 'BLOCKED' || sit === 'INATIVO') {
      return <span className="badge badge-inativo">INATIVO</span>;
    }
    return <span className="badge badge-cinza">{situacao || 'N/A'}</span>;
  };

  // Baixar planilha padrão
  const handleBaixarPlanilha = async () => {
    setBaixandoPlanilha(true);
    try {
      const response = await gestaoColaboradoresAPI.baixarPlanilhaUsuarios(clienteId);
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ImportacaoColaboradores-${clienteId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao baixar planilha');
    } finally {
      setBaixandoPlanilha(false);
    }
  };

  // Importação Excel
  const handleImportarExcel = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportando(true);
    setResultadoImport(null);
    try {
      const response = await gestaoColaboradoresAPI.importarUsuarios(clienteId, file);
      setResultadoImport(response.data?.data || response.data);
      await carregarDados();
    } catch (err) {
      setResultadoImport({ erro: err.response?.data?.message || 'Erro ao importar arquivo' });
    } finally {
      setImportando(false);
      e.target.value = '';
    }
  };

  return (
    <div className="lista-recargas">
      <div className="page-header">
        <div>
          <h2 className="page-title">Colaboradores</h2>
          <p className="page-subtitle">Busque por nome, CPF ou situação</p>
        </div>
        <div className="page-header-actions">
          <button className="btn-primario" onClick={onNovoColaborador} style={{ padding: '12px 24px', fontSize: '0.9rem', borderRadius: '8px' }}>
            + Novo colaborador
          </button>
          <button
            className="btn-selecionar"
            onClick={handleImportarExcel}
            disabled={importando}
            style={{ padding: '12px 24px', fontSize: '0.9rem', borderRadius: '8px' }}
          >
            {importando ? 'Importando...' : 'Importar Excel'}
          </button>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
      />

      {/* Barra de busca — mesmo modelo */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--cinza-500)' }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou situação..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !search.trim() && carregarDados()}
            style={{ paddingLeft: '38px', borderRadius: '8px', height: '42px' }}
          />
        </div>
        <button
          className="btn-secundario"
          onClick={carregarDados}
          style={{ height: '42px', padding: '0 20px' }}
        >
          Pesquisar
        </button>
      </div>

      {/* Info planilha padrão */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '8px',
        marginBottom: '16px'
      }}>
        <div>
          <strong style={{ fontSize: '0.85rem', color: '#166534' }}>Planilha Padrão</strong>
          <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#15803d' }}>
            Baixe a planilha modelo com colunas: NOME, CPF, DATA_NASCIMENTO, SEXO (M/F), EMAIL, CELULAR.
          </p>
        </div>
        <button
          className="btn-selecionar"
          onClick={handleBaixarPlanilha}
          disabled={baixandoPlanilha || importando}
          style={{ whiteSpace: 'nowrap', padding: '8px 18px', fontSize: '0.82rem' }}
        >
          {baixandoPlanilha ? 'Gerando...' : 'Baixar Planilha'}
        </button>
      </div>

      {/* Resultado importação */}
      {resultadoImport && (
        <div style={{ marginBottom: '16px' }}>
          {resultadoImport.erro ? (
            <div className="alert alert-erro">{resultadoImport.erro}</div>
          ) : (
            <div>
              <div className="alert alert-sucesso" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  Importação concluída: {resultadoImport.criados || 0} criados,{' '}
                  {resultadoImport.existentes || 0} já existentes
                  {resultadoImport.total_erros > 0 && `, ${resultadoImport.total_erros} com erro`}
                </span>
                <button
                  onClick={() => setResultadoImport(null)}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: '1rem', color: '#065f46', fontWeight: 700
                  }}
                >
                  ✕
                </button>
              </div>
              {resultadoImport.total_erros > 0 && resultadoImport.erros?.length > 0 && (
                <div className="alert alert-erro" style={{ marginTop: '8px', padding: '12px 16px' }}>
                  <strong style={{ display: 'block', marginBottom: '6px' }}>Detalhes dos erros:</strong>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem' }}>
                    {resultadoImport.erros.map((e, i) => (
                      <li key={i} style={{ marginBottom: '4px' }}>
                        <strong>Linha {e.linha}</strong>
                        {e.nome && ` — ${e.nome}`}
                        {e.cpf && ` (CPF: ${e.cpf})`}
                        {': '}
                        {e.erros?.join(', ') || 'Erro desconhecido'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Erro */}
      {erro && <div className="alert alert-erro">{erro}</div>}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--cinza-500)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>...</div>
          Carregando colaboradores...
        </div>
      )}

      {/* Tabela — mesmo modelo com border arredondada */}
      {!loading && colaboradoresPagina.length > 0 && (
        <>
          <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--cinza-300)' }}>
            <table style={{ minWidth: '700px' }}>
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Nome</th>
                  <th style={{ width: '140px' }}>CPF</th>
                  <th>Empresa</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Situação</th>
                </tr>
              </thead>
              <tbody>
                {colaboradoresPagina.map((c) => (
                  <tr
                    key={c.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onAbrirColaborador(c.id)}
                  >
                    <td style={{ fontWeight: '500', color: 'var(--cinza-600)' }}>{c.id}</td>
                    <td style={{ fontWeight: '500' }}>{c.nome}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--cinza-800)' }}>
                      {formatarCPF(c.cpf)}
                    </td>
                    <td style={{ fontWeight: '500' }}>{c.restaurante || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      {getBadgeSituacao(c.situacao)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação — mesmo modelo */}
          {totalPaginas > 1 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginTop: '16px', padding: '0 4px'
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--cinza-600)' }}>
                {totalFiltrados} registro(s) &middot; Página {page + 1} de {totalPaginas}
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
                  disabled={page >= totalPaginas - 1}
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Vazio — mesmo modelo */}
      {!loading && filtrados.length === 0 && !erro && (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--cinza-100)', borderRadius: '12px',
          border: '1px solid var(--cinza-300)'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.4 }}>👥</div>
          <p style={{ margin: '0 0 8px', fontWeight: '600', color: 'var(--cinza-800)' }}>
            Nenhum colaborador encontrado
          </p>
          <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--cinza-600)' }}>
            Comece adicionando seu primeiro colaborador
          </p>
          <button className="btn-primario" onClick={onNovoColaborador} style={{ padding: '10px 24px' }}>
            + Novo colaborador
          </button>
        </div>
      )}
    </div>
  );
};

export default ListaColaboradoresGestao;
