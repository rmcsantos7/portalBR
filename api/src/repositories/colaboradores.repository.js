/**
 * Repositório de Colaboradores
 * Consultas ao banco de dados (pattern Repository)
 *
 * NOTA: Usa JOIN direto com crd_cliente_setor para cargos
 * (NÃO usa functions do banco)
 */

const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Busca colaboradores ativos com filtros
 * Replica lógica de fn_consultar_colaboradores_ativos direto na API
 *
 * @param {number} clienteId - ID do cliente (obrigatório)
 * @param {string} search - Busca por nome ou CPF (opcional)
 * @param {number} setorId - Filtro por setor/cargo (opcional)
 * @param {number} limit - Limite de resultados
 * @param {number} offset - Offset para paginação
 * @returns {Promise<object>} Colaboradores e total
 */
const buscarColaboradores = async (clienteId, search = '', setorId = null, limit = 50, offset = 0) => {
  const searchPattern = `%${search}%`;

  let sql = `
    SELECT
      u.crd_usr_id AS id,
      u.crd_usr_nome AS nome,
      u.crd_usr_cpf AS cpf,
      c.crd_cli_nome_fantasia AS restaurante,
      COALESCE(s.crd_set_setor, 'Sem cargo') AS cargo,
      COALESCE(s.crd_set_id, 0) AS setor_id,
      sit.crd_sit_situacao AS status,
      COALESCE(c.crd_cli_manutencao_usuario, 0) AS taxa_convenio
    FROM crd_usuario u
    INNER JOIN crd_cliente c ON c.crd_cli_id = u.crd_cli_id
    INNER JOIN crd_situacao sit ON sit.crd_sit_id = u.crd_sit_id
    LEFT JOIN crd_cliente_setor s ON s.crd_set_id = u.crd_set_id
    WHERE u.crd_sit_id = 1
      AND u.crd_cli_id = $1
      AND (
        u.crd_usr_nome ILIKE $2
        OR u.crd_usr_cpf LIKE $2
      )
  `;

  const params = [clienteId, searchPattern];
  let paramCount = 3;

  if (setorId) {
    sql += ` AND s.crd_set_id = $${paramCount}`;
    params.push(setorId);
    paramCount++;
  }

  sql += `
    ORDER BY u.crd_usr_nome ASC
    LIMIT $${paramCount} OFFSET $${paramCount + 1}
  `;
  params.push(limit, offset);

  try {
    const result = await db.query(sql, params);

    // Conta total sem paginação
    let countSql = `
      SELECT COUNT(*) AS total
      FROM crd_usuario u
      INNER JOIN crd_cliente c ON c.crd_cli_id = u.crd_cli_id
      LEFT JOIN crd_cliente_setor s ON s.crd_set_id = u.crd_set_id
      WHERE u.crd_sit_id = 1
        AND u.crd_cli_id = $1
        AND (
          u.crd_usr_nome ILIKE $2
          OR u.crd_usr_cpf LIKE $2
        )
    `;

    const countParams = [clienteId, searchPattern];

    if (setorId) {
      countSql += ` AND s.crd_set_id = $3`;
      countParams.push(setorId);
    }

    const countResult = await db.query(countSql, countParams);
    const total = parseInt(countResult.rows[0].total);

    return {
      colaboradores: result.rows,
      total,
      limit,
      offset,
      page: Math.floor(offset / limit)
    };
  } catch (error) {
    logger.error('Erro ao buscar colaboradores:', { error: error.message });
    throw error;
  }
};

/**
 * Busca um colaborador específico pelo ID
 * @param {number} userId - ID do usuário
 * @param {number} clienteId - ID do cliente (validação de segurança)
 * @returns {Promise<object|null>} Colaborador ou null
 */
const buscarColaboradorPorId = async (userId, clienteId) => {
  const sql = `
    SELECT
      u.crd_usr_id AS id,
      u.crd_usr_nome AS nome,
      u.crd_usr_cpf AS cpf,
      c.crd_cli_nome_fantasia AS restaurante,
      COALESCE(s.crd_set_setor, 'Sem cargo') AS cargo,
      COALESCE(s.crd_set_id, 0) AS setor_id,
      sit.crd_sit_situacao AS status,
      COALESCE(c.crd_cli_manutencao_usuario, 0) AS taxa_convenio
    FROM crd_usuario u
    INNER JOIN crd_cliente c ON c.crd_cli_id = u.crd_cli_id
    INNER JOIN crd_situacao sit ON sit.crd_sit_id = u.crd_sit_id
    LEFT JOIN crd_cliente_setor s ON s.crd_set_id = u.crd_set_id
    WHERE u.crd_usr_id = $1
      AND u.crd_cli_id = $2
      AND u.crd_sit_id = 1
  `;

  try {
    const result = await db.query(sql, [userId, clienteId]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Erro ao buscar colaborador por ID:', { error: error.message });
    throw error;
  }
};

/**
 * Busca múltiplos colaboradores pelos IDs (com taxa convênio para geração de crédito)
 * @param {array} userIds - Array de IDs
 * @param {number} clienteId - ID do cliente (validação de segurança)
 * @returns {Promise<array>} Array de colaboradores
 */
const buscarColaboradoresPorIds = async (userIds, clienteId) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return [];
  }

  const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
  const sql = `
    SELECT
      u.crd_usr_id AS id,
      u.crd_usr_nome AS nome,
      u.crd_usr_cpf AS cpf,
      u.crd_cli_id AS cliente_id,
      c.crd_cli_nome_fantasia AS restaurante,
      COALESCE(s.crd_set_setor, 'Sem cargo') AS cargo,
      COALESCE(s.crd_set_id, 0) AS setor_id,
      sit.crd_sit_situacao AS status,
      COALESCE(c.crd_cli_manutencao_usuario, 0) AS taxa_convenio
    FROM crd_usuario u
    INNER JOIN crd_cliente c ON c.crd_cli_id = u.crd_cli_id
    INNER JOIN crd_situacao sit ON sit.crd_sit_id = u.crd_sit_id
    LEFT JOIN crd_cliente_setor s ON s.crd_set_id = u.crd_set_id
    WHERE u.crd_usr_id IN (${placeholders})
      AND u.crd_cli_id = $${userIds.length + 1}
      AND u.crd_sit_id = 1
  `;

  try {
    const result = await db.query(sql, [...userIds, clienteId]);
    return result.rows;
  } catch (error) {
    logger.error('Erro ao buscar colaboradores por IDs:', { error: error.message });
    throw error;
  }
};

/**
 * Busca setores/cargos de um cliente
 * Consulta direta em crd_cliente_setor (sem usar fn_consultar_categorias)
 *
 * @param {number} clienteId - ID do cliente
 * @returns {Promise<array>} Array de setores com id e nome
 */
const buscarSetores = async (clienteId) => {
  const sql = `
    SELECT
      cs.crd_set_id AS id,
      cs.crd_set_setor AS nome
    FROM crd_cliente_setor cs
    WHERE cs.crd_cli_id = $1
    ORDER BY cs.crd_set_setor ASC
  `;

  try {
    const result = await db.query(sql, [clienteId]);
    return result.rows;
  } catch (error) {
    logger.error('Erro ao buscar setores:', { error: error.message });
    throw error;
  }
};

/**
 * Busca colaboradores ativos por CPF (para importação via Excel)
 * Replica lógica do MKF: busca USUARIO ID por CPF + CLI_ID
 *
 * @param {array} cpfs - Array de CPFs (limpos, 11 dígitos)
 * @param {number} clienteId - ID do cliente
 * @returns {Promise<array>} Array de colaboradores com id, nome, cpf
 */
const buscarColaboradoresPorCpfs = async (cpfs, clienteId) => {
  if (!Array.isArray(cpfs) || cpfs.length === 0) {
    return [];
  }

  const placeholders = cpfs.map((_, i) => `$${i + 1}`).join(',');
  const sql = `
    SELECT
      u.crd_usr_id AS id,
      u.crd_usr_nome AS nome,
      u.crd_usr_cpf AS cpf,
      u.crd_cli_id AS cliente_id,
      COALESCE(s.crd_set_setor, 'Sem cargo') AS cargo,
      COALESCE(c.crd_cli_manutencao_usuario, 0) AS taxa_convenio
    FROM crd_usuario u
    INNER JOIN crd_cliente c ON c.crd_cli_id = u.crd_cli_id
    LEFT JOIN crd_cliente_setor s ON s.crd_set_id = u.crd_set_id
    WHERE REPLACE(REPLACE(u.crd_usr_cpf, '.', ''), '-', '') IN (${placeholders})
      AND u.crd_cli_id = $${cpfs.length + 1}
      AND u.crd_sit_id = 1
  `;

  try {
    const result = await db.query(sql, [...cpfs, clienteId]);
    return result.rows;
  } catch (error) {
    logger.error('Erro ao buscar colaboradores por CPFs:', { error: error.message });
    throw error;
  }
};

/**
 * Busca todos os colaboradores ativos para gerar planilha de importação
 * Replica lógica do MKF "Gerar Excel Importação de Crédito":
 * SELECT crd_usr_nome As NOME, crd_usr_cpf As CPF
 * FROM crd_usuario
 * WHERE crd_cli_id = :cli AND crd_sit_id = 1
 * AND crd_agendamentos.crd_age_id Is Null
 * ORDER BY crd_usr_nome
 */
const buscarColaboradoresParaPlanilha = async (clienteId) => {
  const sql = `
    SELECT
      u.crd_usr_nome AS nome,
      u.crd_usr_cpf AS cpf
    FROM crd_usuario u
    LEFT JOIN crd_agendamentos a ON u.crd_usr_id = a.crd_usr_id
    WHERE u.crd_cli_id = $1
      AND u.crd_sit_id = 1
      AND a.crd_age_id IS NULL
    GROUP BY u.crd_usr_nome, u.crd_usr_cpf
    ORDER BY u.crd_usr_nome
  `;

  try {
    const result = await db.query(sql, [clienteId]);
    return result.rows;
  } catch (error) {
    logger.error('Erro ao buscar colaboradores para planilha:', { error: error.message });
    throw error;
  }
};

module.exports = {
  buscarColaboradores,
  buscarColaboradorPorId,
  buscarColaboradoresPorIds,
  buscarColaboradoresPorCpfs,
  buscarSetores,
  buscarColaboradoresParaPlanilha
};
