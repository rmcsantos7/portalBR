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
const criarRemessa = async (client, clienteId, login, titulo = null) => {
  const sql = `
    INSERT INTO crd_usuario_credito_remessa (
      crd_usu_data_import,
      crd_usu_login,
      crd_cli_id,
      crd_usucrerem_titulo
    ) VALUES (CURRENT_TIMESTAMP, $1, $2, $3)
    RETURNING crd_usucrerem_id
  `;

  try {
    const result = await client.query(sql, [login, clienteId, titulo]);
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
      cli.crd_cli_nome_fantasia AS restaurante,
      COALESCE(cli.crd_cli_manutencao_usuario, 0) AS taxa,
      r.crd_usucrerem_titulo AS titulo,
      COUNT(c.crd_usucre_id) AS total_colaboradores,
      COALESCE(SUM(c.crd_usu_valor), 0) AS valor_bruto,
      nf.crd_not_id AS nota_fiscal_id,
      nf.crd_not_boleto_status AS boleto_status,
      nf.crd_not_qr_code AS boleto_pix_qrcode,
      nf.crd_not_linha_digitavel_boleto AS boleto_linha_digitavel
    FROM crd_usuario_credito_remessa r
    LEFT JOIN crd_usuario_credito c ON c.crd_usucrerem_id = r.crd_usucrerem_id
    INNER JOIN crd_cliente cli ON cli.crd_cli_id = r.crd_cli_id
    LEFT JOIN LATERAL (
      SELECT * FROM crd_nota_fiscal nf2
      WHERE nf2.crd_cli_id = r.crd_cli_id
        AND nf2.crd_not_data_emissao = r.crd_usu_data_import::date
        AND nf2.crd_not_situacao = 'A'
      ORDER BY nf2.crd_not_id DESC
      LIMIT 1
    ) nf ON true
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
    GROUP BY r.crd_usucrerem_id, r.crd_usu_data_import, r.crd_usu_login, cli.crd_cli_nome_fantasia, cli.crd_cli_manutencao_usuario, r.crd_usucrerem_titulo, nf.crd_not_id, nf.crd_not_boleto_status, nf.crd_not_qr_code, nf.crd_not_linha_digitavel_boleto
    ORDER BY r.crd_usucrerem_id DESC
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
      c.crd_usu_valor AS valor_bruto,
      c.crd_usu_data_credito AS data_credito,
      COALESCE(cli.crd_cli_manutencao_usuario, 0) AS taxa,
      r.crd_usu_login AS criado_por,
      r.crd_usu_data_import AS data_criacao,
      cli.crd_cli_nome_fantasia AS restaurante,
      r.crd_usucrerem_titulo AS titulo,
      nf.crd_not_id AS nota_fiscal_id,
      nf.crd_not_charge_id AS boleto_charge_id,
      nf.crd_not_codigo_barras AS boleto_codigo_barras,
      nf.crd_not_linha_digitavel_boleto AS boleto_linha_digitavel,
      nf.crd_not_qr_code AS boleto_pix_qrcode,
      nf.crd_not_pdf_url AS boleto_pdf_url,
      nf.crd_not_qr_code_url AS boleto_qrcode_image_url,
      nf.crd_not_boleto_status AS boleto_status
    FROM crd_usuario_credito c
    INNER JOIN crd_usuario u ON u.crd_usr_id = c.crd_usr_id
    INNER JOIN crd_cliente cli ON cli.crd_cli_id = c.crd_cli_id
    INNER JOIN crd_usuario_credito_remessa r ON r.crd_usucrerem_id = c.crd_usucrerem_id
    LEFT JOIN LATERAL (
      SELECT * FROM crd_nota_fiscal nf2
      WHERE nf2.crd_cli_id = c.crd_cli_id
        AND nf2.crd_not_data_emissao = c.crd_usu_data_credito
        AND nf2.crd_not_situacao = 'A'
      ORDER BY nf2.crd_not_id DESC
      LIMIT 1
    ) nf ON true
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

/**
 * Cria nota fiscal vinculada à remessa
 *
 * @param {object} client - Client de transação
 * @param {number} clienteId - ID do cliente
 * @param {number} valorBruto - Valor bruto total (soma dos créditos)
 * @param {number} valorServico - Valor do serviço (valorBruto * taxa / 100)
 * @returns {Promise<number>} ID da nota fiscal criada
 */
const criarNotaFiscal = async (client, clienteId, valorBruto, valorServico) => {
  const sql = `
    INSERT INTO crd_nota_fiscal (
      crd_cli_id,
      crd_not_data_emissao,
      crd_not_data_vencimento,
      crd_not_valor_nota_fiscal,
      crd_not_valor_servico,
      crd_not_valor_movimentacao,
      crd_not_situacao
    ) VALUES (
      $1,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '360 days',
      $2,
      $3,
      $4,
      'A'
    )
    RETURNING crd_not_id
  `;

  try {
    const result = await client.query(sql, [
      clienteId,
      valorBruto,
      valorServico,
      valorBruto - valorServico
    ]);
    const id = result.rows[0].crd_not_id;
    logger.info('Nota fiscal criada:', { notaId: id, clienteId, valorBruto, valorServico });
    return id;
  } catch (error) {
    logger.error('Erro ao criar nota fiscal:', { error: error.message });
    throw error;
  }
};

/**
 * Atualiza nota fiscal com dados do boleto retornados pela API EFI
 *
 * @param {number} notaId - ID da nota fiscal
 * @param {object} boleto - Dados do boleto da API EFI
 * @returns {Promise<void>}
 */
const atualizarNotaComBoleto = async (notaId, boleto) => {
  const sql = `
    UPDATE crd_nota_fiscal SET
      crd_not_charge_id = $1,
      crd_not_codigo_barras = $2,
      crd_not_linha_digitavel_boleto = $3,
      crd_not_qr_code = $4,
      crd_not_pdf_url = $5,
      crd_not_qr_code_url = $6,
      crd_not_boleto_status = $7,
      crd_not_boleto_status_atualizado_em = NOW()
    WHERE crd_not_id = $8
  `;

  try {
    await db.query(sql, [
      boleto.charge_id,
      boleto.codigo_barras,
      boleto.linha_digitavel,
      boleto.pix?.qrcode || null,
      boleto.links?.pdf_url || null,
      boleto.links?.qrcode_image_url || null,
      boleto.status,
      notaId
    ]);
    logger.info('Nota fiscal atualizada com boleto:', { notaId, chargeId: boleto.charge_id });
  } catch (error) {
    logger.error('Erro ao atualizar nota com boleto:', { error: error.message });
    throw error;
  }
};

/**
 * Busca nota fiscal vinculada a uma remessa (pela data de crédito e cliente)
 * @param {number} remessaId - ID da remessa
 * @param {number} clienteId - ID do cliente
 * @returns {Promise<object|null>} Dados da nota fiscal ou null
 */
const buscarNotaFiscalPorRemessa = async (remessaId, clienteId) => {
  const sql = `
    SELECT DISTINCT nf.crd_not_id AS nota_fiscal_id,
           nf.crd_not_charge_id AS charge_id,
           nf.crd_not_boleto_status AS boleto_status
    FROM crd_nota_fiscal nf
    INNER JOIN crd_usuario_credito c
      ON c.crd_cli_id = nf.crd_cli_id
      AND c.crd_usu_data_credito = nf.crd_not_data_emissao
    WHERE c.crd_usucrerem_id = $1
      AND c.crd_cli_id = $2
      AND nf.crd_not_situacao = 'A'
    ORDER BY nf.crd_not_id DESC
    LIMIT 1
  `;

  try {
    const result = await db.query(sql, [remessaId, clienteId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    logger.error('Erro ao buscar nota fiscal por remessa:', { error: error.message });
    throw error;
  }
};

/**
 * Exclui todos os créditos de uma remessa
 * @param {object} client - Client de transação
 * @param {number} remessaId - ID da remessa
 * @param {number} clienteId - ID do cliente
 * @returns {Promise<number>} Quantidade de créditos excluídos
 */
const excluirCreditosPorRemessa = async (client, remessaId, clienteId) => {
  const sql = `
    DELETE FROM crd_usuario_credito
    WHERE crd_usucrerem_id = $1 AND crd_cli_id = $2
  `;

  try {
    const result = await client.query(sql, [remessaId, clienteId]);
    logger.info('Créditos excluídos:', { remessaId, clienteId, count: result.rowCount });
    return result.rowCount;
  } catch (error) {
    logger.error('Erro ao excluir créditos:', { error: error.message });
    throw error;
  }
};

/**
 * Exclui a remessa
 * @param {object} client - Client de transação
 * @param {number} remessaId - ID da remessa
 * @param {number} clienteId - ID do cliente
 * @returns {Promise<number>} Quantidade excluída
 */
const excluirRemessa = async (client, remessaId, clienteId) => {
  const sql = `
    DELETE FROM crd_usuario_credito_remessa
    WHERE crd_usucrerem_id = $1 AND crd_cli_id = $2
  `;

  try {
    const result = await client.query(sql, [remessaId, clienteId]);
    logger.info('Remessa excluída:', { remessaId, clienteId });
    return result.rowCount;
  } catch (error) {
    logger.error('Erro ao excluir remessa:', { error: error.message });
    throw error;
  }
};

/**
 * Exclui (ou inativa) a nota fiscal
 * @param {object} client - Client de transação
 * @param {number} notaId - ID da nota fiscal
 * @returns {Promise<number>} Quantidade excluída
 */
const excluirNotaFiscal = async (client, notaId) => {
  const sql = `
    DELETE FROM crd_nota_fiscal
    WHERE crd_not_id = $1
  `;

  try {
    const result = await client.query(sql, [notaId]);
    logger.info('Nota fiscal excluída:', { notaId });
    return result.rowCount;
  } catch (error) {
    logger.error('Erro ao excluir nota fiscal:', { error: error.message });
    throw error;
  }
};

module.exports = {
  criarRemessa,
  inserirCredito,
  criarNotaFiscal,
  atualizarNotaComBoleto,
  buscarHistorico,
  buscarDetalheRemessa,
  buscarNotaFiscalPorRemessa,
  excluirCreditosPorRemessa,
  excluirRemessa,
  excluirNotaFiscal
};
