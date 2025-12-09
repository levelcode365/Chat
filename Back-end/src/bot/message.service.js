const { sql, config } = require('../config/banco');

class MessageService {
  constructor() {
    this.pool = null;
  }

  async init() {
    if (!this.pool) {
      this.pool = await sql.connect(config);
      console.log('✅ MessageService conectado ao SQL Server');
    }
  }

  /**
   * Salva uma mensagem na tabela cmMensagens
   */
  async saveMessage(conversaId, remetente, mensagem, isBot = false, intencao = null) {
    try {
      await this.init();
      
      const request = this.pool.request();
      
      await request
        .input('conversa_id', sql.NVarChar, conversaId)
        .input('remetente', sql.NVarChar, remetente)
        .input('mensagem', sql.NVarChar, mensagem)
        .input('is_bot', sql.Bit, isBot ? 1 : 0)
        .input('intencao', sql.NVarChar, intencao)
        .query(`
          INSERT INTO cmMensagens 
          (conversa_id, remetente, mensagem, is_bot, intencao, data_hora)
          VALUES (@conversa_id, @remetente, @mensagem, @is_bot, @intencao, GETDATE())
        `);
      
      // Atualiza última mensagem na conversa
      await this.updateLastMessageTime(conversaId);
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error.message);
      return false;
    }
  }

  /**
   * Atualiza data_ultima_mensagem na cmConversas
   */
  async updateLastMessageTime(conversaId) {
    try {
      await this.init();
      
      await this.pool.request()
        .input('id', sql.NVarChar, conversaId)
        .query(`
          UPDATE cmConversas 
          SET data_ultima_mensagem = GETDATE()
          WHERE id = @id
        `);
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar última mensagem:', error.message);
      return false;
    }
  }

  /**
   * Obtém histórico de mensagens
   */
  async getMessageHistory(conversaId, limit = 50) {
    try {
      await this.init();
      
      const result = await this.pool.request()
        .input('conversa_id', sql.NVarChar, conversaId)
        .input('limit', sql.Int, limit)
        .query(`
          SELECT TOP (@limit) 
            id,
            remetente,
            mensagem,
            is_bot,
            intencao,
            data_hora
          FROM cmMensagens 
          WHERE conversa_id = @conversa_id
          ORDER BY data_hora DESC
        `);
      
      return result.recordset.reverse(); // Ordena do mais antigo para o mais novo
    } catch (error) {
      console.error('Erro ao buscar histórico:', error.message);
      return [];
    }
  }

  /**
   * Salva início de conversa
   */
  async saveConversationStart(conversaId, clienteId = null, clienteNome = null) {
    try {
      await this.init();
      
      await this.pool.request()
        .input('id', sql.NVarChar, conversaId)
        .input('cliente_id', sql.Int, clienteId)
        .input('cliente_nome', sql.NVarChar, clienteNome)
        .input('estado', sql.NVarChar, 'ATIVA')
        .input('is_bot', sql.Bit, 1)
        .query(`
          INSERT INTO cmConversas 
          (id, cliente_id, cliente_nome, estado, is_bot, data_inicio, data_ultima_mensagem)
          VALUES (@id, @cliente_id, @cliente_nome, @estado, @is_bot, GETDATE(), GETDATE())
        `);
      
      console.log(`✅ Conversa iniciada: ${conversaId}`);
      return true;
    } catch (error) {
      console.error('Erro ao salvar início da conversa:', error.message);
      return false;
    }
  }

  /**
   * Atualiza estado da conversa
   */
  async updateConversationState(conversaId, estado, motivoFim = null) {
    try {
      await this.init();
      
      const request = this.pool.request()
        .input('id', sql.NVarChar, conversaId)
        .input('estado', sql.NVarChar, estado);
      
      let query = `UPDATE cmConversas SET estado = @estado`;
      
      if (estado === 'FINALIZADA') {
        request.input('data_fim', sql.DateTime, new Date());
        query += `, data_fim = @data_fim`;
        
        if (motivoFim) {
          request.input('motivo_fim', sql.NVarChar, motivoFim);
          query += `, motivo_fim = @motivo_fim`;
        }
      }
      
      query += ` WHERE id = @id`;
      
      await request.query(query);
      
      console.log(`✅ Estado da conversa atualizado: ${conversaId} -> ${estado}`);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar estado da conversa:', error.message);
      return false;
    }
  }

  /**
   * Salva mensagem completa (cliente + resposta bot)
   */
  async saveCompleteExchange(conversaId, clienteId, mensagemCliente, respostaBot, intencao) {
    try {
      // Salva mensagem do cliente
      await this.saveMessage(conversaId, 'CLIENTE', mensagemCliente, false, intencao);
      
      // Salva resposta do bot
      await this.saveMessage(conversaId, 'BOT', respostaBot, true, intencao);
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar troca completa:', error.message);
      return false;
    }
  }
}

module.exports = MessageService;