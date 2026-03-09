/**
 * Componente: PreviewCredito
 * Preview e confirmação de geração de crédito
 * Valores são editáveis diretamente na tabela
 */

import React, { useState } from 'react';

const PreviewCredito = ({ clienteId, colaboradores: colaboradoresIniciais, onVoltar, onSucesso, creditoHook }) => {
  // Estado local com valores editáveis por colaborador
  const [colaboradores, setColaboradores] = useState(
    colaboradoresIniciais.map(c => ({
      ...c,
      valor: c.valor !== undefined && c.valor !== null && c.valor !== '' && c.valor !== 0
        ? String(c.valor)
        : ''
    }))
  );

  const [valorUniforme, setValorUniforme] = useState('');
  const [mesmoValor, setMesmoValor] = useState(false);
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
   * Aplica valor uniforme a todos
   */
  const aplicarValorUniforme = (valor) => {
    setValorUniforme(valor);
    if (mesmoValor) {
      setColaboradores(prev => prev.map(c => ({ ...c, valor })));
    }
  };

  /**
   * Toggle mesmo valor
   */
  const handleMesmoValor = (checked) => {
    setMesmoValor(checked);
    if (checked && valorUniforme) {
      setColaboradores(prev => prev.map(c => ({ ...c, valor: valorUniforme })));
    }
  };

  /**
   * Calcula valor total
   */
  const calcularTotal = () => {
    return colaboradores.reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);
  };

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
      colaboradores: colaboradores.map(c => ({
        id: c.id || 0,
        cpf: c.cpf || '',
        nome: c.nome || '',
        valor: parseFloat(c.valor)
      })),
      aplicar_mesmo_valor: mesmoValor
    };

    const dados = await creditoHook.gerar(payload);
    if (dados) {
      // Mostra mensagem de sucesso com dados do retorno da API
      setSucesso({
        total_inseridos: dados.total_inseridos || colaboradores.length,
        valor_total: dados.valor_total || calcularTotal(),
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

  const total = calcularTotal();
  const todosPreenchidos = colaboradores.every(c => c.valor && parseFloat(c.valor) > 0);

  // Modal de sucesso
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
          {/* Ícone de sucesso */}
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
            Crédito gerado com sucesso!
          </h3>

          <p style={{ margin: '0 0 24px', color: '#6b7280', fontSize: '0.9rem' }}>
            Os créditos foram inseridos no sistema.
          </p>

          {/* Detalhes */}
          <div style={{
            display: 'flex',
            gap: '24px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: '32px'
          }}>
            <div style={{
              background: '#f3f4f6',
              borderRadius: '10px',
              padding: '16px 24px',
              minWidth: '140px'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Registros
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                {sucesso.total_inseridos || colaboradores.length}
              </div>
            </div>

            <div style={{
              background: '#f3f4f6',
              borderRadius: '10px',
              padding: '16px 24px',
              minWidth: '140px'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Valor Total
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#4A1D4F' }}>
                R$ {(sucesso.valor_total || total).toFixed(2)}
              </div>
            </div>

            {sucesso.remessa_id && (
              <div style={{
                background: '#f3f4f6',
                borderRadius: '10px',
                padding: '16px 24px',
                minWidth: '140px'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ID da Remessa
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                  {sucesso.remessa_id}
                </div>
              </div>
            )}
          </div>

          {/* Botão fechar */}
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

      {/* Valor uniforme */}
      <div className="secao" style={{ padding: '16px' }}>
        <div className="grupo-form checkbox" style={{ margin: 0 }}>
          <input
            type="checkbox"
            id="mesmoValor"
            checked={mesmoValor}
            onChange={(e) => handleMesmoValor(e.target.checked)}
            disabled={creditoHook.creditoLoading}
          />
          <label htmlFor="mesmoValor">Aplicar mesmo valor para todos</label>
        </div>

        {mesmoValor && (
          <div className="grupo-form" style={{ marginTop: '12px', marginBottom: 0, maxWidth: '250px' }}>
            <label>Valor (R$):</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={valorUniforme}
              onChange={(e) => aplicarValorUniforme(e.target.value)}
              disabled={creditoHook.creditoLoading}
            />
          </div>
        )}
      </div>

      {/* Tabela de Colaboradores com valores editáveis */}
      <div className="tabela-preview">
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Nome</th>
              <th>CPF</th>
              <th>Cargo</th>
              <th className="align-right" style={{ width: '150px' }}>Valor (R$)</th>
            </tr>
          </thead>
          <tbody>
            {colaboradores.map((colab, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>{colab.nome}</td>
                <td>{colab.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</td>
                <td>{colab.cargo || '-'}</td>
                <td className="align-right">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={colab.valor}
                    onChange={(e) => handleValorChange(idx, e.target.value)}
                    disabled={creditoHook.creditoLoading || mesmoValor}
                    style={{
                      width: '120px',
                      textAlign: 'right',
                      padding: '6px 8px',
                      fontSize: '0.85rem'
                    }}
                  />
                </td>
              </tr>
            ))}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Valor Total</span>
            <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#4A1D4F' }}>
              R$ {total.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="acoes">
        <button
          className="btn-secundario"
          onClick={onVoltar}
          disabled={creditoHook.creditoLoading}
        >
          Voltar
        </button>
        <button
          className="btn-primario"
          onClick={handleGerar}
          disabled={creditoHook.creditoLoading || !todosPreenchidos}
        >
          {creditoHook.creditoLoading ? 'Gerando...' : 'Gerar Crédito'}
        </button>
      </div>
    </div>
  );
};

export default PreviewCredito;
