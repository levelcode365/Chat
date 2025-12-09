// back/src/bot/banco.service.js
const sql = require('mssql');
const config = require('../config/banco');

class BancoService {
  constructor() {
    this.pool = null;
    this.conectar();
  }

  async conectar() {
    try {
      this.pool = await sql.connect(config);
      console.log('Bot conectado ao SQL Server');
    } catch (error) {
      console.error('Erro ao conectar bot ao SQL Server:', error);
      // Tentar reconexão após 5 segundos
      setTimeout(() => this.conectar(), 5000);
    }
  }

  async buscarCliente(id) {
    try {
      const result = await this.pool.request()
        .input('id', sql.Int, id)
        .query(`
          SELECT 
            id, nome, email, telefone, 
            CASE WHEN vip = 1 THEN 1 ELSE 0 END as vip,
            data_cadastro
          FROM clientes 
          WHERE id = @id AND ativo = 1
        `);
      
      return result.recordset[0] || null;
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      return null;
    }
  }

  async buscarClientePorEmail(email) {
    try {
      const result = await this.pool.request()
        .input('email', sql.NVarChar, email)
        .query(`
          SELECT 
            id, nome, email, telefone, 
            CASE WHEN vip = 1 THEN 1 ELSE 0 END as vip
          FROM clientes 
          WHERE email = @email AND ativo = 1
        `);
      
      return result.recordset[0] || null;
    } catch (error) {
      console.error('Erro ao buscar cliente por email:', error);
      return null;
    }
  }

  async buscarProduto(nomeOuCodigo) {
    try {
      const result = await this.pool.request()
        .input('busca', sql.NVarChar, `%${nomeOuCodigo}%`)
        .query(`
          SELECT TOP 5 
            id, codigo, nome, descricao, preco, 
            estoque, categoria, marca, imagem_url
          FROM produtos 
          WHERE (nome LIKE @busca OR codigo LIKE @busca)
            AND ativo = 1
          ORDER BY 
            CASE 
              WHEN nome LIKE @busca THEN 1
              WHEN codigo LIKE @busca THEN 2
              ELSE 3
            END,
            estoque DESC
        `);
      
      return result.recordset;
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      return [];
    }
  }

  async verificarEstoque(produtoId) {
    try {
      const result = await this.pool.request()
        .input('produto_id', sql.Int, produtoId)
        .query(`
          SELECT 
            estoque, 
            CASE 
              WHEN estoque > 10 THEN 'Disponível'
              WHEN estoque > 0 THEN 'Últimas unidades'
              ELSE 'Esgotado'
            END as status
          FROM produtos 
          WHERE id = @produto_id
        `);
      
      return result.recordset[0] || null;
    } catch (error) {
      console.error('Erro ao verificar estoque:', error);
      return null;
    }
  }

  async salvarConversa(conversaId, clienteId, estado) {
    try {
      await this.pool.request()
        .input('id', sql.NVarChar, conversaId)
        .input('cliente_id', sql.Int, clienteId || null)
        .input('estado', sql.NVarChar, estado)
        .input('data_inicio', sql.DateTime, new Date())
        .query(`
          INSERT INTO conversas (id, cliente_id, estado, data_inicio)
          VALUES (@id, @cliente_id, @estado, @data_inicio)
          ON DUPLICATE KEY UPDATE
            estado = @estado,
            data_ultima_atualizacao = GETDATE()
        `);
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar conversa:', error);
      return false;
    }
  }

  async salvarMensagem(conversaId, origem, mensagem, intencao = null) {
    try {
      await this.pool.request()
        .input('conversa_id', sql.NVarChar, conversaId)
        .input('origem', sql.NVarChar, origem)
        .input('mensagem', sql.NVarChar, mensagem)
        .input('intencao', sql.NVarChar, intencao)
        .query(`
          INSERT INTO mensagens_conversas 
          (conversa_id, origem, mensagem, intencao, data_hora)
          VALUES (@conversa_id, @origem, @mensagem, @intencao, GETDATE())
        `);
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
      return false;
    }
  }

  async obterHistoricoConversa(conversaId, limite = 50) {
    try {
      const result = await this.pool.request()
        .input('conversa_id', sql.NVarChar, conversaId)
        .input('limite', sql.Int, limite)
        .query(`
          SELECT TOP (@limite)
            origem, mensagem, intencao, data_hora
          FROM mensagens_conversas
          WHERE conversa_id = @conversa_id
          ORDER BY data_hora ASC
        `);
      
      return result.recordset;
    } catch (error) {
      console.error('Erro ao obter histórico:', error);
      return [];
    }
  }

  async atualizarEstadoConversa(conversaId, estado) {
    try {
      await this.pool.request()
        .input('conversa_id', sql.NVarChar, conversaId)
        .input('estado', sql.NVarChar, estado)
        .query(`
          UPDATE conversas 
          SET estado = @estado,
              data_ultima_atualizacao = GETDATE()
          WHERE id = @conversa_id
        `);
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar estado:', error);
      return false;
    }
  }

  async finalizarConversa(conversaId, resolvido = false, avaliacao = null) {
    try {
      await this.pool.request()
        .input('conversa_id', sql.NVarChar, conversaId)
        .input('resolvido', sql.Bit, resolvido ? 1 : 0)
        .input('avaliacao', sql.Int, avaliacao)
        .input('data_fim', sql.DateTime, new Date())
        .query(`
          UPDATE conversas 
          SET estado = 'FINALIZADA',
              resolvido = @resolvido,
              avaliacao = @avaliacao,
              data_fim = @data_fim
          WHERE id = @conversa_id
        `);
      
      return true;
    } catch (error) {
      console.error('Erro ao finalizar conversa:', error);
      return false;
    }
  }

  async registrarFeedback(conversaId, feedback, nota) {
    try {
      await this.pool.request()
        .input('conversa_id', sql.NVarChar, conversaId)
        .input('feedback', sql.NVarChar, feedback)
        .input('nota', sql.Int, nota)
        .query(`
          INSERT INTO feedback_conversas 
          (conversa_id, feedback, nota, data_registro)
          VALUES (@conversa_id, @feedback, @nota, GETDATE())
        `);
      
      return true;
    } catch (error) {
      console.error('Erro ao registrar feedback:', error);
      return false;
    }
  }

  async obterMetricasBot(dataInicio, dataFim) {
    try {
      const result = await this.pool.request()
        .input('data_inicio', sql.DateTime, dataInicio)
        .input('data_fim', sql.DateTime, dataFim)
        .query(`
          SELECT 
            -- Total de conversas
            COUNT(DISTINCT conversa_id) as total_conversas,
            
            -- Conversas resolvidas pelo bot
            SUM(CASE WHEN estado = 'FINALIZADA' AND resolvido = 1 THEN 1 ELSE 0 END) 
              as conversas_resolvidas_bot,
            
            -- Transferências para atendente
            SUM(CASE WHEN estado IN ('COM_ATENDENTE', 'AGUARDANDO_ATENDENTE') THEN 1 ELSE 0 END) 
              as transferencias,
            
            -- Tempo médio de resposta do bot
            AVG(DATEDIFF(SECOND, mc1.data_hora, mc2.data_hora)) 
              as tempo_medio_resposta_segundos,
            
            -- Intenções mais comuns
            (
              SELECT TOP 5 intencao, COUNT(*) as quantidade
              FROM mensagens_conversas mc
              WHERE mc.origem = 'cliente'
                AND mc.data_hora BETWEEN @data_inicio AND @data_fim
              GROUP BY intencao
              ORDER BY quantidade DESC
              FOR JSON PATH
            ) as intencoes_comuns,
            
            -- Taxa de satisfação
            AVG(ISNULL(avaliacao, 0)) as satisfacao_media
            
          FROM conversas c
          LEFT JOIN mensagens_conversas mc1 ON c.id = mc1.conversa_id 
            AND mc1.origem = 'cliente'
          LEFT JOIN mensagens_conversas mc2 ON c.id = mc2.conversa_id 
            AND mc2.origem = 'bot'
            AND mc2.data_hora > mc1.data_hora
          WHERE c.data_inicio BETWEEN @data_inicio AND @data_fim
        `);
      
      return result.recordset[0] || {};
    } catch (error) {
      console.error('Erro ao obter métricas:', error);
      return {};
    }
  }
}

module.exports = BancoService;