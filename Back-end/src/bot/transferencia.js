// back/src/bot/transferencia.js
const sql = require('mssql');
const config = require('../config/banco');

class TransferenciaService {
  constructor() {
    this.filaTransferencia = [];
    this.atendentesDisponiveis = new Map(); // {atendenteId: {capacidade, conversasAtivas}}
  }

  async solicitar(conversaId, contexto, intencao) {
    try {
      // 1. Verificar se há atendentes disponíveis
      const atendente = await this.buscarAtendenteDisponivel();
      
      if (!atendente) {
        // Adicionar à fila de espera
        this.filaTransferencia.push({
          conversaId,
          contexto,
          intencao,
          horarioSolicitacao: new Date(),
          prioridade: this.calcularPrioridade(contexto, intencao)
        });

        // Ordenar fila por prioridade
        this.filaTransferencia.sort((a, b) => b.prioridade - a.prioridade);

        return {
          sucesso: false,
          mensagem: 'Atendentes ocupados. Você está na fila.',
          posicaoFila: this.filaTransferencia.length,
          tempoEstimado: this.estimarTempoFila()
        };
      }

      // 2. Atribuir conversa ao atendente
      const atribuicaoSucesso = await this.atribuirConversa(atendente.id, conversaId);
      
      if (!atribuicaoSucesso) {
        return {
          sucesso: false,
          mensagem: 'Erro ao atribuir atendente. Tente novamente.'
        };
      }

      // 3. Registrar transferência no banco
      await this.registrarTransferencia(conversaId, atendente.id, contexto, intencao);

      // 4. Preparar contexto para o atendente
      const contextoPreparado = await this.prepararContextoAtendente(contexto);

      // 5. Notificar via WebSocket (será integrado posteriormente)
      this.notificarAtendente(atendente.id, conversaId, contextoPreparado);

      return {
        sucesso: true,
        atendente: atendente.nome,
        idAtendente: atendente.id,
        contexto: contextoPreparado
      };

    } catch (error) {
      console.error('Erro na solicitação de transferência:', error);
      return {
        sucesso: false,
        mensagem: 'Erro no sistema de transferência.'
      };
    }
  }

  async buscarAtendenteDisponivel() {
    try {
      const pool = await sql.connect(config);
      
      // Buscar atendentes online e com capacidade
      const result = await pool.request().query(`
        SELECT TOP 1 
          a.id, a.nome, a.email, a.setor, a.nivel,
          COUNT(c.id) as conversas_ativas
        FROM atendentes a
        LEFT JOIN conversas_atendentes ca ON a.id = ca.atendente_id 
          AND ca.status = 'ativa'
        LEFT JOIN conversas c ON ca.conversa_id = c.id 
          AND c.estado NOT IN ('FINALIZADA', 'ARQUIVADA')
        WHERE a.disponivel = 1 
          AND a.online = 1
          AND a.bloqueado = 0
        GROUP BY a.id, a.nome, a.email, a.setor, a.nivel
        HAVING COUNT(c.id) < a.capacidade_maxima
        ORDER BY 
          CASE 
            WHEN a.nivel = 'senior' THEN 1
            WHEN a.nivel = 'junior' THEN 2
            ELSE 3
          END,
          COUNT(c.id) ASC,
          a.data_ultima_atribuicao ASC
      `);

      return result.recordset[0] || null;
    } catch (error) {
      console.error('Erro ao buscar atendente disponível:', error);
      return null;
    }
  }

  calcularPrioridade(contexto, intencao) {
    let prioridade = 0;

    // Cliente VIP tem prioridade máxima
    if (contexto.dadosCliente?.vip) prioridade += 100;

    // Problemas técnicos têm alta prioridade
    if (intencao.tipo === 'problema_tecnico') prioridade += 50;

    // Tempo de espera na fila
    if (contexto.inicioConversa) {
      const minutosEspera = (new Date() - contexto.inicioConversa) / (1000 * 60);
      prioridade += Math.floor(minutosEspera * 2); // +2 pontos por minuto
    }

    // Tentativas do bot
    prioridade += contexto.tentativasBot * 10;

    // Palavras-chave de urgência
    const palavrasUrgencia = ['urgente', 'emergencia', 'imediatamente', 'agora'];
    if (contexto.ultimaMensagem?.texto) {
      const texto = contexto.ultimaMensagem.texto.toLowerCase();
      palavrasUrgencia.forEach(palavra => {
        if (texto.includes(palavra)) prioridade += 30;
      });
    }

    return prioridade;
  }

  estimarTempoFila() {
    // Estimativa baseada no tamanho da fila e atendentes disponíveis
    const atendentesAtivos = Array.from(this.atendentesDisponiveis.values())
      .filter(a => a.conversasAtivas < a.capacidade).length;
    
    if (atendentesAtivos === 0) return 'Indeterminado';
    
    const tempoMedioConversa = 8; // minutos
    const posicao = this.filaTransferencia.length;
    
    const minutosEstimados = Math.ceil((posicao * tempoMedioConversa) / atendentesAtivos);
    
    return minutosEstimados <= 1 ? 'menos de 1 minuto' : `${minutosEstimados} minutos`;
  }

  async atribuirConversa(atendenteId, conversaId) {
    try {
      const pool = await sql.connect(config);
      
      await pool.request()
        .input('atendente_id', sql.Int, atendenteId)
        .input('conversa_id', sql.NVarChar, conversaId)
        .query(`
          INSERT INTO conversas_atendentes 
          (conversa_id, atendente_id, status, data_atribuicao)
          VALUES (@conversa_id, @atendente_id, 'ativa', GETDATE())
        `);

      // Atualizar status do atendente
      await pool.request()
        .input('atendente_id', sql.Int, atendenteId)
        .query(`
          UPDATE atendentes 
          SET conversas_ativas = conversas_ativas + 1,
              data_ultima_atribuicao = GETDATE()
          WHERE id = @atendente_id
        `);

      return true;
    } catch (error) {
      console.error('Erro ao atribuir conversa:', error);
      return false;
    }
  }

  async registrarTransferencia(conversaId, atendenteId, contexto, intencao) {
    try {
      const pool = await sql.connect(config);
      
      await pool.request()
        .input('conversa_id', sql.NVarChar, conversaId)
        .input('atendente_id', sql.Int, atendenteId)
        .input('contexto', sql.NVarChar, JSON.stringify(contexto))
        .input('intencao', sql.NVarChar, intencao.tipo)
        .input('tentativas_bot', sql.Int, contexto.tentativasBot || 0)
        .query(`
          INSERT INTO transferencias 
          (conversa_id, atendente_id, contexto, intencao, 
           tentativas_bot, data_transferencia)
          VALUES (@conversa_id, @atendente_id, @contexto, @intencao,
                  @tentativas_bot, GETDATE())
        `);

      // Atualizar estado da conversa
      await pool.request()
        .input('conversa_id', sql.NVarChar, conversaId)
        .input('estado', sql.NVarChar, 'AGUARDANDO_ATENDENTE')
        .query(`
          UPDATE conversas 
          SET estado = @estado,
              data_ultima_atualizacao = GETDATE()
          WHERE id = @conversa_id
        `);

    } catch (error) {
      console.error('Erro ao registrar transferência:', error);
    }
  }

  async prepararContextoAtendente(contexto) {
    // Preparar resumo para o atendente
    const resumo = {
      cliente: contexto.dadosCliente ? {
        nome: contexto.dadosCliente.nome,
        email: contexto.dadosCliente.email,
        telefone: contexto.dadosCliente.telefone,
        vip: contexto.dadosCliente.vip
      } : null,
      
      historico: contexto.mensagens
        ? contexto.mensagens.slice(-10) // Últimas 10 mensagens
        : [],
      
      tentativasBot: contexto.tentativasBot || 0,
      
      tempoConversa: contexto.inicioConversa 
        ? Math.round((new Date() - contexto.inicioConversa) / (1000 * 60)) + ' minutos'
        : 'Desconhecido',
      
      intencoesDetectadas: contexto.intencoesDetectadas || [],
      
      dadosColetados: {
        nome: contexto.nomeTemporario || null,
        email: contexto.emailTemporario || null,
        produtoInteresse: contexto.produtoInteresse || null,
        problemaDescricao: contexto.problemaDescricao || null
      }
    };

    return resumo;
  }

  notificarAtendente(atendenteId, conversaId, contexto) {
    // Esta função será integrada com WebSocket
    console.log(`Notificando atendente ${atendenteId} sobre conversa ${conversaId}`);
    
    // Em produção, enviar via WebSocket:
    // websocketServer.emit('nova_conversa', {
    //   atendenteId,
    //   conversaId,
    //   contexto,
    //   timestamp: new Date()
    // });
  }

  async processarFila() {
    // Processar itens da fila periodicamente
    if (this.filaTransferencia.length === 0) return;

    const item = this.filaTransferencia[0]; // Item com maior prioridade
    const atendente = await this.buscarAtendenteDisponivel();

    if (atendente) {
      // Remover da fila e processar
      this.filaTransferencia.shift();
      return await this.solicitar(item.conversaId, item.contexto, item.intencao);
    }

    return null;
  }

  getStatusFila() {
    return {
      tamanho: this.filaTransferencia.length,
      itens: this.filaTransferencia.map(item => ({
        conversaId: item.conversaId,
        prioridade: item.prioridade,
        tempoEspera: Math.round((new Date() - item.horarioSolicitacao) / (1000 * 60)) + ' min'
      }))
    };
  }

  async liberarAtendente(atendenteId, conversaId) {
    try {
      const pool = await sql.connect(config);
      
      // Remover atribuição
      await pool.request()
        .input('atendente_id', sql.Int, atendenteId)
        .input('conversa_id', sql.NVarChar, conversaId)
        .query(`
          UPDATE conversas_atendentes 
          SET status = 'finalizada',
              data_finalizacao = GETDATE()
          WHERE atendente_id = @atendente_id 
            AND conversa_id = @conversa_id
            AND status = 'ativa'
        `);

      // Atualizar contador do atendente
      await pool.request()
        .input('atendente_id', sql.Int, atendenteId)
        .query(`
          UPDATE atendentes 
          SET conversas_ativas = GREATEST(conversas_ativas - 1, 0)
          WHERE id = @atendente_id
        `);

      return true;
    } catch (error) {
      console.error('Erro ao liberar atendente:', error);
      return false;
    }
  }
}

module.exports = TransferenciaService;