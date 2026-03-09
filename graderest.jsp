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

// Mascarar CNPJ (tratando teu caso de 15 dígitos)
private static String maskCnpj(String cnpj) {
    if (cnpj == null) return "";
    String digits = cnpj.replaceAll("\\D", "");
    if (digits.length() == 15) {
        digits = digits.substring(1, 15);
    }
    if (digits.length() != 14) return cnpj;
    return digits.substring(0,2) + "." +
           digits.substring(2,5) + "." +
           digits.substring(5,8) + "/" +
           digits.substring(8,12) + "-" +
           digits.substring(12);
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
    if (ord == null || ord.isEmpty()) ord = "restaurante";

    String dir = request.getParameter("dir");
    if (!"desc".equalsIgnoreCase(dir)) dir = "asc";

    String orderByCol;
    switch (ord) {
        case "id":
            orderByCol = "crd_cliente.crd_cli_id";
            break;
        case "cnpj":
            orderByCol = "crd_cliente.crd_cli_cnpj";
            break;
        case "cidade":
            orderByCol = "crd_cidade.crd_cid_cidade";
            break;
        case "situacao":
            orderByCol = "crd_situacao.crd_sit_situacao";
            break;
        case "restaurante":
        default:
            orderByCol = "crd_cliente.crd_cli_nome_fantasia";
            ord = "restaurante";
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
        String where = "";
        if (!filtroSql.isEmpty()) {
            where =
                " WHERE (" +
                "   crd_cliente.crd_cli_nome_fantasia ILIKE '%" + filtroSql + "%' " +
                "   OR crd_cliente.crd_cli_cnpj LIKE '%" + filtroSql + "%' " +
                "   OR crd_cidade.crd_cid_cidade ILIKE '%" + filtroSql + "%' " +
                "   OR crd_cidade.crd_cid_uf ILIKE '%" + filtroSql + "%' " +
                "   OR crd_situacao.crd_sit_situacao ILIKE '%" + filtroSql + "%' " +
                " )";
        }

        String sql =
            "SELECT " +
            "  crd_cliente.crd_cli_id AS id, " +
            "  crd_cliente.crd_cli_nome_fantasia AS restaurante, " +
            "  crd_cliente.crd_cli_cnpj AS cnpj, " +
            "  crd_cidade.crd_cid_cidade || ' (' || crd_cidade.crd_cid_uf || ')' AS cidade, " +
            "  crd_situacao.crd_sit_situacao AS situacao " +
            "FROM crd_cliente " +
            "  LEFT JOIN crd_cidade   ON crd_cliente.crd_cid_id = crd_cidade.crd_cid_id " +
            "  LEFT JOIN crd_situacao ON crd_cliente.crd_sit_id = crd_situacao.crd_sit_id " +
             where +
            " ORDER BY " + orderByCol + " " + orderDir;

        ResultSet rs = null;
        try {
            rs = conn.getResultSet(sql);
            while (rs.next()) {
                Map<String,Object> row = new HashMap<String,Object>();
                row.put("id",       rs.getInt("id"));
                row.put("rest",     rs.getString("restaurante"));
                row.put("cnpj",     rs.getString("cnpj"));
                row.put("cidade",   rs.getString("cidade"));
                row.put("situacao", rs.getString("situacao"));
                linhas.add(row);
            }
        } catch (Exception e) {
            logger.error(htmli != null ? htmli.getUser() : WFRSystem.DEFAULT_USER, sistema, e);
            erro = "Erro ao carregar lista de restaurantes.";
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
  <title>Restaurantes</title>

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
      padding: 10px 12px;
      border-radius: 8px;
      background: #fee2e2;
      color: #b91c1c;
      font-size: 0.9rem;
      margin-bottom: 12px;
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
      border-bottom: 1px solid #f3f4f6;
      font-size: 0.9rem;
      vertical-align: middle;
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
  // === NOVO RESTAURANTE ===
  function novoRestaurante() {
    var host = window.parent || window.top || window;

    // limpa sessão
    try {
      if (host.ebfSetSessionAttribute) {
        host.ebfSetSessionAttribute("restid", "", 0);
      } else if (typeof ebfSetSessionAttribute !== "undefined") {
        ebfSetSessionAttribute("restid", "", 0);
      }
    } catch (e) {
      console.log("Erro ao limpar sessão restid:", e);
    }

    // abre via regra OpenForm
    try {
      var regraGuid = "{8B24A9B5-7CDC-4EE8-B681-FA5C0F70491F}";

      if (host.ebfFormOpenForm) {
        host.ebfFormOpenForm(regraGuid);
        return;
      } else if (typeof ebfFormOpenForm !== "undefined") {
        ebfFormOpenForm(regraGuid);
        return;
      }
    } catch (e) {
      console.log("Erro ao abrir Novo Restaurante via ebfFormOpenForm:", e);
    }

    // fallback — abre form normal
    var url =
      "form.jsp"
      + "?sys=BRG"
      + "&action=openform"
      + "&formID=21"
      + "&mode=1"
      + "&goto=-1"
      + "&scrolling=no";

    window.location.href = url;
  }


  // === ABRIR RESTAURANTE EXISTENTE ===
  function abrirRestaurantePorId(restId) {
    var host = window.parent || window.top || window;

    // seta sessão com o ID do restaurante
    try {
      if (host.ebfSetSessionAttribute) {
        host.ebfSetSessionAttribute("restid", String(restId), 0);
      } else if (typeof ebfSetSessionAttribute !== "undefined") {
        ebfSetSessionAttribute("restid", String(restId), 0);
      }
    } catch (e) {
      console.log("Erro ao setar sessão restid:", e);
    }

    // abre via regra OpenForm
    try {
      var regraGuid = "{8B24A9B5-7CDC-4EE8-B681-FA5C0F70491F}";

      if (host.ebfFormOpenForm) {
        host.ebfFormOpenForm(regraGuid);
        return;
      } else if (typeof ebfFormOpenForm !== "undefined") {
        ebfFormOpenForm(regraGuid);
        return;
      }
    } catch (e) {
      console.log("Erro ao abrir Restaurante via ebfFormOpenForm:", e);
    }

    // fallback — abre já filtrado
    var url =
      "form.jsp"
      + "?sys=BRG"
      + "&action=openform"
      + "&formID=21"
      + "&mode=0"
      + "&goto=-1"
      + "&filter=crd_cli_id=" + encodeURIComponent(restId)
      + "&scrolling=no";

    window.location.href = url;
  }


  // === RECARREGAR GRADE DE RESTAURANTES (igual recarregarResgates) ===
  function recarregarRestaurantes() {
    try {
      var form = document.getElementById('searchForm');
      if (form) {
        form.submit();     // reaplica filtros/ordem atuais
      } else {
        console.log("searchForm não encontrado em graderest.jsp");
      }
    } catch (e) {
      console.log("Erro em recarregarRestaurantes:", e);
    }
  }


  // === ORDENAÇÃO DA GRADE ===
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
      <div class="title">Restaurantes</div>
      <div class="subtitle">Busque por nome, CNPJ, cidade, UF ou situação</div>
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
          placeholder="Digite parte do nome, CNPJ, cidade, UF ou situação"
          value="<%= filtroHtml %>">
      </div>

      <button type="button" class="btn-pill btn-novo" onclick="novoRestaurante()">
        + Novo restaurante
      </button>

      <button type="submit" class="btn-pill btn-buscar">
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
          <th onclick="sortBy('restaurante')">
            <span class="th-label">
              RESTAURANTE
              <% if ("restaurante".equals(ord)) { %>
                <span class="th-arrow"><%= "asc".equalsIgnoreCase(dir) ? "▲" : "▼" %></span>
              <% } %>
            </span>
          </th>
          <th style="width:190px;" onclick="sortBy('cnpj')">
            <span class="th-label">
              CNPJ
              <% if ("cnpj".equals(ord)) { %>
                <span class="th-arrow"><%= "asc".equalsIgnoreCase(dir) ? "▲" : "▼" %></span>
              <% } %>
            </span>
          </th>
          <th style="width:230px;" onclick="sortBy('cidade')">
            <span class="th-label">
              CIDADE
              <% if ("cidade".equals(ord)) { %>
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
          <th style="width:80px; text-align:center;">AÇÃO</th>
        </tr>
      </thead>
      <tbody>
      <%
        if (linhas.isEmpty() && erro == null) {
      %>
        <tr>
          <td colspan="6" style="text-align:center; padding:20px; color:#9ca3af;">
            Nenhum restaurante encontrado.
          </td>
        </tr>
      <%
        } else {
          for (Map<String,Object> row : linhas) {
            int id        = (Integer)row.get("id");
            String rest   = (String)row.get("rest");
            String cnpj   = (String)row.get("cnpj");
            String cidade = (String)row.get("cidade");
            String situ   = (String)row.get("situacao");

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
          <td><%= esc(rest) %></td>
          <td><%= esc(maskCnpj(cnpj)) %></td>
          <td><%= esc(cidade) %></td>
          <td>
            <span class="badge <%= badgeClass %>">
              <%= situ != null ? esc(situ.toUpperCase()) : "" %>
            </span>
          </td>
          <td style="text-align:right;">
            <button type="button"
                    class="btn-abrir"
                    onclick="abrirRestaurantePorId(<%= id %>)">
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
