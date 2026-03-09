/**
 * Componente: CreditoForm
 * Sistema de Geração de Crédito - BR GORJETA
 */

import React, { useState, useEffect } from 'react';
import './CreditoForm.css';

import TabImportarExcel from './TabImportarExcel';
import TabSelecaoManual from './TabSelecaoManual';
import PreviewCredito from './PreviewCredito';

import { useFetchColaboradores } from '../hooks/useFetchColaboradores';
import { useCredito } from '../hooks/useCredito';

const CreditoForm = ({ clienteId }) => {
  const [abaAtiva, setAbaAtiva] = useState('manual');
  const [etapa, setEtapa] = useState('selecao');
  const [colaboradoresSelecionados, setColaboradoresSelecionados] = useState([]);

  const colaboradoresHook = useFetchColaboradores(clienteId);
  const creditoHook = useCredito(clienteId);

  useEffect(() => {
    if (clienteId) {
      if (abaAtiva === 'manual') {
        colaboradoresHook.buscar();
      }
    }
  }, [clienteId, abaAtiva]);

  if (!clienteId) {
    return (
      <div className="credito-container">
        <div className="card">
          <div className="alert alert-erro">
            cliente_id não fornecido na URL
          </div>
        </div>
      </div>
    );
  }

  const irParaPreview = (colaboradores) => {
    if (colaboradores.length === 0) {
      alert('Selecione pelo menos 1 colaborador');
      return;
    }
    setColaboradoresSelecionados(colaboradores);
    setEtapa('preview');
  };

  const voltarParaSelecao = () => {
    setEtapa('selecao');
    setColaboradoresSelecionados([]);
  };

  const renderizarAba = () => {
    if (etapa === 'preview') {
      return (
        <PreviewCredito
          clienteId={clienteId}
          colaboradores={colaboradoresSelecionados}
          creditoHook={creditoHook}
          onVoltar={voltarParaSelecao}
          onSucesso={() => {
            voltarParaSelecao();
          }}
        />
      );
    }

    if (abaAtiva === 'manual') {
      return (
        <TabSelecaoManual
          clienteId={clienteId}
          colaboradoresHook={colaboradoresHook}
          onProximo={irParaPreview}
        />
      );
    }

    if (abaAtiva === 'excel') {
      return (
        <TabImportarExcel
          clienteId={clienteId}
          colaboradoresHook={colaboradoresHook}
          onProximo={irParaPreview}
        />
      );
    }

    return null;
  };

  return (
    <div className="credito-container">
        {/* Card Principal */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                {etapa === 'preview' ? 'Confirmar Geração' : 'Geração de Crédito'}
              </h2>
              <p className="card-subtitle">
                {etapa === 'preview'
                  ? 'Revise os dados e confirme a geração de crédito'
                  : 'Selecione colaboradores e configure os valores'}
              </p>
            </div>
          </div>

          <div className="divider"></div>

          {/* Abas */}
          {etapa === 'selecao' && (
            <div className="tabs">
              <button
                className={`tab ${abaAtiva === 'manual' ? 'ativa' : ''}`}
                onClick={() => setAbaAtiva('manual')}
              >
                Seleção Manual
              </button>
              <button
                className={`tab ${abaAtiva === 'excel' ? 'ativa' : ''}`}
                onClick={() => setAbaAtiva('excel')}
              >
                Importar Excel
              </button>
            </div>
          )}

          {/* Conteúdo */}
          <div className="tab-content">
            {renderizarAba()}
          </div>
        </div>

    </div>
  );
};

export default CreditoForm;
