/**
 * Service de Créditos
 * Lógica de negócio (validações, processamento)
 *
 * NOTA: Replica lógica dos MKFs "Insere Remessa de Importacao" e "Importar Creditos"
 * - Remessa: apenas (crd_usucrerem_id, crd_usu_data_import, crd_usu_login, crd_cli_id)
 * - Credito: (crd_usr_id, crd_pro_id=999, crd_usu_valor, crd_usu_data_credito,
 *             crd_usucre_cpf, crd_cli_id, crd_usu_login, crd_usu_data_import,
 *             crd_usucrerem_id, crd_sit_id=1)
 * - SEM cálculo de taxa — valor inserido é o valor armazenado
 */

const creditosRepository = require('../repositories/creditos.repository');
const colaboradoresRepository = require('../repositories/colaboradores.repository');
const { APIError } = require('../middlewares/errorHandler');
const { isValidPositiveNumber, validatePagination } = require('../utils/validators');
const logger = require('../utils/logger');
const db = require('../config/database');

/**
 * Valida dados de geração de crédito
 * @param {object} payload - Dados de entrada
 * @param {number} clienteId - ID do cliente
 * @returns {object} Payload validado
 */
const validarPayloadCredito = (payload, clienteId) => {
  const { colaboradores, aplicar_mesmo_valor, valor_uniforme } = payload;

  // Validação de colaboradores
  if (!Array.isArray(colaboradores) || colaboradores.length === 0) {
    throw new APIError('Mínimo 1 colaborador é obrigatório', 400, { campo: 'colaboradores' });
  }

  if (colaboradores.length > 5000) {
    throw new APIError('Máximo 5000 colaboradores permitidos', 400, { campo: 'colaboradores' });
  }

  // Se aplicar_mesmo_valor, valida valor_uniforme
  if (aplicar_mesmo_valor) {
    if (!isValidPositiveNumber(valor_uniforme, 1000000)) {
      throw new APIError('Valor uniforme inválido ou excede o limite', 400, { campo: 'valor_uniforme' });
    }
  }

  // Detecta modo: por ID (seleção manual) ou por CPF (importação Excel)
  const modoCpf = colaboradores.some(c => !c.id || c.id <= 0);

  // Validação de valores individuais
  colaboradores.forEach((colab, index) => {
    if (modoCpf) {
      // Modo CPF: precisa ter cpf válido
      const cpfLimpo = (colab.cpf || '').replace(/\D/g, '');
      if (cpfLimpo.length !== 11) {
        throw new APIError(`Colaborador ${index + 1}: CPF inválido`, 400);
      }
    } else {
      // Modo ID: precisa ter id válido
      if (!colab.id || !Number.isInteger(colab.id) || colab.id <= 0) {
        throw new APIError(`Colaborador ${index + 1}: ID inválido`, 400);
      }
    }

    // Se não é valor uniforme, cada colaborador precisa de valor
    if (!aplicar_mesmo_valor) {
      if (!isValidPositiveNumber(colab.valor, 1000000)) {
        throw new APIError(`Colaborador ${index + 1}: Valor inválido ou excede o limite`, 400);
      }
    }
  });

  return {
    colaboradores,
    aplicar_mesmo_valor: aplicar_mesmo_valor || false,
    valor_uniforme: aplicar_mesmo_valor ? parseFloat(valor_uniforme) : null,
    clienteId,
    modoCpf
  };
};

/**
 * Gera crédito para múltiplos colaboradores (com transação)
 * Replica lógica dos MKFs:
 * 1. Gera remessa_id via sequence (nextval)
 * 2. Insere remessa com (id, data, login, cli_id) — apenas 4 campos
 * 3. Para cada colaborador: insere crédito com valor direto (sem taxa)
 *    com crd_pro_id=999 e crd_sit_id=1
 *
 * @param {object} payload - Dados validados
 * @param {string} login - Login do usuário que está gerando
 * @returns {Promise<object>} Resultado da geração
 */
const gerarCredito = async (payload, login = 'sistema') => {
  const { colaboradores, aplicar_mesmo_valor, valor_uniforme, clienteId, modoCpf } = payload;
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    let colaboradoresValidos;

    if (modoCpf) {
      // Modo Excel: resolve IDs pelo CPF (como o MKF faz)
      const cpfs = colaboradores.map(c => (c.cpf || '').replace(/\D/g, '').padStart(11, '0'));
      colaboradoresValidos = await colaboradoresRepository.buscarColaboradoresPorCpfs(cpfs, clienteId);
    } else {
      // Modo manual: busca pelo ID
      const ids = colaboradores.map(c => c.id);
      colaboradoresValidos = await colaboradoresRepository.buscarColaboradoresPorIds(ids, clienteId);
    }

    // 2. Cria registro de remessa (ID gerado automaticamente pela sequence)
    const remessaId = await creditosRepository.criarRemessa(client, clienteId, login);

    // 3. Processa cada colaborador — valor direto, sem cálculo de taxa
    let valorTotal = 0;
    const creditosCriados = [];
    const ignorados = [];

    for (const colab of colaboradores) {
      // Encontra colaborador no banco: por ID ou por CPF
      let colabDB;
      if (modoCpf) {
        const cpfLimpo = (colab.cpf || '').replace(/\D/g, '').padStart(11, '0');
        colabDB = colaboradoresValidos.find(c => {
          const dbCpfLimpo = (c.cpf || '').replace(/\D/g, '').padStart(11, '0');
          return dbCpfLimpo === cpfLimpo;
        });
      } else {
        colabDB = colaboradoresValidos.find(c => c.id === colab.id);
      }

      if (!colabDB) {
        ignorados.push({
          id: colab.id || 0,
          cpf: colab.cpf || '',
          nome: colab.nome || '',
          motivo: 'CPF não encontrado ou colaborador inativo'
        });
        continue;
      }

      // Valor: individual ou uniforme
      const valor = aplicar_mesmo_valor
        ? valor_uniforme
        : parseFloat(colab.valor);

      if (!valor || valor <= 0) {
        ignorados.push({ id: colabDB.id, motivo: 'valor<=0' });
        continue;
      }

      // CPF do colaborador (limpo, como no MKF)
      const cpf = (colabDB.cpf || '').replace(/[.\-]/g, '').padStart(11, '0');

      // Insere crédito individual (replica MKF exatamente)
      const creditoId = await creditosRepository.inserirCredito(
        client,
        colabDB.id,
        valor,
        cpf,
        remessaId,
        clienteId,
        login
      );

      creditosCriados.push({
        credito_id: creditoId,
        colaborador_id: colabDB.id,
        nome: colabDB.nome,
        valor
      });

      valorTotal += valor;
    }

    // 4. Confirma transação
    await client.query('COMMIT');

    logger.info('Crédito gerado com sucesso:', {
      remessaId,
      clienteId,
      totalColaboradores: creditosCriados.length,
      totalIgnorados: ignorados.length,
      valorTotal,
      login
    });

    return {
      success: true,
      message: `Crédito gerado com sucesso para ${creditosCriados.length} colaborador(es)`,
      data: {
        remessa_id: remessaId,
        total_inseridos: creditosCriados.length,
        total_ignorados: ignorados.length,
        valor_total: Math.round(valorTotal * 100) / 100,
        data_criacao: new Date().toISOString(),
        criado_por: login,
        detalhes: creditosCriados,
        ignorados: ignorados.length > 0 ? ignorados : undefined
      }
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Erro ao gerar crédito:', { error: error.message });

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError('Erro ao gerar crédito', 500);
  } finally {
    client.release();
  }
};

/**
 * Busca histórico de gerações
 * @param {object} query - Query parameters
 * @param {number} clienteId - ID do cliente
 * @returns {Promise<object>} Histórico e metadados
 */
const obterHistorico = async (query, clienteId) => {
  if (!clienteId) {
    throw new APIError('cliente_id é obrigatório', 400);
  }

  const { limit, offset, data_inicio, data_fim } = query;
  const { limit: validLimit, offset: validOffset } = validatePagination(limit, offset);

  try {
    const resultado = await creditosRepository.buscarHistorico(
      clienteId,
      validLimit,
      validOffset,
      data_inicio,
      data_fim
    );

    logger.info('Histórico buscado:', {
      clienteId,
      total: resultado.total,
      filtro_datas: { data_inicio, data_fim }
    });

    return {
      success: true,
      data: resultado.historico,
      total: resultado.total,
      limit: validLimit,
      offset: validOffset,
      page: resultado.page
    };
  } catch (error) {
    logger.error('Erro ao obter histórico:', { error: error.message });
    throw new APIError('Erro ao buscar histórico', 500);
  }
};

/**
 * Busca detalhes de uma remessa específica
 * @param {number} remessaId - ID da remessa
 * @param {number} clienteId - ID do cliente
 * @returns {Promise<object>} Detalhes da remessa
 */
const obterDetalheRemessa = async (remessaId, clienteId) => {
  if (!remessaId || !clienteId) {
    throw new APIError('remessa_id e cliente_id são obrigatórios', 400);
  }

  try {
    const detalhes = await creditosRepository.buscarDetalheRemessa(remessaId, clienteId);

    return {
      success: true,
      data: {
        remessa_id: remessaId,
        total_colaboradores: detalhes.length,
        colaboradores: detalhes
      }
    };
  } catch (error) {
    logger.error('Erro ao obter detalhe da remessa:', { error: error.message });
    throw new APIError('Erro ao buscar detalhes da remessa', 500);
  }
};

module.exports = {
  validarPayloadCredito,
  gerarCredito,
  obterHistorico,
  obterDetalheRemessa
};
