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

<%!
// Escapar HTML
private static String esc(String s) {
    if (s == null) return "";
    return s
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;");
}
%>

<%
    Logger logger = Logger.getLogger(this.getClass());
    String sistema = "BRG";

    HTMLInterface htmli = null;
    String erro = null;

    try {
        htmli = HTMLInterface.getInstance(request);
        htmli.checkJSPAccess((javax.servlet.jsp.JspWriter) out, true);
    } catch (Exception e) {
        logger.error(htmli != null ? htmli.getUser() : WFRSystem.DEFAULT_USER, sistema, e);
        erro = "Erro no check de acesso à página.";
    }

    // ====== SESSÃO CLIENTE (filtro opcional) ======
    Integer cliente = null;
    if (erro == null) {
        Object sessionCliente = request.getSession().getAttribute("cliente");
        if (sessionCliente != null) {
            try {
                String clienteStr = sessionCliente.toString().trim();
                if (!clienteStr.isEmpty()) {
                    cliente = Integer.parseInt(clienteStr);
                }
            } catch (NumberFormatException e) {
                erro = "Cliente inválido encontrado na sessão.";
            }
        }
    }

    DBConnection conn = null;
    List<Map<String,Object>> linhas = new ArrayList<Map<String,Object>>();

    // ========= FILTRO =========
    String filtro = request.getParameter("q");
    if (filtro == null) filtro = "";
    filtro = filtro.trim();

    String filtroSql  = filtro.replace("'", "''");
    String filtroHtml = esc(filtro);

    // ========= ORDEM =========
    String ord = request.getParameter("ord");
    if (ord == null || ord.isEmpty()) ord = "nome";

    String dir = request.getParameter("dir");
    if (!"desc".equalsIgnoreCase(dir)) dir = "asc";

    String orderByCol;
    switch (ord) {
        case "id":
            orderByCol = "crd_usuario.crd_usr_id";
            break;
        case "cpf":
            orderByCol = "crd_usuario.crd_usr_cpf";
            break;
        case "restaurante":
            orderByCol = "crd_cliente.crd_cli_nome_fantasia";
            break;
        case "situacao":
            orderByCol = "crd_situacao.crd_sit_situacao";
            break;
        case "acao":
            orderByCol = "crd_usuario.crd_usr_id";
            break;
        case "nome":
        default:
            orderByCol = "crd_usuario.crd_usr_nome";
            ord = "nome";
            break;
    }
    String orderDir = "ASC";
    if ("desc".equalsIgnoreCase(dir)) {
        orderDir = "DESC";
    }

    if (erro == null) {
        conn = htmli.getData().connection();
        if (conn == null) {
            erro = "Não foi possível obter conexão com o banco.";
        }
    }

    if (erro == null) {
        String where = " WHERE 1=1 ";

        // filtro por cliente da sessão (se existir)
        if (cliente != null) {
            where += " AND crd_usuario.crd_cli_id = " + cliente + " ";
        }

        // filtro de busca (nome, cpf, restaurante, situação)
        if (!filtroSql.isEmpty()) {
            where +=
                " AND (" +
                "   crd_usuario.crd_usr_nome ILIKE '%" + filtroSql + "%' " +
                "   OR crd_usuario.crd_usr_cpf LIKE '%" + filtroSql + "%' " +
                "   OR crd_cliente.crd_cli_nome_fantasia ILIKE '%" + filtroSql + "%' " +
                "   OR crd_situacao.crd_sit_situacao ILIKE '%" + filtroSql + "%' " +
                " )";
        }

        String sql =
            "SELECT " +
            "  crd_usuario.crd_usr_id AS id, " +
            "  crd_usuario.crd_usr_nome AS nome, " +
            "  crd_usuario.crd_usr_cpf AS cpf, " +
            "  crd_cliente.crd_cli_nome_fantasia AS restaurante, " +
            "  crd_situacao.crd_sit_situacao AS situacao " +
            "FROM crd_usuario " +
            "  INNER JOIN crd_situacao ON crd_usuario.crd_sit_id = crd_situacao.crd_sit_id " +
            "  INNER JOIN crd_cliente  ON crd_cliente.crd_cli_id = crd_usuario.crd_cli_id " +
             where +
            " ORDER BY " + orderByCol + " " + orderDir;

        ResultSet rs = null;
        try {
            rs = conn.getResultSet(sql);
            while (rs.next()) {
                Map<String,Object> row = new HashMap<String,Object>();
                row.put("id",          rs.getInt("id"));
                row.put("nome",        rs.getString("nome"));
                row.put("cpf",         rs.getString("cpf"));
                row.put("restaurante", rs.getString("restaurante"));
                row.put("situacao",    rs.getString("situacao"));
                linhas.add(row);
            }
        } catch (Exception e) {
            logger.error(htmli != null ? htmli.getUser() : WFRSystem.DEFAULT_USER, sistema, e);
            erro = "Erro ao carregar lista de colaboradores.";
        } finally {
            if (rs != null) try { rs.close(); } catch (Exception ignore) {}
            if (conn != null) conn.closeConnection();
        }
    }
%>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Colaboradores</title>

  <style>
    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f5f7fb;
      color: #111827;
    }

    .page {
      width: 100%;
      max-width: 100%;
      margin: 0;
    }

    .card {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
      padding: 16px 24px 20px;
    }

    .header {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 18px;
    }

    .title {
      font-size: 1.4rem;
      font-weight: 700;
    }

    .subtitle {
      font-size: 0.9rem;
      color: #6b7280;
    }

    .alert-erro {
      margin-bottom: 16px;
      padding: 10px 12px;
      border-radius: 8px;
      background: #fef2f2;
      color: #b91c1c;
      font-size: 0.9rem;
    }

    .search-row {
      display: flex;
      gap: 10px;
      margin-bottom: 18px;
      align-items: center;
    }

    .search-input-wrap {
      flex: 1;
      position: relative;
    }

    .search-input-wrap input {
      width: 100%;
      padding: 10px 16px;
      border-radius: 999px;
      border: 1px solid #e5e7eb;
      font-size: 0.9rem;
      outline: none;
      transition: border-color .15s ease, box-shadow .15s ease;
    }

    .search-input-wrap input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 1px rgba(59,130,246,.2);
    }

    .btn-pill {
      border: none;
      border-radius: 999px;
      min-height: 44px;
      padding: 0 22px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background .15s ease, transform .08s ease, box-shadow .08s ease;
      white-space: nowrap;
    }

    .btn-buscar {
      background: #2e3191;
      color: #ffffff;
    }

    .btn-buscar:hover {
      background: #10136e;
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(37,99,235,.35);
    }

    .btn-novo {
      background: #491d4e;
      color: #ffffff;
    }

    .btn-novo:hover {
      background: #3b0f40;
      transform: translateY(-1px);
      box-shadow: 0 2px 6px #3b0f40;
    }

    .btn-import {
      background: #16a34a;
      color: #ffffff;
    }

    .btn-import:hover {
      background: #15803d;
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(22,163,74,.35);
    }

    .btn-rose{
      background: #F9678C;
      color: #ffffff;
    }


    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }

    thead th {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: #9ca3af;
      text-align: left;
      padding: 10px 4px;
      border-bottom: 1px solid #e5e7eb;
      cursor: pointer;
      user-select: none;
    }

    tbody td {
      padding: 10px 4px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 0.9rem;
    }

    tbody tr:hover {
      background: #f9fafb;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      height: 30px;
    }

    .badge-ativo {
      background: #dcfce7;
      color: #166534;
    }

    .badge-bloqueado {
      background:#F87171;
      color:#ffffff;
    }

    .badge-analise {
      background: #fef3c7;
      color: #92400e;
    }

    .btn-abrir {
      border-radius: 999px;
      border: 1px solid #d1d5db;
      background: #ffffff;
      font-size: 0.8rem;
      padding: 4px 12px;
      cursor: pointer;
      transition: background .15s ease, box-shadow .15s ease, transform .08s ease;
      width: 70px;
      height: 30px;
    }

    .btn-abrir:hover {
      background: #eff6ff;
      box-shadow: 0 2px 6px rgba(148,163,184,.4);
      transform: translateY(-1px);
    }

    .th-label {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .th-arrow {
      font-size: 0.7rem;
      opacity: .6;
    }
  </style>

<script>
  // === NOVO COLABORADOR ===
  function novoColaborador() {
    var host = window.parent || window.top || window;

    // limpa sessão "colabid"
    try {
      if (host.ebfSetSessionAttribute) {
        host.ebfSetSessionAttribute("colabid", "", 0);
      } else if (typeof ebfSetSessionAttribute !== "undefined") {
        ebfSetSessionAttribute("colabid", "", 0);
      }
    } catch (e) {
      console.log("Erro ao limpar sessão colabid:", e);
    }

    // abre via regra OpenForm (GUID do colaborador)
    try {
      var regraGuid = "{2914F794-A780-40BC-896C-9DA5DADD0B41}";

      if (host.ebfFormOpenForm) {
        host.ebfFormOpenForm(regraGuid);
        return;
      } else if (typeof ebfFormOpenForm !== "undefined") {
        ebfFormOpenForm(regraGuid);
        return;
      }
    } catch (e) {
      console.log("Erro ao abrir Novo Colaborador via ebfFormOpenForm:", e);
    }

    // fallback — abre form normal em modo inclusão
    var url =
      "form.jsp"
      + "?sys=BRG"
      + "&action=openform"
      + "&formID=23"
      + "&mode=1"
      + "&goto=-1"
      + "&scrolling=no";

    window.location.href = url;
  }


  // === ABRIR COLABORADOR EXISTENTE ===
  function abrirColaboradorPorId(usrId) {
    var host = window.parent || window.top || window;

    // seta sessão "colabid" com o ID do colaborador
    try {
      if (host.ebfSetSessionAttribute) {
        host.ebfSetSessionAttribute("colabid", String(usrId), 0);
      } else if (typeof ebfSetSessionAttribute !== "undefined") {
        ebfSetSessionAttribute("colabid", String(usrId), 0);
      }
    } catch(e) {
      console.log("Erro ao setar sessão colabid:", e);
    }

    // abre via regra OpenForm (GUID do colaborador)
    try {
      var regraGuid = "{2914F794-A780-40BC-896C-9DA5DADD0B41}";

      if (host.ebfFormOpenForm) {
        host.ebfFormOpenForm(regraGuid);
        return;
      } else if (typeof ebfFormOpenForm !== "undefined") {
        ebfFormOpenForm(regraGuid);
        return;
      }
    } catch(e) {
      console.log("Erro ao abrir Colaborador via ebfFormOpenForm:", e);
    }

    // fallback — abre já filtrado pelo usrId (edição)
    var url =
      "form.jsp"
      + "?sys=BRG"
      + "&action=openform"
      + "&formID=22"
      + "&mode=0"
      + "&goto=-1"
      + "&filter=crd_usuario.crd_usr_id=" + encodeURIComponent(usrId)
      + "&scrolling=no";

    window.location.href = url;
  }


  // === RECARREGAR GRADE DE COLABORADORES (para usar depois de salvar) ===
  function recarregarColaboradores() {
    try {
      var form = document.getElementById('searchForm');
      if (form) {
        form.submit();   // reaplica filtros/ordenacao atuais
      } else {
        console.log("searchForm não encontrado em gradecolab.jsp");
      }
    } catch (e) {
      console.log("Erro em recarregarColaboradores:", e);
    }
  }


  // === ORDENAÇÃO DA GRADE ===
  
  function importarViaExcel() {
    var host = window.parent || window.top || window;

    // abre via mesma função do "Novo colaborador" (regra OpenForm / GUID)
    try {
      var regraGuid = "{185685A1-75D6-4215-AE9D-5B640EE9CE39}";

      if (host.ebfFormOpenForm) {
        host.ebfFormOpenForm(regraGuid);
        return;
      } else if (typeof ebfFormOpenForm !== "undefined") {
        ebfFormOpenForm(regraGuid);
        return;
      }
    } catch (e) {
      console.log("Erro ao abrir Importar via Excel via ebfFormOpenForm:", e);
    }

    // fallback — abre form normal pelo ID
    try {
      var url =
        "form.jsp"
        + "?sys=BRG"
        + "&action=openform"
        + "&formID=5000000841";
      host.location.href = url;
    } catch (e) {
      console.log("Erro no fallback Importar via Excel:", e);
    }
  }

function sortBy(col) {
    var form = document.getElementById('searchForm');
    if (!form) return;

    var ord = form.elements['ord'];
    var dir = form.elements['dir'];
    if (!ord || !dir) return;

    if (ord.value === col) {
      dir.value = (dir.value === 'asc') ? 'desc' : 'asc';
    } else {
      ord.value = col;
      dir.value = 'asc';
    }

    form.submit();
  }
</script>




</head>
<body>
<div class="page">
  <div class="card">
    <div class="header">
      <div class="title">Colaboradores</div>
      <div class="subtitle">Busque por nome, CPF, situação ou restaurante</div>
    </div>

    <% if (erro != null) { %>
      <div class="alert-erro"><%= esc(erro) %></div>
    <% } %>

    <form method="post" class="search-row" id="searchForm">
      <%
        Map<String,String[]> paramMap = request.getParameterMap();
        for (Map.Entry<String,String[]> ent : paramMap.entrySet()) {
            String pname = ent.getKey();
            if ("q".equals(pname) || "ord".equals(pname) || "dir".equals(pname)) continue;
            String[] vals = ent.getValue();
            if (vals == null) continue;
            for (String v : vals) {
      %>
        <input type="hidden"
               name="<%= esc(pname) %>"
               value="<%= esc(v) %>">
      <%
            }
        }
      %>

      <input type="hidden" name="ord" value="<%= esc(ord) %>">
      <input type="hidden" name="dir" value="<%= esc(dir) %>">

      <div class="search-input-wrap">
        <input
          type="text"
          name="q"
          placeholder="Digite parte do nome, CPF, situação ou restaurante"
          value="<%= filtroHtml %>">
      </div>

      <button type="button" class="btn-pill btn-novo" onclick="novoColaborador()">
        + Novo colaborador
      </button>

      <button type="button" class="btn-pill btn-rose" onclick="importarViaExcel()">
        Importar Excel
      </button>


      <button type="submit" class="btn-pill btn-rose">
        Pesquisar
      </button>
    </form>

    <table>
      <thead>
        <tr>
          <th style="width:60px;" onclick="sortBy('id')">
            <span class="th-label">
              ID
              <% if ("id".equals(ord)) { %>
                <span class="th-arrow"><%= "asc".equalsIgnoreCase(dir) ? "▲" : "▼" %></span>
              <% } %>
            </span>
          </th>
          <th onclick="sortBy('nome')">
            <span class="th-label">
              NOME
              <% if ("nome".equals(ord)) { %>
                <span class="th-arrow"><%= "asc".equalsIgnoreCase(dir) ? "▲" : "▼" %></span>
              <% } %>
            </span>
          </th>
          <th style="width:180px;" onclick="sortBy('cpf')">
            <span class="th-label">
              CPF
              <% if ("cpf".equals(ord)) { %>
                <span class="th-arrow"><%= "asc".equalsIgnoreCase(dir) ? "▲" : "▼" %></span>
              <% } %>
            </span>
          </th>
          <th style="width:230px;" onclick="sortBy('restaurante')">
            <span class="th-label">
              RESTAURANTE
              <% if ("restaurante".equals(ord)) { %>
                <span class="th-arrow"><%= "asc".equalsIgnoreCase(dir) ? "▲" : "▼" %></span>
              <% } %>
            </span>
          </th>
          <th style="width:130px;" onclick="sortBy('situacao')">
            <span class="th-label">
              SITUAÇÃO
              <% if ("situacao".equals(ord)) { %>
                <span class="th-arrow"><%= "asc".equalsIgnoreCase(dir) ? "▲" : "▼" %></span>
              <% } %>
            </span>
          </th>
          <th style="width:80px; text-align:center;" onclick="sortBy('acao')">
            <span class="th-label" style="justify-content:center;">
              AÇÃO
              <% if ("acao".equals(ord)) { %>
                <span class="th-arrow"><%= "asc".equalsIgnoreCase(dir) ? "▲" : "▼" %></span>
              <% } %>
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
      <%
        if (linhas.isEmpty() && erro == null) {
      %>
        <tr>
          <td colspan="6" style="text-align:center; padding:20px; color:#9ca3af;">
            Nenhum colaborador encontrado.
          </td>
        </tr>
      <%
        } else {
          for (Map<String,Object> row : linhas) {
            int id             = (Integer)row.get("id");
            String nome        = (String)row.get("nome");
            String cpf         = (String)row.get("cpf");
            String restaurante = (String)row.get("restaurante");
            String situ        = (String)row.get("situacao");

            String badgeClass = "badge-analise";
            if (situ != null) {
                String s = situ.toUpperCase();
                if (s.contains("ATIV")) {
                    badgeClass = "badge-ativo";
                } else if (s.contains("BLOQ")) {
                    badgeClass = "badge-bloqueado";
                }
            }
      %>
        <tr>
          <td><%= id %></td>
          <td><%= esc(nome) %></td>
          <td><%= esc(cpf) %></td>
          <td><%= esc(restaurante) %></td>
          <td>
            <span class="badge <%= badgeClass %>">
              <%= situ != null ? esc(situ.toUpperCase()) : "" %>
            </span>
          </td>
          <td style="text-align:right;">
            <button type="button"
                    class="btn-abrir"
                    onclick="abrirColaboradorPorId(<%= id %>)">
              Abrir
            </button>
          </td>
        </tr>
      <%
          }
        }
      %>
      </tbody>
    </table>
  </div>
</div>
</body>
</html>
