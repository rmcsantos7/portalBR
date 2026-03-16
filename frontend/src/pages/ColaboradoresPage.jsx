/**
 * Página de Gestão de Colaboradores
 * Obtém cliente_id do token JWT via AuthContext
 */

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import ColaboradoresManager from '../components/ColaboradoresManager';

const ColaboradoresPage = () => {
  const { usuario } = useAuth();
  const clienteId = usuario?.crd_cli_id;
  const login = usuario?.usr_login || 'sistema';

  if (!clienteId) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
        Erro: cliente não identificado. Faça login novamente.
      </div>
    );
  }

  return <ColaboradoresManager clienteId={clienteId} login={login} />;
};

export default ColaboradoresPage;
