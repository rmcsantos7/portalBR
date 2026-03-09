/**
 * Componente: TableColaboradores
 * Tabela com checkboxes para seleção e campo de valor editável
 */

import React from 'react';

const TableColaboradores = ({ colaboradores, selecionados, onToggle, valores, onValorChange, pagination, total }) => {
  /**
   * Mascara CPF
   */
  const mascaraCPF = (cpf) => {
    if (!cpf) return '-';
    const limpo = cpf.replace(/\D/g, '');
    return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  return (
    <div className="table-colaboradores">
      <table>
        <thead>
          <tr>
            <th style={{ width: '40px' }}>
              <input
                type="checkbox"
                checked={colaboradores.length > 0 && colaboradores.every(c => selecionados[c.id])}
                onChange={() => {
                  colaboradores.forEach(c => {
                    if (!selecionados[c.id]) onToggle(c.id);
                  });
                }}
              />
            </th>
            <th>Nome</th>
            <th>CPF</th>
            <th>Cargo</th>
            <th className="align-right" style={{ width: '140px' }}>Valor (R$)</th>
          </tr>
        </thead>
        <tbody>
          {colaboradores.map((colab) => (
            <tr key={colab.id} className={selecionados[colab.id] ? 'selecionada' : ''}>
              <td>
                <input
                  type="checkbox"
                  checked={!!selecionados[colab.id]}
                  onChange={() => onToggle(colab.id)}
                />
              </td>
              <td>{colab.nome}</td>
              <td>{mascaraCPF(colab.cpf)}</td>
              <td>{colab.cargo || '-'}</td>
              <td className="align-right">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={valores[colab.id] || ''}
                  onChange={(e) => onValorChange(colab.id, e.target.value)}
                  disabled={!selecionados[colab.id]}
                  style={{
                    width: '110px',
                    textAlign: 'right',
                    padding: '5px 8px',
                    fontSize: '0.85rem',
                    opacity: selecionados[colab.id] ? 1 : 0.4
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Paginação info */}
      <div className="pagination-info">
        <span>
          Exibindo {colaboradores.length} de {total} resultados
          {pagination && ` (página ${pagination.page + 1})`}
        </span>
      </div>
    </div>
  );
};

export default TableColaboradores;
