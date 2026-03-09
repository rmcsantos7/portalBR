<%@ page import="wfr.com.WFRSystem" %>
<%@ page import="wfr.util.*" %>
<%@ taglib uri="/WEB-INF/tlds/webrun.tld" prefix="webrun"%>
<%@ page import="wfr.com.*" %>
<%@ page import="wfr.sys.*" %>
<%@ page import="wfr.sys.HTMLInterface.*" %>
<%@ page import="wfr.rules.Variant, wfr.rules.VariantPool, wfr.rules.WFRRule" %>
<%@ page import="java.sql.*" %>
<%@ page import="wfr.database.DBConnection" %>
<%@ page import="org.json.JSONArray, org.json.JSONObject" %>
<%@ page import="java.text.NumberFormat, java.util.Locale" %>
<%@ page import="java.util.ArrayList, java.util.List" %>
<%@ page import="java.io.*" %>

<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>

<%
    // Logger da WFR (já vem de wfr.util.*)
    Logger logger = Logger.getLogger(this.getClass());

    // se quiser só pra log, pode deixar fixo ou tirar
    String sistema = "CRD";

    HTMLInterface htmli = null;
    try {
      htmli = HTMLInterface.getInstance(request);
      htmli.checkJSPAccess((javax.servlet.jsp.JspWriter)out, true);
    } catch (Exception e) {
      logger.error(htmli != null ? htmli.getUser() : WFRSystem.DEFAULT_USER, sistema, e);
      return;
    }

    // 👉 em vez de pegar "WFRCRD" da sessão, usamos o próprio htmli
    HTMLInterface wi = htmli;


    // ===== SUA QUERY =====
    String sqlRanking =
        "SELECT " +
        "  SUM(crd_usuario_credito_remessa.crd_usu_valor_bruto) AS valor, " +
        "  crd_cliente.crd_cli_nome_fantasia AS restaurante " +
        "FROM crd_usuario_credito_remessa " +
        "INNER JOIN crd_cliente ON crd_cliente.crd_cli_id = crd_usuario_credito_remessa.crd_cli_id " +
        "GROUP BY crd_cliente.crd_cli_nome_fantasia " +
        "ORDER BY SUM(crd_usuario_credito_remessa.crd_usu_valor_bruto) DESC";

    DBConnection conn = wi.getData().connection();
    if (conn == null) {
        out.println("Conexão com o banco de dados não foi estabelecida.<br>");
        return;
    }

    ResultSet rs = null;

    List<String> nomes = new ArrayList<String>();
    List<Double> valores = new ArrayList<Double>();
    double maxValor = 0.0;

    try {
        rs = conn.getResultSet(sqlRanking);

        if (rs == null) {
            out.println("Erro na consulta com o banco de dados.");
            return;
        }

        while (rs.next()) {
            String nome = rs.getString("restaurante");
            double valor = rs.getDouble("valor");

            nomes.add(nome);
            valores.add(valor);

            if (valor > maxValor) {
                maxValor = valor;
            }
        }
    } catch (Exception e) {
        logger.error(wi.getUser(), sistema, e);
        out.println("Erro ao carregar dados do ranking.");
        return;
    } finally {
        if (rs != null) try { rs.close(); } catch (Exception ignore) {}
        if (conn != null) conn.closeConnection();
    }

    if (maxValor <= 0) {
        maxValor = 1.0; // evita divisão por zero
    }

    NumberFormat currencyBr = NumberFormat.getCurrencyInstance(new Locale("pt", "BR"));
    double step = maxValor / 4.0;   // para o eixo Y
%>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Ranking de Recargas</title>
  <style>
    :root {
      --card-bg: #ffffff;
      --primary: #05a1c7;
      --primary-soft: #d9f6ff;
      --text-main: #111827;
      --text-muted: #6b7280;
      --radius-xl: 20px;
      --shadow-soft: 0 8px 20px rgba(15, 23, 42, 0.12);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--text-main);
      background: transparent;
    }

    .card {
      width: 100%;
      max-width: 100%;
      background: var(--card-bg);
      border-radius: 9px;
      padding: 14px 18px 16px;
      box-shadow: var(--shadow-soft);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 6px;
    }

    .card-title {
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: 0.01em;
    }

    .card-subtitle {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .legend {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 999px;
      background: var(--primary-soft);
      color: var(--primary);
      font-size: 0.72rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--primary);
    }

    .divider {
      margin-top: 4px;
      border-top: 1px solid #e5e7eb;
    }

    .chart-wrapper {
      margin-top: 8px;
      padding: 10px 10px 6px;
      border-radius: 14px;
      background: linear-gradient(180deg, #f9fafb 0%, #f3f4ff 100%);
      border: 1px solid #e5e7eb;
      position: relative;
      z-index: 0;
    }

    .chart{
  display:grid;
  grid-template-columns:70px 1fr;
  gap:10px;
  align-items:flex-end;
  height:320px;                 /* altura total do gráfico */
}


    .y-axis{
  display:flex;
  flex-direction:column;
  justify-content:space-between;
  height:100%;
  margin-top:8px;
  padding-bottom:20px;          /* mesmo 20px das barras */
  font-size:0.8rem;
  color:#6b7280;
}


.chart-canvas{
  position:relative;
  height:260px;      /* mantenha fixo */
  padding-bottom:16px;
}


    .y-label{
  white-space: nowrap;
  display:block;
  letter-spacing: .2px;
}


    .bars-area{
  position:relative;
  height:100%;
  display:flex;
  align-items:flex-end;
  justify-content:space-between;
  gap:16px;
  padding:4px 8px 20px;         /* pouco espaço embaixo p/ label branca */
}


    .bars-area::before,
    .bars-area::after,
    .grid-mid {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      border-top: 1px dashed rgba(148, 163, 184, 0.45);
      pointer-events: none;
      z-index: 0;
    }

    .bars-area::before { top: 25%; }
    .grid-mid           { top: 50%; }
    .bars-area::after  { top: 75%; }

    .grid-top {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      border-top: 1px solid rgba(148, 163, 184, 0.7);
      pointer-events: none;
      z-index: 0;
    }

    .bar {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      position: relative;
      z-index: 1;
    }

    .bar-column {
      width: 34px;
      height: calc(var(--value) * 1px);
      border-radius: 999px;
      background: linear-gradient(180deg, #10b4d6, #0590b5);
      box-shadow: 0 6px 14px rgba(6, 95, 118, 0.45);
      transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
      opacity: 0.96;
      position: relative;
      z-index: 1;
    }

    .bar::before {
      content: "";
      position: absolute;
      bottom: 22px;
      width: 70px;
      height: 10px;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(15, 118, 143, 0.45) 0, transparent 70%);
      filter: blur(2px);
      opacity: 0.6;
      z-index: 0;
    }

    .bar:hover .bar-column {
      transform: translateY(-4px);
      box-shadow: 0 10px 20px rgba(8, 47, 73, 0.55);
      opacity: 1;
    }

    .bar-value {
      font-size: 0.75rem;
      font-weight: 800;
      color: var(--text-main);
      padding: 4px 10px;
      border-radius: 999px;
      background: #ffffff;
      box-shadow: 0 4px 10px rgba(15, 23, 42, 0.18);
      white-space: nowrap;
      position: relative;
      z-index: 2;
    }

    .bar-label {
      font-size: 0.72rem;
      color: var(--text-muted);
      text-align: center;
      max-width: 110px;
      line-height: 1.25;
      position: relative;
      z-index: 1;
    }

    .tooltip {
      position: absolute;
      bottom: calc(var(--value) * 1px + 52px);
      left: 50%;
      transform: translateX(-50%);
      background: #020617;
      color: #f9fafb;
      padding: 4px 8px;
      border-radius: 8px;
      font-size: 0.68rem;
      white-space: nowrap;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.6);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.18s ease, transform 0.18s ease;
      z-index: 3;
    }

    .tooltip::after {
      content: "";
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-width: 5px;
      border-style: solid;
      border-color: #020617 transparent transparent transparent;
    }

    .bar:hover .tooltip {
      opacity: 1;
      transform: translate(-50%, -2px);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="card-header">
      <div>
        <div class="card-title">Ranking de Recargas</div>
        <div class="card-subtitle">Valor total recarregado por restaurante</div>
      </div>
      <div class="legend">
        <span class="legend-dot"></span>
        <span>Recarga (R$)</span>
      </div>
    </div>

    <div class="divider"></div>

    <div class="chart-wrapper">
      <div class="chart">
        <!-- Eixo Y dinâmico -->
        <div class="y-axis">
          <div class="y-label"><%= currencyBr.format(maxValor) %></div>
          <div class="y-label"><%= currencyBr.format(step * 3) %></div>
          <div class="y-label"><%= currencyBr.format(step * 2) %></div>
          <div class="y-label"><%= currencyBr.format(step) %></div>
          <div class="y-label"><%= currencyBr.format(0) %></div>
        </div>

        <!-- Barras -->
        <div class="bars-area">
          <div class="grid-top"></div>
          <div class="grid-mid"></div>

          <%
            double alturaMaxPx = 245.0;

            for (int i = 0; i < nomes.size(); i++) {
                String nome   = nomes.get(i);
                double valor  = valores.get(i);
                String valorFmt = currencyBr.format(valor);

                double altura = (valor / maxValor) * alturaMaxPx;
                if (altura < 25 && valor > 0) {
                    altura = 25; // mínimo pra não sumir
                }
          %>
              <div class="bar" style="--value:<%= altura %>;">
                <div class="tooltip"><%= nome %> • <%= valorFmt %></div>
                <div class="bar-column"></div>
                <div class="bar-value"><%= valorFmt %></div>
                <div class="bar-label"><%= nome %></div>
              </div>
          <%
            }
          %>

        </div>
      </div>
    </div>
  </div>
</body>
</html>
