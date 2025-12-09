const WebSocket = require('ws');
const EventEmitter = require('events');
const { verificarToken } = require('../config/jwt');
const routerService = require('../services/router.service');
const botService = require('../bot/bot.service');
const database = require('../config/banco');

class WebSocketServer extends EventEmitter {
  constructor(server) {
    super();
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws',
      clientTracking: true
    });
    
    this.conexoes = new Map(); // userId → { ws, ultimaConexao, infoCliente }
    this.router = new routerService();
    this.bot = new botService();
    
    this.iniciar();
  }
  
  iniciar() {
    this.wss.on('connection', async (ws, req) => {
      try {
        // 1. AUTENTICAÇÃO via query string (token)
        const token = this.extrairToken(req);
        if (!token) {
          ws.close(1008, 'Token não fornecido');
          return;
        }
        
        // 2. VERIFICAR TOKEN JWT
        const usuario = await verificarToken(token);
        if (!usuario) {
          ws.close(1008, 'Token inválido ou expirado');
          return;
        }
        
        const userId = usuario.id || usuario.userId;
        
        // 3. REGISTRAR CONEXÃO
        this.conexoes.set(userId, {
          ws,
          usuario,
          conectadoEm: new Date(),
          ip: req.socket.remoteAddress
        });
        
        console.log(`✅ Cliente ${userId} (${usuario.nome}) conectado ao WebSocket`);
        
        // 4. ENVIAR CONFIRMAÇÃO DE CONEXÃO
        ws.send(JSON.stringify({
          tipo: 'conexao_estabelecida',
          userId,
          timestamp: new Date(),
          mensagem: 'Conectado ao servidor de chat'
        }));
        
        // 5. ENVIAR HISTÓRICO DE MENSAGENS (últimas 50)
        await this.enviarHistorico(ws, userId);
        
        // 6. CONFIGURAR EVENTOS DO WEBSOCKET
        ws.on('message', (data) => this.processarMensagem(userId, data));
        ws.on('close', () => this.removerConexao(userId));
        ws.on('error', (error) => this.tratarErro(userId, error));
        
        // 7. NOTIFICAR SISTEMA DE NOVA CONEXÃO
        this.emit('cliente_conectado', { userId, usuario });
        
      } catch (error) {
        console.error('❌ Erro na conexão WebSocket:', error);
        ws.close(1011, 'Erro interno do servidor');
      }
    });
    
    console.log('🚀 WebSocket Server iniciado na porta', this.wss.address().port);
  }
  
  extrairToken(req) {
    const url = require('url');
    const query = url.parse(req.url, true).query;
    return query.token || null;
  }
  
  async processarMensagem(userId, data) {
    try {
      const conexao = this.conexoes.get(userId);
      if (!conexao) {
        console.warn(`⚠️ Tentativa de mensagem de usuário desconectado: ${userId}`);
        return;
      }
      
      const mensagem = JSON.parse(data);
      
      // VALIDAR ESTRUTURA DA MENSAGEM
      if (!mensagem.texto || !mensagem.conversaId) {
        conexao.ws.send(JSON.stringify({
          tipo: 'erro',
          mensagem: 'Estrutura da mensagem inválida'
        }));
        return;
      }
      
      console.log(`📩 Mensagem recebida de ${userId}:`, mensagem.texto.substring(0, 50));
      
      // 1. SALVAR NO BANCO (mensagem do cliente)
      const mensagemSalva = await this.salvarMensagemNoBanco({
        texto: mensagem.texto,
        conversaId: mensagem.conversaId,
        remetenteId: userId,
        remetenteTipo: 'cliente',
        timestamp: new Date(),
        tipo: mensagem.tipo || 'texto'
      });
      
      // 2. ACK PARA CLIENTE (confirmação de recebimento)
      conexao.ws.send(JSON.stringify({
        tipo: 'mensagem_recebida',
        mensagemId: mensagemSalva.id,
        timestamp: new Date()
      }));
      
      // 3. ENVIAR PARA O SISTEMA DE ROTEAMENTO
      const destino = await this.router.decidirDestino(mensagem.texto, userId);
      
      console.log(`📍 Roteando mensagem de ${userId} para: ${destino}`);
      
      // 4. PROCESSAR CONFORME DESTINO
      if (destino === 'bot') {
        await this.processarComBot(userId, mensagemSalva);
      } else {
        await this.processarComAtendente(userId, mensagemSalva);
      }
      
    } catch (error) {
      console.error('❌ Erro processar mensagem:', error);
      this.enviarErro(userId, 'Erro ao processar mensagem');
    }
  }
  
  async processarComBot(userId, mensagemCliente) {
    try {
      const conexao = this.conexoes.get(userId);
      if (!conexao) return;
      
      // 1. GERAR RESPOSTA DO BOT
      const respostaBot = await this.bot.gerarResposta(mensagemCliente);
      
      // 2. SALVAR RESPOSTA NO BANCO
      const respostaSalva = await this.salvarMensagemNoBanco({
        texto: respostaBot.texto,
        conversaId: mensagemCliente.conversaId,
        remetenteId: 'bot_001',
        remetenteTipo: 'bot',
        timestamp: new Date(),
        tipo: respostaBot.tipo || 'texto',
        metadata: respostaBot.metadata || {}
      });
      
      // 3. ENVIAR RESPOSTA PARA CLIENTE VIA WEBSOCKET
      this.enviarParaUsuario(userId, {
        tipo: 'mensagem_bot',
        mensagem: {
          id: respostaSalva.id,
          texto: respostaSalva.texto,
          timestamp: respostaSalva.timestamp,
          remetente: 'bot',
          tipo: respostaSalva.tipo,
          metadata: respostaSalva.metadata
        }
      });
      
      console.log(`🤖 Bot respondeu para ${userId}:`, respostaBot.texto.substring(0, 50));
      
    } catch (error) {
      console.error('❌ Erro no bot:', error);
      this.enviarErro(userId, 'Desculpe, tive um problema ao processar sua mensagem');
    }
  }
  
  async processarComAtendente(userId, mensagemCliente) {
    try {
      // FUTURO: ENCAMINHAR PARA SISTEMA C# VIA SIGNALR
      // Por enquanto, o bot responde
      
      console.log(`👨‍💼 Mensagem de ${userId} encaminhada para atendente (simulado)`);
      
      // Simular atraso de atendente
      setTimeout(async () => {
        const respostaAtendente = {
          texto: `Recebi sua mensagem: "${mensagemCliente.texto}". Um atendente irá responder em breve.`,
          tipo: 'atendimento_pendente'
        };
        
        const respostaSalva = await this.salvarMensagemNoBanco({
          ...respostaAtendente,
          conversaId: mensagemCliente.conversaId,
          remetenteId: 'sistema',
          remetenteTipo: 'sistema',
          timestamp: new Date()
        });
        
        this.enviarParaUsuario(userId, {
          tipo: 'mensagem_sistema',
          mensagem: {
            id: respostaSalva.id,
            texto: respostaSalva.texto,
            timestamp: respostaSalva.timestamp,
            remetente: 'sistema'
          }
        });
      }, 1000);
      
    } catch (error) {
      console.error('❌ Erro no atendente:', error);
    }
  }
  
  async salvarMensagemNoBanco(dados) {
    try {
      const pool = await database.getConnection();
      const query = `
        INSERT INTO mensagens 
        (texto, conversa_id, remetente_id, remetente_tipo, tipo, metadata, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await pool.request()
        .input('texto', dados.texto)
        .input('conversaId', dados.conversaId)
        .input('remetenteId', dados.remetenteId)
        .input('remetenteTipo', dados.remetenteTipo)
        .input('tipo', dados.tipo || 'texto')
        .input('metadata', JSON.stringify(dados.metadata || {}))
        .input('timestamp', dados.timestamp)
        .query(query);
      
      return {
        id: result.recordset[0]?.id || Date.now(),
        ...dados
      };
      
    } catch (error) {
      console.error('❌ Erro ao salvar mensagem:', error);
      // Retornar objeto simulado em caso de erro no banco
      return {
        id: Date.now(),
        ...dados,
        salvoNoBanco: false
      };
    }
  }
  
  async enviarHistorico(ws, userId) {
    try {
      const pool = await database.getConnection();
      const query = `
        SELECT TOP 50 * FROM mensagens 
        WHERE conversa_id IN (
          SELECT id FROM conversas WHERE cliente_id = @userId
        )
        ORDER BY timestamp DESC
      `;
      
      const result = await pool.request()
        .input('userId', userId)
        .query(query);
      
      ws.send(JSON.stringify({
        tipo: 'historico_mensagens',
        mensagens: result.recordset || [],
        timestamp: new Date()
      }));
      
    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error);
    }
  }
  
  enviarParaUsuario(userId, dados) {
    const conexao = this.conexoes.get(userId);
    if (conexao && conexao.ws.readyState === WebSocket.OPEN) {
      try {
        conexao.ws.send(JSON.stringify(dados));
      } catch (error) {
        console.error(`❌ Erro ao enviar para ${userId}:`, error);
        this.removerConexao(userId);
      }
    }
  }
  
  enviarErro(userId, mensagem) {
    this.enviarParaUsuario(userId, {
      tipo: 'erro',
      mensagem,
      timestamp: new Date()
    });
  }
  
  removerConexao(userId) {
    const conexao = this.conexoes.get(userId);
    if (conexao) {
      console.log(`❌ Cliente ${userId} desconectado`);
      this.conexoes.delete(userId);
      this.emit('cliente_desconectado', { userId });
    }
  }
  
  tratarErro(userId, error) {
    console.error(`💥 Erro WebSocket para ${userId}:`, error);
    this.removerConexao(userId);
  }
  
  // MÉTODOS PÚBLICOS PARA O SISTEMA
  
  broadcast(dados, filtro = null) {
    for (const [userId, conexao] of this.conexoes) {
      if (!filtro || filtro(userId, conexao.usuario)) {
        this.enviarParaUsuario(userId, dados);
      }
    }
  }
  
  enviarParaAtendente(atendenteId, dados) {
    // FUTURO: Enviar para interface C# via SignalR
    console.log(`📤 Enviando para atendente ${atendenteId}:`, dados);
  }
  
  getConexoesAtivas() {
    return Array.from(this.conexoes.entries()).map(([userId, info]) => ({
      userId,
      usuario: info.usuario,
      conectadoEm: info.conectadoEm,
      ip: info.ip
    }));
  }
  
  verificarConexao(userId) {
    const conexao = this.conexoes.get(userId);
    return conexao ? conexao.ws.readyState === WebSocket.OPEN : false;
  }
}

module.exports = WebSocketServer;