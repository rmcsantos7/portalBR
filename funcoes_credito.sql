-- ============================================================================
-- FUNÇÕES POSTGRESQL - GERAÇÃO DE CRÉDITO (Sistema BRG)
-- ============================================================================
-- Atualizado: 2026-03-06
-- Lógica:
--   valor_bruto  = valor informado pelo operador
--   taxa_convenio = crd_cliente.crd_cli_manutencao_usuario (percentual)
--   valor_taxa   = valor_bruto * (taxa_convenio / 100)
--   valor_liquido = valor_bruto - valor_taxa  → vai para crd_usu_valor
-- ============================================================================


-- ============================================================================
-- 1. GERAR REMESSA ID
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_gerar_remessa_id()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_id INTEGER;
BEGIN
    SELECT COALESCE(MAX(crd_usucrerem_id), 0) + 1 INTO v_id
    FROM crd_usuario_credito_remessa;
    RETURN v_id;
END;
$$;

COMMENT ON FUNCTION fn_gerar_remessa_id() IS
'Gera novo ID de remessa (MAX + 1 da tabela crd_usuario_credito_remessa).';


-- ============================================================================
-- 2. GERAR CRÉDITO EM LOTE (valor individual por colaborador)
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_gerar_credito_lote(
    p_usr_ids         INTEGER[],
    p_valores_brutos  NUMERIC(15,2)[],
    p_tipo_credito    VARCHAR(50) DEFAULT 'Crédito Manual',
    p_login           VARCHAR(100) DEFAULT 'sistema',
    p_cli_id_remessa  INTEGER DEFAULT NULL
)
RETURNS TABLE (
    remessa_id        INTEGER,
    total_inseridos   INTEGER,
    total_ignorados   INTEGER,
    total_bruto       NUMERIC(15,2),
    total_liquido     NUMERIC(15,2),
    total_servico     NUMERIC(15,2),
    detalhes          TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_remessa_id      INTEGER;
    v_idx             INTEGER;
    v_usr_id          INTEGER;
    v_valor_bruto     NUMERIC(15,2);
    v_taxa_pct        NUMERIC(15,4);
    v_valor_taxa      NUMERIC(15,2);
    v_valor_liquido   NUMERIC(15,2);
    v_usr_cli_id      INTEGER;

    v_inseridos       INTEGER := 0;
    v_ignorados       INTEGER := 0;
    v_total_bruto     NUMERIC(15,2) := 0;
    v_total_liquido   NUMERIC(15,2) := 0;
    v_total_servico   NUMERIC(15,2) := 0;
    v_ignorados_lista TEXT := '';
    v_cli_remessa     INTEGER;
    v_taxa_remessa    NUMERIC(15,4) := 0;
BEGIN
    -- Validações
    IF p_usr_ids IS NULL OR array_length(p_usr_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'Lista de colaboradores está vazia.';
    END IF;

    IF p_valores_brutos IS NULL OR array_length(p_valores_brutos, 1) IS NULL THEN
        RAISE EXCEPTION 'Lista de valores está vazia.';
    END IF;

    IF array_length(p_usr_ids, 1) != array_length(p_valores_brutos, 1) THEN
        RAISE EXCEPTION 'Número de colaboradores (%) diferente do número de valores (%).',
            array_length(p_usr_ids, 1), array_length(p_valores_brutos, 1);
    END IF;

    -- Gerar remessa
    v_remessa_id := fn_gerar_remessa_id();
    v_cli_remessa := p_cli_id_remessa;

    -- Iterar por colaborador
    FOR v_idx IN 1..array_length(p_usr_ids, 1)
    LOOP
        v_usr_id := p_usr_ids[v_idx];
        v_valor_bruto := p_valores_brutos[v_idx];

        BEGIN
            IF v_valor_bruto IS NULL OR v_valor_bruto <= 0 THEN
                v_ignorados := v_ignorados + 1;
                v_ignorados_lista := v_ignorados_lista ||
                    CASE WHEN v_ignorados_lista = '' THEN '' ELSE ', ' END ||
                    v_usr_id::TEXT || '(valor<=0)';
                CONTINUE;
            END IF;

            -- Buscar dados do colaborador + taxa convênio do restaurante
            SELECT u.crd_cli_id, COALESCE(c.crd_cli_manutencao_usuario, 0)
            INTO v_usr_cli_id, v_taxa_pct
            FROM crd_usuario u
            INNER JOIN crd_cliente c ON c.crd_cli_id = u.crd_cli_id
            WHERE u.crd_usr_id = v_usr_id AND u.crd_sit_id = 1;

            IF NOT FOUND THEN
                v_ignorados := v_ignorados + 1;
                v_ignorados_lista := v_ignorados_lista ||
                    CASE WHEN v_ignorados_lista = '' THEN '' ELSE ', ' END ||
                    v_usr_id::TEXT || '(inativo/inexistente)';
                CONTINUE;
            END IF;

            -- Definir cli_id da remessa
            IF v_cli_remessa IS NULL THEN
                v_cli_remessa := v_usr_cli_id;
            END IF;
            IF v_taxa_remessa = 0 THEN
                v_taxa_remessa := v_taxa_pct;
            END IF;

            -- Calcular valores
            v_valor_taxa := ROUND(v_valor_bruto * (v_taxa_pct / 100), 2);
            v_valor_liquido := v_valor_bruto - v_valor_taxa;

            -- Inserir crédito individual
            INSERT INTO crd_usuario_credito (
                crd_usr_id,
                crd_usu_valor,
                crd_usu_data_credito,
                crd_usucrerem_id,
                crd_cli_id,
                crd_usu_valor_bruto,
                crd_usu_login,
                crd_usu_data_import,
                crd_sit_id
            ) VALUES (
                v_usr_id,
                v_valor_liquido,
                CURRENT_DATE,
                v_remessa_id,
                v_usr_cli_id,
                v_valor_bruto,
                p_login,
                NOW(),
                1
            );

            v_inseridos := v_inseridos + 1;
            v_total_bruto := v_total_bruto + v_valor_bruto;
            v_total_liquido := v_total_liquido + v_valor_liquido;
            v_total_servico := v_total_servico + v_valor_taxa;

        EXCEPTION WHEN OTHERS THEN
            v_ignorados := v_ignorados + 1;
            v_ignorados_lista := v_ignorados_lista ||
                CASE WHEN v_ignorados_lista = '' THEN '' ELSE ', ' END ||
                v_usr_id::TEXT || '(erro: ' || SQLERRM || ')';
        END;
    END LOOP;

    -- Inserir registro na tabela de remessa
    IF v_inseridos > 0 THEN
        INSERT INTO crd_usuario_credito_remessa (
            crd_usucrerem_id,
            crd_usu_data_import,
            crd_usu_login,
            crd_cli_id,
            crd_usu_valor_bruto,
            crd_usu_valor_liquido,
            crd_usu_valor_servico,
            crd_usu_valor_tributo,
            crd_usu_taxa_servico,
            crd_usu_taxa_tributo,
            crd_rem_status
        ) VALUES (
            v_remessa_id,
            NOW(),
            p_login,
            COALESCE(v_cli_remessa, 0),
            v_total_bruto,
            v_total_liquido,
            v_total_servico,
            0,
            v_taxa_remessa,
            0,
            1
        );
    END IF;

    -- Retornar resultado
    RETURN QUERY SELECT
        v_remessa_id,
        v_inseridos,
        v_ignorados,
        v_total_bruto,
        v_total_liquido,
        v_total_servico,
        CASE
            WHEN v_ignorados > 0 THEN 'IDs ignorados: ' || v_ignorados_lista
            ELSE 'Todos os créditos inseridos com sucesso.'
        END;
END;
$$;

COMMENT ON FUNCTION fn_gerar_credito_lote(INTEGER[], NUMERIC[], VARCHAR, VARCHAR, INTEGER) IS
'Gera crédito em lote com valor individual por colaborador.
 Calcula taxa convênio (crd_cli_manutencao_usuario) por restaurante.
 Cria registro em crd_usuario_credito_remessa.
 valor_bruto -> crd_usu_valor_bruto, valor_liquido (bruto - taxa) -> crd_usu_valor.';


-- ============================================================================
-- 3. GERAR CRÉDITO LOTE (mesmo valor para todos)
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_gerar_credito_lote_uniforme(
    p_usr_ids         INTEGER[],
    p_valor_bruto     NUMERIC(15,2),
    p_tipo_credito    VARCHAR(50) DEFAULT 'Crédito Manual',
    p_login           VARCHAR(100) DEFAULT 'sistema',
    p_cli_id_remessa  INTEGER DEFAULT NULL
)
RETURNS TABLE (
    remessa_id        INTEGER,
    total_inseridos   INTEGER,
    total_ignorados   INTEGER,
    total_bruto       NUMERIC(15,2),
    total_liquido     NUMERIC(15,2),
    total_servico     NUMERIC(15,2),
    detalhes          TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_valores NUMERIC(15,2)[];
    v_i INTEGER;
BEGIN
    -- Construir array com o mesmo valor para todos
    v_valores := ARRAY[]::NUMERIC(15,2)[];
    FOR v_i IN 1..array_length(p_usr_ids, 1)
    LOOP
        v_valores := array_append(v_valores, p_valor_bruto);
    END LOOP;

    -- Delegar para a função principal
    RETURN QUERY SELECT * FROM fn_gerar_credito_lote(
        p_usr_ids, v_valores, p_tipo_credito, p_login, p_cli_id_remessa
    );
END;
$$;

COMMENT ON FUNCTION fn_gerar_credito_lote_uniforme(INTEGER[], NUMERIC, VARCHAR, VARCHAR, INTEGER) IS
'Wrapper que aplica o mesmo valor bruto para todos os colaboradores. Delega para fn_gerar_credito_lote.';


-- ============================================================================
-- 4. CONSULTAR COLABORADORES ATIVOS (com taxa convênio)
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_consultar_colaboradores_ativos(
    p_cli_id       INTEGER DEFAULT NULL,
    p_filtro_nome  TEXT DEFAULT NULL,
    p_set_id       INTEGER DEFAULT NULL
)
RETURNS TABLE (
    usr_id         INTEGER,
    usr_nome       VARCHAR,
    usr_cpf        VARCHAR,
    cli_id         INTEGER,
    cli_nome       VARCHAR,
    cargo          VARCHAR,
    set_id         INTEGER,
    taxa_convenio  NUMERIC(15,4)
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.crd_usr_id,
        u.crd_usr_nome,
        u.crd_usr_cpf,
        u.crd_cli_id,
        c.crd_cli_nome_fantasia,
        COALESCE(s.crd_set_setor, 'Sem cargo')::VARCHAR,
        COALESCE(s.crd_set_id, 0),
        COALESCE(c.crd_cli_manutencao_usuario, 0)
    FROM crd_usuario u
    INNER JOIN crd_cliente c ON c.crd_cli_id = u.crd_cli_id
    LEFT JOIN crd_cliente_setor s ON s.crd_set_id = u.crd_set_id
    WHERE u.crd_sit_id = 1
      AND (p_cli_id IS NULL OR u.crd_cli_id = p_cli_id)
      AND (p_filtro_nome IS NULL OR u.crd_usr_nome ILIKE '%' || p_filtro_nome || '%')
      AND (p_set_id IS NULL OR s.crd_set_id = p_set_id)
    ORDER BY u.crd_usr_nome;
END;
$$;

COMMENT ON FUNCTION fn_consultar_colaboradores_ativos(INTEGER, TEXT, INTEGER) IS
'Retorna colaboradores ativos com taxa convênio do restaurante. Filtros: cliente, nome, setor/cargo.';


-- ============================================================================
-- 5. CONSULTAR CATEGORIAS/CARGOS (crd_cliente_setor)
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_consultar_categorias(
    p_cli_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    set_id    INTEGER,
    set_nome  VARCHAR,
    cli_id    INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cs.crd_set_id,
        cs.crd_set_setor,
        cs.crd_cli_id
    FROM crd_cliente_setor cs
    WHERE (p_cli_id IS NULL OR cs.crd_cli_id = p_cli_id)
    ORDER BY cs.crd_set_setor;
END;
$$;

COMMENT ON FUNCTION fn_consultar_categorias(INTEGER) IS
'Retorna cargos/categorias da crd_cliente_setor, com filtro opcional por cliente.';


-- ============================================================================
-- 6. RESUMO DE UMA REMESSA
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_resumo_credito_remessa(
    p_remessa_id INTEGER
)
RETURNS TABLE (
    remessa_id       INTEGER,
    data_import      TIMESTAMP,
    login_usuario    VARCHAR,
    cli_id           INTEGER,
    valor_bruto      NUMERIC(15,2),
    valor_liquido    NUMERIC(15,2),
    valor_servico    NUMERIC(15,2),
    taxa_servico     NUMERIC(15,4),
    status_remessa   INTEGER,
    total_creditos   BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.crd_usucrerem_id,
        r.crd_usu_data_import,
        r.crd_usu_login,
        r.crd_cli_id,
        r.crd_usu_valor_bruto,
        r.crd_usu_valor_liquido,
        r.crd_usu_valor_servico,
        r.crd_usu_taxa_servico,
        r.crd_rem_status,
        (SELECT COUNT(*) FROM crd_usuario_credito uc WHERE uc.crd_usucrerem_id = p_remessa_id)
    FROM crd_usuario_credito_remessa r
    WHERE r.crd_usucrerem_id = p_remessa_id;
END;
$$;

COMMENT ON FUNCTION fn_resumo_credito_remessa(INTEGER) IS
'Retorna resumo de uma remessa com totais da crd_usuario_credito_remessa + contagem de créditos.';


-- ============================================================================
-- 7. VERIFICAR DUPLICATA (se já houve crédito hoje)
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_verificar_duplicata_credito(
    p_usr_ids      INTEGER[],
    p_data_credito DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    usr_id           INTEGER,
    usr_nome         VARCHAR,
    ja_creditado     BOOLEAN,
    valor_existente  NUMERIC(15,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.crd_usr_id,
        u.crd_usr_nome,
        EXISTS(
            SELECT 1 FROM crd_usuario_credito uc
            WHERE uc.crd_usr_id = u.crd_usr_id
              AND uc.crd_usu_data_credito = p_data_credito
        ),
        (SELECT SUM(uc2.crd_usu_valor)
         FROM crd_usuario_credito uc2
         WHERE uc2.crd_usr_id = u.crd_usr_id
           AND uc2.crd_usu_data_credito = p_data_credito)
    FROM crd_usuario u
    WHERE u.crd_usr_id = ANY(p_usr_ids);
END;
$$;

COMMENT ON FUNCTION fn_verificar_duplicata_credito(INTEGER[], DATE) IS
'Verifica se colaboradores já receberam crédito na data, para prevenir duplicatas.';


-- ============================================================================
-- EXEMPLOS DE USO
-- ============================================================================
/*
-- Gerar crédito com valores individuais:
SELECT * FROM fn_gerar_credito_lote(
    ARRAY[1, 2, 3],                -- IDs dos colaboradores
    ARRAY[100.00, 150.00, 80.00],  -- Valores brutos individuais
    'Crédito Manual',               -- Tipo
    'admin',                        -- Login do operador
    NULL                            -- cli_id (pega do colaborador)
);
-- Resultado: remessa criada, taxa descontada automaticamente por restaurante

-- Gerar crédito com mesmo valor para todos:
SELECT * FROM fn_gerar_credito_lote_uniforme(
    ARRAY[1, 2, 3, 4, 5],
    100.00,           -- R$ 100 bruto para cada (taxa descontada individualmente)
    'Recarga Mensal',
    'admin'
);

-- Consultar colaboradores com taxa:
SELECT * FROM fn_consultar_colaboradores_ativos(1, 'João', NULL);

-- Consultar cargos:
SELECT * FROM fn_consultar_categorias(1);

-- Verificar duplicatas:
SELECT * FROM fn_verificar_duplicata_credito(ARRAY[1, 2, 3]);

-- Resumo de remessa:
SELECT * FROM fn_resumo_credito_remessa(42);
*/
