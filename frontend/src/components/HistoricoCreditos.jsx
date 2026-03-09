/**
 * Componente: HistoricoCreditos
 * Histórico de gerações de crédito
 */

import React from 'react';

const HistoricoCreditos = ({ clienteId, historico, loading }) => {
  /**
   * Formata data
   */
  const formatarData = (dataStr) => {
    if (!dataStr) return '-';
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Formata moeda
   */
  const formatarMoeda = (valor) => {
    if (!valor) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <div className="card historico-creditos">
      <div className="card-header">
        <div>
          <div className="card-title">Histórico de Gerações</div>
          <div className="card-subtitle">Ultimas operações de crédito</div>
        </div>
      </div>

      <div className="divider"></div>

      {loading && (
        <div className="loading">Carregando histórico...</div>
      )}

      {!loading && historico.length === 0 && (
        <div className="vazio">
          <p>Nenhuma geração de crédito encontrada.</p>
        </div>
      )}

      {!loading && historico.length > 0 && (
        <div className="table-wrapper">
          <table className="tabela-historico">
            <thead>
              <tr>
                <th>Data</th>
                <th>Remessa ID</th>
                <th>Tipo</th>
                <th className="align-right">Colaboradores</th>
                <th className="align-right">Valor Total</th>
                <th>Criado por</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((item, idx) => (
                <tr key={idx} className="historico-linha">
                  <td>{formatarData(item.data_criacao)}</td>
                  <td className="codigo">#{item.remessa_id}</td>
                  <td>
                    <span className="badge badge-tipo">
                      {item.tipo_credito}
                    </span>
                  </td>
                  <td className="align-right">
                    <strong>{item.total_colaboradores}</strong>
                  </td>
                  <td className="align-right valor-destaque">
                    {formatarMoeda(item.valor_total)}
                  </td>
                  <td className="usuario">
                    {item.criado_por || 'Sistema'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HistoricoCreditos;
