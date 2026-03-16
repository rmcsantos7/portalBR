/**
 * Página de Créditos
 * Obtém cliente_id do token JWT via AuthContext
 */

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import CreditoForm from '../components/CreditoForm';

const CreditoPage = () => {
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

  return <CreditoForm clienteId={clienteId} login={login} />;
};

export default CreditoPage;
