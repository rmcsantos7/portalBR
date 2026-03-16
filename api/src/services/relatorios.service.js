/**
 * Service de Relatórios
 * Lógica de negócio para geração de relatórios
 */

const relatoriosRepository = require('../repositories/relatorios.repository');
const { APIError } = require('../middlewares/errorHandler');

/**
 * Relatório 1: Recargas no período
 */
const relatorioRecargasPeriodo = async (clienteId, dataInicio, dataFim) => {
  if (!dataInicio || !dataFim) {
    throw new APIError('Informe data_inicio e data_fim', 400);
  }

  return await relatoriosRepository.buscarRecargasPeriodo(clienteId, dataInicio, dataFim);
};

/**
 * Relatório 2: Colaboradores cadastrados
 */
const relatorioColaboradores = async (clienteId) => {
  return await relatoriosRepository.buscarColaboradoresCadastrados(clienteId);
};

/**
 * Relatório 3: Histórico total por colaborador
 */
const relatorioHistoricoColaborador = async (clienteId, colaboradorId, dataInicio, dataFim) => {
  const colabId = parseInt(colaboradorId);
  if (!colabId) {
    throw new APIError('Informe o colaborador_id', 400);
  }

  if (!dataInicio || !dataFim) {
    throw new APIError('Informe data_inicio e data_fim', 400);
  }

  return await relatoriosRepository.buscarHistoricoColaborador(clienteId, colabId, dataInicio, dataFim);
};

/**
 * Lista colaboradores para seleção no relatório 3
 */
const listarColaboradoresRelatorio = async (clienteId, search) => {
  return await relatoriosRepository.listarColaboradoresParaRelatorio(clienteId, search || '');
};

module.exports = {
  relatorioRecargasPeriodo,
  relatorioColaboradores,
  relatorioHistoricoColaborador,
  listarColaboradoresRelatorio
};
