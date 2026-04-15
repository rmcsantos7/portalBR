/**
 * Service de Autenticação
 * Valida credenciais usando hash MD5(usr_codigo + senha)
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const authRepository = require('../repositories/auth.repository');
const { APIError } = require('../middlewares/errorHandler');
const { ok } = require('../utils/response');
const logger = require('../utils/logger');

// SEGURANÇA: JWT_SECRET obrigatório via variável de ambiente
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET não definido nas variáveis de ambiente. O servidor não pode iniciar sem esta configuração.');
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Gera hash MD5
 */
const md5 = (str) => crypto.createHash('md5').update(String(str)).digest('hex');

/**
 * Verifica senha via MD5(usr_codigo + senha)
 */
const verificarSenha = (usuario, senha) => {
  const hashBanco = usuario.usr_senha;
  const concatenacao = String(usuario.usr_codigo) + senha;
  const hashGerado = md5(concatenacao);
  return hashGerado === hashBanco;
};

/**
 * Realiza login
 */
const login = async (loginUsuario, senha) => {
  if (!loginUsuario || !senha) {
    throw new APIError('Login e senha são obrigatórios', 400);
  }

  try {
    const usuario = await authRepository.buscarUsuarioPorLogin(loginUsuario);
    if (!usuario) {
      throw new APIError('Usuário ou senha inválidos', 401);
    }

    const valido = verificarSenha(usuario, senha);

    if (!valido) {
      throw new APIError('Usuário ou senha inválidos', 401);
    }

    // Verificar se é senha temporária
    const senhaTemporaria = usuario.usr_senha_temporaria === true || usuario.usr_senha_temporaria === 'S';

    // Gerar JWT
    const token = jwt.sign(
      {
        usr_codigo: usuario.usr_codigo,
        usr_login: usuario.usr_login,
        usr_nome: usuario.usr_nome,
        crd_cli_id: usuario.crd_cli_id,
        cliente_nome: usuario.cliente_nome,
        cliente_cnpj: usuario.cliente_cnpj,
        usr_administrador: usuario.usr_administrador,
        senha_temporaria: senhaTemporaria
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logger.info('Login realizado:', { login: loginUsuario, usr_codigo: usuario.usr_codigo, senhaTemporaria });

    return ok({
      token,
      senha_temporaria: senhaTemporaria,
      usuario: {
        usr_codigo: usuario.usr_codigo,
        usr_login: usuario.usr_login,
        usr_nome: usuario.usr_nome,
        usr_email: usuario.usr_email,
        crd_cli_id: usuario.crd_cli_id,
        cliente_nome: usuario.cliente_nome,
        cliente_cnpj: usuario.cliente_cnpj,
        usr_administrador: usuario.usr_administrador
      }
    });
  } catch (error) {
    if (error instanceof APIError) throw error;
    logger.error('Erro no login:', { error: error.message });
    throw new APIError('Erro interno no login', 500);
  }
};

/**
 * Verifica e decodifica token JWT
 */
const verificarToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new APIError('Token inválido ou expirado', 401);
  }
};

/**
 * Recuperação de senha — gera senha temporária, salva com MD5 e envia por email
 */
const nodemailer = require('nodemailer');

const gerarSenhaTemporaria = (tamanho = 8) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let senha = '';
  for (let i = 0; i < tamanho; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha;
};

const recuperarSenha = async (email) => {
  if (!email) {
    throw new APIError('Email é obrigatório', 400);
  }

  try {
    // 1. Buscar usuário pelo email
    const usuario = await authRepository.buscarUsuarioPorEmail(email);
    if (!usuario) {
      logger.info('Tentativa de recuperação para email não encontrado:', { email });
      return ok(null, 'Se o email estiver cadastrado, você receberá uma senha temporária em instantes.');
    }

    // 2. Buscar config SMTP do banco (pk=1)
    const smtp = await authRepository.buscarConfigSMTP(1);
    if (!smtp) {
      logger.error('Config SMTP não encontrada no banco (crd_dados_sensiveis pk=1)');
      throw new APIError('Configuração de email não disponível. Contate o administrador.', 500);
    }

    // 3. Gerar senha temporária
    const senhaTemporaria = gerarSenhaTemporaria();

    // 4. Salvar nova senha com MD5(usr_codigo + senha) + marcar como temporária
    const hashNovo = md5(String(usuario.usr_codigo) + senhaTemporaria);
    await authRepository.atualizarSenhaComFlag(usuario.usr_codigo, hashNovo, true);

    // 5. Configurar transporter nodemailer
    const portaNum = parseInt(smtp.porta, 10) || 587;
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: portaNum,
      secure: portaNum === 465,
      auth: {
        user: smtp.usuario,
        pass: smtp.senha
      },
      tls: { rejectUnauthorized: false }
    });

    // 6. Enviar email
    const htmlEmail = `
      <div style="font-family: 'Nunito', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px;">
        <div style="background: #4A1D4F; border-radius: 12px; padding: 30px; text-align: center;">
          ${smtp.logo_url ? `<img src="${smtp.logo_url}" alt="Logo" style="max-height: 50px; margin-bottom: 20px;" />` : ''}
          <h2 style="color: #fff; margin: 0 0 10px; font-size: 22px;">Recuperação de Senha</h2>
          <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 25px;">
            Olá <strong>${usuario.usr_nome}</strong>, recebemos sua solicitação.
          </p>
          <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0 0 8px;">Sua nova senha temporária:</p>
            <p style="color: #F9678C; font-size: 28px; font-weight: 800; letter-spacing: 3px; margin: 0; font-family: monospace;">
              ${senhaTemporaria}
            </p>
          </div>
          <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 0;">
            Você será solicitado a criar uma nova senha ao fazer login.
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"BR Gorjeta" <${smtp.remetente || smtp.usuario}>`,
      to: usuario.usr_email || usuario.usr_login,
      subject: 'Recuperação de Senha - BR Gorjeta',
      html: htmlEmail
    });

    const emailDestino = usuario.usr_email || usuario.usr_login;
    logger.info('Senha temporária enviada por email:', { usr_codigo: usuario.usr_codigo, email: emailDestino });

    return {
      success: true,
      message: 'Se o email estiver cadastrado, você receberá uma senha temporária em instantes.'
    };
  } catch (error) {
    if (error instanceof APIError) throw error;
    logger.error('Erro na recuperação de senha:', { error: error.message });
    throw new APIError('Erro ao processar recuperação de senha. Tente novamente.', 500);
  }
};

/**
 * Troca de senha (obrigatória após senha temporária ou voluntária)
 */
const trocarSenha = async (usrCodigo, senhaAtual, novaSenha) => {
  if (!senhaAtual || !novaSenha) {
    throw new APIError('Senha atual e nova senha são obrigatórias', 400);
  }

  if (novaSenha.length < 6) {
    throw new APIError('A nova senha deve ter pelo menos 6 caracteres', 400);
  }

  try {
    const usuario = await authRepository.buscarUsuarioPorCodigo(usrCodigo);
    if (!usuario) {
      throw new APIError('Usuário não encontrado', 404);
    }

    // Verificar senha atual via MD5
    const valido = verificarSenha(usuario, senhaAtual);
    if (!valido) {
      throw new APIError('Senha atual incorreta', 401);
    }

    // Salvar nova senha como MD5(usr_codigo + novaSenha) e limpar flag
    const hashNovo = md5(String(usrCodigo) + novaSenha);
    await authRepository.atualizarSenhaComFlag(usrCodigo, hashNovo, false);

    // Gerar novo token sem flag de senha temporária
    const token = jwt.sign(
      {
        usr_codigo: usuario.usr_codigo,
        usr_login: usuario.usr_login,
        usr_nome: usuario.usr_nome,
        crd_cli_id: usuario.crd_cli_id,
        cliente_nome: usuario.cliente_nome,
        cliente_cnpj: usuario.cliente_cnpj,
        usr_administrador: usuario.usr_administrador,
        senha_temporaria: false
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logger.info('Senha alterada com sucesso:', { usr_codigo: usrCodigo });

    return ok({ token }, 'Senha alterada com sucesso');
  } catch (error) {
    if (error instanceof APIError) throw error;
    logger.error('Erro ao trocar senha:', { error: error.message });
    throw new APIError('Erro ao alterar senha', 500);
  }
};

/**
 * Lista clientes disponíveis (apenas para administradores)
 */
const listarClientes = async (usuario) => {
  const isAdmin = usuario?.administrador === true || usuario?.usr_administrador === 'S';
  if (!isAdmin) {
    throw new APIError('Acesso negado: apenas administradores podem listar clientes', 403);
  }

  try {
    const clientes = await authRepository.listarClientes();
    return ok(clientes.map(c => ({
      crd_cli_id: c.crd_cli_id,
      crd_cli_nome_fantasia: c.crd_cli_nome_fantasia,
      crd_cli_cnpj: c.crd_cli_cnpj
    })));
  } catch (error) {
    if (error instanceof APIError) throw error;
    logger.error('Erro ao listar clientes:', { error: error.message });
    throw new APIError('Erro ao listar clientes', 500);
  }
};

/**
 * Troca o cliente ativo (apenas administradores).
 * Gera um novo token JWT com o novo crd_cli_id.
 */
const trocarCliente = async (usuario, novoClienteId) => {
  const isAdmin = usuario?.administrador === true || usuario?.usr_administrador === 'S';
  if (!isAdmin) {
    throw new APIError('Acesso negado: apenas administradores podem trocar de cliente', 403);
  }

  if (!novoClienteId) {
    throw new APIError('cliente_id é obrigatório', 400);
  }

  try {
    const cliente = await authRepository.buscarClientePorId(novoClienteId);
    if (!cliente) {
      throw new APIError('Cliente não encontrado', 404);
    }

    const usuarioDb = await authRepository.buscarUsuarioPorCodigo(usuario.codigo || usuario.usr_codigo);
    if (!usuarioDb) {
      throw new APIError('Usuário não encontrado', 404);
    }

    const token = jwt.sign(
      {
        usr_codigo: usuarioDb.usr_codigo,
        usr_login: usuarioDb.usr_login,
        usr_nome: usuarioDb.usr_nome,
        crd_cli_id: cliente.crd_cli_id,
        cliente_nome: cliente.crd_cli_nome_fantasia,
        cliente_cnpj: cliente.crd_cli_cnpj,
        usr_administrador: usuarioDb.usr_administrador,
        senha_temporaria: false
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logger.info('Admin trocou de cliente:', {
      usr_codigo: usuarioDb.usr_codigo,
      novoClienteId: cliente.crd_cli_id
    });

    return ok({
      token,
      usuario: {
        usr_codigo: usuarioDb.usr_codigo,
        usr_login: usuarioDb.usr_login,
        usr_nome: usuarioDb.usr_nome,
        usr_email: usuarioDb.usr_email,
        crd_cli_id: cliente.crd_cli_id,
        cliente_nome: cliente.crd_cli_nome_fantasia,
        cliente_cnpj: cliente.crd_cli_cnpj,
        usr_administrador: usuarioDb.usr_administrador
      }
    }, 'Cliente alterado com sucesso');
  } catch (error) {
    if (error instanceof APIError) throw error;
    logger.error('Erro ao trocar cliente:', { error: error.message });
    throw new APIError('Erro ao trocar cliente', 500);
  }
};

module.exports = {
  login,
  verificarToken,
  recuperarSenha,
  trocarSenha,
  listarClientes,
  trocarCliente
};
