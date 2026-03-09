<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="wfr.com.WFRSystem" %>
<%@ page import="wfr.util.*" %>
<%@ taglib uri="/WEB-INF/tlds/webrun.tld" prefix="webrun"%>
<%@ page import="wfr.com.*" %>
<%@ page import="wfr.sys.*" %>
<%@ page import="wfr.sys.HTMLInterface.*" %>
<%@ page import="wfr.rules.Variant, wfr.rules.VariantPool, wfr.rules.WFRRule" %>
<%@ page import="java.sql.*" %>
<%@ page import="wfr.database.DBConnection" %>
<%@ page import="java.text.NumberFormat, java.text.DecimalFormat" %>
<%@ page import="java.util.*, java.util.Locale" %>
<%@ page import="java.math.BigDecimal" %>

<%!
private static String esc(String s) {
    if (s == null) return "";
    return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;");
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

    HTMLInterface wi = htmli;
    NumberFormat nf = NumberFormat.getCurrencyInstance(new Locale("pt", "BR"));
    DecimalFormat dfNum = new DecimalFormat("#,##0");

    // ====== CARDS RESUMO GERAL (sem filtro) ======
    int totalRestaurantes = 0;
    int totalColaboradores = 0;
    double totalRecargas = 0;
    int totalRepasses = 0;

    if (erro == null) {
        DBConnection cCards = null; ResultSet rCards = null;
        try {
            cCards = wi.getData().connection();
            String sqlCards =
                "SELECT " +
                "  (SELECT COUNT(*) FROM crd_cliente WHERE crd_sit_id = 1) AS total_rest, " +
                "  (SELECT COUNT(*) FROM crd_usuario WHERE crd_sit_id = 1) AS total_colab, " +
                "  (SELECT COALESCE(SUM(crd_usu_valor), 0) FROM crd_usuario_credito WHERE crd_sit_id = 1) AS total_recargas, " +
                "  (SELECT COUNT(*) FROM crd_transacao WHERE crd_tra_autorizacao > 0) AS total_repasses";
            rCards = cCards.getResultSet(sqlCards);
            if (rCards != null && rCards.next()) {
                totalRestaurantes = rCards.getInt("total_rest");
                totalColaboradores = rCards.getInt("total_colab");
                totalRecargas = rCards.getDouble("total_recargas");
                totalRepasses = rCards.getInt("total_repasses");
            }
        } catch (Exception e) { logger.error(wi.getUser(), sistema, e);
        } finally {
            if (rCards != null) try { rCards.close(); } catch (Exception ignore) {}
            if (cCards != null) cCards.closeConnection();
        }
    }

    // ====== BUSCA UNIFICADA ======
    String busca = request.getParameter("q");
    if (busca == null) busca = "";
    busca = busca.trim();
    String buscaSql = busca.replace("'", "''");
    String buscaHtml = esc(busca);
    boolean temBusca = !buscaSql.isEmpty();

    // ====== ABA ATIVA ======
    String aba = request.getParameter("aba");
    if (aba == null || aba.isEmpty()) aba = "restaurantes";

    // ====== RESULTADOS RESTAURANTES ======
    List<Map<String,Object>> linhasRest = new ArrayList<Map<String,Object>>();

    if (erro == null && temBusca) {
        DBConnection cR = null; ResultSet rR = null;
        try {
            cR = wi.getData().connection();
            String sqlR =
                "SELECT " +
                "  cli.crd_cli_id AS id, " +
                "  cli.crd_cli_nome_fantasia AS restaurante, " +
                "  cli.crd_cli_cnpj AS cnpj, " +
                "  sit.crd_sit_situacao AS situacao, " +
                "  (SELECT COUNT(*) FROM crd_usuario u WHERE u.crd_cli_id = cli.crd_cli_id AND u.crd_sit_id = 1) AS qtd_colabs, " +
                "  COALESCE((SELECT SUM(c.crd_usu_valor) FROM crd_usuario_credito c " +
                "    INNER JOIN crd_usuario u2 ON u2.crd_usr_id = c.crd_usr_id " +
                "    WHERE u2.crd_cli_id = cli.crd_cli_id AND c.crd_sit_id = 1), 0) AS total_recargas, " +
                "  (SELECT COUNT(*) FROM crd_transacao t WHERE t.crd_cli_id = cli.crd_cli_id AND t.crd_tra_autorizacao > 0) AS qtd_repasses " +
                "FROM crd_cliente cli " +
                "  LEFT JOIN crd_situacao sit ON cli.crd_sit_id = sit.crd_sit_id " +
                "WHERE (" +
                "  cli.crd_cli_nome_fantasia ILIKE '%" + buscaSql + "%' " +
                "  OR cli.crd_cli_cnpj LIKE '%" + buscaSql + "%' " +
                "  OR CAST(cli.crd_cli_id AS TEXT) = '" + buscaSql + "' " +
                ") " +
                "ORDER BY cli.crd_cli_nome_fantasia ASC " +
                "LIMIT 20";
            rR = cR.getResultSet(sqlR);
            while (rR != null && rR.next()) {
                Map<String,Object> row = new HashMap<String,Object>();
                row.put("id", rR.getInt("id"));
                row.put("restaurante", rR.getString("restaurante"));
                row.put("cnpj", rR.getString("cnpj"));
                row.put("situacao", rR.getString("situacao"));
                row.put("qtd_colabs", rR.getInt("qtd_colabs"));
                row.put("total_recargas", rR.getDouble("total_recargas"));
                row.put("qtd_repasses", rR.getInt("qtd_repasses"));
                linhasRest.add(row);
            }
        } catch (Exception e) {
            logger.error(wi.getUser(), sistema, e);
            erro = "Erro ao buscar restaurantes: " + e.getMessage();
        } finally {
            if (rR != null) try { rR.close(); } catch (Exception ignore) {}
            if (cR != null) cR.closeConnection();
        }
    }

    // ====== RESULTADOS COLABORADORES ======
    List<Map<String,Object>> linhasColab = new ArrayList<Map<String,Object>>();

    if (erro == null && temBusca) {
        DBConnection cC = null; ResultSet rC = null;
        try {
            cC = wi.getData().connection();
            String sqlC =
                "SELECT " +
                "  u.crd_usr_id AS id, " +
                "  u.crd_usr_nome AS nome, " +
                "  u.crd_usr_cpf AS cpf, " +
                "  cli.crd_cli_nome_fantasia AS restaurante, " +
                "  cli.crd_cli_id AS cli_id, " +
                "  sit.crd_sit_situacao AS situacao, " +
                "  COALESCE((SELECT SUM(c.crd_usu_valor) FROM crd_usuario_credito c WHERE c.crd_usr_id = u.crd_usr_id AND c.crd_sit_id = 1), 0) AS total_recargas, " +
                "  COALESCE((SELECT SUM(t.crd_tra_valor) FROM crd_transacao t WHERE t.crd_usr_id = u.crd_usr_id AND t.crd_tra_autorizacao > 0), 0) AS total_resgates " +
                "FROM crd_usuario u " +
                "  INNER JOIN crd_cliente cli ON cli.crd_cli_id = u.crd_cli_id " +
                "  LEFT JOIN crd_situacao sit ON u.crd_sit_id = sit.crd_sit_id " +
                "WHERE (" +
                "  u.crd_usr_nome ILIKE '%" + buscaSql + "%' " +
                "  OR u.crd_usr_cpf LIKE '%" + buscaSql + "%' " +
                "  OR CAST(u.crd_usr_id AS TEXT) = '" + buscaSql + "' " +
                ") " +
                "ORDER BY u.crd_usr_nome ASC " +
                "LIMIT 20";
            rC = cC.getResultSet(sqlC);
            while (rC != null && rC.next()) {
                Map<String,Object> row = new HashMap<String,Object>();
                row.put("id", rC.getInt("id"));
                row.put("nome", rC.getString("nome"));
                row.put("cpf", rC.getString("cpf"));
                row.put("restaurante", rC.getString("restaurante"));
                row.put("cli_id", rC.getInt("cli_id"));
                row.put("situacao", rC.getString("situacao"));
                row.put("total_recargas", rC.getDouble("total_recargas"));
                row.put("total_resgates", rC.getDouble("total_resgates"));
                linhasColab.add(row);
            }
        } catch (Exception e) {
            logger.error(wi.getUser(), sistema, e);
            erro = "Erro ao buscar colaboradores: " + e.getMessage();
        } finally {
            if (rC != null) try { rC.close(); } catch (Exception ignore) {}
            if (cC != null) cC.closeConnection();
        }
    }

    // auto-selecionar aba com resultado
    if (temBusca && "restaurantes".equals(aba) && linhasRest.isEmpty() && !linhasColab.isEmpty()) {
        aba = "colaboradores";
    }
%>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Backoffice - Consulta Rápida</title>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">

  <style>
    :root {
      --brg-dark: #491d4e;
      --brg-pink: #f9678c;
      --brg-pink-soft: rgba(249, 103, 140, 0.10);
      --card-bg: #ffffff;
      --bg-page: #f5f7fb;
      --text-main: #111827;
      --text-muted: #6b7280;
      --border: #e5e7eb;
      --shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
      --radius: 12px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Nunito', sans-serif;
      background: var(--bg-page);
      color: var(--text-main);
    }

    .page { width: 100%; padding: 20px 24px; }

    /* ===== HEADER ===== */
    .page-header {
      background: linear-gradient(135deg, var(--brg-dark) 0%, #6b2c72 100%);
      border-radius: var(--radius);
      padding: 28px 32px;
      margin-bottom: 20px;
      color: #fff;
      box-shadow: 0 6px 20px rgba(73, 29, 78, 0.3);
      position: relative; overflow: hidden;
    }
    .page-header::after {
      content: ""; position: absolute; top: -40px; right: -40px;
      width: 160px; height: 160px; border-radius: 50%;
      background: rgba(249, 103, 140, 0.12);
    }
    .page-header h1 { font-size: 1.5rem; font-weight: 800; }
    .page-header p { font-size: 0.9rem; opacity: 0.75; margin-top: 4px; }

    /* ===== CARDS RESUMO ===== */
    .cards-row {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 16px; margin-bottom: 20px;
    }
    .kpi-card {
      background: var(--card-bg); border-radius: var(--radius);
      padding: 18px 20px; box-shadow: var(--shadow);
      border-left: 4px solid var(--brg-dark);
    }
    .kpi-card .kpi-value {
      font-size: 1.45rem; font-weight: 800; color: var(--brg-dark); line-height: 1.2;
    }
    .kpi-card .kpi-label {
      font-size: 0.82rem; font-weight: 600; color: var(--text-muted); margin-top: 4px;
    }

    /* ===== BUSCA ===== */
    .search-card {
      background: var(--card-bg); border-radius: var(--radius);
      box-shadow: var(--shadow); padding: 20px 24px; margin-bottom: 20px;
    }
    .search-row {
      display: flex; gap: 10px; align-items: center;
    }
    .search-input-wrap {
      flex: 1; position: relative;
    }
    .search-input-wrap input {
      width: 100%; padding: 12px 18px; border-radius: 999px;
      border: 2px solid var(--border); font-size: 0.95rem;
      font-family: 'Nunito', sans-serif; outline: none;
      transition: border-color .15s;
    }
    .search-input-wrap input:focus {
      border-color: var(--brg-dark);
      box-shadow: 0 0 0 3px rgba(73, 29, 78, 0.1);
    }
    .search-input-wrap input::placeholder { color: #b0b0b0; }
    .btn-buscar {
      border: none; border-radius: 999px; padding: 12px 28px;
      font-size: 0.92rem; font-weight: 700; font-family: 'Nunito', sans-serif;
      cursor: pointer; background: var(--brg-dark); color: #fff;
      transition: background .15s, transform .08s;
      white-space: nowrap;
    }
    .btn-buscar:hover {
      background: #5c2563; transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(73, 29, 78, 0.3);
    }
    .search-hint {
      font-size: 0.78rem; color: var(--text-muted); margin-top: 8px;
    }

    /* ===== ABAS ===== */
    .tabs {
      display: flex; gap: 0; margin-bottom: 0;
      border-bottom: 2px solid var(--border);
    }
    .tab-btn {
      padding: 10px 24px; font-size: 0.88rem; font-weight: 700;
      font-family: 'Nunito', sans-serif; cursor: pointer;
      background: none; border: none; color: var(--text-muted);
      border-bottom: 3px solid transparent;
      margin-bottom: -2px; transition: all .15s;
    }
    .tab-btn:hover { color: var(--brg-dark); }
    .tab-btn.active {
      color: var(--brg-dark);
      border-bottom-color: var(--brg-dark);
    }
    .tab-count {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 22px; height: 20px; padding: 0 6px;
      border-radius: 999px; font-size: 0.7rem; font-weight: 800;
      margin-left: 6px;
    }
    .tab-btn.active .tab-count {
      background: var(--brg-dark); color: #fff;
    }
    .tab-btn:not(.active) .tab-count {
      background: #f3f4f6; color: var(--text-muted);
    }

    /* ===== RESULTADOS ===== */
    .results-card {
      background: var(--card-bg); border-radius: var(--radius);
      box-shadow: var(--shadow); padding: 0; overflow: hidden;
    }
    .results-card .tabs { padding: 0 24px; padding-top: 16px; }

    .tab-panel { display: none; }
    .tab-panel.active { display: block; }

    table {
      width: 100%; border-collapse: collapse;
    }
    thead th {
      font-size: 0.72rem; text-transform: uppercase; letter-spacing: .06em;
      color: #9ca3af; padding: 12px 10px; border-bottom: 1px solid var(--border);
      text-align: left; font-weight: 700;
    }
    tbody td {
      padding: 12px 10px; border-bottom: 1px solid #f3f4f6;
      font-size: 0.88rem; vertical-align: middle;
    }
    tbody tr:hover { background: #fafaff; }
    tbody tr:last-child td { border-bottom: none; }

    .td-num {
      text-align: right; font-variant-numeric: tabular-nums; font-weight: 600;
    }

    .badge {
      display: inline-flex; align-items: center; padding: 3px 10px;
      border-radius: 999px; font-size: 0.72rem; font-weight: 700; height: 26px;
    }
    .badge-ativo { background: #dcfce7; color: #166534; }
    .badge-bloqueado { background: #F87171; color: #fff; }
    .badge-analise { background: #fef3c7; color: #92400e; }

    .rest-tag {
      display: inline-flex; align-items: center; gap: 4px;
      background: var(--brg-pink-soft); color: var(--brg-dark);
      padding: 3px 10px; border-radius: 999px;
      font-size: 0.75rem; font-weight: 700;
    }

    .saldo-pos { color: #16a34a; font-weight: 700; }
    .saldo-neg { color: #dc2626; font-weight: 700; }

    .empty-state {
      text-align: center; padding: 48px 20px; color: #9ca3af;
    }
    .empty-state svg { width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.35; }
    .empty-state p { font-size: 0.92rem; }
    .empty-state .hint { font-size: 0.8rem; margin-top: 4px; }

    .alert-erro {
      background: #fef2f2; color: #b91c1c; padding: 10px 14px;
      border-radius: 8px; font-size: 0.88rem; margin-bottom: 16px;
    }

    @media (max-width: 900px) {
      .cards-row { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 550px) {
      .cards-row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
<div class="page">

  <% if (erro != null) { %>
    <div class="alert-erro"><%= esc(erro) %></div>
  <% } %>

  <!-- ===== HEADER ===== -->
  <div class="page-header">
    <h1>Informações Consolidadas</h1>
    <p>Consulta rápida — busque por restaurante, colaborador, CPF ou CNPJ</p>
  </div>

  <!-- ===== CARDS RESUMO GERAL ===== -->
  <div class="cards-row">
    <div class="kpi-card">
      <div class="kpi-value"><%= dfNum.format(totalRestaurantes) %></div>
      <div class="kpi-label">Restaurantes ativos</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value"><%= dfNum.format(totalColaboradores) %></div>
      <div class="kpi-label">Colaboradores ativos</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value"><%= nf.format(totalRecargas) %></div>
      <div class="kpi-label">Total recarregado</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-value"><%= dfNum.format(totalRepasses) %></div>
      <div class="kpi-label">Repasses realizados</div>
    </div>
  </div>

  <!-- ===== BUSCA ===== -->
  <div class="search-card">
    <form method="post" class="search-row" id="searchForm">
      <input type="hidden" name="aba" id="abaInput" value="<%= esc(aba) %>">
      <div class="search-input-wrap">
        <input type="text" name="q" autocomplete="off"
               placeholder="Buscar por nome do restaurante, colaborador, CPF, CNPJ ou ID..."
               value="<%= buscaHtml %>">
      </div>
      <button type="submit" class="btn-buscar">Pesquisar</button>
    </form>
    <div class="search-hint">
      Busca em restaurantes e colaboradores simultaneamente. Resultados limitados a 20 por categoria.
    </div>
  </div>

  <!-- ===== RESULTADOS ===== -->
  <% if (temBusca) { %>
  <div class="results-card">

    <div class="tabs">
      <button type="button" class="tab-btn <%= "restaurantes".equals(aba) ? "active" : "" %>"
              onclick="trocarAba('restaurantes')">
        Restaurantes <span class="tab-count"><%= linhasRest.size() %></span>
      </button>
      <button type="button" class="tab-btn <%= "colaboradores".equals(aba) ? "active" : "" %>"
              onclick="trocarAba('colaboradores')">
        Colaboradores <span class="tab-count"><%= linhasColab.size() %></span>
      </button>
    </div>

    <!-- ABA RESTAURANTES -->
    <div id="panelRest" class="tab-panel <%= "restaurantes".equals(aba) ? "active" : "" %>">
      <% if (linhasRest.isEmpty()) { %>
        <div class="empty-state">
          <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
          <p>Nenhum restaurante encontrado para "<strong><%= buscaHtml %></strong>"</p>
          <p class="hint">Tente buscar por nome fantasia, CNPJ ou ID</p>
        </div>
      <% } else { %>
        <table>
          <thead>
            <tr>
              <th style="width:50px;">ID</th>
              <th>Restaurante</th>
              <th style="width:160px;">CNPJ</th>
              <th style="width:100px;">Situação</th>
              <th style="width:110px; text-align:right;">Colaboradores</th>
              <th style="width:140px; text-align:right;">Recargas</th>
              <th style="width:100px; text-align:right;">Repasses</th>
            </tr>
          </thead>
          <tbody>
          <%
            for (Map<String,Object> row : linhasRest) {
              int rId = (Integer) row.get("id");
              String rNome = (String) row.get("restaurante");
              String rCnpj = (String) row.get("cnpj");
              String rSit = (String) row.get("situacao");
              int rColabs = (Integer) row.get("qtd_colabs");
              double rRecargas = (Double) row.get("total_recargas");
              int rRepasses = (Integer) row.get("qtd_repasses");

              String badgeClass = "badge-analise";
              if (rSit != null) {
                String s = rSit.toUpperCase();
                if (s.contains("ATIV")) badgeClass = "badge-ativo";
                else if (s.contains("BLOQ")) badgeClass = "badge-bloqueado";
              }
          %>
            <tr>
              <td><%= rId %></td>
              <td><strong><%= esc(rNome) %></strong></td>
              <td><%= esc(rCnpj != null ? rCnpj : "") %></td>
              <td><span class="badge <%= badgeClass %>"><%= rSit != null ? esc(rSit.toUpperCase()) : "" %></span></td>
              <td class="td-num"><%= dfNum.format(rColabs) %></td>
              <td class="td-num"><%= nf.format(rRecargas) %></td>
              <td class="td-num"><%= dfNum.format(rRepasses) %></td>
            </tr>
          <% } %>
          </tbody>
        </table>
      <% } %>
    </div>

    <!-- ABA COLABORADORES -->
    <div id="panelColab" class="tab-panel <%= "colaboradores".equals(aba) ? "active" : "" %>">
      <% if (linhasColab.isEmpty()) { %>
        <div class="empty-state">
          <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
          <p>Nenhum colaborador encontrado para "<strong><%= buscaHtml %></strong>"</p>
          <p class="hint">Tente buscar por nome, CPF ou ID</p>
        </div>
      <% } else { %>
        <table>
          <thead>
            <tr>
              <th style="width:50px;">ID</th>
              <th>Colaborador</th>
              <th style="width:140px;">CPF</th>
              <th>Restaurante</th>
              <th style="width:100px;">Situação</th>
              <th style="width:130px; text-align:right;">Recargas</th>
              <th style="width:130px; text-align:right;">Resgates</th>
              <th style="width:130px; text-align:right;">Saldo</th>
            </tr>
          </thead>
          <tbody>
          <%
            for (Map<String,Object> row : linhasColab) {
              int cId = (Integer) row.get("id");
              String cNome = (String) row.get("nome");
              String cCpf = (String) row.get("cpf");
              String cRest = (String) row.get("restaurante");
              String cSit = (String) row.get("situacao");
              double cRecargas = (Double) row.get("total_recargas");
              double cResgates = (Double) row.get("total_resgates");
              double cSaldo = cRecargas - cResgates;

              String badgeClass = "badge-analise";
              if (cSit != null) {
                String s = cSit.toUpperCase();
                if (s.contains("ATIV")) badgeClass = "badge-ativo";
                else if (s.contains("BLOQ")) badgeClass = "badge-bloqueado";
              }

              String saldoClass = cSaldo >= 0 ? "saldo-pos" : "saldo-neg";
          %>
            <tr>
              <td><%= cId %></td>
              <td><strong><%= esc(cNome) %></strong></td>
              <td><%= esc(cCpf != null ? cCpf : "") %></td>
              <td><span class="rest-tag"><%= esc(cRest) %></span></td>
              <td><span class="badge <%= badgeClass %>"><%= cSit != null ? esc(cSit.toUpperCase()) : "" %></span></td>
              <td class="td-num"><%= nf.format(cRecargas) %></td>
              <td class="td-num"><%= nf.format(cResgates) %></td>
              <td class="td-num <%= saldoClass %>"><%= nf.format(cSaldo) %></td>
            </tr>
          <% } %>
          </tbody>
        </table>
      <% } %>
    </div>

  </div>
  <% } else { %>
    <!-- SEM BUSCA AINDA -->
    <div class="results-card">
      <div class="empty-state" style="padding:60px 20px;">
        <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>
        <p>Digite algo no campo de busca para encontrar restaurantes ou colaboradores</p>
        <p class="hint">Você pode buscar por nome, CPF, CNPJ ou ID</p>
      </div>
    </div>
  <% } %>

</div>

<script>
function trocarAba(aba) {
  // visual
  var btns = document.querySelectorAll('.tab-btn');
  for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');

  var panels = document.querySelectorAll('.tab-panel');
  for (var i = 0; i < panels.length; i++) panels[i].classList.remove('active');

  if (aba === 'restaurantes') {
    btns[0].classList.add('active');
    document.getElementById('panelRest').classList.add('active');
  } else {
    btns[1].classList.add('active');
    document.getElementById('panelColab').classList.add('active');
  }

  // guardar aba ativa pro submit
  document.getElementById('abaInput').value = aba;
}
</script>

</body>
</html>
