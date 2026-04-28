/**
 * Página Trocar Senha (obrigatória após senha temporária)
 * Mesma estrutura visual do LoginPage
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './LoginPage.css';

function TrocarSenhaPage() {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { atualizarToken } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

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
      atualizarToken(res.data.data.token);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Erro ao alterar senha';
      setErro(msg);
    } finally {
      setEnviando(false);
    }
  };

  const logoUrl = `${process.env.PUBLIC_URL}/images/logo-rosa-branca.png`;

  const requisitos = [
    { ok: novaSenha.length >= 6, label: 'Mínimo 6 caracteres' },
    { ok: /[A-Z]/.test(novaSenha), label: 'Uma letra maiúscula' },
    { ok: /[0-9]/.test(novaSenha), label: 'Um número' },
    { ok: /[^A-Za-z0-9]/.test(novaSenha), label: 'Um caractere especial' },
  ];

  return (
    <div
      className="login-page"
      style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/images/novologin.png)` }}
    >
      {/* Branding à esquerda — visível apenas em telas grandes */}
      <div className="login-branding">
        <img src={logoUrl} alt="BR Gorjeta" className="login-logo" />
        <p className="login-tagline">
          <span className="login-tagline-white">Solução inteligente para a</span>
          <br />
          <span className="login-tagline-pink">gestão de gorjetas</span>
        </p>
        <p className="login-site">brgorjeta.com.br</p>
      </div>

      {/* Card */}
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Alterar Senha</h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: '0 0 20px', lineHeight: '1.5' }}>
          Sua senha é temporária. Crie uma nova senha para continuar.
        </p>

        {erro && <div className="login-error">{erro}</div>}

        <div className="login-field">
          <input
            type="password"
            placeholder="Senha atual (temporária)"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            autoFocus
            disabled={enviando}
          />
        </div>

        <div className="login-field">
          <input
            type="password"
            placeholder="Nova senha"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            disabled={enviando}
          />
        </div>

        <ul style={{
          listStyle: 'none', padding: 0, margin: '0 0 14px',
          fontSize: '12px', color: 'rgba(255,255,255,0.75)'
        }}>
          {requisitos.map((req, i) => (
            <li key={i} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              color: req.ok ? '#34d399' : 'rgba(255,255,255,0.65)',
              marginBottom: '2px'
            }}>
              <span style={{ fontSize: '13px' }}>{req.ok ? '✓' : '○'}</span>
              {req.label}
            </li>
          ))}
        </ul>

        <div className="login-field">
          <input
            type="password"
            placeholder="Confirmar nova senha"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            disabled={enviando}
          />
        </div>

        <button type="submit" className="login-btn" disabled={enviando}>
          {enviando ? 'Alterando...' : 'Alterar Senha'}
        </button>
      </form>

      {/* Branding compacto — visível apenas em telas pequenas */}
      <div className="login-branding-compact">
        <img src={logoUrl} alt="BR Gorjeta" className="login-logo-compact" />
        <p className="login-site-compact">brgorjeta.com.br</p>
      </div>
    </div>
  );
}

export default TrocarSenhaPage;
