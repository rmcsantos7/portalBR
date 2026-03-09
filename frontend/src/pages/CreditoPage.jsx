/**
 * Página Principal - CreditoPage
 * Extrai cliente_id da URL e renderiza CreditoForm
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CreditoForm from '../components/CreditoForm';

const CreditoPage = () => {
  const [searchParams] = useSearchParams();
  const [clienteId, setClienteId] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const id = searchParams.get('cliente_id');

    if (!id) {
      setErro('Erro: cliente_id não foi fornecido na URL. Use: ?cliente_id=1');
      return;
    }

    if (!/^\d+$/.test(id) || parseInt(id) <= 0) {
      setErro('Erro: cliente_id deve ser um número positivo válido.');
      return;
    }

    setClienteId(parseInt(id));
    setErro(null);
  }, [searchParams]);

  if (erro) {
    return (
      <div className="pagina-credito">
        <div className="credito-container" style={{ paddingTop: '60px' }}>
          <div className="card">
            <div className="alert alert-erro">{erro}</div>
            <div style={{ background: '#f9fafb', padding: '24px', borderRadius: '8px', marginTop: '16px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem' }}>Como usar:</h3>
              <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
                Acesse esta página com um cliente_id válido:
              </p>
              <code style={{
                display: 'block', background: '#fff', padding: '12px', borderRadius: '6px',
                margin: '8px 0', fontFamily: 'monospace', borderLeft: '3px solid #F9678C'
              }}>
                /credito?cliente_id=7
              </code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return clienteId ? <CreditoForm clienteId={clienteId} /> : null;
};

export default CreditoPage;
