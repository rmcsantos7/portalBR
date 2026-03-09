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
<%@ page import="java.math.RoundingMode" %>

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

    // ====== SESSÃO CLIENTE ======
    Integer cliente = null;
    if (erro == null) {
        Object sessionCliente = request.getSession().getAttribute("cliente");
        if (sessionCliente != null) {
            try {
                String clienteStr = sessionCliente.toString().trim();
                if (!clienteStr.isEmpty()) cliente = Integer.parseInt(clienteStr);
            } catch (NumberFormatException e) {
                erro = "Cliente inválido encontrado na sessão.";
            }
        }
    }

    // ====== USUÁRIO LOGADO ======
    String loginUsuario = "";
    try {
        if (htmli != null) loginUsuario = htmli.getUser();
    } catch (Exception e) { loginUsuario = "sistema"; }

    DBConnection conn = null;

    // ================================================================
    // PROCESSAR POST — GERAÇÃO DE CRÉDITO
    // ================================================================
    String action = request.getParameter("action");
    if (erro == null && "POST".equalsIgnoreCase(request.getMethod()) && "gerarCredito".equals(action)) {
        try {
            conn = htmli.getData().connection();

            String[] idsParam = request.getParameterValues("usr_ids");

            if (idsParam == null || idsParam.length == 0) {
                erro = "Selecione pelo menos 1 colaborador.";
            }

            if (erro == null) {
                // 1) Gerar novo remessa ID
                int remessaId = 1;
                ResultSet rsMax = conn.getResultSet(
                    "SELECT COALESCE(MAX(crd_usucrerem_id), 0) + 1 AS novo_id FROM crd_usuario_credito_remessa"
                );
                if (rsMax.next()) remessaId = rsMax.getInt("novo_id");
                rsMax.close();

                // 2) Calcular totais por cliente para a remessa
                // Mapa: cli_id -> { valorBrutoTotal, taxaConvenio }
                Map<Integer, BigDecimal> brutosPorCliente = new HashMap<Integer, BigDecimal>();
                Map<Integer, BigDecimal> taxasPorCliente = new HashMap<Integer, BigDecimal>();
                int cliIdRemessa = (cliente != null) ? cliente : 0;

                int inseridos = 0;
                int ignorados = 0;
                BigDecimal totalBrutoGeral = BigDecimal.ZERO;
                BigDecimal totalLiquidoGeral = BigDecimal.ZERO;
                BigDecimal totalServicoGeral = BigDecimal.ZERO;

                for (String idStr : idsParam) {
                    try {
                        int usrId = Integer.parseInt(idStr.trim());

                        // Pegar valor bruto individual
                        String vParam = nvl(request.getParameter("valor_" + usrId))
                            .replace(".", "").replace(",", ".").replace("R$", "").replace(" ", "").trim();

                        if (vParam.isEmpty()) { ignorados++; continue; }

                        BigDecimal valorBruto = new BigDecimal(vParam);
                        if (valorBruto.compareTo(BigDecimal.ZERO) <= 0) { ignorados++; continue; }

                        // Buscar dados do colaborador + taxa convênio do restaurante
                        ResultSet rsUsr = conn.getResultSet(
                            "SELECT u.crd_usr_id, u.crd_cli_id, " +
                            "  COALESCE(c.crd_cli_manutencao_usuario, 0) AS taxa_convenio " +
                            "FROM crd_usuario u " +
                            "  INNER JOIN crd_cliente c ON c.crd_cli_id = u.crd_cli_id " +
                            "WHERE u.crd_usr_id = " + usrId + " AND u.crd_sit_id = 1"
                        );

                        if (!rsUsr.next()) {
                            rsUsr.close();
                            ignorados++;
                            continue;
                        }

                        int usrCliId = rsUsr.getInt("crd_cli_id");
                        BigDecimal taxaConvenio = rsUsr.getBigDecimal("taxa_convenio");
                        rsUsr.close();

                        if (cliIdRemessa == 0) cliIdRemessa = usrCliId;

                        // Calcular: taxa = bruto * (taxa% / 100), líquido = bruto - taxa
                        BigDecimal valorTaxa = valorBruto.multiply(taxaConvenio)
                            .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
                        BigDecimal valorLiquido = valorBruto.subtract(valorTaxa);

                        // Inserir crédito individual
                        String sqlInsert =
                            "INSERT INTO crd_usuario_credito " +
                            "(crd_usr_id, crd_usu_valor, crd_usu_data_credito, crd_usucrerem_id, " +
                            " crd_cli_id, crd_usu_valor_bruto, crd_usu_login, crd_usu_data_import, crd_sit_id, crd_pro_id) " +
                            "VALUES (" +
                                usrId + ", " +
                                valorLiquido.toPlainString() + ", " +
                                "CURRENT_DATE, " +
                                remessaId + ", " +
                                usrCliId + ", " +
                                valorBruto.toPlainString() + ", " +
                                "'" + loginUsuario.replace("'", "''") + "', " +
                                "NOW(), " +
                                "1, " +
                                "201" +
                            ") RETURNING crd_usucre_id";

                        ResultSet rsIns = conn.getResultSet(sqlInsert);
                        if (rsIns != null) rsIns.close();

                        inseridos++;
                        totalBrutoGeral = totalBrutoGeral.add(valorBruto);
                        totalLiquidoGeral = totalLiquidoGeral.add(valorLiquido);
                        totalServicoGeral = totalServicoGeral.add(valorTaxa);

                        // Acumular bruto por cliente
                        if (!taxasPorCliente.containsKey(usrCliId)) {
                            taxasPorCliente.put(usrCliId, taxaConvenio);
                            brutosPorCliente.put(usrCliId, BigDecimal.ZERO);
                        }
                        brutosPorCliente.put(usrCliId, brutosPorCliente.get(usrCliId).add(valorBruto));

                    } catch (Exception ex) {
                        ignorados++;
                        if (erro == null) erro = "Erro no colaborador ID " + idStr + ": " + ex.getMessage();
                        logger.error(htmli != null ? htmli.getUser() : WFRSystem.DEFAULT_USER, sistema, ex);
                    }
                }

                // 3) Inserir registro na crd_usuario_credito_remessa
                if (inseridos > 0) {
                    BigDecimal taxaTributo = BigDecimal.ZERO;
                    // Usar a taxa do primeiro cliente ou média
                    BigDecimal taxaServicoPct = BigDecimal.ZERO;
                    if (!taxasPorCliente.isEmpty()) {
                        taxaServicoPct = taxasPorCliente.values().iterator().next();
                    }

                    String sqlRemessa =
                        "INSERT INTO crd_usuario_credito_remessa " +
                        "(crd_usucrerem_id, crd_usu_data_import, crd_usu_login, crd_cli_id, " +
                        " crd_usu_valor_bruto, crd_usu_valor_liquido, crd_usu_valor_servico, " +
                        " crd_usu_valor_tributo, crd_usu_taxa_servico, crd_usu_taxa_tributo, " +
                        " crd_rem_status) " +
                        "VALUES (" +
                            remessaId + ", " +
                            "NOW(), " +
                            "'" + loginUsuario.replace("'", "''") + "', " +
                            cliIdRemessa + ", " +
                            totalBrutoGeral.toPlainString() + ", " +
                            totalLiquidoGeral.toPlainString() + ", " +
                            totalServicoGeral.toPlainString() + ", " +
                            taxaTributo.toPlainString() + ", " +
                            taxaServicoPct.toPlainString() + ", " +
                            "0, " +
                            "1" +
                        ") RETURNING crd_usucrerem_id";

                    ResultSet rsRem = conn.getResultSet(sqlRemessa);
                    if (rsRem != null) rsRem.close();

                    java.text.DecimalFormat df = new java.text.DecimalFormat("#,##0.00");
                    sucesso = "Crédito gerado com sucesso! Remessa #" + remessaId +
                              " — " + inseridos + " colaborador(es)" +
                              " | Bruto: R$ " + df.format(totalBrutoGeral) +
                              " | Líquido: R$ " + df.format(totalLiquidoGeral) +
                              " | Taxa serviço: R$ " + df.format(totalServicoGeral) +
                              (ignorados > 0 ? " (" + ignorados + " ignorado(s))" : "");
                } else {
                    erro = "Nenhum crédito foi gerado. " + idsParam.length + " enviado(s), " + ignorados + " ignorado(s). Verifique se os valores estão preenchidos.";
                }
            }
        } catch (Exception e) {
            logger.error(htmli != null ? htmli.getUser() : WFRSystem.DEFAULT_USER, sistema, e);
            String errMsg = e.getMessage();
            if (errMsg == null && e.getCause() != null) errMsg = e.getCause().getMessage();
            erro = "Erro ao gerar crédito: " + esc(errMsg != null ? errMsg : e.getClass().getName());
        } finally {
            if (conn != null) { try { conn.closeConnection(); } catch (Exception ignore) {} conn = null; }
        }
    }

    // ================================================================
    // CARREGAR COLABORADORES ATIVOS (com taxa do restaurante)
    // ================================================================
    List<Map<String,Object>> colaboradores = new ArrayList<Map<String,Object>>();

    String filtro = request.getParameter("q");
    if (filtro == null) filtro = "";
    filtro = filtro.trim();
    String filtroSql  = filtro.replace("'", "''");
    String filtroHtml = esc(filtro);

    String filtroCategoria = request.getParameter("categoria");
    if (filtroCategoria == null) filtroCategoria = "";
    filtroCategoria = filtroCategoria.trim();

    if (erro == null || sucesso != null) {
        try {
            conn = htmli.getData().connection();
            if (conn == null) {
                erro = "Não foi possível obter conexão com o banco.";
            } else {
                String where = " WHERE u.crd_sit_id = 1 ";

                if (cliente != null) {
                    where += " AND u.crd_cli_id = " + cliente + " ";
                }

                if (!filtroSql.isEmpty()) {
                    where += " AND (u.crd_usr_nome ILIKE '%" + filtroSql + "%' " +
                             "      OR u.crd_usr_cpf LIKE '%" + filtroSql + "%') ";
                }

                if (!filtroCategoria.isEmpty() && !"todos".equalsIgnoreCase(filtroCategoria)) {
                    where += " AND s.crd_set_id = " + filtroCategoria.replace("'", "''") + " ";
                }

                String sql =
                    "SELECT " +
                    "  u.crd_usr_id AS id, " +
                    "  u.crd_usr_nome AS nome, " +
                    "  u.crd_usr_cpf AS cpf, " +
                    "  u.crd_cli_id AS cli_id, " +
                    "  c.crd_cli_nome_fantasia AS restaurante, " +
                    "  COALESCE(s.crd_set_setor, 'Sem cargo') AS cargo, " +
                    "  COALESCE(s.crd_set_id, 0) AS set_id, " +
                    "  COALESCE(c.crd_cli_manutencao_usuario, 0) AS taxa_convenio " +
                    "FROM crd_usuario u " +
                    "  INNER JOIN crd_cliente c ON c.crd_cli_id = u.crd_cli_id " +
                    "  LEFT JOIN crd_cliente_setor s ON s.crd_set_id = u.crd_set_id " +
                    where +
                    " ORDER BY u.crd_usr_nome ASC";

                ResultSet rs = conn.getResultSet(sql);
                while (rs.next()) {
                    Map<String,Object> row = new HashMap<String,Object>();
                    row.put("id",            rs.getInt("id"));
                    row.put("nome",          rs.getString("nome"));
                    row.put("cpf",           rs.getString("cpf"));
                    row.put("cli_id",        rs.getInt("cli_id"));
                    row.put("restaurante",   rs.getString("restaurante"));
                    row.put("cargo",         rs.getString("cargo"));
                    row.put("set_id",        rs.getInt("set_id"));
                    row.put("taxa_convenio", rs.getBigDecimal("taxa_convenio"));
                    colaboradores.add(row);
                }
                rs.close();
            }
        } catch (Exception e) {
            logger.error(htmli != null ? htmli.getUser() : WFRSystem.DEFAULT_USER, sistema, e);
            if (erro == null) erro = "Erro ao carregar colaboradores.";
        } finally {
            if (conn != null) { try { conn.closeConnection(); } catch (Exception ignore) {} conn = null; }
        }
    }

    // ================================================================
    // CARREGAR CATEGORIAS/CARGOS (crd_cliente_setor)
    // ================================================================
    List<Map<String,Object>> categorias = new ArrayList<Map<String,Object>>();
    try {
        conn = htmli.getData().connection();
        if (conn != null) {
            String sqlCat =
                "SELECT crd_set_id, crd_set_setor " +
                "FROM crd_cliente_setor " +
                "WHERE 1=1 ";
            if (cliente != null) {
                sqlCat += " AND crd_cli_id = " + cliente;
            }
            sqlCat += " ORDER BY crd_set_setor";

            ResultSet rsCat = conn.getResultSet(sqlCat);
            while (rsCat.next()) {
                Map<String,Object> cat = new HashMap<String,Object>();
                cat.put("id", rsCat.getInt("crd_set_id"));
                cat.put("nome", rsCat.getString("crd_set_setor"));
                categorias.add(cat);
            }
            rsCat.close();
        }
    } catch (Exception e) {
        logger.error(htmli != null ? htmli.getUser() : WFRSystem.DEFAULT_USER, sistema, e);
    } finally {
        if (conn != null) { try { conn.closeConnection(); } catch (Exception ignore) {} conn = null; }
    }
%>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Geração de Crédito</title>

  <style>
    * { box-sizing: border-box; }

    body {
      margin: 0; padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f5f7fb;
      color: #111827;
    }

    .page { width: 100%; max-width: 100%; margin: 0; }

    .card {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
      padding: 16px 24px 20px;
      margin-bottom: 16px;
    }

    .header { display: flex; flex-direction: column; gap: 4px; margin-bottom: 18px; }
    .title  { font-size: 1.4rem; font-weight: 700; }
    .subtitle { font-size: 0.9rem; color: #6b7280; }

    .alert-erro {
      margin-bottom: 16px; padding: 10px 12px; border-radius: 8px;
      background: #fef2f2; color: #b91c1c; font-size: 0.9rem;
    }
    .alert-sucesso {
      margin-bottom: 16px; padding: 10px 12px; border-radius: 8px;
      background: #f0fdf4; color: #166534; font-size: 0.9rem;
    }

    /* ABAS */
    .tabs { display: flex; gap: 0; margin-bottom: 18px; border-bottom: 2px solid #e5e7eb; }
    .tab-btn {
      padding: 10px 24px; font-size: 0.9rem; font-weight: 600;
      border: none; background: transparent; cursor: pointer; color: #6b7280;
      border-bottom: 2px solid transparent; margin-bottom: -2px;
      transition: color .15s, border-color .15s;
    }
    .tab-btn:hover { color: #2e3191; }
    .tab-btn.active { color: #2e3191; border-bottom-color: #2e3191; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    /* FILTROS */
    .search-row {
      display: flex; gap: 10px; margin-bottom: 18px;
      align-items: center; flex-wrap: wrap;
    }
    .search-input-wrap { flex: 1; min-width: 200px; position: relative; }

    .search-input-wrap input, .filter-select {
      width: 100%; padding: 10px 16px; border-radius: 999px;
      border: 1px solid #e5e7eb; font-size: 0.9rem; outline: none;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    .search-input-wrap input:focus, .filter-select:focus {
      border-color: #3b82f6; box-shadow: 0 0 0 1px rgba(59,130,246,.2);
    }
    .filter-select { width: auto; min-width: 180px; appearance: auto; }

    /* BOTÕES */
    .btn-pill {
      border: none; border-radius: 999px; min-height: 44px; padding: 0 22px;
      font-size: 0.9rem; font-weight: 600; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      transition: background .15s ease, transform .08s ease, box-shadow .08s ease;
      white-space: nowrap;
    }
    .btn-pill:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }
    .btn-buscar { background: #2e3191; color: #fff; }
    .btn-buscar:hover:not(:disabled) { background: #10136e; transform: translateY(-1px); box-shadow: 0 2px 6px rgba(37,99,235,.35); }
    .btn-novo { background: #491d4e; color: #fff; }
    .btn-novo:hover:not(:disabled) { background: #3b0f40; transform: translateY(-1px); }
    .btn-import { background: #16a34a; color: #fff; }
    .btn-import:hover:not(:disabled) { background: #15803d; transform: translateY(-1px); }
    .btn-rose { background: #F9678C; color: #fff; }
    .btn-rose:hover:not(:disabled) { background: #e84d71; transform: translateY(-1px); }
    .btn-secondary { background: #e5e7eb; color: #374151; }
    .btn-secondary:hover:not(:disabled) { background: #d1d5db; transform: translateY(-1px); }
    .btn-sm { min-height: 34px; padding: 0 14px; font-size: 0.8rem; }

    /* TABELA */
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    thead th {
      font-size: 0.75rem; text-transform: uppercase; letter-spacing: .06em;
      color: #9ca3af; text-align: left; padding: 10px 4px;
      border-bottom: 1px solid #e5e7eb; user-select: none;
    }
    tbody td { padding: 10px 4px; border-bottom: 1px solid #e5e7eb; font-size: 0.9rem; }
    tbody tr:hover { background: #f9fafb; }
    tbody tr.selected { background: #eff6ff; }

    input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: #2e3191; }

    /* CAMPO VALOR NA TABELA */
    .input-valor {
      width: 110px; padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 6px;
      font-size: 0.88rem; text-align: right; outline: none;
      transition: border-color .15s, box-shadow .15s;
    }
    .input-valor:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,.15); }
    .input-valor:disabled { background: #f3f4f6; color: #9ca3af; }

    /* UPLOAD */
    .upload-area {
      border: 2px dashed #e5e7eb; border-radius: 12px; padding: 40px 20px;
      text-align: center; transition: border-color .2s, background .2s; cursor: pointer;
    }
    .upload-area:hover, .upload-area.dragover { border-color: #2e3191; background: #f0f0ff; }
    .upload-area input[type="file"] { display: none; }
    .upload-icon { font-size: 2.5rem; margin-bottom: 8px; }
    .upload-text { font-size: 0.95rem; color: #6b7280; }
    .upload-text strong { color: #2e3191; }

    .preview-area { display: none; margin-top: 16px; }
    .preview-area.visible { display: block; }
    .preview-info { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 0.9rem; color: #374151; }
    .preview-info .file-name { font-weight: 600; }
    .preview-info .file-count { color: #6b7280; }

    /* CRÉDITO CONFIG */
    .credito-section { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .field { display: flex; flex-direction: column; }
    .field.full { grid-column: 1 / -1; }
    .field label {
      font-size: 0.8rem; font-weight: 600; color: #6b7280; margin-bottom: 4px;
      text-transform: uppercase; letter-spacing: .04em;
    }
    .field label .req { color: #ef4444; }
    .field input, .field select, .field textarea {
      padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px;
      font-size: 0.95rem; outline: none; transition: border-color .15s, box-shadow .15s;
      font-family: inherit;
    }
    .field input:focus, .field select:focus, .field textarea:focus {
      border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,.15);
    }

    /* RESUMO NO CABEÇALHO */
    .resumo-header {
      display: flex; gap: 24px; padding: 12px 16px; margin-bottom: 16px;
      background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb; flex-wrap: wrap;
    }

    /* RESUMO */
    .resumo-stats { display: flex; gap: 24px; padding: 14px 0; flex-wrap: wrap; }
    .resumo-stat { display: flex; flex-direction: column; }
    .resumo-stat .stat-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: .06em; color: #9ca3af; }
    .resumo-stat .stat-value { font-size: 1.3rem; font-weight: 700; color: #111827; }
    .resumo-stat .stat-value.text-green { color: #16a34a; }
    .resumo-stat .stat-value.text-orange { color: #ea580c; }

    .actions-row { display: flex; gap: 10px; margin-top: 16px; justify-content: flex-end; }

    /* TOAST */
    .toast {
      position: fixed; top: 20px; right: 20px; padding: 14px 24px;
      border-radius: 8px; color: #fff; font-size: 0.9rem; font-weight: 600;
      z-index: 9999; opacity: 0; transform: translateY(-20px);
      transition: opacity .3s, transform .3s; pointer-events: none;
    }
    .toast.show { opacity: 1; transform: translateY(0); }
    .toast-success { background: #16a34a; }
    .toast-error   { background: #dc2626; }
    .toast-info    { background: #2e3191; }

    /* LOADING */
    .loading-overlay {
      display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255,255,255,0.7); z-index: 9998;
      align-items: center; justify-content: center;
    }
    .loading-overlay.active { display: flex; }
    .spinner {
      width: 48px; height: 48px; border: 4px solid #e5e7eb;
      border-top-color: #2e3191; border-radius: 50%; animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .badge {
      display: inline-flex; align-items: center; padding: 3px 10px;
      border-radius: 999px; font-size: 0.75rem; font-weight: 600; height: 26px;
    }
    .badge-cat { background: #ede9fe; color: #5b21b6; }
    .badge-taxa { background: #fef3c7; color: #92400e; font-size: 0.75rem; }

    .count-badge {
      background: #2e3191; color: #fff; padding: 2px 10px;
      border-radius: 999px; font-size: 0.8rem; font-weight: 600; margin-left: 6px;
    }

    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }

    @media (max-width: 768px) {
      .credito-section { grid-template-columns: 1fr; }
      .search-row { flex-direction: column; }
      .search-input-wrap { min-width: 100%; }
      .filter-select { width: 100%; }
      .resumo-stats { flex-direction: column; gap: 12px; }
    }
  </style>
</head>
<body>

<div id="toast" class="toast"></div>
<div id="loadingOverlay" class="loading-overlay"><div class="spinner"></div></div>

<div class="page">

  <!-- ============ CARD PRINCIPAL ============ -->
  <div class="card">
    <div class="header">
      <div class="title">Geração de Crédito <span class="count-badge" id="countBadge">0</span></div>
      <div class="subtitle">Adicione crédito para colaboradores ativos</div>
    </div>

    <div class="resumo-header">
      <div class="resumo-stat">
        <span class="stat-label">Colaboradores</span>
        <span class="stat-value" id="resumoColabHeader">0</span>
      </div>
      <div class="resumo-stat">
        <span class="stat-label">Total Bruto</span>
        <span class="stat-value" id="resumoBrutoHeader">R$ 0,00</span>
      </div>
      <div class="resumo-stat">
        <span class="stat-label">Taxa Serviço</span>
        <span class="stat-value text-orange" id="resumoTaxaHeader">R$ 0,00</span>
      </div>
      <div class="resumo-stat">
        <span class="stat-label">Total Líquido</span>
        <span class="stat-value text-green" id="resumoLiquidoHeader">R$ 0,00</span>
      </div>
    </div>

    <% if (erro != null) { %><div class="alert-erro"><%= esc(erro) %></div><% } %>
    <% if (sucesso != null) { %><div class="alert-sucesso"><%= esc(sucesso) %></div><% } %>

    <!-- ABAS -->
    <div class="tabs">
      <button type="button" class="tab-btn active" onclick="trocarAba('manual', this)">Seleção Manual</button>
      <button type="button" class="tab-btn" onclick="trocarAba('excel', this)">Importar Excel</button>
    </div>

    <!-- ======== ABA: SELEÇÃO MANUAL ======== -->
    <div id="tab-manual" class="tab-content active">

      <div class="search-row">
        <div class="search-input-wrap">
          <input type="text" id="filtroNome" placeholder="Buscar por nome ou CPF"
                 value="<%= filtroHtml %>" oninput="filtrarTabelaLocal()">
        </div>

        <select class="filter-select" id="filtroCategoria" onchange="filtrarTabelaLocal()">
          <option value="todos">Todos os Cargos</option>
          <% for (Map<String,Object> cat : categorias) { %>
            <option value="<%= cat.get("id") %>"
                    <%= String.valueOf(cat.get("id")).equals(filtroCategoria) ? "selected" : "" %>>
              <%= esc((String)cat.get("nome")) %>
            </option>
          <% } %>
        </select>

        <button type="button" class="btn-pill btn-sm btn-novo" onclick="selecionarTodos()">Selecionar Todos</button>
        <button type="button" class="btn-pill btn-sm btn-secondary" onclick="desselecionarTodos()">Desselecionar</button>
      </div>

      <table id="tabelaColaboradores">
        <thead>
          <tr>
            <th style="width:40px; text-align:center;">
              <input type="checkbox" id="checkAll" onchange="toggleAll(this)">
            </th>
            <th style="width:55px;">ID</th>
            <th>NOME</th>
            <th style="width:130px;">CPF</th>
            <th style="width:170px;">RESTAURANTE</th>
            <th style="width:130px;">CARGO</th>
            <th style="width:90px;">TAXA %</th>
            <th style="width:130px;">VALOR (R$)</th>
          </tr>
        </thead>
        <tbody>
        <%
          if (colaboradores.isEmpty()) {
        %>
          <tr id="row-empty">
            <td colspan="8" style="text-align:center; padding:20px; color:#9ca3af;">
              Nenhum colaborador ativo encontrado.
            </td>
          </tr>
        <%
          } else {
            for (Map<String,Object> row : colaboradores) {
              int id              = (Integer)row.get("id");
              String nome         = (String)row.get("nome");
              String cpfCol       = (String)row.get("cpf");
              int cliId           = (Integer)row.get("cli_id");
              String restaurante  = (String)row.get("restaurante");
              String cargo        = (String)row.get("cargo");
              int setId           = (Integer)row.get("set_id");
              BigDecimal taxa     = (BigDecimal)row.get("taxa_convenio");
              String taxaStr      = taxa != null ? taxa.toPlainString() : "0";
        %>
          <tr class="colab-row"
              data-id="<%= id %>"
              data-nome="<%= esc(nome).toLowerCase() %>"
              data-cpf="<%= esc(cpfCol) %>"
              data-set-id="<%= setId %>"
              data-taxa="<%= taxaStr %>">
            <td style="text-align:center;">
              <input type="checkbox" class="colab-check" value="<%= id %>"
                     data-nome="<%= esc(nome) %>"
                     data-cpf="<%= esc(cpfCol) %>"
                     data-restaurante="<%= esc(restaurante) %>"
                     data-cargo="<%= esc(cargo) %>"
                     data-taxa="<%= taxaStr %>"
                     data-cli-id="<%= cliId %>"
                     onchange="onCheckChange(this)">
            </td>
            <td><%= id %></td>
            <td><%= esc(nome) %></td>
            <td><%= esc(cpfCol) %></td>
            <td><%= esc(restaurante) %></td>
            <td><span class="badge badge-cat"><%= esc(cargo) %></span></td>
            <td class="num"><span class="badge badge-taxa"><%= taxaStr %>%</span></td>
            <td>
              <input type="text" class="input-valor" id="val_<%= id %>"
                     placeholder="0,00" disabled
                     oninput="mascaraMoeda(this); calcularResumo()">
            </td>
          </tr>
        <%
            }
          }
        %>
        </tbody>
      </table>
    </div>

    <!-- ======== ABA: IMPORTAR EXCEL ======== -->
    <div id="tab-excel" class="tab-content">

      <div class="upload-area" id="uploadArea" onclick="document.getElementById('fileInput').click()">
        <input type="file" id="fileInput" accept=".xlsx,.xls,.csv" onchange="handleFileUpload(this)">
        <div class="upload-icon">📁</div>
        <div class="upload-text">
          <strong>Clique aqui</strong> ou arraste um arquivo .xlsx<br>
          <small>Colunas esperadas: nome, cpf, valor</small>
        </div>
      </div>

      <div id="previewArea" class="preview-area">
        <div class="preview-info">
          <span class="file-name" id="fileName"></span>
          <span class="file-count" id="fileCount"></span>
          <button type="button" class="btn-pill btn-sm btn-secondary" onclick="limparImportacao()">Limpar</button>
        </div>
        <table id="tabelaPreview">
          <thead>
            <tr>
              <th style="width:40px; text-align:center;">
                <input type="checkbox" id="checkAllExcel" checked onchange="toggleAllExcel(this)">
              </th>
              <th>NOME</th>
              <th style="width:130px;">CPF</th>
              <th style="width:130px;">VALOR BRUTO</th>
              <th style="width:90px;">TAXA %</th>
              <th style="width:130px;">VALOR LÍQUIDO</th>
              <th style="width:100px;">STATUS</th>
            </tr>
          </thead>
          <tbody id="previewBody"></tbody>
        </table>
      </div>
    </div>

    <div class="actions-row">
      <button type="button" class="btn-pill btn-secondary" onclick="cancelar()">Cancelar</button>
      <button type="button" class="btn-pill btn-import" id="btnGerar" onclick="gerarCredito()" disabled>
        Gerar Crédito
      </button>
    </div>
  </div>

</div>

<!-- FORM HIDDEN PARA POST -->
<form method="post" id="creditoForm" style="display:none;">
  <input type="hidden" name="action" value="gerarCredito">
  <div id="frmIds"></div>
  <div id="frmValores"></div>
</form>

<script>
// ================================================================
var abaAtiva = 'manual';
var dadosExcel = [];

// Mapa de colaboradores do servidor (para Excel resolver CPF -> id/taxa)
var colabMap = {};
<%
  for (Map<String,Object> row : colaboradores) {
    int id          = (Integer)row.get("id");
    String cpfCol   = (String)row.get("cpf");
    BigDecimal taxa = (BigDecimal)row.get("taxa_convenio");
    String nomeCol  = (String)row.get("nome");
    String restCol  = (String)row.get("restaurante");
    if (cpfCol != null && !cpfCol.trim().isEmpty()) {
%>
colabMap['<%= cpfCol.replaceAll("[^0-9]", "") %>'] = {
  id: <%= id %>,
  taxa: <%= taxa != null ? taxa.toPlainString() : "0" %>,
  nome: '<%= esc(nomeCol).replace("'", "\\'") %>',
  restaurante: '<%= esc(restCol).replace("'", "\\'") %>'
};
<%
    }
  }
%>

// ================================================================
// ABAS
// ================================================================
function trocarAba(aba, el) {
  abaAtiva = aba;
  var tabs = document.querySelectorAll('.tab-btn');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
  var contents = document.querySelectorAll('.tab-content');
  for (var i = 0; i < contents.length; i++) contents[i].classList.remove('active');
  el.classList.add('active');
  document.getElementById('tab-' + aba).classList.add('active');
  calcularResumo();
}

// ================================================================
// FILTRO LOCAL
// ================================================================
function filtrarTabelaLocal() {
  var nome = (document.getElementById('filtroNome').value || '').toLowerCase();
  var catId = document.getElementById('filtroCategoria').value;

  var rows = document.querySelectorAll('.colab-row');
  var visivel = 0;

  for (var i = 0; i < rows.length; i++) {
    var rNome  = rows[i].getAttribute('data-nome') || '';
    var rCpf   = rows[i].getAttribute('data-cpf') || '';
    var rSetId = rows[i].getAttribute('data-set-id') || '0';

    var matchNome = (nome === '' || rNome.indexOf(nome) >= 0 || rCpf.indexOf(nome) >= 0);
    var matchCat  = (catId === 'todos' || rSetId === catId);

    if (matchNome && matchCat) { rows[i].style.display = ''; visivel++; }
    else { rows[i].style.display = 'none'; }
  }

  var emptyRow = document.getElementById('row-empty');
  if (emptyRow) emptyRow.style.display = (visivel === 0) ? '' : 'none';
}

// ================================================================
// SELEÇÃO
// ================================================================
function selecionarTodos() {
  var rows = document.querySelectorAll('.colab-row:not([style*="display: none"])');
  for (var i = 0; i < rows.length; i++) {
    var cb = rows[i].querySelector('.colab-check');
    cb.checked = true;
    rows[i].classList.add('selected');
    var inp = rows[i].querySelector('.input-valor');
    if (inp) inp.disabled = false;
  }
  document.getElementById('checkAll').checked = true;
  calcularResumo();
}

function desselecionarTodos() {
  var checks = document.querySelectorAll('.colab-check');
  for (var i = 0; i < checks.length; i++) {
    checks[i].checked = false;
    checks[i].closest('tr').classList.remove('selected');
    var inp = checks[i].closest('tr').querySelector('.input-valor');
    if (inp) { inp.disabled = true; inp.value = ''; }
  }
  document.getElementById('checkAll').checked = false;
  calcularResumo();
}

function toggleAll(master) {
  var rows = document.querySelectorAll('.colab-row:not([style*="display: none"])');
  for (var i = 0; i < rows.length; i++) {
    var cb = rows[i].querySelector('.colab-check');
    cb.checked = master.checked;
    var inp = rows[i].querySelector('.input-valor');
    if (master.checked) {
      rows[i].classList.add('selected');
      if (inp) inp.disabled = false;
    } else {
      rows[i].classList.remove('selected');
      if (inp) { inp.disabled = true; inp.value = ''; }
    }
  }
  calcularResumo();
}

function onCheckChange(cb) {
  var tr = cb.closest('tr');
  var inp = tr.querySelector('.input-valor');
  if (cb.checked) {
    tr.classList.add('selected');
    if (inp) inp.disabled = false;
  } else {
    tr.classList.remove('selected');
    if (inp) { inp.disabled = true; inp.value = ''; }
  }
  calcularResumo();
}

// ================================================================
// MÁSCARA MOEDA
// ================================================================
function mascaraMoeda(el) {
  var v = el.value.replace(/\D/g, '');
  if (v === '') { el.value = ''; return; }
  v = (parseInt(v, 10) / 100).toFixed(2);
  v = v.replace('.', ',');
  v = v.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  el.value = v;
}

function parseValor(str) {
  if (!str) return 0;
  str = String(str).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  var n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

function fmtMoeda(v) {
  return 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function escHtml(s) {
  if (!s) return '';
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(s));
  return d.innerHTML;
}

// ================================================================
// CALCULAR RESUMO
// ================================================================
function calcularResumo() {
  var selecionados = obterSelecionados();
  var count = selecionados.length;

  var totalBruto = 0, totalTaxa = 0, totalLiquido = 0;

  for (var i = 0; i < selecionados.length; i++) {
    var s = selecionados[i];
    var bruto = s.valor || 0;
    var taxaPct = s.taxa || 0;
    var taxa = bruto * (taxaPct / 100);
    var liquido = bruto - taxa;

    totalBruto += bruto;
    totalTaxa += taxa;
    totalLiquido += liquido;
  }

  // Header resumo
  document.getElementById('resumoColabHeader').textContent = count;
  document.getElementById('resumoBrutoHeader').textContent = fmtMoeda(totalBruto);
  document.getElementById('resumoTaxaHeader').textContent = fmtMoeda(totalTaxa);
  document.getElementById('resumoLiquidoHeader').textContent = fmtMoeda(totalLiquido);
  document.getElementById('countBadge').textContent = count;

  // Habilitar botão: precisa de ao menos 1 colab com valor > 0
  var temValor = false;
  for (var i = 0; i < selecionados.length; i++) {
    if ((selecionados[i].valor || 0) > 0) { temValor = true; break; }
  }
  document.getElementById('btnGerar').disabled = (count === 0 || !temValor);
}

// ================================================================
// OBTER SELECIONADOS
// ================================================================
function obterSelecionados() {
  var lista = [];

  if (abaAtiva === 'manual') {
    var checks = document.querySelectorAll('.colab-check:checked');
    for (var i = 0; i < checks.length; i++) {
      var id = checks[i].value;
      var valInput = document.getElementById('val_' + id);
      lista.push({
        id: id,
        nome: checks[i].getAttribute('data-nome'),
        cpf: checks[i].getAttribute('data-cpf'),
        restaurante: checks[i].getAttribute('data-restaurante'),
        cargo: checks[i].getAttribute('data-cargo'),
        taxa: parseFloat(checks[i].getAttribute('data-taxa') || '0'),
        valor: valInput ? parseValor(valInput.value) : 0
      });
    }
  } else {
    var cbs = document.querySelectorAll('.excel-check:checked');
    for (var i = 0; i < cbs.length; i++) {
      var idx = parseInt(cbs[i].value);
      if (dadosExcel[idx]) lista.push(dadosExcel[idx]);
    }
  }

  return lista;
}

// ================================================================
// IMPORTAÇÃO EXCEL
// ================================================================
(function() {
  var area = document.getElementById('uploadArea');
  if (!area) return;
  area.addEventListener('dragover', function(e) { e.preventDefault(); area.classList.add('dragover'); });
  area.addEventListener('dragleave', function(e) { e.preventDefault(); area.classList.remove('dragover'); });
  area.addEventListener('drop', function(e) {
    e.preventDefault(); area.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) processarArquivo(e.dataTransfer.files[0]);
  });
})();

function handleFileUpload(input) {
  if (input.files.length > 0) processarArquivo(input.files[0]);
}

function processarArquivo(file) {
  var ext = file.name.split('.').pop().toLowerCase();
  if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
    showToast('Formato não suportado. Use .xlsx, .xls ou .csv', 'error'); return;
  }
  showLoading(true);

  if (typeof XLSX === 'undefined') {
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = function() { lerArquivo(file); };
    script.onerror = function() { showLoading(false); showToast('Erro ao carregar SheetJS.', 'error'); };
    document.head.appendChild(script);
  } else {
    lerArquivo(file);
  }
}

function lerArquivo(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = new Uint8Array(e.target.result);
      var wb = XLSX.read(data, { type: 'array' });
      var sheet = wb.Sheets[wb.SheetNames[0]];
      var json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (json.length === 0) { showToast('Planilha vazia.', 'error'); showLoading(false); return; }

      dadosExcel = [];
      var colNome = findCol(json[0], ['nome', 'name', 'colaborador', 'funcionario']);
      var colCpf  = findCol(json[0], ['cpf', 'documento', 'doc']);
      var colVal  = findCol(json[0], ['valor', 'value', 'credito', 'credit']);

      var naoEncontrados = 0;

      for (var i = 0; i < json.length; i++) {
        var row = json[i];
        var nome = colNome ? String(row[colNome] || '').trim() : '';
        var cpf  = colCpf  ? String(row[colCpf] || '').replace(/\D/g, '').trim() : '';
        var val  = colVal  ? parseValor(String(row[colVal] || '0')) : 0;

        if (nome === '' && cpf === '') continue;

        // Resolver CPF no mapa de colaboradores do servidor
        var matched = colabMap[cpf];
        var usrId = 0;
        var taxa = 0;
        var restaurante = '';
        var status = 'não encontrado';

        if (matched) {
          usrId = matched.id;
          taxa = matched.taxa;
          restaurante = matched.restaurante;
          nome = matched.nome; // usar nome do banco
          status = 'ok';
        } else {
          naoEncontrados++;
        }

        dadosExcel.push({
          idx: dadosExcel.length,
          id: usrId,
          nome: nome,
          cpf: cpf,
          valor: val,
          taxa: taxa,
          restaurante: restaurante,
          status: status
        });
      }

      renderizarPreview(file.name);
      var msg = dadosExcel.length + ' registro(s) importado(s).';
      if (naoEncontrados > 0) msg += ' ' + naoEncontrados + ' CPF(s) não encontrado(s) no sistema.';
      showToast(msg, naoEncontrados > 0 ? 'info' : 'success');
    } catch (err) {
      showToast('Erro ao ler arquivo: ' + err.message, 'error');
    }
    showLoading(false);
  };
  reader.readAsArrayBuffer(file);
}

function findCol(row, aliases) {
  var keys = Object.keys(row);
  for (var a = 0; a < aliases.length; a++) {
    for (var k = 0; k < keys.length; k++) {
      if (keys[k].toLowerCase().replace(/[^a-z]/g, '').indexOf(aliases[a]) >= 0) return keys[k];
    }
  }
  return null;
}

function renderizarPreview(nomeArquivo) {
  document.getElementById('fileName').textContent = nomeArquivo;
  document.getElementById('fileCount').textContent = dadosExcel.length + ' registro(s)';
  document.getElementById('previewArea').classList.add('visible');

  var tbody = document.getElementById('previewBody');
  tbody.innerHTML = '';

  for (var i = 0; i < dadosExcel.length; i++) {
    var d = dadosExcel[i];
    var bruto = d.valor;
    var taxa = bruto * (d.taxa / 100);
    var liquido = bruto - taxa;
    var statusClass = d.status === 'ok' ? 'color:#16a34a' : 'color:#dc2626';

    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td style="text-align:center;">' +
        '<input type="checkbox" class="excel-check" value="' + i + '"' +
        (d.status === 'ok' ? ' checked' : '') +
        (d.status !== 'ok' ? ' disabled' : '') +
        ' onchange="calcularResumo()">' +
      '</td>' +
      '<td>' + escHtml(d.nome) + '</td>' +
      '<td>' + escHtml(d.cpf) + '</td>' +
      '<td class="num">' + fmtMoeda(bruto) + '</td>' +
      '<td class="num">' + d.taxa.toFixed(1) + '%</td>' +
      '<td class="num" style="color:#16a34a;">' + fmtMoeda(liquido) + '</td>' +
      '<td style="' + statusClass + '; font-weight:600; font-size:0.8rem;">' +
        escHtml(d.status === 'ok' ? 'OK' : 'Não encontrado') +
      '</td>';
    tbody.appendChild(tr);
  }
  calcularResumo();
}

function toggleAllExcel(master) {
  var cbs = document.querySelectorAll('.excel-check:not(:disabled)');
  for (var i = 0; i < cbs.length; i++) cbs[i].checked = master.checked;
  calcularResumo();
}

function limparImportacao() {
  dadosExcel = [];
  document.getElementById('previewArea').classList.remove('visible');
  document.getElementById('fileInput').value = '';
  calcularResumo();
}

// ================================================================
// GERAR CRÉDITO (POST)
// ================================================================
function gerarCredito() {
  var selecionados = obterSelecionados();

  // Filtrar só quem tem id e valor
  var validos = [];
  var idsVisto = {};
  for (var i = 0; i < selecionados.length; i++) {
    var s = selecionados[i];
    if (!s.id || s.id == '0' || s.id === 0) continue;
    if ((s.valor || 0) <= 0) continue;
    if (idsVisto[s.id]) continue; // duplicata
    idsVisto[s.id] = true;
    validos.push(s);
  }

  if (validos.length === 0) {
    showToast('Nenhum colaborador válido com valor preenchido.', 'error'); return;
  }

  var totalBruto = 0, totalLiquido = 0;
  for (var i = 0; i < validos.length; i++) {
    var b = validos[i].valor;
    var t = b * ((validos[i].taxa || 0) / 100);
    totalBruto += b;
    totalLiquido += (b - t);
  }

  if (!confirm(
    'Confirma a geração de crédito?\n\n' +
    'Colaboradores: ' + validos.length + '\n' +
    'Total Bruto: ' + fmtMoeda(totalBruto) + '\n' +
    'Total Líquido: ' + fmtMoeda(totalLiquido) + '\n\n' +
    'Esta ação não pode ser desfeita.'
  )) return;

  showLoading(true);

  var form = document.getElementById('creditoForm');

  var divIds = document.getElementById('frmIds');
  var divVals = document.getElementById('frmValores');
  divIds.innerHTML = '';
  divVals.innerHTML = '';

  for (var i = 0; i < validos.length; i++) {
    var s = validos[i];
    var inp = document.createElement('input');
    inp.type = 'hidden'; inp.name = 'usr_ids'; inp.value = s.id;
    divIds.appendChild(inp);

    var inpV = document.createElement('input');
    inpV.type = 'hidden'; inpV.name = 'valor_' + s.id;
    inpV.value = s.valor.toFixed(2).replace('.', ',');
    divVals.appendChild(inpV);
  }

  form.submit();
}

// ================================================================
function cancelar() {
  desselecionarTodos();
  limparImportacao();
  calcularResumo();
}

function showToast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast toast-' + (type || 'info') + ' show';
  setTimeout(function() { t.classList.remove('show'); }, 4000);
}

function showLoading(show) {
  document.getElementById('loadingOverlay').classList.toggle('active', show);
}

// INIT
calcularResumo();
</script>
</body>
</html>
