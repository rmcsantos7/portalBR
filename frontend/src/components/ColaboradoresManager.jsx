/**
 * ColaboradoresManager
 * Componente orquestrador: lista ↔ formulário de colaboradores
 */

import React, { useState } from 'react';
import ListaColaboradoresGestao from './ListaColaboradoresGestao';
import FormColaborador from './FormColaborador';
import '../components/CreditoForm.css';

const ColaboradoresManager = ({ clienteId, login = 'sistema' }) => {
  const [tela, setTela] = useState('lista'); // 'lista' | 'form'
  const [colaboradorId, setColaboradorId] = useState(null); // null = novo, id = edição

  const abrirNovo = () => {
    setColaboradorId(null);
    setTela('form');
  };

  const abrirEdicao = (id) => {
    setColaboradorId(id);
    setTela('form');
  };

  const voltarParaLista = () => {
    setColaboradorId(null);
    setTela('lista');
  };

  return (
    <div className="credito-container">
      {tela === 'lista' && (
        <div className="card">
          <ListaColaboradoresGestao
            clienteId={clienteId}
            onNovoColaborador={abrirNovo}
            onAbrirColaborador={abrirEdicao}
          />
        </div>
      )}

      {tela === 'form' && (
        <div className="card">
          <FormColaborador
            clienteId={clienteId}
            colaboradorId={colaboradorId}
            login={login}
            onVoltar={voltarParaLista}
          />
        </div>
      )}
    </div>
  );
};

export default ColaboradoresManager;
