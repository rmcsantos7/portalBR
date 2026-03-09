/**
 * Componente: TabImportarExcel
 * Upload de arquivo Excel — processa automaticamente ao selecionar
 * e vai direto para a tela de geração de crédito
 */

import React, { useState, useRef } from 'react';
import { colaboradoresAPI } from '../services/api';

const TabImportarExcel = ({ clienteId, colaboradoresHook, onProximo }) => {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [baixandoPlanilha, setBaixandoPlanilha] = useState(false);
  const inputFileRef = useRef(null);

  /**
   * Baixa planilha padrão com todos os colaboradores ativos
   */
  const handleBaixarPlanilha = async () => {
    setBaixandoPlanilha(true);
    try {
      const response = await colaboradoresAPI.baixarPlanilha(clienteId);
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ImportacaoRecarga-${clienteId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao baixar planilha';
      setErro(msg);
    } finally {
      setBaixandoPlanilha(false);
    }
  };

  /**
   * Ao selecionar arquivo, processa automaticamente e vai para geração
   */
  const handleSelecionarArquivo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de tipo
    if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
      setErro('Apenas arquivos .xlsx ou .xls são permitidos');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErro('Arquivo muito grande (máximo 10MB)');
      return;
    }

    setErro(null);
    setLoading(true);

    try {
      // Processa o arquivo via API
      const resultado = await colaboradoresHook.importarExcel(file);

      if (!resultado || !resultado.data) {
        setErro('Erro ao processar arquivo');
        return;
      }

      const { colaboradores, total_erros, erros } = resultado.data;

      if (!colaboradores || colaboradores.length === 0) {
        let msg = 'Nenhum colaborador válido encontrado no arquivo.';
        if (total_erros > 0 && erros?.length > 0) {
          msg += ` Erros: ${erros.map(e => `Linha ${e.linha}: ${e.erros.join(', ')}`).join('; ')}`;
        }
        setErro(msg);
        return;
      }

      // Vai direto para a tela de geração de crédito
      // Envia com cpf para que o backend resolva os IDs
      const colaboradoresParaGerar = colaboradores.map(colab => ({
        id: 0,
        nome: colab.nome,
        cpf: colab.cpf,
        valor: colab.valor,
        cargo: colab.cargo || 'Sem cargo'
      }));

      onProximo(colaboradoresParaGerar);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao processar arquivo');
    } finally {
      setLoading(false);
      // Reseta input para permitir reenvio do mesmo arquivo
      if (inputFileRef.current) {
        inputFileRef.current.value = '';
      }
    }
  };

  return (
    <div className="tab-importar-excel">
      {/* Botão baixar planilha padrão */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div>
          <strong style={{ fontSize: '0.9rem', color: '#166534' }}>Planilha Padrão</strong>
          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#15803d' }}>
            Baixe a planilha com todos os colaboradores já preenchidos
          </p>
        </div>
        <button
          className="btn-selecionar"
          onClick={handleBaixarPlanilha}
          disabled={baixandoPlanilha || loading}
          style={{ whiteSpace: 'nowrap' }}
        >
          {baixandoPlanilha ? 'Gerando...' : 'Baixar Planilha'}
        </button>
      </div>

      {/* Erro */}
      {erro && (
        <div className="alert alert-erro" style={{ marginBottom: '16px' }}>
          {erro}
        </div>
      )}

      {/* Área de upload */}
      <div className="upload-area">
        <input
          ref={inputFileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleSelecionarArquivo}
          disabled={loading}
          style={{ display: 'none' }}
        />

        <div
          className="upload-box"
          onClick={() => !loading && inputFileRef.current?.click()}
          style={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'wait' : 'pointer' }}
        >
          {loading ? (
            <>
              <div style={{ fontSize: '2rem', color: '#9ca3af' }}>...</div>
              <p className="upload-texto">Processando arquivo...</p>
              <p className="upload-subtexto">Aguarde</p>
            </>
          ) : (
            <>
              <div className="upload-icon" style={{ fontSize: '2rem', color: '#9ca3af' }}>+</div>
              <p className="upload-texto">Clique para selecionar arquivo</p>
              <p className="upload-subtexto">Arquivo .xlsx com colunas: nome, cpf, valor</p>
              <button
                className="btn-selecionar"
                onClick={(e) => { e.stopPropagation(); inputFileRef.current?.click(); }}
                disabled={loading}
              >
                Selecionar Arquivo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TabImportarExcel;
