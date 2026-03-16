/**
 * Funções utilitárias de formatação
 * Centralizadas para evitar duplicação
 */

/**
 * Formata valor para BRL (R$ 1.234,56)
 */
export const formatBRL = (v) => {
  const n = Number(v) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

/**
 * Formata CPF (12345678901 → 123.456.789-01)
 */
export const formatCPF = (cpf) => {
  if (!cpf) return '';
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length === 11) {
    return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return cpf;
};

/**
 * Formata CNPJ (12345678000199 → 12.345.678/0001-99)
 */
export const formatCNPJ = (cnpj) => {
  if (!cnpj) return '';
  const c = cnpj.replace(/\D/g, '');
  return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

/**
 * Formata data ISO para dd/mm/yyyy
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR');
};

/**
 * Extrai iniciais do nome (máximo 2 letras)
 */
export const getIniciais = (nome) => {
  if (!nome) return 'U';
  return nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};
