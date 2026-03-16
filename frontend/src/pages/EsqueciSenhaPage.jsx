/**
 * Página Esqueci Minha Senha
 * Mesma estrutura visual do LoginPage
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './LoginPage.css';

function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (!email.trim()) {
      setErro('Informe seu email cadastrado');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErro('Informe um email válido');
      return;
    }

    setEnviando(true);
    try {
      await api.post('/auth/recuperar-senha', { email: email.trim() });
      setSucesso(true);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || (err.request ? 'Servidor indisponível. Tente novamente.' : 'Erro ao solicitar recuperação');
      setErro(msg);
    } finally {
      setEnviando(false);
    }
  };

  const logoUrl = `${process.env.PUBLIC_URL}/images/logo-rosa-branca.png`;

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
      <div className="login-card">
        {!sucesso ? (
          <form onSubmit={handleSubmit}>
            <h2>recuperar senha</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: '0 0 20px', lineHeight: '1.5' }}>
              Informe o email cadastrado na sua conta. Enviaremos uma senha temporária.
            </p>

            {erro && <div className="login-error">{erro}</div>}

            <div className="login-field">
              <input
                type="email"
                placeholder="Seu email cadastrado"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                disabled={enviando}
              />
            </div>

            <button type="submit" className="login-btn" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar senha temporária'}
            </button>

            <div className="login-esqueci">
              <a href="#voltar" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>
                Voltar ao login
              </a>
            </div>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>&#9993;</div>
            <h2 style={{ fontSize: '22px' }}>email enviado</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: '0 0 24px', lineHeight: '1.5' }}>
              Se o email estiver cadastrado, você receberá uma senha temporária em instantes.
              Verifique sua caixa de entrada e spam.
            </p>
            <button
              className="login-btn"
              onClick={() => navigate('/login')}
            >
              Voltar ao login
            </button>
          </div>
        )}
      </div>

      {/* Branding compacto — visível apenas em telas pequenas */}
      <div className="login-branding-compact">
        <img src={logoUrl} alt="BR Gorjeta" className="login-logo-compact" />
        <p className="login-site-compact">brgorjeta.com.br</p>
      </div>
    </div>
  );
}

export default EsqueciSenhaPage;
