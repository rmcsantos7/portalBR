/**
 * Página Dashboard
 * KPI cards + gráficos Chart.js
 * Dados vindos de /api/dashboard
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { formatBRL } from '../utils/formatters';
import './DashboardPage.css';

Chart.register(...registerables);


function DashboardPage() {
  const { usuario } = useAuth();
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Filtros de período
  const hoje = new Date();
  const trintaDiasAtras = new Date(hoje);
  trintaDiasAtras.setDate(hoje.getDate() - 30);
  const [dataInicio, setDataInicio] = useState(trintaDiasAtras.toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(hoje.toISOString().split('T')[0]);

  // Refs dos canvas
  const evolucaoRef = useRef(null);
  const chartInstances = useRef({});

  const carregarDados = useCallback(async (inicio, fim) => {
    setCarregando(true);
    setErro('');
    try {
      const res = await api.get('/dashboard', {
        params: { data_inicio: inicio || dataInicio, data_fim: fim || dataFim }
      });
      setDados(res.data.data);
    } catch (err) {
      setErro(err.response?.data?.message || 'Erro ao carregar dashboard');
    } finally {
      setCarregando(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carregar apenas na montagem inicial
  useEffect(() => {
    carregarDados(dataInicio, dataFim);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Renderizar gráficos quando dados mudam
  useEffect(() => {
    if (!dados) return;

    // Destruir gráficos anteriores
    Object.values(chartInstances.current).forEach(c => c?.destroy());

    // 1. Evolução de Recargas (bar chart)
    if (evolucaoRef.current && dados.graficos.evolucaoRecargas) {
      const ctx = evolucaoRef.current.getContext('2d');
      const ev = dados.graficos.evolucaoRecargas;
      chartInstances.current.evolucao = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ev.map(e => {
            // e.semana vem como ISO string do JSON (ex: "2026-02-09T03:00:00.000Z")
            const raw = String(e.semana);
            const dateOnly = raw.includes('T') ? raw.split('T')[0] : raw;
            const d = new Date(dateOnly + 'T00:00:00');
            if (isNaN(d.getTime())) return raw;
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
          }),
          datasets: [
            {
              label: 'Valor (R$)',
              data: ev.map(e => Number(e.valor)),
              backgroundColor: 'rgba(249, 103, 140, 0.7)',
              borderRadius: 4,
              yAxisID: 'y'
            },
            {
              label: 'Colaboradores',
              data: ev.map(e => Number(e.colabs)),
              type: 'line',
              borderColor: '#4A1D4F',
              backgroundColor: '#4A1D4F',
              tension: 0.3,
              pointRadius: 4,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } } },
          scales: {
            y: {
              position: 'left',
              ticks: { callback: v => 'R$ ' + (v/1000).toFixed(0) + 'k', font: { size: 11 } },
              grid: { color: '#f0f0f0' }
            },
            y1: {
              position: 'right',
              grid: { display: false },
              ticks: { font: { size: 11 } }
            },
            x: { ticks: { font: { size: 10 } }, grid: { display: false } }
          }
        }
      });
    }

    return () => {
      Object.values(chartInstances.current).forEach(c => c?.destroy());
      chartInstances.current = {};
    };
  }, [dados]);

  if (carregando) {
    return <div className="dash-loading">Carregando dashboard...</div>;
  }

  if (erro) {
    return <div className="dash-error">{erro}</div>;
  }

  if (!dados) return null;

  const { cards, graficos } = dados;

  return (
    <div>
      {/* Banner de boas-vindas */}
      <div className="dash-welcome">
        <h1>Bem-vindo(a), <span>{usuario?.usr_nome || 'Master'}</span>!</h1>
        <p>Aqui está o resumo da sua empresa. Acompanhe recargas, repasses e colaboradores.</p>
      </div>

      {/* Filtro de período */}
      <div className="dash-filter">
        <div className="dash-filter-info">
          <p className="dash-section-title">Filtrar por periodo</p>
          <p className="dash-section-sub">Resumo</p>
        </div>
        <label>De</label>
        <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
        <label>Até</label>
        <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
        <button className="dash-filter-btn" onClick={() => carregarDados(dataInicio, dataFim)}>Filtrar</button>
      </div>

      {/* KPI Cards */}
      <div className="dash-cards">
        <div className="dash-card">
          <div className="dash-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </div>
          <div className="dash-card-value">{formatBRL(cards.movTotal)}</div>
          <div className="dash-card-label">Valor total<br/>movimentado no período</div>
        </div>

        <div className="dash-card">
          <div className="dash-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          </div>
          <div className="dash-card-value">{cards.totalColaboradores}</div>
          <div className="dash-card-label">Colaboradores<br/>ativos</div>
        </div>

        <div className="dash-card">
          <div className="dash-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          </div>
          <div className="dash-card-value">{cards.totalRepasses}</div>
          <div className="dash-card-label">Nº de repasses<br/>realizados no período</div>
        </div>

        <div className="dash-card">
          <div className="dash-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          </div>
          <div className="dash-card-value">{formatBRL(cards.ticketMedio)}</div>
          <div className="dash-card-label">Ticket Médio<br/>no período</div>
        </div>
      </div>

      {/* Gráficos - linha 1 */}
      <div className="dash-charts">
        {/* Evolução de Recargas */}
        <div className="dash-chart-box">
          <h3>Evolução de Recargas</h3>
          <p className="sub">Valor recarregado e colaboradores atendidos por semana</p>
          <div style={{ height: 220 }}>
            <canvas ref={evolucaoRef} />
          </div>
        </div>

        {/* Top Colaboradores */}
        <div className="dash-chart-box">
          <h3>Top Colaboradores</h3>
          <p className="sub">Maiores saldos recarregados no período</p>
          {graficos.topColaboradores && graficos.topColaboradores.length > 0 ? (
            <table className="dash-top-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nome</th>
                  <th>Valor</th>
                  <th>Repasses</th>
                </tr>
              </thead>
              <tbody>
                {graficos.topColaboradores.map((c, i) => (
                  <tr key={i}>
                    <td className="dash-top-rank">0{i + 1}</td>
                    <td>{c.nome}</td>
                    <td className="dash-top-valor">{formatBRL(c.valor)}</td>
                    <td><span className="dash-top-repasses">{c.repasses}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="dash-empty">Nenhum dado no período</p>
          )}
        </div>
      </div>

    </div>
  );
}

export default DashboardPage;
