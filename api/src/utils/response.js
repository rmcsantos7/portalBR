/**
 * Helpers de resposta padronizada
 *
 * Formato padrão (JUST):
 *   Sucesso:   { success: true, data, message? }
 *   Lista:     { success: true, data: [], total, limit, offset, page }
 *   Erro:      { success: false, error: "msg", code: "ERRO_CODE", details?, timestamp }
 *
 * Uso nos services:
 *   const { ok, created, paginated } = require('../utils/response');
 *   return ok(usuario);
 *   return created(colaborador, 'Colaborador criado');
 *   return paginated(lista, { total: 100, limit: 50, offset: 0 });
 */

/**
 * Resposta de sucesso (200)
 * @param {*} data - Dados de retorno
 * @param {string} [message] - Mensagem opcional
 * @returns {object}
 */
const ok = (data, message) => ({
  success: true,
  ...(message && { message }),
  data
});

/**
 * Resposta de criação (201)
 * @param {*} data - Dados criados
 * @param {string} [message] - Mensagem opcional
 * @returns {object}
 */
const created = (data, message) => ({
  success: true,
  ...(message && { message }),
  data
});

/**
 * Resposta paginada
 * @param {Array} data - Lista de resultados
 * @param {object} meta - { total, limit, offset }
 * @returns {object}
 */
const paginated = (data, { total, limit, offset }) => ({
  success: true,
  data,
  total,
  limit,
  offset,
  page: Math.floor(offset / limit)
});

module.exports = { ok, created, paginated };
