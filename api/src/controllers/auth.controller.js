/**
 * Controller de Autenticação
 */

const authService = require('../services/auth.service');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { login: loginUsuario, senha } = req.body;
  const resultado = await authService.login(loginUsuario, senha);
  return res.status(200).json(resultado);
});

const enviar2FA = asyncHandler(async (req, res) => {
  const { challenge_token, metodo } = req.body;
  const resultado = await authService.enviarCodigo2FA(challenge_token, metodo);
  return res.status(200).json(resultado);
});

const verificar2FA = asyncHandler(async (req, res) => {
  const { challenge_token, codigo } = req.body;
  const resultado = await authService.verificarCodigo2FA(challenge_token, codigo);
  return res.status(200).json(resultado);
});

const aceitarTermos = asyncHandler(async (req, res) => {
  const resultado = await authService.aceitarTermos(req.usuario);
  return res.status(200).json(resultado);
});

/**
 * GET /api/auth/me
 * Retorna dados do usuário logado (do token)
 */
const me = asyncHandler(async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      usuario: {
        usr_codigo: req.usuario.codigo,
        usr_login: req.usuario.login,
        usr_nome: req.usuario.nome,
        crd_cli_id: req.usuario.cliente_id,
        cliente_nome: req.usuario.cliente_nome,
        cliente_cnpj: req.usuario.cliente_cnpj,
        usr_administrador: req.usuario.administrador ? 'S' : 'N',
        total_restaurantes: req.usuario.total_restaurantes || 1
      }
    }
  });
});

/**
 * POST /api/auth/recuperar-senha
 */
const recuperarSenha = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const resultado = await authService.recuperarSenha(email);
  return res.status(200).json(resultado);
});

/**
 * POST /api/auth/trocar-senha
 * Troca de senha (obrigatória após senha temporária)
 */
const trocarSenha = asyncHandler(async (req, res) => {
  const { senha_atual, nova_senha } = req.body;
  const resultado = await authService.trocarSenha(req.usuario.codigo, senha_atual, nova_senha);
  return res.status(200).json(resultado);
});

/**
 * GET /api/auth/clientes
 * Lista clientes disponíveis (apenas administradores)
 */
const listarClientes = asyncHandler(async (req, res) => {
  const resultado = await authService.listarClientes(req.usuario);
  return res.status(200).json(resultado);
});

/**
 * POST /api/auth/trocar-cliente
 * Troca o cliente ativo do admin, retornando um novo token
 */
const trocarCliente = asyncHandler(async (req, res) => {
  const { cliente_id } = req.body;
  const resultado = await authService.trocarCliente(req.usuario, cliente_id);
  return res.status(200).json(resultado);
});

module.exports = {
  login,
  enviar2FA,
  verificar2FA,
  aceitarTermos,
  me,
  recuperarSenha,
  trocarSenha,
  listarClientes,
  trocarCliente
};
