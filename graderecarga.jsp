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
    if (ord == null || ord.isEmpty()) ord = "data";

    String dir = request.getParameter("dir");
    if (!"desc".equalsIgnoreCase(dir)) dir = "asc";

    String orderByCol;
    switch (ord) {
        case "remessa":
            orderByCol = "crd_usuario_credito.crd_usucrerem_id";
            break;
        case "restaurante":
            orderByCol = "crd_cliente.crd_cli_nome_fantasia";
            break;
        case "colaboradores":
            orderByCol = "COUNT(crd_usuario_credito.crd_usucre_id)";
            break;
        case "valor_total":
            orderByCol = "SUM(crd_usuario_credito.crd_usu_valor)";
            break;
        case "data":
        default:
            orderByCol = "crd_usuario_credito.crd_usu_data_credito";
            ord = "data";
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

        if (cliente != null) {
            where += " AND crd_usuario.crd_cli_id = " + cliente + " ";
        }

        if (!filtroSql.isEmpty()) {
            where +=
                " AND (" +
                "   crd_cliente.crd_cli_nome_fantasia ILIKE '%" + filtroSql + "%' " +
                "   OR CAST(crd_usuario_credito.crd_usucrerem_id AS TEXT) ILIKE '%" + filtroSql + "%' " +
                "   OR CAST(crd_usuario_credito.crd_usu_data_credito AS TEXT) ILIKE '%" + filtroSql + "%' " +
                " )";
        }

        String sql =
            "SELECT " +
            "  COUNT(crd_usuario_credito.crd_usucre_id) AS colaboradores, " +
            "  SUM(crd_usuario_credito.crd_usu_valor) AS valor_total, " +
            "  crd_usuario_credito.crd_usu_data_credito AS data_credito, " +
            "  crd_usuario_credito.crd_usucrerem_id AS remessa_id, " +
            "  crd_cliente.crd_cli_nome_fantasia AS restaurante " +
            "FROM crd_usuario_credito " +
            "  INNER JOIN crd_usuario ON crd_usuario.crd_usr_id = crd_usuario_credito.crd_usr_id " +
            "  INNER JOIN crd_cliente ON crd_cliente.crd_cli_id = crd_usuario.crd_cli_id " +
            where +
            " GROUP BY " +
            "  crd_usuario_credito.crd_usu_data_credito, " +
            "  crd_usuario_credito.crd_usucrerem_id, " +
            "  crd_cliente.crd_cli_nome_fantasia, " +
            "  crd_usuario.crd_cli_id " +
            " ORDER BY " + orderByCol + " " + orderDir;

        ResultSet rs = null;
        try {
            rs = conn.getResultSet(sql);
            while (rs.next()) {
                Map<String,Object> row = new HashMap<String,Object>();
                row.put("colaboradores", rs.getInt("colaboradores"));
                BigDecimal vt = rs.getBigDecimal("valor_total");
                row.put("valor_total", vt);
                row.put("data_credito", rs.getDate("data_credito"));
                row.put("remessa_id", rs.getInt("remessa_id"));
                row.put("restaurante", rs.getString("restaurante"));
                linhas.add(row);
            }
        } catch (Exception e) {
            logger.error(htmli != null ? htmli.getUser() : WFRSystem.DEFAULT_USER, sistema, e);
            erro = "Erro ao carregar lista de recargas.";
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
  <title>Recargas</title>

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
      flex-wrap: wrap;
    }

    .search-input-wrap {
      flex: 1;
      min-width: 280px;
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

    .btn-rose{
      background: #F9678C;
      color: #ffffff;
    }


    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      table-layout: fixed;
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
	
.th-left,
.th-left .th-label {
    text-align: left !important;
}

    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
  </style>

<script>
  // === NOVA RECARGA ===
  function novaRecarga() {
    var host = window.parent || window.top || window;

    // abre via regra OpenForm (GUID Nova Recarga)
    try {
      var regraGuid = "{B8C8F8EC-8346-47B7-A03C-86408D3152C5}";

      if (host.ebfFormOpenForm) {
        host.ebfFormOpenForm(regraGuid);
        return;
      } else if (typeof ebfFormOpenForm !== "undefined") {
        ebfFormOpenForm(regraGuid);
        return;
      }
    } catch (e) {
      console.log("Erro ao abrir Nova Recarga via ebfFormOpenForm:", e);
    }

    // fallback — abre form normal em modo inclusão
    var url =
      "form.jsp"
      + "?sys=BRG"
      + "&action=openform"
      + "&formID=5000000186"
      + "&mode=1"
      + "&goto=-1"
      + "&scrolling=no";

    window.location.href = url;
  }


  // === ABRIR RECARGA EXISTENTE (por remessa_id) ===
  function abrirRecargaPorRemessaId(remessaId) {
    var host = window.parent || window.top || window;

    // seta sessão (para o form 26 filtrar)
    try {
      if (host.ebfSetSessionAttribute) {
        host.ebfSetSessionAttribute("recargaid", String(remessaId), 0);
        host.ebfSetSessionAttribute("usucreremid", String(remessaId), 0);
      } else if (typeof ebfSetSessionAttribute !== "undefined") {
        ebfSetSessionAttribute("recargaid", String(remessaId), 0);
        ebfSetSessionAttribute("usucreremid", String(remessaId), 0);
      }
    } catch (e) {
      console.log("Erro ao setar sessão recargaid:", e);
    }


    // abre via regra OpenForm (GUID do form 26)
    try {
      var regraGuid = "{1664FF6C-9E6B-4CDF-BDE5-749E99744F01}";

      if (host.ebfFormOpenForm) {
        host.ebfFormOpenForm(regraGuid);
        return;
      } else if (typeof ebfFormOpenForm !== "undefined") {
        ebfFormOpenForm(regraGuid);
        return;
      }
    } catch (e) {
      console.log("Erro ao abrir Recarga via ebfFormOpenForm:", e);
    }

    // fallback — abre form 26 filtrando pela remessa
    var url =
      "form.jsp"
      + "?sys=BRG"
      + "&action=openform"
      + "&formID=26"
      + "&mode=0"
      + "&goto=-1"
      + "&filter=crd_usuario_credito.crd_usucrerem_id=" + encodeURIComponent(remessaId)
      + "&scrolling=no";

    window.location.href = url;
  }


  // === RECARREGAR GRADE ===
  function recarregarRecargas() {
    try {
      var form = document.getElementById('searchForm');
      if (form) {
        form.submit();
      }
    } catch (e) {
      console.log("Erro em recarregarRecargas:", e);
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
      <div class="title">Recargas</div>
      <div class="subtitle">Resumo por data e remessa</div>
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
        <input type="hidden" name="<%= esc(pname) %>" value="<%= esc(v) %>">
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
          placeholder="Buscar por restaurante, remessa ou data"
          value="<%= filtroHtml %>">
      </div>

      <button type="button" class="btn-pill btn-novo" onclick="novaRecarga()">
        + Nova Recarga
      </button>

      <button type="submit" class="btn-pill btn-rose">
        Pesquisar
      </button>
    </form>

    <table>
      <colgroup>
        <col style="width:140px;">
        <col style="width:120px;">
        <col>
        <col style="width:140px;">
        <col style="width:160px;">
        <col style="width:90px;">
      </colgroup>
      <thead>
        <tr>
          <th style="width:140px;" onclick="sortBy('data')">
            <span class="th-label">DATA
              <% if ("data".equals(ord)) { %>
                <span class="th-arrow"><%= "asc".equalsIgnoreCase(dir) ? "▲" : "▼" %></span>
              <% } %>
            </span>
          </th>
          <th class="th-left" style="width:120px;" onclick="sortBy('remessa')">
            <span class="th-label">REMESSA ID
              <% if ("remessa".equals(ord)) { %>
                <span class="th-arrow"><%= "asc".equalsIgnoreCase(dir) ? "▲" : "▼" %></span>
              <% } %>
            </span>
          </th>
          <th onclick="sortBy('restaurante')">
            <span class="th-label">RESTAURANTE
              <% if ("restaurante".equals(ord)) { %>
                <span class="th-arrow"><%= "asc".equalsIgnoreCase(dir) ? "▲" : "▼" %></span>
              <% } %>
            </span>
          </th>
          <th style="width:140px; text-align:left;" onclick="sortBy('colaboradores')">
            <span class="th-label">COLABORADORES
              <% if ("colaboradores".equals(ord)) { %>
                <span class="th-arrow"><%= "asc".equalsIgnoreCase(dir) ? "▲" : "▼" %></span>
              <% } %>
            </span>
          </th>
          <th style="width:160px; text-align:right;" onclick="sortBy('valor_total')">
            <span class="th-label">VALOR TOTAL
              <% if ("valor_total".equals(ord)) { %>
                <span class="th-arrow"><%= "asc".equalsIgnoreCase(dir) ? "▲" : "▼" %></span>
              <% } %>
            </span>
          </th>
          <th style="width:90px; text-align:right;">AÇÃO</th>
        </tr>
      </thead>
      <tbody>
      <%
        if (linhas.isEmpty() && erro == null) {
      %>
        <tr>
          <td colspan="6" style="text-align:center; padding:20px; color:#9ca3af;">
            Nenhuma recarga encontrada.
          </td>
        </tr>
      <%
        } else {
          java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("dd/MM/yyyy");
          java.text.DecimalFormat df = new java.text.DecimalFormat("#,##0.00");
          for (Map<String,Object> row : linhas) {
            int colaboradores = (Integer)row.get("colaboradores");
            BigDecimal vt = (BigDecimal)row.get("valor_total");
            java.sql.Date data = (java.sql.Date)row.get("data_credito");
            int remessaId = (Integer)row.get("remessa_id");
            String restaurante = (String)row.get("restaurante");

            String dataFmt = (data != null) ? sdf.format(data) : "";
            String vtFmt = (vt != null) ? df.format(vt) : "0,00";
      %>
        <tr>
          <td><%= esc(dataFmt) %></td>
          <td class="text-left"><%= remessaId %></td>
          <td><%= esc(restaurante) %></td>
          <td class="text-left"><%= colaboradores %></td>
          <td class="num">R$ <%= esc(vtFmt) %></td>
          <td style="text-align:right;">
            <button type="button" class="btn-abrir" onclick="abrirRecargaPorRemessaId(<%= remessaId %>)">
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
