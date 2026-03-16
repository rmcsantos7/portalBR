/**
 * Componente: DetalheRecarga
 * Detalhe completo de uma remessa — cabeçalho, resumo e lista de colaboradores
 */

import React, { useState, useEffect } from 'react';
import { creditosAPI } from '../services/api';
import { gerarPdfRemessa } from '../utils/pdfGenerator';

const DetalheRecarga = ({ clienteId, remessaId, onVoltar }) => {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (clienteId && remessaId) {
      carregarDetalhes();
    }
  }, [clienteId, remessaId]);

  const carregarDetalhes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await creditosAPI.obterDetalheRemessa(clienteId, remessaId);
      setDados(response.data.data);
    } catch (err) {
      setError('Erro ao carregar detalhes da remessa');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data) => {
    if (!data) return '-';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatarMoeda = (valor) => {
    return (parseFloat(valor) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatarCPF = (cpf) => {
    if (!cpf) return '-';
    const limpo = cpf.replace(/\D/g, '');
    if (limpo.length === 11) {
      return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
  };

  // Loading
  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--cinza-500)' }}>
        <div style={{
          width: '40px', height: '40px', margin: '0 auto 16px',
          border: '3px solid var(--cinza-300)', borderTopColor: 'var(--roxo)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite'
        }} />
        Carregando detalhes da remessa...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Erro
  if (error) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div className="alert alert-erro" style={{ display: 'inline-block' }}>{error}</div>
        <div style={{ marginTop: '16px' }}>
          <button className="btn-voltar" onClick={onVoltar} style={{ marginRight: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Voltar
          </button>
          <button className="btn-selecionar" onClick={carregarDetalhes}>Tentar novamente</button>
        </div>
      </div>
    );
  }

  if (!dados) return null;

  const taxa = dados.taxa || 0;
  const totalDesconto = taxa > 0 ? Math.round((dados.valor_bruto - dados.valor_liquido) * 100) / 100 : 0;

  return (
    <div className="detalhe-recarga">
      <button className="btn-voltar" onClick={onVoltar}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Voltar
      </button>

      <div className="page-header">
        <div>
          <div className="page-header-info" style={{ marginBottom: '4px' }}>
            <h2 className="page-title">Remessa #{remessaId}</h2>
            <span className="badge badge-ativo">PROCESSADA</span>
          </div>
          <p className="page-subtitle">Detalhes completos da recarga</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn-secundario" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => alert('Funcionalidade em desenvolvimento')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            Nota Fiscal
          </button>
          <button className="btn-secundario" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => alert('Funcionalidade em desenvolvimento')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Boleto
          </button>
          <button className="btn-secundario" style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => gerarPdfRemessa({ ...dados, remessa_id: remessaId })}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Relatório
          </button>
        </div>
      </div>

      {/* Info Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {/* Empresa */}
        {dados.restaurante && (
          <div className="section-card" style={{ marginBottom: 0 }}>
            <div className="form-label-upper">Empresa</div>
            <div className="info-value">{dados.restaurante}</div>
          </div>
        )}

        {/* Título da Remessa */}
        {dados.titulo && (
          <div className="section-card" style={{ marginBottom: 0 }}>
            <div className="form-label-upper">Título</div>
            <div className="info-value">{dados.titulo}</div>
          </div>
        )}

        {/* Operador */}
        <div className="section-card" style={{ marginBottom: 0 }}>
          <div className="form-label-upper">Operador</div>
          <div className="info-value">{dados.criado_por || '-'}</div>
        </div>

        {/* Data */}
        <div className="section-card" style={{ marginBottom: 0 }}>
          <div className="form-label-upper">Data de Criação</div>
          <div className="info-value">{formatarData(dados.data_criacao)}</div>
        </div>

        {/* Total Colaboradores */}
        <div className="section-card" style={{ marginBottom: 0 }}>
          <div className="form-label-upper">Colaboradores</div>
          <div className="info-value" style={{ fontWeight: '700', color: 'var(--roxo)' }}>{dados.total_colaboradores}</div>
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {/* Valor Bruto */}
        <div style={{
          flex: 1, minWidth: '160px',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #f3f4f6 100%)',
          border: '1px solid var(--cinza-300)',
          borderRadius: '12px', padding: '18px 20px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--cinza-500)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
            Valor Bruto
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--cinza-800)' }}>
            {formatarMoeda(dados.valor_bruto)}
          </div>
        </div>

        {/* Taxa */}
        {taxa > 0 && (
          <div style={{
            flex: 1, minWidth: '160px',
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fecaca',
            borderRadius: '12px', padding: '18px 20px', textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.7rem', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
              Tar. Conv. ({taxa}%)
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#dc2626' }}>
              - {formatarMoeda(totalDesconto)}
            </div>
          </div>
        )}

        {/* Valor Líquido */}
        <div style={{
          flex: 1, minWidth: '160px',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: '1px solid #bbf7d0',
          borderRadius: '12px', padding: '18px 20px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.7rem', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
            Valor Líquido
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--roxo)' }}>
            {formatarMoeda(dados.valor_liquido)}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div style={{
        padding: '10px 14px',
        background: '#f9fafb',
        border: '1px solid var(--cinza-300)',
        borderRadius: '8px',
        marginBottom: '20px',
        fontSize: '0.78rem',
        color: 'var(--cinza-600)',
        lineHeight: '1.6'
      }}>
        <strong>Valor Bruto:</strong> corresponde ao valor final apresentado no boleto. &nbsp;|&nbsp;
        <strong>Tarifa Convênio:</strong> valor definido conforme acordo coletivo. &nbsp;|&nbsp;
        <strong>Valor Líquido:</strong> valor que será distribuído entre os colaboradores.
      </div>

      {/* Tabela de Colaboradores */}
      <div style={{ marginBottom: '8px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: '700', color: 'var(--cinza-800)' }}>
          Colaboradores ({dados.colaboradores?.length || 0})
        </h3>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--cinza-300)' }}>
        <table style={{ minWidth: '600px' }}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Nome</th>
              <th style={{ width: '140px' }}>CPF</th>
              {taxa > 0 && (
                <>
                  <th className="align-right" style={{ width: '120px' }}>Bruto</th>
                  <th className="align-right" style={{ width: '100px' }}>Tar. Conv.</th>
                </>
              )}
              <th className="align-right" style={{ width: '130px' }}>
                {taxa > 0 ? 'Líquido' : 'Valor'}
              </th>
            </tr>
          </thead>
          <tbody>
            {(dados.colaboradores || []).map((colab, idx) => {
              const desconto = colab.valor_bruto - colab.valor_liquido;
              return (
                <tr key={colab.credito_id || idx}>
                  <td style={{ color: 'var(--cinza-500)', fontSize: '0.8rem' }}>{idx + 1}</td>
                  <td style={{ fontWeight: '500' }}>{colab.nome || '-'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--cinza-600)' }}>
                    {formatarCPF(colab.cpf)}
                  </td>
                  {taxa > 0 && (
                    <>
                      <td className="align-right" style={{ fontWeight: '500', color: 'var(--cinza-800)' }}>
                        {formatarMoeda(colab.valor_bruto)}
                      </td>
                      <td className="align-right" style={{ fontSize: '0.85rem', color: '#dc2626' }}>
                        {desconto > 0 ? `- ${formatarMoeda(desconto)}` : '-'}
                      </td>
                    </>
                  )}
                  <td className="align-right" style={{ fontWeight: '700', color: 'var(--sucesso)', fontSize: '0.95rem' }}>
                    {formatarMoeda(colab.valor_liquido)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Footer com totais */}
          <tfoot>
            <tr style={{ background: 'var(--cinza-100)', fontWeight: '700' }}>
              <td colSpan={taxa > 0 ? 3 : 3} style={{ textAlign: 'right', paddingRight: '12px', color: 'var(--cinza-600)', fontSize: '0.85rem' }}>
                TOTAIS
              </td>
              {taxa > 0 && (
                <>
                  <td className="align-right" style={{ color: 'var(--cinza-800)' }}>
                    {formatarMoeda(dados.valor_bruto)}
                  </td>
                  <td className="align-right" style={{ color: '#dc2626', fontSize: '0.85rem' }}>
                    - {formatarMoeda(totalDesconto)}
                  </td>
                </>
              )}
              <td className="align-right" style={{ color: 'var(--roxo)', fontSize: '1rem' }}>
                {formatarMoeda(dados.valor_liquido)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default DetalheRecarga;
