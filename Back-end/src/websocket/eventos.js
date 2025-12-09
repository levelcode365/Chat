const MessageRouter = require('../services/router.service');
const { registrarMensagem } = require("../modulos/mensagens/registrarMensagem");
const { atualizarStatusConversa } = require("../modulos/conversas/atualizarStatus");
const BotService = require('../bot/bot.service');
const sql = require('mssql');
const config = require('../config/banco').config;

function sanitizeString(str) {
    if (typeof str !== "string") return "";
    return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

class WebSocketEvents {
    constructor(io) {
        this.io = io;
        this.router = new MessageRouter();
        this.userConnections = new Map(); // userId → socketId
        this.atendentesDisponiveis = new Set();
        this.botService = new BotService(); // BOT INTEGRADO

        // Cache para conversas com novo fluxo
        this.conversasNovoFluxo = new Set();
    }

    setupEvents() {
        this.io.on('connection', (socket) => {
            console.log('[WEBSOCKET] Nova conexão:', socket.id);

            // === SEUS EVENTOS EXISTENTES ===
            socket.on("enviar-mensagem", async (data) => {
                await this.handleEnviarMensagem(socket, data);
            });

            socket.on("transferir-humano", async (data) => {
                await this.handleTransferirHumano(socket, data);
            });

            socket.on("colaborador-assumiu", async (data) => {
                await this.handleColaboradorAssumiu(socket, data);
            });

            // === NOVOS EVENTOS DO ROTEAMENTO ===
            socket.on('cliente_connect', async (data) => {
                await this.handleClienteConnect(socket, data);
            });

            socket.on('cliente_message', async (data) => {
                await this.handleClienteMessage(socket, data);
            });

            // === NOVO EVENTO PARA MENU ===
            socket.on('menu_selection', async (data) => {
                await this.handleMenuSelection(socket, data);
            });

            socket.on('atendente_connect', async (data) => {
                await this.handleAtendenteConnect(socket, data);
            });

            socket.on('atendente_disconnect', async (data) => {
                await this.handleAtendenteDisconnect(socket, data);
            });

            socket.on('atendente_accept_client', async (data) => {
                await this.handleAtendenteAcceptClient(socket, data);
            });

            // Desconexão
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });
        });
    }

    // ============ SEUS MÉTODOS EXISTENTES ============
    async handleEnviarMensagem(socket, data) {
        try {
            // Validação de campos
            if (!data.IdConversa || typeof data.IdConversa !== "number") {
                return socket.send(JSON.stringify({ erro: "IdConversa inválido" }));
            }

            if (!data.Remetente || typeof data.Remetente !== "string" || data.Remetente.length > 20) {
                return socket.send(JSON.stringify({ erro: "Remetente inválido ou muito longo" }));
            }

            if (!data.Mensagem || typeof data.Mensagem !== "string" || data.Mensagem.length > 1000) {
                return socket.send(JSON.stringify({ erro: "Mensagem inválida ou muito longa" }));
            }

            // Sanitização
            data.Remetente = sanitizeString(data.Remetente);
            data.Mensagem = sanitizeString(data.Mensagem);

            // REGRAS DE ROTEAMENTO: Decidir se vai para bot ou atendente
            const routingResult = await this.router.decidirDestino(
                data.Mensagem,
                data.Remetente, // usando Remetente como userId
                {
                    IdConversa: data.IdConversa,
                    Remetente: data.Remetente
                }
            );

            if (routingResult.destination === 'bot') {
                // === CHAMAR BOT REAL ===
                const respostaBot = await this.botService.processarMensagem(
                    `conv_${data.IdConversa}`, // Converter para formato cmConversas
                    data.Mensagem,
                    data.Remetente
                );

                // Criar objeto da resposta do bot
                const botResponse = {
                    IdConversa: data.IdConversa,
                    Remetente: "Bot",
                    Mensagem: respostaBot,
                    DataEnvio: new Date(),
                    isBot: true
                };

                // SALVAR via sistema existente (apenas uma vez)
                const saved = await registrarMensagem(botResponse);

                // Enviar para cliente específico
                socket.emit('bot_response', {
                    response: respostaBot,
                    userId: data.Remetente,
                    destination: 'bot',
                    conversaId: data.IdConversa,
                    timestamp: new Date()
                });

                // Broadcast geral da mensagem do bot
                this.broadcast("nova-mensagem", saved);

            } else if (routingResult.destination === 'atendente') {
                // Transferir para humano
                const saved = await registrarMensagem(data);
                this.broadcast("nova-mensagem", saved);

                // Atualizar status da conversa na cmConversas
                await this.atualizarStatusConversaCm(`conv_${data.IdConversa}`, "AGUARDANDO_ATENDENTE");

                // Registrar transferência na cmTransferencias
                await this.registrarTransferenciaCm(
                    `conv_${data.IdConversa}`,
                    routingResult.metadata?.motivo || 'SOLICITACAO_CLIENTE',
                    data.Mensagem,
                    routingResult.metadata?.tentativasBot || 0
                );

                // Notificar atendentes
                this.broadcastToColaboradores("transferencia-humano", {
                    id: data.IdConversa,
                    cliente: data.Remetente,
                    mensagem: data.Mensagem,
                    motivo: routingResult.metadata?.motivo,
                    contexto: routingResult.metadata?.contexto
                });
            }

        } catch (error) {
            console.error("Erro enviar-mensagem:", error);
            socket.send(JSON.stringify({ erro: "Erro ao enviar mensagem" }));
        }
    }

    async handleTransferirHumano(socket, data) {
        try {
            if (!data.id || typeof data.id !== "number") {
                return socket.send(JSON.stringify({ erro: "Id inválido para transferência" }));
            }

            await atualizarStatusConversa(data.id, "aguardando");
            this.broadcastToColaboradores("transferencia-humano", data);

        } catch (error) {
            console.error("Erro transferir-humano:", error);
            socket.send(JSON.stringify({ erro: "Erro na transferência para humano" }));
        }
    }

    async handleColaboradorAssumiu(socket, data) {
        try {
            const { idConversa, idColaborador } = data;

            if (!idConversa || typeof idConversa !== "number") {
                return socket.send(JSON.stringify({ erro: "IdConversa inválido" }));
            }

            if (!idColaborador || typeof idColaborador !== "number") {
                return socket.send(JSON.stringify({ erro: "IdColaborador inválido" }));
            }

            await atualizarStatusConversa(idConversa, "humano");
            this.broadcast("conversa-assumida", { idConversa, idColaborador });

            // Atualizar cmConversas para estado COM_ATENDENTE
            await this.atualizarStatusConversaCm(`conv_${idConversa}`, "COM_ATENDENTE", idColaborador);

            // Resetar contadores do router para esta conversa
            const userId = await this.getUserIdByConversaId(idConversa);
            if (userId) {
                this.router.resetarContadores(userId);
            }

        } catch (error) {
            console.error("Erro colaborador-assumiu:", error);
            socket.send(JSON.stringify({ erro: "Erro ao assumir conversa" }));
        }
    }

    // ============ NOVOS MÉTODOS DE ROTEAMENTO ============
    async handleClienteConnect(socket, data) {
        const { userId, conversaId } = data;
        this.userConnections.set(userId, socket.id);
        console.log(`[WEBSOCKET] Cliente ${userId} conectado (Conversa: ${conversaId})`);

        // Verificar se já existe contexto de conversa
        const contexto = this.botService.getContextoConversa(conversaId);

        if (!contexto) {
            // Iniciar nova conversa com novo fluxo
            console.log(`[NOVO FLUXO] Iniciando conversa ${conversaId} para usuário ${userId}`);
            this.conversasNovoFluxo.add(conversaId);

            // Iniciar conversa no bot (NÃO salvar aqui - bot.service.js vai salvar)
            const respostaInicial = await this.botService.iniciarConversa(conversaId, userId);

            // Enviar resposta inicial
            socket.emit('bot_response', {
                response: respostaInicial,
                userId,
                conversaId,
                timestamp: new Date(),
                isNewFlow: true
            });
        }

        // Enviar status atual
        socket.emit('connection_established', {
            status: 'connected',
            userId,
            conversaId,
            timestamp: new Date()
        });
    }

    async handleClienteMessage(socket, data) {
        const { userId, message, sessionData, conversaId } = data;

        console.log(`[WEBSOCKET] Mensagem de ${userId}: ${message.substring(0, 50)}...`);

        try {
            // Verificar se é uma conversa com novo fluxo
            const isNovoFluxo = this.conversasNovoFluxo.has(conversaId) ||
                this.botService.isNovoFluxo(conversaId);

            if (isNovoFluxo) {
                // ============ NOVO FLUXO: IDENTIFICAÇÃO + MENU ============
                await this.processarMensagemNovoFluxo(socket, userId, message, conversaId);
            } else {
                // ============ FLUXO ANTIGO: ROTEAMENTO BOT/ATENDENTE ============
                await this.processarMensagemFluxoAntigo(socket, userId, message, conversaId, sessionData);
            }

        } catch (error) {
            console.error('Erro em handleClienteMessage:', error);

            // Resposta de fallback
            socket.emit('bot_response', {
                response: 'Desculpe, estou com problemas técnicos. Tente novamente em alguns instantes.',
                userId,
                destination: 'error',
                conversaId
            });
        }
    }

    /**
     * Processar mensagem com NOVO FLUXO (identificação + menu) - CORRIGIDO: SEM DUPLICAÇÃO
     */
    async processarMensagemNovoFluxo(socket, userId, message, conversaId) {
        console.log(`[NOVO FLUXO] Processando mensagem para ${conversaId}: ${message}`);

        // 1. Processar mensagem no bot (bot.service.js JÁ SALVA internamente)
        const respostaBot = await this.botService.processarMensagem(
            conversaId,
            message,
            userId
        );

        // 2. Obter contexto atual para enviar informações extras
        const contexto = this.botService.getContextoConversa(conversaId);

        // 3. Enviar resposta via WebSocket
        const responseData = {
            response: respostaBot,
            userId,
            conversaId,
            timestamp: new Date(),
            isNewFlow: true
        };

        // Adicionar informações extras se disponíveis
        if (contexto) {
            responseData.conversationState = contexto.estado;
            responseData.hasMenu = contexto.estado === 'MENU_PRINCIPAL' ||
                contexto.estado === 'PROCESSANDO_OPCAO';

            // Se for menu principal, enviar evento específico
            if (contexto.estado === 'MENU_PRINCIPAL') {
                socket.emit('menu_display', {
                    conversaId,
                    menuText: respostaBot,
                    timestamp: new Date()
                });
            }
        }

        socket.emit('bot_response', responseData);

        // 4. Se for transferência (opção 5), notificar atendentes
        if (contexto?.transferenciaRequerida) {
            await this.processarTransferenciaNovoFluxo(conversaId, userId, message, contexto);
        }
    }

    /**
     * Processar transferência no novo fluxo (opção 5 do menu)
     */
    async processarTransferenciaNovoFluxo(conversaId, userId, message, contexto) {
        console.log(`[NOVO FLUXO] Transferindo conversa ${conversaId} para atendente`);

        // 1. Atualizar cmConversas para estado de espera
        await this.atualizarStatusConversaCm(conversaId, "AGUARDANDO_ATENDENTE");

        // 2. Registrar transferência
        await this.registrarTransferenciaCm(
            conversaId,
            'SOLICITACAO_CLIENTE_VIA_MENU',
            `Cliente selecionou opção 5 do menu (${message})`,
            contexto.tentativasBot || 0
        );

        // 3. Notificar atendentes
        this.notificarAtendentesNovoFluxo(conversaId, userId, contexto);

        // 4. Enviar confirmação para cliente
        const clientSocketId = this.userConnections.get(userId);
        if (clientSocketId) {
            this.io.to(clientSocketId).emit('transfer_confirmation', {
                message: 'Sua solicitação foi encaminhada para um atendente especialista.',
                userId,
                conversaId,
                timestamp: new Date(),
                estimatedWait: '2-5 minutos'
            });
        }
    }

    /**
     * Notificar atendentes no novo fluxo
     */
    notificarAtendentesNovoFluxo(conversaId, userId, contexto) {
        const notificacao = {
            id: conversaId.replace('conv_', '') || '0',
            cliente: contexto.dadosCliente?.Nome || userId,
            mensagem: 'Cliente solicitou atendimento humano via menu (opção 5)',
            motivo: 'SOLICITACAO_CLIENTE_VIA_MENU',
            prioridade: 'normal',
            timestamp: new Date(),
            isNewFlow: true
        };

        this.broadcastToColaboradores("transferencia-humano", notificacao);
    }

    /**
     * Processar mensagem com FLUXO ANTIGO (roteamento bot/atendente) - CORRIGIDO
     */
    async processarMensagemFluxoAntigo(socket, userId, message, conversaId, sessionData) {
        console.log(`[FLUXO ANTIGO] Processando mensagem para ${conversaId}`);

        // 1. Usar router para decidir destino
        const resultado = await this.router.decidirDestino(message, userId, {
            ...sessionData,
            conversaId
        });

        if (resultado.destination === 'bot') {
            // Processar com bot (bot.service.js JÁ SALVA internamente)
            const respostaBot = await this.botService.processarMensagem(
                conversaId,
                message,
                userId
            );

            // Enviar resposta
            socket.emit('bot_response', {
                response: respostaBot,
                userId,
                destination: 'bot',
                conversaId,
                timestamp: new Date()
            });

            // NÃO salvar novamente aqui - bot.service.js já salvou

        } else if (resultado.destination === 'atendente') {
            // Transferir para atendente
            await this.processarTransferenciaFluxoAntigo(conversaId, userId, message, resultado);
        }
    }

    /**
     * Processar transferência no fluxo antigo
     */
    async processarTransferenciaFluxoAntigo(conversaId, userId, message, resultado) {
        // Atualizar cmConversas para estado de espera
        await this.atualizarStatusConversaCm(conversaId, "AGUARDANDO_ATENDENTE");

        // Registrar transferência
        await this.registrarTransferenciaCm(
            conversaId,
            resultado.metadata?.motivo || 'SOLICITACAO_CLIENTE',
            message,
            resultado.metadata?.tentativasBot || 0
        );

        // Notificar cliente
        const clientSocketId = this.userConnections.get(userId);
        if (clientSocketId) {
            this.io.to(clientSocketId).emit('transferring_to_atendente', {
                message: 'Sua solicitação foi encaminhada para um atendente. Aguarde um momento...',
                userId,
                estimatedWait: '2-5 minutos',
                conversaId,
                timestamp: new Date()
            });
        }

        // Notificar atendentes
        this.notificarAtendentes(resultado.metadata, conversaId);
    }

    /**
     * Manipular seleção de menu (evento específico)
     */
    async handleMenuSelection(socket, data) {
        const { userId, option, conversaId } = data;

        console.log(`[MENU] Usuário ${userId} selecionou opção ${option} na conversa ${conversaId}`);

        // Processar como uma mensagem normal
        await this.processarMensagemNovoFluxo(socket, userId, option.toString(), conversaId);
    }

    async handleAtendenteConnect(socket, data) {
        const { atendenteId } = data;
        this.atendentesDisponiveis.add(atendenteId);
        console.log(`[WEBSOCKET] Atendente ${atendenteId} conectado`);

        // Associar socket com atendenteId
        socket.atendenteId = atendenteId;

        // Notificar sobre fila de espera
        this.atualizarStatusAtendentes();
    }

    async handleAtendenteDisconnect(socket, data) {
        const { atendenteId } = data;
        this.atendentesDisponiveis.delete(atendenteId);
        console.log(`[WEBSOCKET] Atendente ${atendenteId} desconectado`);
    }

    async handleAtendenteAcceptClient(socket, data) {
        const { atendenteId, userId, conversaId } = data;

        console.log(`[WEBSOCKET] Atendente ${atendenteId} aceitou cliente ${userId}`);

        // Atualizar status da conversa no sistema antigo
        await atualizarStatusConversa(conversaId.replace('conv_', ''), "humano");

        // Atualizar cmConversas para estado COM_ATENDENTE
        await this.atualizarStatusConversaCm(conversaId, "COM_ATENDENTE", atendenteId);

        // Notificar cliente
        const clientSocketId = this.userConnections.get(userId);
        if (clientSocketId) {
            this.io.to(clientSocketId).emit('atendente_assumiu', {
                atendenteId,
                message: `Olá! Sou o atendente ${atendenteId}, como posso ajudar?`,
                timestamp: new Date()
            });

            // Broadcast usando seu sistema existente
            this.broadcast("conversa-assumida", {
                idConversa: conversaId.replace('conv_', ''),
                idColaborador: atendenteId
            });
        }

        // Resetar contadores do router
        this.router.resetarContadores(userId);

        // Remover do novo fluxo se estava nele
        this.conversasNovoFluxo.delete(conversaId);
    }

    handleDisconnect(socket) {
        // Limpar conexões de cliente
        for (const [userId, socketId] of this.userConnections.entries()) {
            if (socketId === socket.id) {
                this.userConnections.delete(userId);
                console.log(`[WEBSOCKET] Cliente ${userId} desconectado`);
            }
        }

        // Limpar conexões de atendente
        if (socket.atendenteId) {
            this.atendentesDisponiveis.delete(socket.atendenteId);
            console.log(`[WEBSOCKET] Atendente ${socket.atendenteId} desconectado`);
            this.atualizarStatusAtendentes();
        }
    }

    // ============ MÉTODOS AUXILIARES ============
    notificarAtendentes(contexto, conversaId) {
        const notificacao = {
            type: 'nova_solicitacao',
            data: {
                id: conversaId,
                userId: contexto.userId,
                userName: contexto.userName || 'Cliente não identificado',
                motivo: contexto.motivo || 'transferencia',
                mensagem: contexto.mensagemOriginal || '',
                tempoEspera: 'agora',
                historico: contexto.historicoConversa || [],
                prioridade: contexto.userType === 'cliente_vip' ? 'alta' : 'normal',
                timestamp: new Date()
            }
        };

        // Enviar para todos os atendentes conectados
        this.broadcastToColaboradores("transferencia-humano", notificacao.data);
    }

    atualizarStatusAtendentes() {
        const status = {
            online: this.atendentesDisponiveis.size,
            clientesEsperando: Array.from(this.userConnections.keys()).length,
            timestamp: new Date()
        };

        // Enviar status para dashboard
        this.io.emit('atendentes_status', status);
    }

    async getUserIdByConversaId(conversaId) {
        try {
            return `user_${conversaId}`;
        } catch (error) {
            console.error("Erro ao buscar userId:", error);
            return null;
        }
    }

    // ============ NOVOS MÉTODOS PARA TABELAS cm* ============
    async atualizarStatusConversaCm(conversaId, estado, atendenteId = null) {
        try {
            const pool = await sql.connect(config);
            const request = pool.request()
                .input('id', sql.NVarChar, conversaId)
                .input('estado', sql.NVarChar, estado);

            if (atendenteId) {
                request.input('atendente_id', sql.Int, atendenteId);

                // Buscar nome do atendente
                const resultAtendente = await pool.request()
                    .input('id', sql.Int, atendenteId)
                    .query(`
                        SELECT nome FROM cmAtendentes WHERE id = @id
                    `);

                const atendenteNome = resultAtendente.recordset[0]?.nome || `Atendente ${atendenteId}`;
                request.input('atendente_nome', sql.NVarChar, atendenteNome);

                await request.query(`
                    UPDATE cmConversas 
                    SET estado = @estado, 
                        atendente_id = @atendente_id,
                        atendente_nome = @atendente_nome,
                        is_bot = 0
                    WHERE id = @id
                `);
            } else {
                await request.query(`
                    UPDATE cmConversas 
                    SET estado = @estado,
                        is_bot = 0
                    WHERE id = @id
                `);
            }

            console.log(`✅ Status cmConversas atualizado: ${conversaId} -> ${estado}`);
            return true;

        } catch (error) {
            console.error('Erro ao atualizar cmConversas:', error);
            return false;
        }
    }

    async registrarTransferenciaCm(conversaId, motivo, mensagemTrigger, tentativasBot = 0) {
        try {
            const pool = await sql.connect(config);

            await pool.request()
                .input('conversa_id', sql.NVarChar, conversaId)
                .input('motivo', sql.NVarChar, motivo)
                .input('mensagem_trigger', sql.NVarChar, mensagemTrigger)
                .input('tentativas_bot', sql.Int, tentativasBot)
                .query(`
                    INSERT INTO cmTransferencias 
                    (conversa_id, motivo, mensagem_trigger, tentativas_bot, data_solicitacao)
                    VALUES (@conversa_id, @motivo, @mensagem_trigger, @tentativas_bot, GETDATE())
                `);

            console.log(`✅ Transferência registrada: ${conversaId} - ${motivo}`);
            return true;

        } catch (error) {
            console.error('Erro ao registrar transferência:', error);
            return false;
        }
    }

    // ============ MÉTODOS DE BROADCAST ============
    broadcast(event, data) {
        this.io.emit(event, data);
    }

    broadcastToColaboradores(event, data) {
        this.atendentesDisponiveis.forEach(atendenteId => {
            const sockets = Array.from(this.io.sockets.sockets.values());
            const atendenteSocket = sockets.find(s => s.atendenteId === atendenteId);

            if (atendenteSocket) {
                atendenteSocket.emit(event, data);
            }
        });
    }

    // ============ NOVOS MÉTODOS PARA TIMEOUT ============
    async verificarTimeouts() {
        console.log('[TIMEOUT] Verificando conversas inativas...');

        for (const [conversaId] of this.conversasNovoFluxo) {
            const contexto = this.botService.getContextoConversa(conversaId);

            if (contexto && this.botService.verificarTimeout(conversaId)) {
                console.log(`[TIMEOUT] Finalizando conversa ${conversaId} por inatividade`);

                // Finalizar conversa
                const mensagemTimeout = await this.botService.finalizarPorTimeout(conversaId);

                // Enviar notificação para cliente
                const userId = contexto.clienteId || 'unknown';
                const clientSocketId = this.userConnections.get(userId);

                if (clientSocketId) {
                    this.io.to(clientSocketId).emit('conversa_timeout', {
                        message: mensagemTimeout,
                        conversaId,
                        timestamp: new Date()
                    });
                }

                // Remover do cache
                this.conversasNovoFluxo.delete(conversaId);
            }
        }
    }
}

module.exports = WebSocketEvents;