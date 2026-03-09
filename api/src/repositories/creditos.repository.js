/**
 * Repositório de Créditos
 * Consultas ao banco de dados (pattern Repository)
 *
 * NOTA: Replica lógica dos MKFs "Insere Remessa de Importacao" e "Importar Creditos"
 * diretamente na API (sem usar functions do banco)
 */

const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Cria uma remessa de importação e retorna o ID gerado automaticamente
 * Replica o MKF "Insere Remessa de Importacao":
 *   INSERT INTO crd_usuario_credito_remessa (crd_usu_data_import, crd_usu_login, crd_cli_id)
 * O crd_usucrerem_id é gerado automaticamente pela sequence DEFAULT do banco
 *
 * @param {object} client - Client de transação
 * @param {number} clienteId - ID do cliente
 * @param {string} login - Login do usuário que criou
 * @returns {Promise<number>} ID da remessa criada
 */
const criarRemessa = async (client, clienteId, login) => {
  const sql = `
    INSERT INTO crd_usuario_credito_remessa (
      crd_usu_data_import,
      crd_usu_login,
      crd_cli_id
    ) VALUES (CURRENT_DATE, $1, $2)
    RETURNING crd_usucrerem_id
  `;

  try {
    const result = await client.query(sql, [login, clienteId]);
    const id = result.rows[0].crd_usucrerem_id;
    logger.info('Remessa criada:', { remessaId: id, clienteId });
    return id;
  } catch (error) {
    logger.error('Erro ao criar remessa:', { error: error.message });
    throw error;
  }
};

/**
 * Insere crédito para um colaborador
 * Replica exatamente o MKF "Importar Creditos":
 *   INSERT INTO crd_usuario_credito (
 *     crd_usr_id, crd_pro_id, crd_usu_valor, crd_usu_data_credito,
 *     crd_usucre_cpf, crd_cli_id, crd_usu_login, crd_usu_data_import,
 *     crd_usucrerem_id, crd_sit_id
 *   )
 *
 * @param {object} client - Client de transação
 * @param {number} usuarioId - ID do usuário (crd_usr_id)
 * @param {number} valor - Valor do crédito (crd_usu_valor) — valor direto, sem cálculo de taxa
 * @param {string} cpf - CPF do colaborador (crd_usucre_cpf)
 * @param {number} remessaId - ID da remessa (crd_usucrerem_id)
 * @param {number} clienteId - ID do cliente (crd_cli_id)
 * @param {string} login - Login do usuário que criou (crd_usu_login)
 * @returns {Promise<number>} ID do crédito criado
 */
const inserirCredito = async (client, usuarioId, valor, cpf, remessaId, clienteId, login) => {
  const sql = `
    INSERT INTO crd_usuario_credito (
      crd_usr_id,
      crd_pro_id,
      crd_usu_valor,
      crd_usu_data_credito,
      crd_usucre_cpf,
      crd_cli_id,
      crd_usu_login,
      crd_usu_data_import,
      crd_usucrerem_id,
      crd_sit_id
    ) VALUES ($1, 999, $2, CURRENT_DATE, $3, $4, $5, CURRENT_DATE, $6, 1)
    RETURNING crd_usucre_id
  `;

  try {
    const result = await client.query(sql, [
      usuarioId,
      valor,
      cpf,
      clienteId,
      login,
      remessaId
    ]);
    return result.rows[0].crd_usucre_id;
  } catch (error) {
    logger.error('Erro ao inserir crédito:', { error: error.message });
    throw error;
  }
};

/**
 * Busca histórico de gerações de crédito (remessas)
 *
 * @param {number} clienteId - ID do cliente
 * @param {number} limit - Limite de resultados
 * @param {number} offset - Offset para paginação
 * @param {string} dataInicio - Data início (opcional)
 * @param {string} dataFim - Data fim (opcional)
 * @returns {Promise<object>} Histórico e total
 */
const buscarHistorico = async (clienteId, limit = 50, offset = 0, dataInicio = null, dataFim = null) => {
  let sql = `
    SELECT
      r.crd_usucrerem_id AS remessa_id,
      r.crd_usu_data_import AS data_criacao,
      r.crd_usu_login AS criado_por,
      COUNT(c.crd_usucre_id) AS total_colaboradores,
      COALESCE(SUM(c.crd_usu_valor), 0) AS valor_total
    FROM crd_usuario_credito_remessa r
    LEFT JOIN crd_usuario_credito c ON c.crd_usucrerem_id = r.crd_usucrerem_id
    WHERE r.crd_cli_id = $1
  `;

  const params = [clienteId];
  let paramCount = 2;

  if (dataInicio) {
    sql += ` AND r.crd_usu_data_import >= $${paramCount}::date`;
    params.push(dataInicio);
    paramCount++;
  }

  if (dataFim) {
    sql += ` AND r.crd_usu_data_import <= ($${paramCount}::date + INTERVAL '1 day')`;
    params.push(dataFim);
    paramCount++;
  }

  sql += `
    GROUP BY r.crd_usucrerem_id, r.crd_usu_data_import, r.crd_usu_login
    ORDER BY r.crd_usu_data_import DESC
    LIMIT $${paramCount} OFFSET $${paramCount + 1}
  `;

  params.push(limit, offset);

  try {
    const result = await db.query(sql, params);

    // Conta total de remessas
    let countSql = `
      SELECT COUNT(*) AS total
      FROM crd_usuario_credito_remessa r
      WHERE r.crd_cli_id = $1
    `;

    const countParams = [clienteId];
    let countParamCount = 2;

    if (dataInicio) {
      countSql += ` AND r.crd_usu_data_import >= $${countParamCount}::date`;
      countParams.push(dataInicio);
      countParamCount++;
    }

    if (dataFim) {
      countSql += ` AND r.crd_usu_data_import <= ($${countParamCount}::date + INTERVAL '1 day')`;
      countParams.push(dataFim);
    }

    const countResult = await db.query(countSql, countParams);
    const total = parseInt(countResult.rows[0].total);

    return {
      historico: result.rows,
      total,
      limit,
      offset,
      page: Math.floor(offset / limit)
    };
  } catch (error) {
    logger.error('Erro ao buscar histórico:', { error: error.message });
    throw error;
  }
};

/**
 * Busca detalhes de uma remessa específica (créditos individuais)
 * @param {number} remessaId - ID da remessa
 * @param {number} clienteId - ID do cliente (segurança)
 * @returns {Promise<object>} Detalhes da remessa com colaboradores
 */
const buscarDetalheRemessa = async (remessaId, clienteId) => {
  const sql = `
    SELECT
      c.crd_usucre_id AS credito_id,
      u.crd_usr_id AS colaborador_id,
      u.crd_usr_nome AS nome,
      u.crd_usr_cpf AS cpf,
      COALESCE(st.crd_set_setor, 'Sem cargo') AS cargo,
      c.crd_usu_valor AS valor,
      c.crd_usu_data_credito AS data_credito
    FROM crd_usuario_credito c
    INNER JOIN crd_usuario u ON u.crd_usr_id = c.crd_usr_id
    LEFT JOIN crd_cliente_setor st ON st.crd_set_id = u.crd_set_id
    WHERE c.crd_usucrerem_id = $1
      AND c.crd_cli_id = $2
    ORDER BY u.crd_usr_nome ASC
  `;

  try {
    const result = await db.query(sql, [remessaId, clienteId]);
    return result.rows;
  } catch (error) {
    logger.error('Erro ao buscar detalhe da remessa:', { error: error.message });
    throw error;
  }
};

module.exports = {
  criarRemessa,
  inserirCredito,
  buscarHistorico,
  buscarDetalheRemessa
};
