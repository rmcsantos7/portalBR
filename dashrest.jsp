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
<%@ page import="java.text.NumberFormat, java.text.SimpleDateFormat, java.text.DecimalFormat" %>
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

    // ====== SESSÃO CLIENTE ======
    Integer clienteId = null;
    if (erro == null) {
        Object sessionCliente = request.getSession().getAttribute("cliente");
        if (sessionCliente != null) {
            try {
                String cliStr = sessionCliente.toString().trim().replace(",", ".");
                clienteId = Integer.valueOf(cliStr.replaceAll("\\D", ""));
            } catch (NumberFormatException e) {
                erro = "Cliente inválido na sessão.";
            }
        }
    }

    // ====== PERÍODO (padrão: últimos 30 dias) ======
    SimpleDateFormat sdfParam = new SimpleDateFormat("yyyy-MM-dd");
    SimpleDateFormat sdfBr    = new SimpleDateFormat("dd/MM/yyyy");

    Calendar cal = Calendar.getInstance();
    String paramFim    = request.getParameter("fim");
    String paramInicio = request.getParameter("inicio");

    java.util.Date dtFim, dtInicio;

    if (paramFim != null && !paramFim.isEmpty()) {
        try { dtFim = sdfParam.parse(paramFim); } catch (Exception e) { dtFim = cal.getTime(); }
    } else {
        dtFim = cal.getTime();
    }

    if (paramInicio != null && !paramInicio.isEmpty()) {
        try { dtInicio = sdfParam.parse(paramInicio); } catch (Exception e) {
            cal.setTime(dtFim);
            cal.add(Calendar.DAY_OF_MONTH, -30);
            dtInicio = cal.getTime();
        }
    } else {
        cal.setTime(dtFim);
        cal.add(Calendar.DAY_OF_MONTH, -30);
        dtInicio = cal.getTime();
    }

    String inicioSql = sdfParam.format(dtInicio);
    String fimSql    = sdfParam.format(dtFim);
    String inicioVal = sdfParam.format(dtInicio);
    String fimVal    = sdfParam.format(dtFim);

    // ====== BUSCAR NOME DO USUÁRIO LOGADO ======
    String nomeUsuario = "";
    if (erro == null) {
        DBConnection connUser = null;
        ResultSet rsUser = null;
        try {
            connUser = wi.getData().connection();
            int userCode = wi.getData().getUser().getCode();

            String sqlUser =
                "SELECT fr_usuario.usr_nome " +
                "FROM fr_usuario " +
                "WHERE fr_usuario.usr_codigo = " + userCode;

            rsUser = connUser.getResultSet(sqlUser);
            if (rsUser != null && rsUser.next()) {
                nomeUsuario = rsUser.getString("usr_nome");
            }
        } catch (Exception e) {
            logger.error(wi.getUser(), sistema, e);
            nomeUsuario = "Usuário";
        } finally {
            if (rsUser != null) try { rsUser.close(); } catch (Exception ignore) {}
            if (connUser != null) connUser.closeConnection();
        }
    }

    // ====== DADOS DOS CARDS ======
    NumberFormat nf = NumberFormat.getCurrencyInstance(new Locale("pt", "BR"));
    DecimalFormat dfNum = new DecimalFormat("#,##0");

    double cardMovTotal      = 0;
    int    cardColaboradores = 0;
    int    cardRepasses      = 0;
    double cardTicketMedio   = 0;

    // --- CARD 1 ---
    if (erro == null && clienteId != null) {
        DBConnection c1 = null; ResultSet r1 = null;
        try {
            c1 = wi.getData().connection();
            String sql1 =
                "SELECT COALESCE(SUM(crd_usuario_credito.crd_usu_valor), 0) AS MovTotal " +
                "FROM crd_usuario_credito " +
                "WHERE crd_usuario_credito.crd_cli_id = " + clienteId +
                "  AND crd_usuario_credito.crd_usu_data_credito BETWEEN '" + inicioSql + "' AND '" + fimSql + "'" +
                "  AND crd_usuario_credito.crd_sit_id = 1";
            r1 = c1.getResultSet(sql1);
            if (r1 != null && r1.next()) cardMovTotal = r1.getDouble("MovTotal");
        } catch (Exception e) { logger.error(wi.getUser(), sistema, e);
        } finally {
            if (r1 != null) try { r1.close(); } catch (Exception ignore) {}
            if (c1 != null) c1.closeConnection();
        }
    }

    // --- CARD 2 ---
    if (erro == null && clienteId != null) {
        DBConnection c2 = null; ResultSet r2 = null;
        try {
            c2 = wi.getData().connection();
            String sql2 =
                "SELECT COUNT(crd_usuario.crd_usr_id) AS Colaboradores " +
                "FROM crd_usuario " +
                "WHERE crd_usuario.crd_sit_id = 1 AND crd_usuario.crd_cli_id = " + clienteId;
            r2 = c2.getResultSet(sql2);
            if (r2 != null && r2.next()) cardColaboradores = r2.getInt("Colaboradores");
        } catch (Exception e) { logger.error(wi.getUser(), sistema, e);
        } finally {
            if (r2 != null) try { r2.close(); } catch (Exception ignore) {}
            if (c2 != null) c2.closeConnection();
        }
    }

    // --- CARD 3 ---
    if (erro == null && clienteId != null) {
        DBConnection c3 = null; ResultSet r3 = null;
        try {
            c3 = wi.getData().connection();
            String sql3 =
                "SELECT COUNT(crd_transacao.crd_tra_id) AS repasses " +
                "FROM crd_transacao " +
                "WHERE crd_transacao.crd_tra_data BETWEEN '" + inicioSql + "' AND '" + fimSql + "'" +
                "  AND crd_transacao.crd_tra_autorizacao > 0 " +
                "  AND crd_transacao.crd_cli_id = " + clienteId;
            r3 = c3.getResultSet(sql3);
            if (r3 != null && r3.next()) cardRepasses = r3.getInt("repasses");
        } catch (Exception e) { logger.error(wi.getUser(), sistema, e);
        } finally {
            if (r3 != null) try { r3.close(); } catch (Exception ignore) {}
            if (c3 != null) c3.closeConnection();
        }
    }

    // --- CARD 4 ---
    if (erro == null && clienteId != null) {
        DBConnection c4 = null; ResultSet r4 = null;
        try {
            c4 = wi.getData().connection();
            String sql4 =
                "SELECT COALESCE(AVG(crd_transacao.crd_tra_valor), 0) AS ticket_medio " +
                "FROM crd_transacao " +
                "WHERE crd_transacao.crd_tra_data BETWEEN '" + inicioSql + "' AND '" + fimSql + "'" +
                "  AND crd_transacao.crd_tra_autorizacao > 0 " +
                "  AND crd_transacao.crd_cli_id = " + clienteId;
            r4 = c4.getResultSet(sql4);
            if (r4 != null && r4.next()) cardTicketMedio = r4.getDouble("ticket_medio");
        } catch (Exception e) { logger.error(wi.getUser(), sistema, e);
        } finally {
            if (r4 != null) try { r4.close(); } catch (Exception ignore) {}
            if (c4 != null) c4.closeConnection();
        }
    }

    // ====== GRÁFICO 1: Evolução de Recargas (por semana) ======
    List<String> g1Labels = new ArrayList<String>();
    List<Double> g1Valores = new ArrayList<Double>();
    List<Integer> g1Colabs = new ArrayList<Integer>();

    if (erro == null && clienteId != null) {
        DBConnection cg1 = null; ResultSet rg1 = null;
        try {
            cg1 = wi.getData().connection();
            String sqlG1 =
                "SELECT " +
                "  DATE_TRUNC('week', crd_usuario_credito.crd_usu_data_credito)::date AS semana, " +
                "  SUM(crd_usuario_credito.crd_usu_valor) AS valor, " +
                "  COUNT(DISTINCT crd_usuario_credito.crd_usr_id) AS colabs " +
                "FROM crd_usuario_credito " +
                "WHERE crd_usuario_credito.crd_cli_id = " + clienteId +
                "  AND crd_usuario_credito.crd_usu_data_credito BETWEEN '" + inicioSql + "' AND '" + fimSql + "'" +
                "  AND crd_usuario_credito.crd_sit_id = 1 " +
                "GROUP BY DATE_TRUNC('week', crd_usuario_credito.crd_usu_data_credito)::date " +
                "ORDER BY semana ASC";
            rg1 = cg1.getResultSet(sqlG1);
            while (rg1 != null && rg1.next()) {
                java.sql.Date d = rg1.getDate("semana");
                g1Labels.add(d != null ? sdfBr.format(d) : "");
                g1Valores.add(rg1.getDouble("valor"));
                g1Colabs.add(rg1.getInt("colabs"));
            }
        } catch (Exception e) { logger.error(wi.getUser(), sistema, e);
        } finally {
            if (rg1 != null) try { rg1.close(); } catch (Exception ignore) {}
            if (cg1 != null) cg1.closeConnection();
        }
    }

    // ====== GRÁFICO 2: Top 5 Colaboradores ======
    List<String> g2Nomes = new ArrayList<String>();
    List<Double> g2Valores = new ArrayList<Double>();
    List<Integer> g2Repasses = new ArrayList<Integer>();

    if (erro == null && clienteId != null) {
        DBConnection cg2 = null; ResultSet rg2 = null;
        try {
            cg2 = wi.getData().connection();
            String sqlG2 =
                "SELECT " +
                "  u.crd_usr_nome AS nome, " +
                "  COALESCE(SUM(c.crd_usu_valor), 0) AS valor, " +
                "  COALESCE((" +
                "    SELECT COUNT(t.crd_tra_id) FROM crd_transacao t " +
                "    WHERE t.crd_usr_id = u.crd_usr_id " +
                "      AND t.crd_tra_autorizacao > 0 " +
                "      AND t.crd_tra_data BETWEEN '" + inicioSql + "' AND '" + fimSql + "'" +
                "  ), 0) AS repasses " +
                "FROM crd_usuario_credito c " +
                "  INNER JOIN crd_usuario u ON u.crd_usr_id = c.crd_usr_id " +
                "WHERE u.crd_cli_id = " + clienteId +
                "  AND c.crd_usu_data_credito BETWEEN '" + inicioSql + "' AND '" + fimSql + "'" +
                "  AND c.crd_sit_id = 1 " +
                "GROUP BY u.crd_usr_nome, u.crd_usr_id " +
                "ORDER BY valor DESC LIMIT 5";
            rg2 = cg2.getResultSet(sqlG2);
            while (rg2 != null && rg2.next()) {
                g2Nomes.add(rg2.getString("nome"));
                g2Valores.add(rg2.getDouble("valor"));
                g2Repasses.add(rg2.getInt("repasses"));
            }
        } catch (Exception e) { logger.error(wi.getUser(), sistema, e);
        } finally {
            if (rg2 != null) try { rg2.close(); } catch (Exception ignore) {}
            if (cg2 != null) cg2.closeConnection();
        }
    }

    // ====== GRÁFICO 3: Recargas vs Resgates (mensal) ======
    List<String> g3Labels = new ArrayList<String>();
    List<Double> g3Recargas = new ArrayList<Double>();
    List<Double> g3Resgates = new ArrayList<Double>();

    if (erro == null && clienteId != null) {
        DBConnection cg3 = null; ResultSet rg3 = null;
        try {
            cg3 = wi.getData().connection();
            String sqlG3 =
                "WITH meses AS ( " +
                "  SELECT generate_series( " +
                "    DATE_TRUNC('month', '" + inicioSql + "'::date), " +
                "    DATE_TRUNC('month', '" + fimSql + "'::date), " +
                "    '1 month'::interval " +
                "  )::date AS mes " +
                "), " +
                "recargas AS ( " +
                "  SELECT DATE_TRUNC('month', c.crd_usu_data_credito)::date AS mes, " +
                "         SUM(c.crd_usu_valor) AS valor " +
                "  FROM crd_usuario_credito c " +
                "    INNER JOIN crd_usuario u ON u.crd_usr_id = c.crd_usr_id " +
                "  WHERE u.crd_cli_id = " + clienteId +
                "    AND c.crd_usu_data_credito BETWEEN '" + inicioSql + "' AND '" + fimSql + "'" +
                "    AND c.crd_sit_id = 1 " +
                "  GROUP BY DATE_TRUNC('month', c.crd_usu_data_credito)::date " +
                "), " +
                "resgates AS ( " +
                "  SELECT DATE_TRUNC('month', t.crd_tra_data)::date AS mes, " +
                "         SUM(t.crd_tra_valor) AS valor " +
                "  FROM crd_transacao t " +
                "  WHERE t.crd_cli_id = " + clienteId +
                "    AND t.crd_tra_data BETWEEN '" + inicioSql + "' AND '" + fimSql + "'" +
                "    AND t.crd_tra_autorizacao > 0 " +
                "  GROUP BY DATE_TRUNC('month', t.crd_tra_data)::date " +
                ") " +
                "SELECT " +
                "  TO_CHAR(m.mes, 'Mon/YY') AS label, " +
                "  COALESCE(r.valor, 0) AS recargas, " +
                "  COALESCE(g.valor, 0) AS resgates " +
                "FROM meses m " +
                "  LEFT JOIN recargas r ON r.mes = m.mes " +
                "  LEFT JOIN resgates g ON g.mes = m.mes " +
                "ORDER BY m.mes ASC";
            rg3 = cg3.getResultSet(sqlG3);
            while (rg3 != null && rg3.next()) {
                g3Labels.add(rg3.getString("label"));
                g3Recargas.add(rg3.getDouble("recargas"));
                g3Resgates.add(rg3.getDouble("resgates"));
            }
        } catch (Exception e) { logger.error(wi.getUser(), sistema, e);
        } finally {
            if (rg3 != null) try { rg3.close(); } catch (Exception ignore) {}
            if (cg3 != null) cg3.closeConnection();
        }
    }

    // ====== GRÁFICO 4: Distribuição de Saldo (Doughnut) ======
    double g4TotalRecargas = 0;
    double g4TotalResgates = 0;
    double g4Saldo = 0;

    if (erro == null && clienteId != null) {
        DBConnection cg4 = null; ResultSet rg4 = null;
        try {
            cg4 = wi.getData().connection();
            String sqlG4 =
                "SELECT " +
                "  COALESCE(( " +
                "    SELECT SUM(c.crd_usu_valor) FROM crd_usuario_credito c " +
                "      INNER JOIN crd_usuario u ON u.crd_usr_id = c.crd_usr_id " +
                "    WHERE u.crd_cli_id = " + clienteId +
                "      AND c.crd_usu_data_credito BETWEEN '" + inicioSql + "' AND '" + fimSql + "'" +
                "      AND c.crd_sit_id = 1 " +
                "  ), 0) AS total_recargas, " +
                "  COALESCE(( " +
                "    SELECT SUM(t.crd_tra_valor) FROM crd_transacao t " +
                "    WHERE t.crd_cli_id = " + clienteId +
                "      AND t.crd_tra_data BETWEEN '" + inicioSql + "' AND '" + fimSql + "'" +
                "      AND t.crd_tra_autorizacao > 0 " +
                "  ), 0) AS total_resgates";
            rg4 = cg4.getResultSet(sqlG4);
            if (rg4 != null && rg4.next()) {
                g4TotalRecargas = rg4.getDouble("total_recargas");
                g4TotalResgates = rg4.getDouble("total_resgates");
                g4Saldo = g4TotalRecargas - g4TotalResgates;
                if (g4Saldo < 0) g4Saldo = 0;
            }
        } catch (Exception e) { logger.error(wi.getUser(), sistema, e);
        } finally {
            if (rg4 != null) try { rg4.close(); } catch (Exception ignore) {}
            if (cg4 != null) cg4.closeConnection();
        }
    }

    // ====== JSONs ======
    StringBuilder g1LabelsJson = new StringBuilder("[");
    StringBuilder g1ValoresJson = new StringBuilder("[");
    StringBuilder g1ColabsJson = new StringBuilder("[");
    for (int i = 0; i < g1Labels.size(); i++) {
        if (i > 0) { g1LabelsJson.append(","); g1ValoresJson.append(","); g1ColabsJson.append(","); }
        g1LabelsJson.append("\"").append(esc(g1Labels.get(i))).append("\"");
        g1ValoresJson.append(g1Valores.get(i));
        g1ColabsJson.append(g1Colabs.get(i));
    }
    g1LabelsJson.append("]"); g1ValoresJson.append("]"); g1ColabsJson.append("]");

    StringBuilder g2NomesJson = new StringBuilder("[");
    StringBuilder g2ValoresJson = new StringBuilder("[");
    StringBuilder g2RepassesJson = new StringBuilder("[");
    for (int i = 0; i < g2Nomes.size(); i++) {
        if (i > 0) { g2NomesJson.append(","); g2ValoresJson.append(","); g2RepassesJson.append(","); }
        g2NomesJson.append("\"").append(esc(g2Nomes.get(i))).append("\"");
        g2ValoresJson.append(g2Valores.get(i));
        g2RepassesJson.append(g2Repasses.get(i));
    }
    g2NomesJson.append("]"); g2ValoresJson.append("]"); g2RepassesJson.append("]");

    StringBuilder g3LabelsJson = new StringBuilder("[");
    StringBuilder g3RecargasJson = new StringBuilder("[");
    StringBuilder g3ResgatesJson = new StringBuilder("[");
    for (int i = 0; i < g3Labels.size(); i++) {
        if (i > 0) { g3LabelsJson.append(","); g3RecargasJson.append(","); g3ResgatesJson.append(","); }
        g3LabelsJson.append("\"").append(esc(g3Labels.get(i))).append("\"");
        g3RecargasJson.append(g3Recargas.get(i));
        g3ResgatesJson.append(g3Resgates.get(i));
    }
    g3LabelsJson.append("]"); g3RecargasJson.append("]"); g3ResgatesJson.append("]");
%>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>

  <style>
    :root {
      --brg-dark: #491d4e;
      --brg-pink: #f9678c;
      --brg-pink-soft: rgba(249, 103, 140, 0.12);
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

    .dashboard { width: 100%; padding: 20px 24px; }

    /* ===== WELCOME BANNER ===== */
    .welcome-banner {
      background: linear-gradient(135deg, var(--brg-dark) 0%, #6b2c72 100%);
      border-radius: var(--radius);
      padding: 30px 34px;
      margin-bottom: 20px;
      color: #fff;
      box-shadow: 0 6px 20px rgba(73, 29, 78, 0.3);
      position: relative;
      overflow: hidden;
    }
    .welcome-banner::after {
      content: "";
      position: absolute;
      top: -40px; right: -40px;
      width: 160px; height: 160px;
      border-radius: 50%;
      background: rgba(249, 103, 140, 0.12);
    }
    .welcome-banner::before {
      content: "";
      position: absolute;
      bottom: -30px; right: 80px;
      width: 100px; height: 100px;
      border-radius: 50%;
      background: rgba(249, 103, 140, 0.08);
    }
    .welcome-greeting {
      font-size: 1.6rem;
      font-weight: 800;
    }
    .welcome-greeting span { color: var(--brg-pink); }
    .welcome-sub {
      font-size: 0.92rem;
      opacity: 0.75;
      margin-top: 4px;
    }

    /* ===== HEADER + FILTRO ===== */
    .dash-header {
      background: var(--card-bg);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 16px 28px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
    }
    .dash-header-left h1 { font-size: 1.35rem; font-weight: 800; color: var(--brg-dark); }
    .dash-header-left .subtitle { font-size: 0.82rem; color: var(--text-muted); }

    .filter-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .filter-row label { font-size: 0.82rem; font-weight: 600; color: var(--text-muted); }
    .filter-row input[type="date"] {
      padding: 8px 12px; border-radius: 999px; border: 1px solid var(--border);
      font-size: 0.85rem; font-family: 'Nunito', sans-serif; outline: none;
      color: var(--text-main); transition: border-color .15s;
    }
    .filter-row input[type="date"]:focus {
      border-color: var(--brg-pink);
      box-shadow: 0 0 0 2px rgba(249, 103, 140, 0.18);
    }
    .btn-filtrar {
      border: none; border-radius: 999px; padding: 8px 22px;
      font-size: 0.85rem; font-weight: 700; font-family: 'Nunito', sans-serif;
      cursor: pointer; background: var(--brg-dark); color: #fff;
      transition: background .15s, transform .08s;
    }
    .btn-filtrar:hover {
      background: #5c2563; transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(73, 29, 78, 0.3);
    }

    /* ===== CARDS KPI ===== */
    .cards-row {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 16px; margin-bottom: 20px;
    }
    .kpi-card {
      background: #491d4e; border-radius: var(--radius);
      padding: 20px 22px; color: #fff;
      box-shadow: 0 6px 18px rgba(73, 29, 78, 0.25);
    }
    .kpi-icon {
      width: 42px; height: 42px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 14px; background: var(--brg-pink);
    }
    .kpi-icon svg { width: 20px; height: 20px; }
    .kpi-value { font-size: 1.6rem; font-weight: 800; color: var(--brg-pink); line-height: 1.2; }
    .kpi-label { font-size: 0.85rem; font-weight: 700; margin-top: 6px; color: var(--brg-pink); }
    .kpi-sub { font-size: 0.78rem; color: rgba(255,255,255,0.55); margin-top: 2px; }

    /* ===== CHARTS 2×2 ===== */
    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .chart-card {
      background: var(--card-bg); border-radius: var(--radius);
      box-shadow: var(--shadow); padding: 20px 22px;
    }
    .chart-title { font-size: 1.05rem; font-weight: 700; color: var(--brg-dark); margin-bottom: 4px; }
    .chart-subtitle { font-size: 0.78rem; color: var(--text-muted); margin-bottom: 16px; }
    .chart-container { position: relative; width: 100%; height: 280px; }

    /* ===== TOP TABLE ===== */
    .top-table { width: 100%; border-collapse: collapse; }
    .top-table thead th {
      font-size: 0.72rem; text-transform: uppercase; letter-spacing: .06em;
      color: #9ca3af; padding: 8px 6px; border-bottom: 1px solid var(--border); text-align: left;
    }
    .top-table thead th:last-child { text-align: center; }
    .top-table tbody td { padding: 10px 6px; border-bottom: 1px solid #f3f4f6; font-size: 0.88rem; }
    .top-table tbody tr:hover { background: #f9fafb; }
    .rank-num { font-weight: 700; color: var(--brg-dark); font-size: 0.82rem; }
    .badge-repasse {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 32px; height: 26px; padding: 0 8px; border-radius: 999px;
      background: var(--brg-pink-soft); color: var(--brg-pink);
      font-size: 0.78rem; font-weight: 700;
    }
    .td-val { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
    .td-center { text-align: center; }

    /* ===== DOUGHNUT CENTER ===== */
    .doughnut-wrap {
      position: relative; display: flex;
      align-items: center; justify-content: center; height: 280px;
    }
    .doughnut-center { position: absolute; text-align: center; pointer-events: none; }
    .doughnut-center .dc-value { font-size: 1.15rem; font-weight: 800; color: var(--brg-dark); }
    .doughnut-center .dc-label { font-size: 0.72rem; color: var(--text-muted); margin-top: 2px; }

    /* ===== ALERT ===== */
    .alert-erro { background: #fef2f2; color: #b91c1c; padding: 10px 14px; border-radius: 8px; font-size: 0.88rem; margin-bottom: 16px; }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 900px) {
      .cards-row { grid-template-columns: repeat(2, 1fr); }
      .charts-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 550px) {
      .cards-row { grid-template-columns: 1fr; }
      .dash-header { flex-direction: column; align-items: flex-start; }
    }
  </style>
</head>
<body>
<div class="dashboard">

  <% if (erro != null) { %>
    <div class="alert-erro"><%= esc(erro) %></div>
  <% } %>

  <!-- ===== WELCOME BANNER ===== -->
  <div class="welcome-banner">
    <div class="welcome-greeting">Bem-vindo(a), <span><%= esc(nomeUsuario) %></span>!</div>
    <div class="welcome-sub">Aqui está o resumo da sua empresa. Acompanhe recargas, repasses e colaboradores.</div>
  </div>

  <!-- ===== HEADER + FILTRO ===== -->
  <div class="dash-header">
    <div class="dash-header-left">
      <h1>Dashboard</h1>
      <div class="subtitle">Resumo</div>
    </div>
    <form method="post" class="filter-row" id="filterForm">
      <label>De</label>
      <input type="date" name="inicio" value="<%= inicioVal %>">
      <label>Até</label>
      <input type="date" name="fim" value="<%= fimVal %>">
      <button type="submit" class="btn-filtrar">Filtrar</button>
    </form>
  </div>

  <!-- ===== 4 CARDS KPI ===== -->
  <div class="cards-row">
    <div class="kpi-card">
      <div class="kpi-icon"><svg fill="#fff" viewBox="0 0 24 24"><path d="M3 13h2v8H3v-8zm4-4h2v12H7V9zm4-4h2v16h-2V5zm4 6h2v10h-2V11zm4-2h2v12h-2V9z"/></svg></div>
      <div class="kpi-value"><%= nf.format(cardMovTotal) %></div>
      <div class="kpi-label">Valor total</div>
      <div class="kpi-sub">movimentado no período</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon"><svg fill="#fff" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg></div>
      <div class="kpi-value"><%= dfNum.format(cardColaboradores) %></div>
      <div class="kpi-label">Colaboradores</div>
      <div class="kpi-sub">cadastrados e ativos</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon"><svg fill="#fff" viewBox="0 0 24 24"><path d="M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-2 0H3V6h14v8zm-7-1c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-5v11c0 1.1-.9 2-2 2H4v-2h17V8h2z"/></svg></div>
      <div class="kpi-value"><%= dfNum.format(cardRepasses) %></div>
      <div class="kpi-label">Repasses</div>
      <div class="kpi-sub">realizados no período</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon"><svg fill="#fff" viewBox="0 0 24 24"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/></svg></div>
      <div class="kpi-value"><%= nf.format(cardTicketMedio) %></div>
      <div class="kpi-label">Ticket Médio</div>
      <div class="kpi-sub">valor médio por repasse</div>
    </div>
  </div>

  <!-- ===== 4 GRÁFICOS (2×2) ===== -->
  <div class="charts-grid">

    <!-- G1: Evolução de Recargas -->
    <div class="chart-card">
      <div class="chart-title">Evolução de Recargas</div>
      <div class="chart-subtitle">Valor recarregado e colaboradores atendidos por semana</div>
      <div class="chart-container"><canvas id="chartEvolucao"></canvas></div>
    </div>

    <!-- G2: Top 5 Colaboradores -->
    <div class="chart-card">
      <div class="chart-title">Top Colaboradores</div>
      <div class="chart-subtitle">Maiores saldos recarregados no período</div>
      <% if (g2Nomes.isEmpty()) { %>
        <div style="text-align:center; padding:40px 0; color:#9ca3af; font-size:0.88rem;">Sem dados no período.</div>
      <% } else { %>
        <table class="top-table">
          <thead><tr><th style="width:36px;">#</th><th>Nome</th><th style="text-align:right;">Valor</th><th>Repasses</th></tr></thead>
          <tbody>
          <% for (int i = 0; i < g2Nomes.size(); i++) { %>
            <tr>
              <td><span class="rank-num"><%= String.format("%02d", i + 1) %></span></td>
              <td><%= esc(g2Nomes.get(i)) %></td>
              <td class="td-val"><%= nf.format(g2Valores.get(i)) %></td>
              <td class="td-center"><span class="badge-repasse"><%= g2Repasses.get(i) %></span></td>
            </tr>
          <% } %>
          </tbody>
        </table>
      <% } %>
    </div>

    <!-- G3: Recargas vs Resgates>
    <div class="chart-card">
      <div class="chart-title">Recargas × Resgates</div>
      <div class="chart-subtitle">Comparativo de entradas e saídas por mês</div>
      <div class="chart-container"><canvas id="chartComparativo"></canvas></div>
    </div-->

    <!-- G4: Distribuição de Saldo (Doughnut)>
    <div class="chart-card">
      <div class="chart-title">Distribuição de Saldo</div>
      <div class="chart-subtitle">Proporção entre recargas utilizadas e saldo disponível</div>
      <div class="doughnut-wrap">
        <canvas id="chartDoughnut"></canvas>
        <div class="doughnut-center">
          <div class="dc-value"><%= nf.format(g4Saldo) %></div>
          <div class="dc-label">Saldo disponível</div>
        </div>
      </div>
    </div-->

  </div>
</div>

<script>
(function() {
  var DARK = '#491d4e';
  var PINK = '#f9678c';
  var DARK_A = 'rgba(73,29,78,0.75)';
  var PINK_A = 'rgba(249,103,140,0.65)';
  var PINK_S = 'rgba(249,103,140,0.18)';

  Chart.defaults.font.family = "'Nunito', sans-serif";

  // G1: Evolução
  var ctx1 = document.getElementById('chartEvolucao');
  if (ctx1) {
    new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: <%= g1LabelsJson.toString() %>,
        datasets: [
          {
            label: 'Valor (R$)', data: <%= g1ValoresJson.toString() %>,
            backgroundColor: PINK_S, borderColor: PINK, borderWidth: 2,
            borderRadius: 6, yAxisID: 'y', order: 2
          },
          {
            label: 'Colaboradores', data: <%= g1ColabsJson.toString() %>,
            type: 'line', borderColor: DARK, backgroundColor: 'rgba(73,29,78,0.06)',
            pointBackgroundColor: DARK, pointRadius: 4, pointHoverRadius: 6,
            tension: 0.35, fill: true, yAxisID: 'y1', order: 1
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { size: 11 } } },
          tooltip: { callbacks: { label: function(c) {
            if (c.dataset.yAxisID === 'y') return 'Valor: R$ ' + c.parsed.y.toLocaleString('pt-BR',{minimumFractionDigits:2});
            return 'Colaboradores: ' + c.parsed.y;
          }}}
        },
        scales: {
          x: { grid: { display: false } },
          y: { position: 'left', grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { callback: function(v) { return v >= 1000 ? 'R$ '+(v/1000).toFixed(0)+'k' : 'R$ '+v; } } },
          y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  // G3: Comparativo
  var ctx3 = document.getElementById('chartComparativo');
  if (ctx3) {
    new Chart(ctx3, {
      type: 'bar',
      data: {
        labels: <%= g3LabelsJson.toString() %>,
        datasets: [
          { label: 'Recargas', data: <%= g3RecargasJson.toString() %>, backgroundColor: DARK, borderRadius: 4 },
          { label: 'Resgates', data: <%= g3ResgatesJson.toString() %>, backgroundColor: PINK, borderRadius: 4 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { size: 11 } } },
          tooltip: { callbacks: { label: function(c) {
            return c.dataset.label + ': R$ ' + c.parsed.y.toLocaleString('pt-BR',{minimumFractionDigits:2});
          }}}
        },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { callback: function(v) { return v >= 1000 ? 'R$ '+(v/1000).toFixed(0)+'k' : 'R$ '+v; } } }
        }
      }
    });
  }

  // G4: Doughnut
  var ctx4 = document.getElementById('chartDoughnut');
  if (ctx4) {
    new Chart(ctx4, {
      type: 'doughnut',
      data: {
        labels: ['Utilizado (resgates)', 'Saldo disponível'],
        datasets: [{ data: [<%= g4TotalResgates %>, <%= g4Saldo %>], backgroundColor: [DARK, PINK], borderWidth: 0, hoverOffset: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { size: 11 } } },
          tooltip: { callbacks: { label: function(c) {
            return c.label + ': R$ ' + c.parsed.toLocaleString('pt-BR',{minimumFractionDigits:2});
          }}}
        }
      }
    });
  }
})();
</script>
</body>
</html>
