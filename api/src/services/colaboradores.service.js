/**
 * Service de Colaboradores
 * Lógica de negócio (validações, processamento)
 */

const colaboradoresRepository = require('../repositories/colaboradores.repository');
const { validatePagination, extractClienteId } = require('../utils/validators');
const { APIError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const XLSX = require('xlsx');

/**
 * Busca colaboradores com filtros
 * @param {object} query - Query parameters
 * @returns {Promise<object>} Colaboradores e metadados
 */
const listarColaboradores = async (query) => {
  const { clienteId, search = '', setorId, limit, offset } = query;

  // Validação de cliente_id obrigatório
  if (!clienteId) {
    throw new APIError('cliente_id é obrigatório', 400, { campo: 'cliente_id' });
  }

  // Validação de paginação
  const { limit: validLimit, offset: validOffset } = validatePagination(limit, offset);

  try {
    const resultado = await colaboradoresRepository.buscarColaboradores(
      clienteId,
      search,
      setorId || null,
      validLimit,
      validOffset
    );

    logger.info('Colaboradores listados:', {
      clienteId,
      total: resultado.total,
      limit: validLimit,
      offset: validOffset
    });

    return {
      success: true,
      data: resultado.colaboradores,
      total: resultado.total,
      limit: validLimit,
      offset: validOffset,
      page: resultado.page
    };
  } catch (error) {
    logger.error('Erro ao listar colaboradores:', { error: error.message });
    throw new APIError('Erro ao buscar colaboradores', 500);
  }
};

/**
 * Busca setores/cargos de um cliente
 * @param {number} clienteId - ID do cliente
 * @returns {Promise<object>} Array de setores
 */
const obterSetores = async (clienteId) => {
  if (!clienteId) {
    throw new APIError('cliente_id é obrigatório', 400);
  }

  try {
    const setores = await colaboradoresRepository.buscarSetores(clienteId);
    return {
      success: true,
      data: setores
    };
  } catch (error) {
    logger.error('Erro ao obter setores:', { error: error.message });
    throw new APIError('Erro ao buscar setores', 500);
  }
};

/**
 * Processa upload e validação de arquivo Excel
 * @param {object} file - Arquivo enviado (multer)
 * @param {number} clienteId - ID do cliente
 * @returns {Promise<object>} Dados processados e validados
 */
const processarExcel = async (file, clienteId) => {
  if (!file) {
    throw new APIError('Arquivo não enviado', 400);
  }

  if (!clienteId) {
    throw new APIError('cliente_id é obrigatório', 400);
  }

  try {
    // Lê o arquivo Excel
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const dados = XLSX.utils.sheet_to_json(worksheet);

    if (dados.length === 0) {
      throw new APIError('Arquivo Excel vazio', 400);
    }

    if (dados.length > 5000) {
      throw new APIError('Arquivo com mais de 5000 linhas', 413);
    }

    const colaboradoresProcessados = [];
    const erros = [];

    // Processa cada linha
    dados.forEach((linha, index) => {
      const numLinha = index + 2; // +1 para cabeçalho, +1 para numeração humana

      const nome = linha.nome ? String(linha.nome).trim() : null;
      const cpf = linha.cpf ? String(linha.cpf).trim() : null;
      const valor = linha.valor ? parseFloat(linha.valor) : null;
      const cargo = linha.cargo ? String(linha.cargo).trim() : null;

      // Validações
      const validacoes = [];

      if (!nome || nome.length === 0) {
        validacoes.push('Nome é obrigatório');
      } else if (nome.length > 255) {
        validacoes.push('Nome muito longo (máximo 255 caracteres)');
      }

      if (!cpf) {
        validacoes.push('CPF é obrigatório');
      } else {
        // Remove caracteres especiais para validação
        const cpfLimpo = cpf.replace(/\D/g, '');
        if (cpfLimpo.length !== 11) {
          validacoes.push('CPF deve ter 11 dígitos');
        }
      }

      if (!valor || isNaN(valor) || valor <= 0) {
        validacoes.push('Valor deve ser um número positivo');
      } else if (valor > 1000000) {
        validacoes.push('Valor não pode exceder R$ 1.000.000');
      }

      if (validacoes.length > 0) {
        erros.push({
          linha: numLinha,
          nome: nome || 'N/A',
          cpf,
          erros: validacoes
        });
      } else {
        colaboradoresProcessados.push({
          nome,
          cpf: cpf.replace(/\D/g, ''), // Normaliza CPF
          valor,
          cargo: cargo || 'Sem cargo'
        });
      }
    });

    logger.info('Excel processado:', {
      clienteId,
      totalLinhas: dados.length,
      validas: colaboradoresProcessados.length,
      erros: erros.length
    });

    return {
      success: true,
      data: {
        total_importados: colaboradoresProcessados.length,
        total_erros: erros.length,
        erros,
        colaboradores: colaboradoresProcessados
      }
    };
  } catch (error) {
    logger.error('Erro ao processar Excel:', { error: error.message });

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError('Erro ao processar arquivo Excel', 400);
  }
};

/**
 * Gera planilha Excel padrão com todos os colaboradores ativos
 * Replica lógica do MKF "Gerar Excel Importação de Crédito":
 * Colunas: NOME, CPF, VALOR (vazio para preenchimento)
 *
 * @param {number} clienteId - ID do cliente
 * @returns {Promise<Buffer>} Buffer do arquivo Excel
 */
const gerarPlanilhaPadrao = async (clienteId) => {
  if (!clienteId) {
    throw new APIError('cliente_id é obrigatório', 400);
  }

  try {
    const colaboradores = await colaboradoresRepository.buscarColaboradoresParaPlanilha(clienteId);

    if (colaboradores.length === 0) {
      throw new APIError('Nenhum colaborador ativo encontrado', 404);
    }

    // Monta dados para o Excel: NOME, CPF, VALOR (vazio)
    const dadosPlanilha = colaboradores.map(c => ({
      nome: c.nome,
      cpf: c.cpf,
      valor: ''
    }));

    // Cria workbook e worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dadosPlanilha);

    // Ajusta largura das colunas
    ws['!cols'] = [
      { wch: 40 }, // nome
      { wch: 16 }, // cpf
      { wch: 14 }  // valor
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'ImportacaoRecarga');

    // Gera buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    logger.info('Planilha padrão gerada:', {
      clienteId,
      totalColaboradores: colaboradores.length
    });

    return buffer;
  } catch (error) {
    logger.error('Erro ao gerar planilha padrão:', { error: error.message });

    if (error instanceof APIError) {
      throw error;
    }

    throw new APIError('Erro ao gerar planilha padrão', 500);
  }
};

module.exports = {
  listarColaboradores,
  obterSetores,
  processarExcel,
  gerarPlanilhaPadrao
};
