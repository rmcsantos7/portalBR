/**
 * Repositório da Dashboard
 * Queries traduzidas do dashrest.jsp
 */

const db = require('../config/database');
const logger = require('../utils/logger');

/** Card 1: Valor total movimentado no período */
const buscarMovTotal = async (clienteId, inicio, fim) => {
  const sql = `
    SELECT COALESCE(SUM(crd_usu_valor), 0) AS total
    FROM crd_usuario_credito
    WHERE crd_cli_id = $1
      AND crd_usu_data_credito BETWEEN $2 AND $3
      AND crd_sit_id = 1
  `;
  try {
    const result = await db.query(sql, [clienteId, inicio, fim]);
    return parseFloat(result.rows[0].total) || 0;
  } catch (error) {
    logger.error('Erro buscarMovTotal:', { error: error.message });
    throw error;
  }
};

/** Card 2: Total de colaboradores ativos */
const buscarTotalColaboradores = async (clienteId) => {
  const sql = `
    SELECT COUNT(crd_usr_id) AS total
    FROM crd_usuario
    WHERE crd_sit_id = 1 AND crd_cli_id = $1
  `;
  try {
    const result = await db.query(sql, [clienteId]);
    return parseInt(result.rows[0].total) || 0;
  } catch (error) {
    logger.error('Erro buscarTotalColaboradores:', { error: error.message });
    throw error;
  }
};

/** Card 3: Total de repasses no período */
const buscarTotalRepasses = async (clienteId, inicio, fim) => {
  const sql = `
    SELECT COUNT(crd_tra_id) AS total
    FROM crd_transacao
    WHERE crd_tra_data BETWEEN $2 AND $3
      AND crd_tra_autorizacao > 0
      AND crd_cli_id = $1
  `;
  try {
    const result = await db.query(sql, [clienteId, inicio, fim]);
    return parseInt(result.rows[0].total) || 0;
  } catch (error) {
    logger.error('Erro buscarTotalRepasses:', { error: error.message });
    throw error;
  }
};

/** Card 4: Ticket médio */
const buscarTicketMedio = async (clienteId, inicio, fim) => {
  const sql = `
    SELECT COALESCE(AVG(crd_tra_valor), 0) AS ticket_medio
    FROM crd_transacao
    WHERE crd_tra_data BETWEEN $2 AND $3
      AND crd_tra_autorizacao > 0
      AND crd_cli_id = $1
  `;
  try {
    const result = await db.query(sql, [clienteId, inicio, fim]);
    return parseFloat(result.rows[0].ticket_medio) || 0;
  } catch (error) {
    logger.error('Erro buscarTicketMedio:', { error: error.message });
    throw error;
  }
};

/** Gráfico 1: Evolução de Recargas por semana */
const buscarEvolucaoRecargas = async (clienteId, inicio, fim) => {
  const sql = `
    SELECT
      DATE_TRUNC('week', crd_usu_data_credito)::date AS semana,
      SUM(crd_usu_valor) AS valor,
      COUNT(DISTINCT crd_usr_id) AS colabs
    FROM crd_usuario_credito
    WHERE crd_cli_id = $1
      AND crd_usu_data_credito BETWEEN $2 AND $3
      AND crd_sit_id = 1
    GROUP BY DATE_TRUNC('week', crd_usu_data_credito)::date
    ORDER BY semana ASC
  `;
  try {
    const result = await db.query(sql, [clienteId, inicio, fim]);
    return result.rows;
  } catch (error) {
    logger.error('Erro buscarEvolucaoRecargas:', { error: error.message });
    throw error;
  }
};

/** Gráfico 2: Top 5 colaboradores */
const buscarTopColaboradores = async (clienteId, inicio, fim) => {
  const sql = `
    SELECT
      u.crd_usr_nome AS nome,
      COALESCE(SUM(c.crd_usu_valor), 0) AS valor,
      COALESCE((
        SELECT COUNT(t.crd_tra_id) FROM crd_transacao t
        WHERE t.crd_usr_id = u.crd_usr_id
          AND t.crd_tra_autorizacao > 0
          AND t.crd_tra_data BETWEEN $2 AND $3
      ), 0) AS repasses
    FROM crd_usuario_credito c
      INNER JOIN crd_usuario u ON u.crd_usr_id = c.crd_usr_id
    WHERE u.crd_cli_id = $1
      AND c.crd_usu_data_credito BETWEEN $2 AND $3
      AND c.crd_sit_id = 1
    GROUP BY u.crd_usr_nome, u.crd_usr_id
    ORDER BY valor DESC LIMIT 5
  `;
  try {
    const result = await db.query(sql, [clienteId, inicio, fim]);
    return result.rows;
  } catch (error) {
    logger.error('Erro buscarTopColaboradores:', { error: error.message });
    throw error;
  }
};

/** Gráfico 3: Recargas vs Resgates mensal */
const buscarRecargasVsResgates = async (clienteId, inicio, fim) => {
  const sql = `
    WITH meses AS (
      SELECT generate_series(
        DATE_TRUNC('month', $2::date),
        DATE_TRUNC('month', $3::date),
        '1 month'::interval
      )::date AS mes
    ),
    recargas AS (
      SELECT DATE_TRUNC('month', c.crd_usu_data_credito)::date AS mes,
             SUM(c.crd_usu_valor) AS valor
      FROM crd_usuario_credito c
        INNER JOIN crd_usuario u ON u.crd_usr_id = c.crd_usr_id
      WHERE u.crd_cli_id = $1
        AND c.crd_usu_data_credito BETWEEN $2 AND $3
        AND c.crd_sit_id = 1
      GROUP BY DATE_TRUNC('month', c.crd_usu_data_credito)::date
    ),
    resgates AS (
      SELECT DATE_TRUNC('month', t.crd_tra_data)::date AS mes,
             SUM(t.crd_tra_valor) AS valor
      FROM crd_transacao t
      WHERE t.crd_cli_id = $1
        AND t.crd_tra_data BETWEEN $2 AND $3
        AND t.crd_tra_autorizacao > 0
      GROUP BY DATE_TRUNC('month', t.crd_tra_data)::date
    )
    SELECT
      TO_CHAR(m.mes, 'Mon/YY') AS label,
      COALESCE(r.valor, 0) AS recargas,
      COALESCE(g.valor, 0) AS resgates
    FROM meses m
      LEFT JOIN recargas r ON r.mes = m.mes
      LEFT JOIN resgates g ON g.mes = m.mes
    ORDER BY m.mes ASC
  `;
  try {
    const result = await db.query(sql, [clienteId, inicio, fim]);
    return result.rows;
  } catch (error) {
    logger.error('Erro buscarRecargasVsResgates:', { error: error.message });
    throw error;
  }
};

/** Gráfico 4: Distribuição de saldo (doughnut) */
const buscarDistribuicaoSaldo = async (clienteId, inicio, fim) => {
  const sql = `
    SELECT
      COALESCE((
        SELECT SUM(c.crd_usu_valor) FROM crd_usuario_credito c
          INNER JOIN crd_usuario u ON u.crd_usr_id = c.crd_usr_id
        WHERE u.crd_cli_id = $1
          AND c.crd_usu_data_credito BETWEEN $2 AND $3
          AND c.crd_sit_id = 1
      ), 0) AS total_recargas,
      COALESCE((
        SELECT SUM(t.crd_tra_valor) FROM crd_transacao t
        WHERE t.crd_cli_id = $1
          AND t.crd_tra_data BETWEEN $2 AND $3
          AND t.crd_tra_autorizacao > 0
      ), 0) AS total_resgates
  `;
  try {
    const result = await db.query(sql, [clienteId, inicio, fim]);
    const row = result.rows[0] || { total_recargas: 0, total_resgates: 0 };
    const recargas = parseFloat(row.total_recargas) || 0;
    const resgates = parseFloat(row.total_resgates) || 0;
    return { recargas, resgates, saldo: Math.max(recargas - resgates, 0) };
  } catch (error) {
    logger.error('Erro buscarDistribuicaoSaldo:', { error: error.message });
    throw error;
  }
};

module.exports = {
  buscarMovTotal,
  buscarTotalColaboradores,
  buscarTotalRepasses,
  buscarTicketMedio,
  buscarEvolucaoRecargas,
  buscarTopColaboradores,
  buscarRecargasVsResgates,
  buscarDistribuicaoSaldo
};
