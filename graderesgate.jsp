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
<%@ page import="java.math.BigDecimal" %>
<%@ page import="java.text.NumberFormat" %>
<%@ page import="java.util.Locale" %>

<%!
/** Escapa HTML básico */
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

    // ========= FILTRO (busca por nome) =========
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
        case "recarga":
            orderByCol = "recarga";
            break;
        case "resgates":
            orderByCol = "resgates";
            break;
        case "saldo":
            orderByCol = "saldo";
            break;
        case "nome":
        default:
            orderByCol = "nome";
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

        // WHERE base
        String where = " WHERE c.crd_sit_id = 1 ";

        // filtro por cliente da sessão (se existir)
        if (cliente != null) {
            where += " AND u.crd_cli_id = " + cliente + " ";
        }

        // filtro de busca por nome
        if (!filtroSql.isEmpty()) {
            where += " AND u.crd_usr_nome ILIKE '%" + filtroSql + "%' ";
        }

        String sql =
            "WITH Transacoes AS ( " +
            "  SELECT t.crd_usr_id, SUM(t.crd_tra_valor) AS transacao " +
            "  FROM crd_transacao t " +
            "  WHERE t.crd_tra_autorizacao IS NOT NULL " +
            "  GROUP BY t.crd_usr_id " +
            ") " +
            "SELECT " +
            "  u.crd_usr_nome AS nome, " +
            "  c.crd_sit_id AS sit_id, " +
            "  SUM(c.crd_usu_valor) AS recarga, " +
            "  SUM(c.crd_usu_valor) - COALESCE(tr.transacao, 0) AS saldo, " +
            "  COALESCE(tr.transacao, 0) AS resgates, " +
            "  c.crd_usr_id AS usr_id " +
            "FROM crd_usuario_credito c " +
            "  INNER JOIN crd_usuario u ON u.crd_usr_id = c.crd_usr_id " +
            "  LEFT JOIN Transacoes tr ON c.crd_usr_id = tr.crd_usr_id " +
             where +
            "GROUP BY " +
            "  u.crd_usr_nome, " +
            "  c.crd_sit_id, " +
            "  COALESCE(tr.transacao, 0), " +
            "  c.crd_usr_id " +
            "ORDER BY " + orderByCol + " " + orderDir;

        ResultSet rs = null;
        try {
            rs = conn.getResultSet(sql);
            while (rs.next()) {
                Map<String,Object> row = new HashMap<String,Object>();
                row.put("nome",     rs.getString("nome"));
                row.put("recarga",  rs.getBigDecimal("recarga"));
                row.put("resgates", rs.getBigDecimal("resgates"));
                row.put("saldo",    rs.getBigDecimal("saldo"));
                row.put("usr_id",   rs.getInt("usr_id"));
                linhas.add(row);
            }
        } catch (Exception e) {
            logger.error(htmli != null ? htmli.getUser() : WFRSystem.DEFAULT_USER, sistema, e);
            erro = "Erro ao carregar dados de recargas e resgates.";
        } finally {
            if (rs != null) try { rs.close(); } catch (Exception ignore) {}
            if (conn != null) conn.closeConnection();
        }
    }

    // formatador de moeda BR
    NumberFormat nf = NumberFormat.getCurrencyInstance(new Locale("pt", "BR"));
%>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Resgates</title>

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

    .td-num {
      text-align: right;
      padding-right: 8px;
      font-variant-numeric: tabular-nums;
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
  function abrirResgate(usrId) {
    var host = window.parent || window.top || window;

    try {
      if (host.ebfSetSessionAttribute) {
        host.ebfSetSessionAttribute("usuario", String(usrId), 0);
      } else if (typeof ebfSetSessionAttribute !== "undefined") {
        ebfSetSessionAttribute("usuario", String(usrId), 0);
      }
    } catch (e) {
      console.log("Erro ao setar sessão usuario:", e);
    }

    try {
      var regraGuid = "{75788D30-2447-4D24-A7E2-6267FDDECAD8}";
      if (host.ebfFormOpenForm) {
        host.ebfFormOpenForm(regraGuid);
        return;
      } else if (typeof ebfFormOpenForm !== "undefined") {
        ebfFormOpenForm(regraGuid);
        return;
      }
    } catch (e) {
      console.log("Erro ao abrir via ebfFormOpenForm:", e);
    }

    // fallback
    var url =
      "form.jsp"
      + "?sys=BRG"
      + "&action=openform"
      + "&formID=500000796"
      + "&mode=0"
      + "&goto=-1"
      + "&filter=crd_usuario.crd_usr_id=" + encodeURIComponent(usrId)
      + "&scrolling=no";
    window.location.href = url;
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

  // 🔁 FUNÇÃO PARA RECARREGAR A GRADE
  function recarregarResgates() {
  try {
    var form = document.getElementById('searchForm');
    if (form) {
      form.submit(); // reaplica filtros/ordenação atuais
    }
  } catch (e) {
    console.log("Erro em recarregarResgates:", e);
  }
}

</script>




</head>
<body>
<div class="page">
  <div class="card">
    <div class="header">
      <div class="title">Resgates</div>
      <div class="subtitle">Consulte recargas, resgates e saldo por colaborador</div>
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
          placeholder="Digite parte do nome do colaborador"
          value="<%= filtroHtml %>">
      </div>

      <button type="submit" class="btn-pill btn-buscar">
        Pesquisar
      </button>
    </form>

    <table>
      <thead>
        <tr>
          <th onclick="sortBy('nome')">
            <span class="th-label">
              COLABORADOR
              <% if ("nome".equals(ord)) { %>
                <span class="th-arrow"><%= "asc".equalsIgnoreCase(dir) ? "▲" : "▼" %></span>
              <% } %>
            </span>
          </th>
          <th style="width:150px;" onclick="sortBy('recarga')">
            <span class="th-label">
              RECARGAS
              <% if ("recarga".equals(ord)) { %>
                <span class="th-arrow"><%= "asc".equalsIgnoreCase(dir) ? "▲" : "▼" %></span>
              <% } %>
            </span>
          </th>
          <th style="width:150px;" onclick="sortBy('resgates')">
            <span class="th-label">
              RESGATES
              <% if ("resgates".equals(ord)) { %>
                <span class="th-arrow"><%= "asc".equalsIgnoreCase(dir) ? "▲" : "▼" %></span>
              <% } %>
            </span>
          </th>
          <th style="width:150px;" onclick="sortBy('saldo')">
            <span class="th-label">
              SALDO
              <% if ("saldo".equals(ord)) { %>
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
          <td colspan="5" style="text-align:center; padding:20px; color:#9ca3af;">
            Nenhum registro encontrado.
          </td>
        </tr>
      <%
        } else {
          for (Map<String,Object> row : linhas) {
            String nome       = (String)row.get("nome");
            BigDecimal rec    = (BigDecimal)row.get("recarga");
            BigDecimal res    = (BigDecimal)row.get("resgates");
            BigDecimal saldo  = (BigDecimal)row.get("saldo");
            int usrId         = (Integer)row.get("usr_id");
      %>
        <tr>
          <td><%= esc(nome) %></td>
          <td class="td-num"><%= rec != null ? nf.format(rec) : "R$ 0,00" %></td>
          <td class="td-num"><%= res != null ? nf.format(res) : "R$ 0,00" %></td>
          <td class="td-num"><%= saldo != null ? nf.format(saldo) : "R$ 0,00" %></td>
          <td style="text-align:right;">
            <button type="button"
                    class="btn-abrir"
                    onclick="abrirResgate(<%= usrId %>)">
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
