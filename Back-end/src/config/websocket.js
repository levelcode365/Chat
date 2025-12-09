const socketIO = require('socket.io');
const MessageRouter = require('../services/router.service');
const BotService = require('../bot/bot.service');

class WebSocketManager {
    constructor() {
        this.conexoesClientes = new Map();
        this.conexoesAtendentes = new Map();
        this.atendentesDisponiveis = new Set();
        this.router = new MessageRouter();
        this.botService = new BotService();
    }

    iniciarWebSocket(servidor) {
        // VERIFICAÇÃO CRÍTICA PARA EVITAR NULL
        if (!servidor || !servidor.address) {
            console.error('❌ WebSocket: Servidor HTTP não está disponível');
            return null;
        }

        // Aguardar servidor estar pronto
        if (!servidor.address()) {
            console.log('⏳ WebSocket: Aguardando servidor HTTP iniciar...');
            servidor.on('listening', () => {
                console.log('✅ WebSocket: Servidor HTTP pronto na porta', servidor.address().port);
                return this._iniciarSocketIO(servidor);
            });
            return null;
        }

        return this._iniciarSocketIO(servidor);
    }

    _iniciarSocketIO(servidor) {
        try {
            const io = socketIO(servidor, {
                cors: {
                    origin: '*',
                    methods: ['GET', 'POST'],
                    credentials: true
                },
                transports: ['websocket', 'polling']
            });

            console.log('✅ WebSocket Server configurado na porta', servidor.address().port);

            io.on('connection', (socket) => {
                console.log(`🔗 Nova conexão WebSocket: ${socket.id}`);

                // === EVENTOS DO CLIENTE ===
                socket.on('cliente_connect', async (data) => {
                    await this.handleClienteConnect(socket, data, io);
                });

                socket.on('cliente_message', async (data) => {
                    await this.handleClienteMessage(socket, data, io);
                });

                // === EVENTOS DO ATENDENTE ===
                socket.on('atendente_connect', async (data) => {
                    await this.handleAtendenteConnect(socket, data, io);
                });

                socket.on('atendente_disconnect', async (data) => {
                    await this.handleAtendenteDisconnect(socket, data);
                });

                socket.on('atendente_accept_client', async (data) => {
                    await this.handleAtendenteAcceptClient(socket, data, io);
                });

                // === EVENTOS LEGACY ===
                socket.on('enviar-mensagem', async (data) => {
                    await this.handleEnviarMensagem(socket, data, io);
                });

                socket.on('transferir-humano', async (data) => {
                    await this.handleTransferirHumano(socket, data, io);
                });

                socket.on('colaborador-assumiu', async (data) => {
                    await this.handleColaboradorAssumiu(socket, data, io);
                });

                // === DESCONEXÃO ===
                socket.on('disconnect', () => {
                    this.handleDisconnect(socket);
                });

                // === EVENTO DE TESTE ===
                socket.on('test', (data) => {
                    socket.emit('test_response', {
                        message: 'WebSocket funcionando!',
                        data: data,
                        timestamp: new Date()
                    });
                });
            });

            return io;

        } catch (error) {
            console.error('❌ Erro crítico ao iniciar WebSocket:', error.message);
            return null;
        }
    }

    // === HANDLERS ===
    async handleClienteConnect(socket, data, io) {
        try {
            const { userId, conversaId } = data;
            if (!userId || !conversaId) {
                socket.emit('error', { message: 'Dados de conexão inválidos' });
                return;
            }

            this.conexoesClientes.set(userId, socket.id);
            console.log(`👤 Cliente ${userId} conectado (Conversa: ${conversaId})`);
            
            // Iniciar conversa com bot
            const mensagemInicial = await this.botService.iniciarConversa(
                conversaId, 
                userId
            );
            
            socket.emit('connection_established', {
                status: 'connected',
                userId,
                conversaId,
                mensagemInicial,
                timestamp: new Date()
            });
            
            // Enviar mensagem inicial do bot
            if (mensagemInicial) {
                socket.emit('bot_message', {
                    IdConversa: conversaId,
                    Remetente: "Bot",
                    Mensagem: mensagemInicial,
                    DataEnvio: new Date(),
                    isBot: true
                });
            }
            
        } catch (error) {
            console.error('❌ Erro cliente_connect:', error);
            socket.emit('error', { message: 'Erro na conexão' });
        }
    }

    async handleClienteMessage(socket, data, io) {
        try {
            const { userId, message, sessionData, conversaId } = data;
            
            if (!userId || !message || !conversaId) {
                socket.emit('error', { message: 'Dados da mensagem inválidos' });
                return;
            }

            console.log(`📨 Mensagem de ${userId}: ${message.substring(0, 50)}...`);

            // Confirmar recebimento da mensagem do usuário
            socket.emit('message_received', {
                userId,
                conversaId,
                originalMessage: message,
                timestamp: new Date()
            });

            // Usar BotService real para processar mensagem
            const respostaBot = await this.botService.processarMensagem(
                conversaId,
                message,
                userId
            );

            // Verificar se precisa transferir para atendente
            const contexto = this.botService.getContextoConversa(conversaId);
            
            if (contexto?.transferenciaRequerida) {
                // Transferir para atendente
                socket.emit('transferring_to_atendente', {
                    message: 'Transferindo você para um atendente humano. Por favor, aguarde...',
                    userId,
                    estimatedWait: '2-5 minutos'
                });

                this.notificarAtendentes({
                    userId,
                    userName: contexto.dadosCliente?.Nome || userId,
                    mensagemOriginal: message,
                    motivo: 'SOLICITACAO_CLIENTE',
                    historicoConversa: contexto.historicoMensagens || []
                }, conversaId, io);
                
                // Enviar mensagem de transferência
                socket.emit('bot_message', {
                    IdConversa: conversaId,
                    Remetente: "Sistema",
                    Mensagem: respostaBot,
                    DataEnvio: new Date(),
                    isBot: true,
                    isTransfer: true
                });
            } else {
                // Responder com bot
                socket.emit('bot_message', {
                    IdConversa: conversaId,
                    Remetente: "Bot",
                    Mensagem: respostaBot,
                    DataEnvio: new Date(),
                    isBot: true
                });
            }
            
        } catch (error) {
            console.error('❌ Erro cliente_message:', error);
            socket.emit('error', { message: 'Erro ao processar mensagem' });
        }
    }

    async handleAtendenteConnect(socket, data, io) {
        try {
            const { atendenteId } = data;
            if (!atendenteId) {
                socket.emit('error', { message: 'ID do atendente não fornecido' });
                return;
            }

            this.conexoesAtendentes.set(atendenteId, socket.id);
            this.atendentesDisponiveis.add(atendenteId);
            socket.atendenteId = atendenteId;
            
            console.log(`👨‍💼 Atendente ${atendenteId} conectado`);
            
            socket.emit('atendente_connected', {
                status: 'connected',
                atendenteId,
                timestamp: new Date(),
                clientesEsperando: this.conexoesClientes.size
            });
            
        } catch (error) {
            console.error('❌ Erro atendente_connect:', error);
            socket.emit('error', { message: 'Erro na conexão do atendente' });
        }
    }

    async handleAtendenteDisconnect(socket, data) {
        try {
            const { atendenteId } = data || { atendenteId: socket.atendenteId };
            
            if (atendenteId) {
                this.atendentesDisponiveis.delete(atendenteId);
                this.conexoesAtendentes.delete(atendenteId);
                console.log(`👋 Atendente ${atendenteId} desconectado`);
            }
            
        } catch (error) {
            console.error('❌ Erro atendente_disconnect:', error);
        }
    }

    async handleAtendenteAcceptClient(socket, data, io) {
        try {
            const { atendenteId, userId, conversaId } = data;
            
            if (!atendenteId || !userId || !conversaId) {
                socket.emit('error', { message: 'Dados inválidos para aceitar cliente' });
                return;
            }

            console.log(`✅ Atendente ${atendenteId} aceitou cliente ${userId}`);
            
            const clientSocketId = this.conexoesClientes.get(userId);
            if (clientSocketId) {
                io.to(clientSocketId).emit('atendente_assumiu', {
                    atendenteId,
                    message: `Olá! Sou o atendente ${atendenteId}, como posso ajudar?`,
                    timestamp: new Date()
                });
                
                io.emit('conversa-assumida', { 
                    idConversa: conversaId, 
                    idColaborador: atendenteId 
                });
            }

            if (this.router && this.router.resetarContadores) {
                this.router.resetarContadores(userId);
            }
            
        } catch (error) {
            console.error('❌ Erro atendente_accept_client:', error);
            socket.emit('error', { message: 'Erro ao aceitar cliente' });
        }
    }

    async handleEnviarMensagem(socket, data, io) {
        try {
            if (!data.IdConversa || typeof data.IdConversa !== "number") {
                return socket.emit('error', { erro: "IdConversa inválido" });
            }

            if (!data.Remetente || typeof data.Remetente !== "string" || data.Remetente.length > 20) {
                return socket.emit('error', { erro: "Remetente inválido ou muito longo" });
            }

            if (!data.Mensagem || typeof data.Mensagem !== "string" || data.Mensagem.length > 1000) {
                return socket.emit('error', { erro: "Mensagem inválida ou muito longa" });
            }

            const sanitizeString = (str) => {
                if (typeof str !== "string") return "";
                return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            };

            data.Remetente = sanitizeString(data.Remetente);
            data.Mensagem = sanitizeString(data.Mensagem);

            if (this.router) {
                const routingResult = await this.router.decidirDestino(
                    data.Mensagem,
                    data.Remetente,
                    {
                        IdConversa: data.IdConversa,
                        Remetente: data.Remetente
                    }
                );

                if (routingResult.destination === 'bot') {
                    const botResponse = {
                        IdConversa: data.IdConversa,
                        Remetente: "Bot",
                        Mensagem: routingResult.metadata?.mensagemSistema || "Olá! Como posso ajudar?",
                        DataEnvio: new Date(),
                        isBot: true
                    };

                    io.emit("nova-mensagem", botResponse);
                    
                } else if (routingResult.destination === 'atendente') {
                    io.emit("nova-mensagem", data);
                    
                    this.broadcastToColaboradores("transferencia-humano", {
                        id: data.IdConversa,
                        cliente: data.Remetente,
                        mensagem: data.Mensagem,
                        motivo: routingResult.metadata?.motivo,
                        contexto: routingResult.metadata?.contexto
                    }, io);
                }
            } else {
                io.emit("nova-mensagem", data);
            }

        } catch (error) {
            console.error("❌ Erro enviar-mensagem:", error);
            socket.emit('error', { erro: "Erro ao enviar mensagem" });
        }
    }

    async handleTransferirHumano(socket, data, io) {
        try {
            if (!data.id || typeof data.id !== "number") {
                return socket.emit('error', { erro: "Id inválido para transferência" });
            }

            this.broadcastToColaboradores("transferencia-humano", data, io);

        } catch (error) {
            console.error("❌ Erro transferir-humano:", error);
            socket.emit('error', { erro: "Erro na transferência para humano" });
        }
    }

    async handleColaboradorAssumiu(socket, data, io) {
        try {
            const { idConversa, idColaborador } = data;

            if (!idConversa || typeof idConversa !== "number") {
                return socket.emit('error', { erro: "IdConversa inválido" });
            }

            if (!idColaborador || typeof idColaborador !== "number") {
                return socket.emit('error', { erro: "IdColaborador inválido" });
            }

            io.emit("conversa-assumida", { idConversa, idColaborador });

            if (this.router && this.router.resetarContadores) {
                const userId = `user_${idConversa}`;
                this.router.resetarContadores(userId);
            }

        } catch (error) {
            console.error("❌ Erro colaborador-assumiu:", error);
            socket.emit('error', { erro: "Erro ao assumir conversa" });
        }
    }

    handleDisconnect(socket) {
        // Limpar conexões de cliente
        for (const [userId, socketId] of this.conexoesClientes.entries()) {
            if (socketId === socket.id) {
                this.conexoesClientes.delete(userId);
                console.log(`👋 Cliente ${userId} desconectado`);
            }
        }
        
        // Limpar conexões de atendente
        if (socket.atendenteId) {
            this.atendentesDisponiveis.delete(socket.atendenteId);
            this.conexoesAtendentes.delete(socket.atendenteId);
            console.log(`👋 Atendente ${socket.atendenteId} desconectado`);
        }
    }

    // === FUNÇÕES AUXILIARES ===
    notificarAtendentes(contexto, conversaId, io) {
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

        this.broadcastToColaboradores("transferencia-humano", notificacao.data, io);
    }

    broadcastToColaboradores(event, data, io) {
        this.atendentesDisponiveis.forEach(atendenteId => {
            const socketId = this.conexoesAtendentes.get(atendenteId);
            if (socketId) {
                io.to(socketId).emit(event, data);
            }
        });
    }
}




// Exportar uma instância
const webSocketManager = new WebSocketManager();

module.exports = {
    iniciarWebSocket: (servidor) => webSocketManager.iniciarWebSocket(servidor)
};