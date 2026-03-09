/**
 * Validadores e Sanitizadores
 * Proteção contra SQL injection, XSS, e outras ameaças
 */

/**
 * Valida se uma string é um inteiro positivo
 * @param {any} value - Valor a validar
 * @returns {boolean}
 */
const isValidPositiveInteger = (value) => {
  return Number.isInteger(Number(value)) && Number(value) > 0;
};

/**
 * Valida se um número é positivo
 * @param {any} value - Valor a validar
 * @param {number} maxValue - Valor máximo permitido
 * @returns {boolean}
 */
const isValidPositiveNumber = (value, maxValue = 1000000) => {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0 && num <= maxValue;
};

/**
 * Valida CPF (formato básico)
 * @param {string} cpf - CPF a validar
 * @returns {boolean}
 */
const isValidCPF = (cpf) => {
  if (!cpf) return false;
  // Remove caracteres especiais
  const cleaned = cpf.replace(/\D/g, '');
  // Deve ter 11 dígitos
  return cleaned.length === 11 && /^\d{11}$/.test(cleaned);
};

/**
 * Valida email
 * @param {string} email - Email a validar
 * @returns {boolean}
 */
const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Valida string não vazia (máximo 255 caracteres)
 * @param {string} value - Valor a validar
 * @param {number} maxLength - Comprimento máximo
 * @returns {boolean}
 */
const isValidString = (value, maxLength = 255) => {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
};

/**
 * Sanitiza string removendo caracteres perigosos
 * @param {string} value - String a sanitizar
 * @returns {string}
 */
const sanitizeString = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 255);
};

/**
 * Valida se é um arquivo XLSX
 * @param {string} filename - Nome do arquivo
 * @returns {boolean}
 */
const isValidExcelFile = (filename) => {
  return filename.toLowerCase().endsWith('.xlsx') || filename.toLowerCase().endsWith('.xls');
};

/**
 * Valida limite e offset para paginação
 * @param {any} limit - Limite
 * @param {any} offset - Offset
 * @returns {object} { limit, offset, valid }
 */
const validatePagination = (limit, offset) => {
  const validLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 500);
  const validOffset = Math.max(parseInt(offset) || 0, 0);
  return {
    limit: validLimit,
    offset: validOffset,
    valid: true
  };
};

/**
 * Valida data (não pode ser no futuro)
 * @param {string} dateString - Data em formato YYYY-MM-DD
 * @returns {boolean}
 */
const isValidDate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return date <= today && !isNaN(date.getTime());
};

/**
 * Extrai e valida cliente_id da URL
 * @param {string} clienteIdParam - Parâmetro de cliente_id
 * @returns {number|null}
 */
const extractClienteId = (clienteIdParam) => {
  if (!clienteIdParam || !isValidPositiveInteger(clienteIdParam)) {
    return null;
  }
  return parseInt(clienteIdParam);
};

module.exports = {
  isValidPositiveInteger,
  isValidPositiveNumber,
  isValidCPF,
  isValidEmail,
  isValidString,
  sanitizeString,
  isValidExcelFile,
  validatePagination,
  isValidDate,
  extractClienteId
};
