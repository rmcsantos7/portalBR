/**
 * Componente: PreviewCredito
 * Preview e confirmação de geração de crédito
 * Mostra valor bruto, desconto da taxa e valor líquido por colaborador
 */

import React, { useState } from 'react';

const PreviewCredito = ({ clienteId, colaboradores: colaboradoresIniciais, onVoltar, onSucesso, creditoHook, taxa = 0 }) => {
  /**
   * Formata CPF com máscara 000.000.000-00
   */
  const formatarCPF = (cpf) => {
    if (!cpf) return '-';
    const limpo = cpf.replace(/\D/g, '');
    if (limpo.length === 11) {
      return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
  };
  // Estado local com valores editáveis por colaborador
  const [colaboradores, setColaboradores] = useState(
    colaboradoresIniciais.map(c => ({
      ...c,
      valor: c.valor !== undefined && c.valor !== null && c.valor !== '' && c.valor !== 0
        ? String(c.valor)
        : ''
    }))
  );

  const [tituloRecarga, setTituloRecarga] = useState('');
  const [sucesso, setSucesso] = useState(null);

  /**
   * Atualiza valor de um colaborador específico
   */
  const handleValorChange = (idx, novoValor) => {
    setColaboradores(prev => prev.map((c, i) =>
      i === idx ? { ...c, valor: novoValor } : c
    ));
  };

  /**
   * Calcula valor líquido após desconto da taxa
   */
  const calcularLiquido = (valorBruto) => {
    const v = parseFloat(valorBruto) || 0;
    if (taxa > 0) {
      return Math.round((v - (v * taxa / 100)) * 100) / 100;
    }
    return v;
  };

  /**
   * Calcula desconto da taxa
   */
  const calcularDesconto = (valorBruto) => {
    const v = parseFloat(valorBruto) || 0;
    if (taxa > 0) {
      return Math.round((v * taxa / 100) * 100) / 100;
    }
    return 0;
  };

  /**
   * Calcula totais
   */
  const totalBruto = colaboradores.reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);
  const totalDesconto = colaboradores.reduce((acc, c) => acc + calcularDesconto(c.valor), 0);
  const totalLiquido = colaboradores.reduce((acc, c) => acc + calcularLiquido(c.valor), 0);

  /**
   * Gera crédito
   */
  const handleGerar = async () => {
    // Valida que todos têm valor
    const semValor = colaboradores.filter(c => !c.valor || parseFloat(c.valor) <= 0);
    if (semValor.length > 0) {
      alert(`${semValor.length} colaborador(es) sem valor definido. Preencha todos os valores.`);
      return;
    }

    // Limpa erro anterior
    creditoHook.limparErro();

    const payload = {
      titulo: tituloRecarga.trim() || null,
      colaboradores: colaboradores.map(c => ({
        id: c.id || 0,
        cpf: c.cpf || '',
        nome: c.nome || '',
        valor: parseFloat(c.valor)
      })),
    };

    const dados = await creditoHook.gerar(payload);
    if (dados) {
      setSucesso({
        total_inseridos: dados.total_inseridos || colaboradores.length,
        valor_total: dados.valor_total || totalLiquido,
        valor_bruto: totalBruto,
        valor_desconto: totalDesconto,
        valor_liquido: totalLiquido,
        remessa_id: dados.remessa_id || null
      });
    }
  };

  /**
   * Fecha modal de sucesso e volta
   */
  const handleFecharSucesso = () => {
    setSucesso(null);
    creditoHook.limparSucesso();
    onSucesso();
  };

  const todosPreenchidos = colaboradores.every(c => c.valor && parseFloat(c.valor) > 0);

  // Tela de sucesso
  if (sucesso) {
    return (
      <div className="preview-credito">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '40px 20px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h3 style={{ margin: '0 0 8px', fontSize: '1.3rem', color: '#111827' }}>
            Recarga gerada com sucesso!
          </h3>

          <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: '0.9rem' }}>
            A recarga foi inserida no sistema.
          </p>

          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '32px'
          }}>
            <div style={{ background: '#f3f4f6', borderRadius: '10px', padding: '16px 24px', minWidth: '120px' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Registros
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                {sucesso.total_inseridos || colaboradores.length}
              </div>
            </div>

            {sucesso.remessa_id && (
              <div style={{ background: '#f3f4f6', borderRadius: '10px', padding: '16px 24px', minWidth: '120px' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ID da Remessa
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                  {sucesso.remessa_id}
                </div>
              </div>
            )}

            <div style={{ background: '#f3f4f6', borderRadius: '10px', padding: '16px 24px', minWidth: '120px' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Valor Bruto
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#374151' }}>
                R$ {sucesso.valor_bruto.toFixed(2)}
              </div>
            </div>

            {taxa > 0 && (
              <>
                <div style={{ background: '#fef2f2', borderRadius: '10px', padding: '16px 24px', minWidth: '120px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#dc2626', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Tar. Conv. ({taxa}%)
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
                    - R$ {sucesso.valor_desconto.toFixed(2)}
                  </div>
                </div>
              </>
            )}

            <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '16px 24px', minWidth: '120px' }}>
              <div style={{ fontSize: '0.75rem', color: '#059669', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Valor Líquido
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#4A1D4F' }}>
                R$ {sucesso.valor_liquido.toFixed(2)}
              </div>
            </div>
          </div>

          <button
            className="btn-primario"
            onClick={handleFecharSucesso}
            style={{ minWidth: '200px' }}
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-credito">
      {/* Erro da API */}
      {creditoHook.creditoError && (
        <div className="alert alert-erro">
          {creditoHook.creditoError}
        </div>
      )}

      {/* Info da taxa */}
      {taxa > 0 && (
        <div style={{
          padding: '10px 16px',
          background: '#fef3c7',
          border: '1px solid #fcd34d',
          borderRadius: '8px',
          marginBottom: '12px',
          fontSize: '0.85rem',
          color: '#92400e'
        }}>
          Tarifa convênio aplicada: <strong>{taxa}%</strong>
        </div>
      )}

      {/* Legenda */}
      {taxa > 0 && (
        <div style={{
          padding: '8px 14px',
          background: '#f9fafb',
          border: '1px solid var(--cinza-300)',
          borderRadius: '8px',
          marginBottom: '12px',
          fontSize: '0.78rem',
          color: 'var(--cinza-600)',
          lineHeight: '1.6'
        }}>
          <strong>Valor Bruto:</strong> corresponde ao valor final apresentado no boleto. &nbsp;|&nbsp;
          <strong>Tarifa Convênio:</strong> valor definido conforme acordo coletivo. &nbsp;|&nbsp;
          <strong>Valor Líquido:</strong> valor que será distribuído entre os colaboradores.
        </div>
      )}

      {/* Título da recarga */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--cinza-700)', marginBottom: '6px' }}>
          Título da recarga <span style={{ fontWeight: '400', color: 'var(--cinza-500)' }}>(opcional, máx. 40 caracteres)</span>
        </label>
        <input
          type="text"
          maxLength={40}
          placeholder="Ex: Recarga mensal março"
          value={tituloRecarga}
          onChange={(e) => setTituloRecarga(e.target.value)}
          disabled={creditoHook.creditoLoading}
          style={{ width: '100%', maxWidth: '400px', padding: '8px 12px', borderRadius: '8px', fontSize: '0.9rem' }}
        />
        <div style={{ fontSize: '0.72rem', color: 'var(--cinza-500)', marginTop: '4px' }}>
          {tituloRecarga.length}/40
        </div>
      </div>

      {/* Tabela de Colaboradores com valores editáveis */}
      <div className="tabela-preview">
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Nome</th>
              <th>CPF</th>
              <th className="align-right" style={{ width: '130px' }}>Valor Bruto (R$)</th>
              {taxa > 0 && (
                <>
                  <th className="align-right" style={{ width: '110px' }}>Tar. Conv.</th>
                  <th className="align-right" style={{ width: '110px' }}>Líquido</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {colaboradores.map((colab, idx) => {
              const valorBruto = parseFloat(colab.valor) || 0;
              const desconto = calcularDesconto(colab.valor);
              const liquido = calcularLiquido(colab.valor);

              return (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{colab.nome}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--cinza-600)' }}>{formatarCPF(colab.cpf)}</td>
                  <td className="align-right">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={colab.valor}
                      onChange={(e) => handleValorChange(idx, e.target.value)}
                      disabled={creditoHook.creditoLoading}
                      style={{
                        width: '110px',
                        textAlign: 'right',
                        padding: '6px 8px',
                        fontSize: '0.85rem'
                      }}
                    />
                  </td>
                  {taxa > 0 && (
                    <>
                      <td className="align-right" style={{ color: '#dc2626', fontSize: '0.85rem' }}>
                        {valorBruto > 0 ? `- ${desconto.toFixed(2)}` : '-'}
                      </td>
                      <td className="align-right" style={{ fontWeight: '600', fontSize: '0.85rem', color: '#059669' }}>
                        {valorBruto > 0 ? liquido.toFixed(2) : '-'}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {colaboradores.length > 50 && (
          <p className="txt-info">
            Exibindo {Math.min(colaboradores.length, 50)} de {colaboradores.length} colaboradores
          </p>
        )}
      </div>

      {/* Resumo */}
      <div className="secao resumo-final" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
              {colaboradores.length} colaborador(es)
            </span>
            {!todosPreenchidos && (
              <span style={{ fontSize: '0.8rem', color: '#d97706', marginLeft: '12px' }}>
                Preencha todos os valores para continuar
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            {taxa > 0 && (
              <>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Valor Total do Boleto</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#374151' }}>
                    {totalBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>Tar. Conv. ({taxa}%)</span>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: '#dc2626' }}>
                    - {totalDesconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
              </>
            )}
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{taxa > 0 ? 'Valor Líquido' : 'Valor Total'}</span>
              <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#4A1D4F' }}>
                R$ {totalLiquido.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="acoes">
        <button
          className="btn-voltar"
          onClick={onVoltar}
          disabled={creditoHook.creditoLoading}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Voltar
        </button>
        <button
          className="btn-primario"
          onClick={handleGerar}
          disabled={creditoHook.creditoLoading || !todosPreenchidos}
        >
          {creditoHook.creditoLoading ? 'Gerando...' : 'Gerar Recarga'}
        </button>
      </div>
    </div>
  );
};

export default PreviewCredito;
