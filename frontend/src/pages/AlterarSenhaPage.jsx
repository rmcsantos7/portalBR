/**
 * Página Alterar Senha (dentro do portal logado)
 * Permite ao usuário alterar sua senha voluntariamente
 */

import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function AlterarSenhaPage() {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { atualizarToken } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');

    if (!senhaAtual.trim() || !novaSenha.trim() || !confirmar.trim()) {
      setErro('Preencha todos os campos');
      return;
    }

    if (novaSenha.length < 6) {
      setErro('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (!/[A-Z]/.test(novaSenha)) {
      setErro('A nova senha deve ter pelo menos uma letra maiúscula');
      return;
    }

    if (!/[0-9]/.test(novaSenha)) {
      setErro('A nova senha deve ter pelo menos um número');
      return;
    }

    if (!/[^A-Za-z0-9]/.test(novaSenha)) {
      setErro('A nova senha deve ter pelo menos um caractere especial');
      return;
    }

    if (novaSenha !== confirmar) {
      setErro('As senhas não conferem');
      return;
    }

    if (novaSenha === senhaAtual) {
      setErro('A nova senha deve ser diferente da atual');
      return;
    }

    setEnviando(true);
    try {
      const res = await api.post('/auth/trocar-senha', {
        senha_atual: senhaAtual,
        nova_senha: novaSenha
      });
      if (res.data?.data?.token) {
        atualizarToken(res.data.data.token);
      }
      setSucesso('Senha alterada com sucesso!');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmar('');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Erro ao alterar senha';
      setErro(msg);
    } finally {
      setEnviando(false);
    }
  };

  const estilos = {
    page: { maxWidth: '500px', margin: '0 auto' },
    card: {
      background: '#fff',
      border: '1px solid var(--cinza-300)',
      borderRadius: '12px',
      padding: '28px 32px',
    },
    field: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      marginBottom: '16px',
    },
    label: {
      fontSize: '0.8rem',
      fontWeight: 600,
      color: 'var(--cinza-600)',
    },
    input: {
      padding: '10px 12px',
      fontSize: '0.9rem',
      border: '1px solid var(--cinza-300)',
      borderRadius: '8px',
      background: '#fff',
      outline: 'none',
      transition: 'border-color 0.2s',
    },
    btn: {
      width: '100%',
      padding: '12px',
      fontSize: '0.9rem',
      fontWeight: 700,
      background: 'var(--roxo)',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      marginTop: '8px',
      transition: 'opacity 0.2s',
    },
  };

  return (
    <div style={estilos.page}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Alterar Senha</h2>
          <p className="page-subtitle">Atualize sua senha de acesso ao portal</p>
        </div>
      </div>

      <div style={estilos.card}>
        {erro && (
          <div className="alert alert-erro" style={{ marginBottom: '16px', padding: '10px 14px', fontSize: '0.85rem' }}>
            {erro}
          </div>
        )}
        {sucesso && (
          <div className="alert alert-sucesso" style={{ marginBottom: '16px', padding: '10px 14px', fontSize: '0.85rem' }}>
            {sucesso}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={estilos.field}>
            <label style={estilos.label}>Senha Atual</label>
            <input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              placeholder="Digite sua senha atual"
              style={estilos.input}
              disabled={enviando}
            />
          </div>

          <div style={estilos.field}>
            <label style={estilos.label}>Nova Senha</label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Digite a nova senha"
              style={estilos.input}
              disabled={enviando}
            />
            <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', fontSize: '12px' }}>
              {[
                { ok: novaSenha.length >= 6, label: 'Mínimo 6 caracteres' },
                { ok: /[A-Z]/.test(novaSenha), label: 'Uma letra maiúscula' },
                { ok: /[0-9]/.test(novaSenha), label: 'Um número' },
                { ok: /[^A-Za-z0-9]/.test(novaSenha), label: 'Um caractere especial' },
              ].map((req, i) => (
                <li key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  color: req.ok ? '#15803d' : 'var(--cinza-500)',
                  marginBottom: '2px'
                }}>
                  <span>{req.ok ? '✓' : '○'}</span>
                  {req.label}
                </li>
              ))}
            </ul>
          </div>

          <div style={estilos.field}>
            <label style={estilos.label}>Confirmar Nova Senha</label>
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="Repita a nova senha"
              style={estilos.input}
              disabled={enviando}
            />
          </div>

          <button
            type="submit"
            style={{ ...estilos.btn, opacity: enviando ? 0.6 : 1 }}
            disabled={enviando}
          >
            {enviando ? 'Alterando...' : 'Alterar Senha'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AlterarSenhaPage;
