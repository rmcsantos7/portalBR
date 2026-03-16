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
 * Valida CPF com cálculo dos dígitos verificadores
 * @param {string} cpf - CPF a validar (com ou sem máscara)
 * @returns {boolean}
 */
const isValidCPF = (cpf) => {
  if (!cpf) return false;
  let cleaned = cpf.replace(/\D/g, '');
  // Excel pode remover zeros à esquerda ao tratar CPF como número
  if (cleaned.length > 0 && cleaned.length < 11) {
    cleaned = cleaned.padStart(11, '0');
  }
  if (cleaned.length !== 11) return false;

  // Rejeitar CPFs com todos os dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  // Cálculo do 1º dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cleaned[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cleaned[9])) return false;

  // Cálculo do 2º dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cleaned[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cleaned[10])) return false;

  return true;
};

/**
 * Remove máscara de CPF, retornando apenas dígitos
 * @param {string} cpf - CPF com ou sem máscara
 * @returns {string}
 */
const limparCPF = (cpf) => {
  if (!cpf) return '';
  const cleaned = cpf.replace(/\D/g, '');
  // Garantir 11 dígitos (Excel pode remover zeros à esquerda)
  return cleaned.padStart(11, '0');
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
  limparCPF,
  isValidEmail,
  isValidString,
  sanitizeString,
  isValidExcelFile,
  validatePagination,
  isValidDate,
  extractClienteId
};
