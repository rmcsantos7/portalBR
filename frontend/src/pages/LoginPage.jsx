/**
 * Página de Login
 * Fundo = novologin.png
 * Logo + textos à esquerda, card à direita
 * Responsivo: tela pequena → logo e site abaixo do card
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

function LoginPage() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { login: fazerLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (!login.trim() || !senha.trim()) {
      setErro('Preencha todos os campos');
      return;
    }

    setEnviando(true);
    try {
      const resultado = await fazerLogin(login.trim(), senha, lembrar);
      if (resultado.senhaTemporaria) {
        navigate('/trocar-senha');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || (err.request ? 'Servidor indisponível. Verifique sua conexão.' : 'Erro ao fazer login');
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

      {/* Card de login */}
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>login</h2>

        {erro && <div className="login-error">{erro}</div>}

        <div className="login-field">
          <input
            type="text"
            placeholder="Usuário"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoFocus
            disabled={enviando}
          />
        </div>

        <div className="login-field">
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            disabled={enviando}
          />
        </div>

        <label className="login-lembrar">
          <input
            type="checkbox"
            checked={lembrar}
            onChange={(e) => setLembrar(e.target.checked)}
            disabled={enviando}
          />
          <span>Lembrar-me</span>
        </label>

        <button type="submit" className="login-btn" disabled={enviando}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>

        <div className="login-esqueci">
          <a href="/esqueci-senha" onClick={(e) => { e.preventDefault(); navigate('/esqueci-senha'); }}>
            Esqueci minha Senha
          </a>
        </div>
      </form>

      {/* Branding compacto — visível apenas em telas pequenas, abaixo do card */}
      <div className="login-branding-compact">
        <img src={logoUrl} alt="BR Gorjeta" className="login-logo-compact" />
        <p className="login-site-compact">brgorjeta.com.br</p>
      </div>
    </div>
  );
}

export default LoginPage;
