/**
 * Página de Relatórios
 * Menu com 3 relatórios disponíveis em PDF
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { relatoriosAPI } from '../services/api';
import {
  gerarPdfRecargasPeriodo,
  gerarPdfColaboradores,
  gerarPdfHistoricoColaborador
} from '../utils/pdfGenerator';

// Helpers
const hoje = () => new Date().toISOString().split('T')[0];
const primeiroDiaMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};
const umAnoAtras = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split('T')[0];
};

const RelatoriosPage = () => {
  const { usuario } = useAuth();
  const clienteId = usuario?.crd_cli_id;

  // Estado para cada relatório
  const [loadingRel, setLoadingRel] = useState(null);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);

  // Relatório 1: Recargas
  const [recDataInicio, setRecDataInicio] = useState(primeiroDiaMes());
  const [recDataFim, setRecDataFim] = useState(hoje());

  // Relatório 3: Histórico por colaborador
  const [histColabId, setHistColabId] = useState('');
  const [histColabNome, setHistColabNome] = useState('');
  const [histDataInicio, setHistDataInicio] = useState(umAnoAtras());
  const [histDataFim, setHistDataFim] = useState(hoje());
  const [buscaColab, setBuscaColab] = useState('');
  const [listaColabs, setListaColabs] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  // Buscar colaboradores com debounce
  const buscarColaboradores = useCallback(async (termo) => {
    if (!clienteId || termo.length < 2) {
      setListaColabs([]);
      return;
    }
    try {
      const res = await relatoriosAPI.listarColaboradores(clienteId, termo);
      setListaColabs(res.data?.data || []);
      setShowDropdown(true);
    } catch {
      setListaColabs([]);
    }
  }, [clienteId]);

  const handleBuscaColab = (valor) => {
    setBuscaColab(valor);
    setHistColabId('');
    setHistColabNome('');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscarColaboradores(valor), 300);
  };

  const selecionarColab = (colab) => {
    setHistColabId(colab.id);
    setHistColabNome(colab.nome);
    setBuscaColab(colab.nome);
    setShowDropdown(false);
    setListaColabs([]);
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cleanup debounce
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // Formatação
  const formatarCPF = (cpf) => {
    if (!cpf) return '';
    const limpo = (cpf + '').replace(/\D/g, '');
    if (limpo.length === 11) return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    return cpf;
  };

  // ---- GERAR RELATÓRIOS ----

  const gerarRelRecargasPeriodo = async () => {
    if (!recDataInicio || !recDataFim) { setErro('Preencha as datas do período'); return; }
    setLoadingRel('recargas'); setErro(null); setSucesso(null);
    try {
      const res = await relatoriosAPI.recargasPeriodo(clienteId, recDataInicio, recDataFim);
      gerarPdfRecargasPeriodo(res.data.data);
      setSucesso('Relatório de Recargas gerado com sucesso!');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao gerar relatório');
    } finally {
      setLoadingRel(null);
    }
  };

  const gerarRelColaboradores = async () => {
    setLoadingRel('colaboradores'); setErro(null); setSucesso(null);
    try {
      const res = await relatoriosAPI.colaboradores(clienteId);
      gerarPdfColaboradores(res.data.data);
      setSucesso('Relatório de Colaboradores gerado com sucesso!');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao gerar relatório');
    } finally {
      setLoadingRel(null);
    }
  };

  const gerarRelHistoricoColaborador = async () => {
    if (!histColabId) { setErro('Selecione um colaborador'); return; }
    if (!histDataInicio || !histDataFim) { setErro('Preencha as datas do período'); return; }
    setLoadingRel('historico'); setErro(null); setSucesso(null);
    try {
      const res = await relatoriosAPI.historicoColaborador(clienteId, histColabId, histDataInicio, histDataFim);
      gerarPdfHistoricoColaborador(res.data.data);
      setSucesso('Histórico do Colaborador gerado com sucesso!');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao gerar relatório');
    } finally {
      setLoadingRel(null);
    }
  };

  // ---- ESTILOS ----
  const estilos = {
    page: { maxWidth: '900px', margin: '0 auto' },
    card: {
      background: '#fff', border: '1px solid var(--cinza-300)',
      borderRadius: '12px', padding: '20px 24px', marginBottom: '16px',
      transition: 'box-shadow 0.2s ease',
    },
    cardHeader: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' },
    cardIcon: {
      width: '44px', height: '44px', borderRadius: '10px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
    },
    cardTitle: { fontSize: '1rem', fontWeight: 700, color: 'var(--cinza-800)', marginBottom: '2px' },
    cardDesc: { fontSize: '0.8rem', color: 'var(--cinza-600)' },
    formRow: { display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '10px' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '140px' },
    label: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--cinza-600)' },
    input: { padding: '8px 10px', fontSize: '0.85rem', border: '1px solid var(--cinza-300)', borderRadius: '6px', background: '#fff' },
    btnGerar: {
      padding: '9px 20px', fontSize: '0.85rem', fontWeight: 700,
      background: 'var(--roxo)', color: '#fff', border: 'none',
      borderRadius: '8px', cursor: 'pointer', display: 'flex',
      alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
      transition: 'opacity 0.2s ease'
    }
  };

  return (
    <div style={estilos.page}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Relatórios</h2>
          <p className="page-subtitle">Gere relatórios em PDF para análise e acompanhamento</p>
        </div>
      </div>

      {erro && (
        <div className="alert alert-erro" style={{ marginBottom: '12px', padding: '10px 14px', fontSize: '0.85rem' }}>
          {erro}
        </div>
      )}
      {sucesso && (
        <div className="alert alert-sucesso" style={{ marginBottom: '12px', padding: '10px 14px', fontSize: '0.85rem' }}>
          {sucesso}
        </div>
      )}

      {/* ========== RELATÓRIO 1: Recargas no Período ========== */}
      <div style={estilos.card}>
        <div style={estilos.cardHeader}>
          <div style={{ ...estilos.cardIcon, background: '#f3e8ff' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4A1D4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div>
            <div style={estilos.cardTitle}>Recarga por Período</div>
            <div style={estilos.cardDesc}>Lista todas as remessas de recarga realizadas no período selecionado com valores totais</div>
          </div>
        </div>

        <div style={estilos.formRow}>
          <div style={estilos.formGroup}>
            <label style={estilos.label}>Data Início</label>
            <input type="date" value={recDataInicio} onChange={e => setRecDataInicio(e.target.value)} style={estilos.input} />
          </div>
          <div style={estilos.formGroup}>
            <label style={estilos.label}>Data Fim</label>
            <input type="date" value={recDataFim} onChange={e => setRecDataFim(e.target.value)} style={estilos.input} />
          </div>
          <button
            style={{ ...estilos.btnGerar, opacity: loadingRel === 'recargas' ? 0.6 : 1 }}
            onClick={gerarRelRecargasPeriodo}
            disabled={!!loadingRel}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {loadingRel === 'recargas' ? 'Gerando...' : 'Gerar PDF'}
          </button>
        </div>
      </div>

      {/* ========== RELATÓRIO 2: Colaboradores Cadastrados ========== */}
      <div style={estilos.card}>
        <div style={estilos.cardHeader}>
          <div style={{ ...estilos.cardIcon, background: '#dcfce7' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <div>
            <div style={estilos.cardTitle}>Colaboradores Cadastrados</div>
            <div style={estilos.cardDesc}>Lista completa de colaboradores ativos e inativos com dados cadastrais</div>
          </div>
        </div>

        <div style={estilos.formRow}>
          <button
            style={{ ...estilos.btnGerar, opacity: loadingRel === 'colaboradores' ? 0.6 : 1 }}
            onClick={gerarRelColaboradores}
            disabled={!!loadingRel}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {loadingRel === 'colaboradores' ? 'Gerando...' : 'Gerar PDF'}
          </button>
        </div>
      </div>

      {/* ========== RELATÓRIO 3: Histórico por Colaborador ========== */}
      <div style={estilos.card}>
        <div style={estilos.cardHeader}>
          <div style={{ ...estilos.cardIcon, background: '#fef3c7' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <div style={estilos.cardTitle}>Histórico Total por Colaborador</div>
            <div style={estilos.cardDesc}>Histórico de gorjetas recebidas por colaborador</div>
          </div>
        </div>

        <div style={estilos.formRow}>
          {/* Campo de busca de colaborador com autocomplete */}
          <div style={{ ...estilos.formGroup, flex: 1, position: 'relative', minWidth: '220px' }} ref={dropdownRef}>
            <label style={estilos.label}>Colaborador</label>
            <input
              type="text"
              value={buscaColab}
              onChange={e => handleBuscaColab(e.target.value)}
              placeholder="Busque por nome ou CPF..."
              style={{
                ...estilos.input,
                borderColor: histColabId ? '#059669' : undefined,
                paddingRight: histColabId ? '28px' : undefined
              }}
            />
            {histColabId && (
              <span style={{
                position: 'absolute', right: '8px', bottom: '10px',
                color: '#059669', fontSize: '1rem', fontWeight: 700
              }}>&#10003;</span>
            )}

            {/* Dropdown de resultados */}
            {showDropdown && listaColabs.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: '#fff', border: '1px solid var(--cinza-300)',
                borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 100, maxHeight: '200px', overflowY: 'auto', marginTop: '2px'
              }}>
                {listaColabs.map(c => (
                  <div
                    key={c.id}
                    onClick={() => selecionarColab(c)}
                    style={{
                      padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem',
                      borderBottom: '1px solid #f3f4f6',
                      display: 'flex', justifyContent: 'space-between'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    <span style={{ fontWeight: 500 }}>{c.nome}</span>
                    <span style={{ color: 'var(--cinza-500)', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                      {formatarCPF(c.cpf)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={estilos.formGroup}>
            <label style={estilos.label}>Data Início</label>
            <input type="date" value={histDataInicio} onChange={e => setHistDataInicio(e.target.value)} style={estilos.input} />
          </div>
          <div style={estilos.formGroup}>
            <label style={estilos.label}>Data Fim</label>
            <input type="date" value={histDataFim} onChange={e => setHistDataFim(e.target.value)} style={estilos.input} />
          </div>
          <button
            style={{ ...estilos.btnGerar, opacity: loadingRel === 'historico' ? 0.6 : !histColabId ? 0.5 : 1 }}
            onClick={gerarRelHistoricoColaborador}
            disabled={!!loadingRel || !histColabId}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {loadingRel === 'historico' ? 'Gerando...' : 'Gerar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RelatoriosPage;
