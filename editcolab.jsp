<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="wfr.com.WFRSystem" %>
<%@ page import="wfr.util.*" %>
<%@ page import="wfr.com.*" %>
<%@ page import="wfr.sys.*" %>
<%@ page import="wfr.sys.HTMLInterface.*" %>
<%@ page import="wfr.rules.*" %>
<%@ page import="wfr.database.DBConnection" %>
<%@ page import="java.sql.*" %>
<%@ page import="java.util.*" %>
<%@ page import="java.text.SimpleDateFormat" %>
<%!
private static String esc(String s) {
    if (s == null) return "";
    return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;");
}
private static String nvl(String s) { return s == null ? "" : s; }
%>
<%
    Logger logger = Logger.getLogger(this.getClass());
    String sistema = "BRG";
    HTMLInterface htmli = null;
    String erro = null;
    String sucesso = null;

    try {
        htmli = HTMLInterface.getInstance(request);
        htmli.checkJSPAccess((javax.servlet.jsp.JspWriter) out, true);
    } catch (Exception e) {
        logger.error(htmli != null ? htmli.getUser() : WFRSystem.DEFAULT_USER, sistema, e);
        erro = "Erro no check de acesso à página.";
    }

    // ====== ID do colaborador via URL ======
    String paramId = request.getParameter("id");
    int colabId = 0;
    if (paramId != null && !paramId.trim().isEmpty()) {
        try { colabId = Integer.parseInt(paramId.trim()); }
        catch (NumberFormatException e) { erro = "Parâmetro 'id' inválido."; }
    } else {
        erro = "ID do colaborador não informado.";
    }

    // ====== Cliente da sessão (para filtrar restaurante) ======
    Integer sessaoCliente = null;
    {
        String pc = request.getParameter("cliente");
        if (pc != null && !pc.trim().isEmpty()) {
            try { sessaoCliente = Integer.parseInt(pc.trim()); } catch (NumberFormatException ignore) {}
        }
        if (sessaoCliente == null) {
            Object sc = request.getSession().getAttribute("cliente");
            if (sc != null) {
                try { sessaoCliente = Integer.parseInt(sc.toString().trim()); } catch (NumberFormatException ignore) {}
            }
        }
    }

    DBConnection conn = null;

    // ====== PROCESSAR AÇÕES POST ======
    String action = request.getParameter("action");
    if (erro == null && "POST".equalsIgnoreCase(request.getMethod()) && action != null) {
        try {
            conn = htmli.getData().connection();
            if ("salvar".equals(action)) {
                String sqlUpd =
                    "UPDATE crd_usuario SET " +
                    "  crd_usr_nome = '" + nvl(request.getParameter("nome")).replace("'","''") + "', " +
                    "  crd_usr_cpf = '" + nvl(request.getParameter("cpf")).replace("'","''") + "', " +
                    "  crd_usu_email = '" + nvl(request.getParameter("email")).replace("'","''") + "', " +
                    "  crd_usr_celular = '" + nvl(request.getParameter("celular")).replace("'","''") + "', " +
                    "  crd_usr_nascimento = " + (nvl(request.getParameter("nascimento")).isEmpty() ? "NULL" : "'" + nvl(request.getParameter("nascimento")).replace("'","''") + "'") + ", " +
                    "  crd_usr_sexo = '" + nvl(request.getParameter("sexo")).replace("'","''") + "', " +
                    "  crd_cli_id = " + (nvl(request.getParameter("restaurante")).isEmpty() ? "NULL" : request.getParameter("restaurante")) + ", " +
                    "  crd_set_id = " + (nvl(request.getParameter("cargo")).isEmpty() ? "NULL" : request.getParameter("cargo")) +
                    " WHERE crd_usr_id = " + colabId;
                conn.executeUpdate(sqlUpd);
                sucesso = "Dados salvos com sucesso.";
            } else if ("ativar".equals(action)) {
                conn.executeUpdate("UPDATE crd_usuario SET crd_sit_id = 1 WHERE crd_usr_id = " + colabId);
                sucesso = "Colaborador ativado.";
            } else if ("bloquear".equals(action)) {
                conn.executeUpdate("UPDATE crd_usuario SET crd_sit_id = 2 WHERE crd_usr_id = " + colabId);
                sucesso = "Colaborador bloqueado.";
            }
        } catch (Exception e) {
            logger.error(htmli != null ? htmli.getUser() : WFRSystem.DEFAULT_USER, sistema, e);
            erro = "Erro ao processar ação: " + esc(e.getMessage());
        } finally {
            if (conn != null) { try { conn.closeConnection(); } catch (Exception ignore) {} conn = null; }
        }
    }

    // ====== CARREGAR DADOS DO COLABORADOR ======
    String nome = "", cpf = "", email = "", celular = "", nascimento = "", sexo = "";
    int sitId = 0, cliId = 0, setId = 0;
    String dataCadastro = "";

    if (erro == null) {
        try {
            conn = htmli.getData().connection();
            String sql =
                "SELECT crd_usr_id, crd_usr_nome, crd_usr_cpf, crd_sit_id, crd_cli_id, crd_set_id, " +
                "  crd_usu_email, crd_usu_data_inclusao, crd_usr_celular, crd_usr_nascimento, crd_usr_sexo " +
                "FROM crd_usuario WHERE crd_usr_id = " + colabId;
            ResultSet rs = conn.getResultSet(sql);
            if (rs.next()) {
                nome        = nvl(rs.getString("crd_usr_nome"));
                cpf         = nvl(rs.getString("crd_usr_cpf"));
                email       = nvl(rs.getString("crd_usu_email"));
                celular     = nvl(rs.getString("crd_usr_celular"));
                sitId       = rs.getInt("crd_sit_id");
                cliId       = rs.getInt("crd_cli_id");
                setId       = rs.getInt("crd_set_id");
                sexo        = nvl(rs.getString("crd_usr_sexo"));

                java.sql.Date dtNasc = rs.getDate("crd_usr_nascimento");
                if (dtNasc != null) nascimento = new SimpleDateFormat("yyyy-MM-dd").format(dtNasc);

                java.sql.Date dtCad = rs.getDate("crd_usu_data_inclusao");
                if (dtCad != null) dataCadastro = new SimpleDateFormat("dd/MM/yyyy").format(dtCad);
            } else {
                erro = "Colaborador não encontrado (ID=" + colabId + ").";
            }
            rs.close();
        } catch (Exception e) {
            logger.error(htmli != null ? htmli.getUser() : WFRSystem.DEFAULT_USER, sistema, e);
            erro = "Erro ao carregar colaborador.";
        } finally {
            if (conn != null) { try { conn.closeConnection(); } catch (Exception ignore) {} conn = null; }
        }
    }

    // ====== CARREGAR DROPDOWN RESTAURANTES ======
    List<int[]> restaurantes = new ArrayList<int[]>();      // [id]
    List<String> restauranteNomes = new ArrayList<String>();
    if (erro == null) {
        try {
            conn = htmli.getData().connection();
            String sqlRest = "SELECT crd_cli_id, crd_cli_nome_fantasia FROM crd_cliente";
            if (sessaoCliente != null) {
                sqlRest += " WHERE crd_cli_id = " + sessaoCliente;
            }
            sqlRest += " ORDER BY crd_cli_nome_fantasia";
            ResultSet rs = conn.getResultSet(sqlRest);
            while (rs.next()) {
                restaurantes.add(new int[]{ rs.getInt("crd_cli_id") });
                restauranteNomes.add(nvl(rs.getString("crd_cli_nome_fantasia")));
            }
            rs.close();
        } catch (Exception e) {
            logger.error(htmli != null ? htmli.getUser() : WFRSystem.DEFAULT_USER, sistema, e);
        } finally {
            if (conn != null) { try { conn.closeConnection(); } catch (Exception ignore) {} conn = null; }
        }
    }

    // ====== CARREGAR DROPDOWN CARGOS (filtrado pelo restaurante) ======
    // Se veio cli_id na URL (troca de restaurante), usa ele; senão usa o do colaborador
    int cargoCliId = cliId;
    {
        String paramCliId = request.getParameter("cli_id");
        if (paramCliId != null && !paramCliId.trim().isEmpty()) {
            try { cargoCliId = Integer.parseInt(paramCliId.trim()); } catch (NumberFormatException ignore) {}
        }
    }
    List<int[]> cargos = new ArrayList<int[]>();
    List<String> cargoNomes = new ArrayList<String>();
    if (erro == null && cargoCliId > 0) {
        try {
            conn = htmli.getData().connection();
            String sqlCargo =
                "SELECT crd_set_id, crd_set_setor FROM crd_cliente_setor " +
                "WHERE crd_cli_id = " + cargoCliId + " ORDER BY crd_set_setor";
            ResultSet rs = conn.getResultSet(sqlCargo);
            while (rs.next()) {
                cargos.add(new int[]{ rs.getInt("crd_set_id") });
                cargoNomes.add(nvl(rs.getString("crd_set_setor")));
            }
            rs.close();
        } catch (Exception e) {
            logger.error(htmli != null ? htmli.getUser() : WFRSystem.DEFAULT_USER, sistema, e);
        } finally {
            if (conn != null) { try { conn.closeConnection(); } catch (Exception ignore) {} conn = null; }
        }
    }

    boolean isAtivo = (sitId == 1);
%>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Colaborador - Edição</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f5f7fb; color: #111827;
    }
    .page { max-width: 1140px; margin: 0 auto; padding: 20px; }

    /* --- Cards / Seções --- */
    .card {
      background: #fff; border-radius: 8px;
      box-shadow: 0 4px 12px rgba(15,23,42,.05);
      padding: 20px 28px; margin-bottom: 16px;
    }
    .card-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 16px; }

    /* --- Header da página --- */
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 20px;
    }
    .page-title { font-size: 1.4rem; font-weight: 700; }
    .page-id { font-size: 1.1rem; color: #6b7280; margin-left: 8px; }

    /* --- Grid de campos --- */
    .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; }
    .field { display: flex; flex-direction: column; }
    .field.full { grid-column: 1 / -1; }
    .field label {
      font-size: 0.8rem; font-weight: 600; color: #6b7280;
      margin-bottom: 4px; text-transform: uppercase; letter-spacing: .04em;
    }
    .field label .req { color: #ef4444; }
    .field input, .field select {
      padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px;
      font-size: 0.95rem; outline: none;
      transition: border-color .15s, box-shadow .15s;
    }
    .field input:focus, .field select:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59,130,246,.15);
    }
    .field input[readonly] {
      background: #f9fafb; color: #6b7280; cursor: default;
    }

    /* --- Situação --- */
    .situacao-wrap {
      display: flex; flex-direction: column; align-items: center;
      gap: 12px; padding: 10px 0;
    }
    .badge {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 6px 20px; border-radius: 999px;
      font-size: 0.85rem; font-weight: 700; letter-spacing: .04em;
    }
    .badge-ativo   { background: #dcfce7; color: #166534; }
    .badge-bloqueado { background: #F87171; color: #fff; }

    .btn-toggle {
      width: 100%; max-width: 220px; padding: 12px 20px;
      border: none; border-radius: 8px; cursor: pointer;
      font-size: 0.95rem; font-weight: 600; color: #fff;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: background .15s, transform .08s, box-shadow .08s;
    }
    .btn-toggle:hover { transform: translateY(-1px); }
    .btn-ativar   { background: #491d4e; }
    .btn-ativar:hover   { background: #3b0f40; box-shadow: 0 2px 6px rgba(59,15,64,.4); }
    .btn-bloquear { background: #491d4e; }
    .btn-bloquear:hover { background: #3b0f40; box-shadow: 0 2px 6px rgba(59,15,64,.4); }

    /* --- Layout 2 colunas para Operacionais + Situação --- */
    .row-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

    /* --- Botões de ação --- */
    .actions { display: flex; gap: 10px; margin-top: 8px; }
    .btn {
      border: none; border-radius: 999px; padding: 12px 28px;
      font-size: 0.95rem; font-weight: 600; cursor: pointer;
      display: inline-flex; align-items: center; gap: 6px;
      transition: background .15s, transform .08s, box-shadow .08s;
    }
    .btn:hover { transform: translateY(-1px); }
    .btn-salvar { background: #2e3191; color: #fff; }
    .btn-salvar:hover { background: #10136e; box-shadow: 0 2px 6px rgba(37,99,235,.35); }
    .btn-voltar { background: #e5e7eb; color: #374151; }
    .btn-voltar:hover { background: #d1d5db; box-shadow: 0 2px 6px rgba(0,0,0,.1); }

    /* --- Alertas --- */
    .alert {
      margin-bottom: 16px; padding: 10px 14px; border-radius: 8px;
      font-size: 0.9rem;
    }
    .alert-erro    { background: #fef2f2; color: #b91c1c; }
    .alert-sucesso { background: #f0fdf4; color: #166534; }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="page-header">
    <div>
      <span class="page-title">Colaborador edição</span>
      <% if (colabId > 0) { %>
        <span class="page-id"><%= colabId %></span>
      <% } %>
    </div>
  </div>

  <% if (erro != null) { %>
    <div class="alert alert-erro"><%= esc(erro) %></div>
  <% } %>
  <% if (sucesso != null) { %>
    <div class="alert alert-sucesso"><%= esc(sucesso) %></div>
  <% } %>

  <% if (erro == null) { %>

  <form method="post" id="editForm">
    <input type="hidden" name="id" value="<%= colabId %>" />
    <input type="hidden" name="action" value="salvar" id="formAction" />

    <!-- Informações Pessoais -->
    <div class="card">
      <div class="card-title">Informações Pessoais</div>
      <div class="fields">
        <div class="field">
          <label>Nome Completo <span class="req">*</span></label>
          <input type="text" name="nome" value="<%= esc(nome) %>" required />
        </div>
        <div class="field">
          <label>CPF <span class="req">*</span></label>
          <input type="text" name="cpf" value="<%= esc(cpf) %>" required />
        </div>
        <div class="field">
          <label>Email <span class="req">*</span></label>
          <input type="email" name="email" value="<%= esc(email) %>" required />
        </div>
        <div class="field">
          <label>Celular <span class="req">*</span></label>
          <input type="text" name="celular" value="<%= esc(celular) %>" />
        </div>
        <div class="field">
          <label>Data Nascimento <span class="req">*</span></label>
          <input type="date" name="nascimento" value="<%= esc(nascimento) %>" />
        </div>
        <div class="field">
          <label>Sexo <span class="req">*</span></label>
          <select name="sexo">
            <option value="">Selecione</option>
            <option value="M" <%= "M".equalsIgnoreCase(sexo) ? "selected" : "" %>>Masculino</option>
            <option value="F" <%= "F".equalsIgnoreCase(sexo) ? "selected" : "" %>>Feminino</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Dados Operacionais + Situação -->
    <div class="row-2col">
      <div class="card">
        <div class="card-title">Dados Operacionais</div>
        <div class="fields">
          <div class="field full">
            <label>Cargo <span class="req">*</span></label>
            <select name="cargo">
              <option value="">Selecione</option>
              <% for (int i = 0; i < cargos.size(); i++) { %>
                <option value="<%= cargos.get(i)[0] %>"
                  <%= (cargos.get(i)[0] == setId) ? "selected" : "" %>>
                  <%= esc(cargoNomes.get(i)) %>
                </option>
              <% } %>
            </select>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Situação</div>
        <div class="situacao-wrap">
          <span class="badge <%= isAtivo ? "badge-ativo" : "badge-bloqueado" %>">
            <%= isAtivo ? "ATIVO" : "BLOQUEADO" %>
          </span>
          <% if (isAtivo) { %>
            <button type="button" class="btn-toggle btn-bloquear"
                    onclick="doAction('bloquear')">
              &#128274; Bloquear
            </button>
          <% } else { %>
            <button type="button" class="btn-toggle btn-ativar"
                    onclick="doAction('ativar')">
              &#128274; Ativar
            </button>
          <% } %>
        </div>
      </div>
    </div>

    <!-- Restaurante + Data Cadastro -->
    <div class="card">
      <div class="fields">
        <div class="field">
          <label>Restaurante <span class="req">*</span></label>
          <select name="restaurante" id="selRestaurante" onchange="onRestauranteChange()">
            <option value="">Selecione</option>
            <% for (int i = 0; i < restaurantes.size(); i++) { %>
              <option value="<%= restaurantes.get(i)[0] %>"
                <%= (restaurantes.get(i)[0] == cliId) ? "selected" : "" %>>
                <%= esc(restauranteNomes.get(i)) %>
              </option>
            <% } %>
          </select>
        </div>
        <div class="field">
          <label>Data Cadastro</label>
          <input type="text" value="<%= esc(dataCadastro) %>" readonly />
        </div>
      </div>
    </div>

    <!-- Botões -->
    <div class="actions">
      <button type="submit" class="btn btn-salvar">Salvar</button>
      <button type="button" class="btn btn-voltar" onclick="voltar()">Voltar</button>
    </div>
  </form>

  <% } else { %>
    <div class="actions">
      <button type="button" class="btn btn-voltar" onclick="voltar()">Voltar</button>
    </div>
  <% } %>

</div>

<script>
  function doAction(acao) {
    if (acao === 'bloquear' && !confirm('Deseja realmente bloquear este colaborador?')) return;
    document.getElementById('formAction').value = acao;
    document.getElementById('editForm').submit();
  }

  function voltar() {
    window.location.href = 'gradecolab.jsp?sys=BRG';
  }

  // Quando muda o restaurante, recarrega a página para atualizar os cargos
  function onRestauranteChange() {
    var sel = document.getElementById('selRestaurante');
    var novoCliId = sel.value;
    if (novoCliId) {
      // Salva temporariamente e recarrega com o novo restaurante para atualizar cargos
      // (os dados do form não são salvos — apenas recarrega cargos)
      window.location.href = 'editcolab.jsp?id=<%= colabId %>&cli_id=' + novoCliId;
    }
  }
</script>
</body>
</html>