// bot.service.js - CÓDIGO COMPLETO OTIMIZADO
// APENAS UMA importação - verifique que não há duplicação

const { sql, config } = require('../config/banco');
const IntencoesService = require('./intencoes');
const RespostasService = require('./respostas');
const UserService = require('./user.service');
const MenuService = require('./menu.service');
const MessageService = require('./message.service');

class BotService {
    constructor() {
        this.intencoes = new IntencoesService();
        this.respostas = new RespostasService();
        
        // Novos serviços
        this.userService = new UserService();
        this.menuService = new MenuService();
        this.messageService = new MessageService();
        
        this.conversasAtivas = new Map();
        this.pool = null;
        this.initialized = false;
        
        // Estados do novo fluxo
        this.estados = {
            AGUARDANDO_NOME: 'AGUARDANDO_NOME',
            IDENTIFICANDO: 'IDENTIFICANDO',
            IDENTIFICADO: 'IDENTIFICADO',
            MENU_PRINCIPAL: 'MENU_PRINCIPAL',
            PROCESSANDO_OPCAO: 'PROCESSANDO_OPCAO',
            AGUARDANDO_DETALHES: 'AGUARDANDO_DETALHES',
            RESOLVENDO: 'RESOLVENDO',
            FINALIZADA: 'FINALIZADA',
            TIMEOUT: 'TIMEOUT'
        };
    }

    async initBanco() {
        if (!this.initialized) {
            try {
                this.pool = await sql.connect(config);
                this.initialized = true;
                console.log('🤖 Bot conectado ao SQL Server');
            } catch (error) {
                console.error('❌ Erro ao conectar bot:', error.message);
                throw error;
            }
        }
    }

    // ============ MÉTODOS OTIMIZADOS ============
    
    async buscarCliente(clienteId) {
        try {
            await this.initBanco();
            
            const idNum = parseInt(clienteId);
            if (isNaN(idNum)) {
                console.log(`⚠️ buscarCliente: ID inválido: ${clienteId}`);
                return null;
            }
            
            console.log(`🔍 Buscando cliente ID: ${idNum}`);
            
            // BUSCA DIRETA - sem filtro de Ativo
            const result = await this.pool.request()
                .input('clienteId', sql.Int, idNum)
                .query(`
                    SELECT TOP 1 
                        Id as id, 
                        Nome as nome, 
                        Email as email, 
                        Telefone as telefone,
                        Ativo as ativo
                    FROM Usuarios 
                    WHERE Id = @clienteId
                    -- Remover filtro temporariamente:
                    -- AND Ativo = 1
                `);
            
            if (result.recordset.length > 0) {
                const cliente = result.recordset[0];
                console.log(`✅ Cliente encontrado: ${cliente.nome} (ID: ${cliente.id}, Ativo: ${cliente.ativo})`);
                return cliente;
            } else {
                console.log(`❌ Cliente ID ${idNum} NÃO encontrado`);
                return null;
            }
            
        } catch (error) {
            console.error('❌ Erro buscarCliente:', error.message);
            return null;
        }
    }
    
    async criarConversaCm(conversaId, clienteId = null, clienteNome = null) {
        try {
            await this.initBanco();
            
            console.log(`📝 Criando conversa: ${conversaId}, clienteId: ${clienteId}, clienteNome: ${clienteNome}`);
            
            const request = this.pool.request()
                .input('id', sql.NVarChar, conversaId)
                .input('estado', sql.NVarChar, 'ATIVA')
                .input('is_bot', sql.Bit, 1);
            
            // Tratamento seguro do clienteId
            if (clienteId && !isNaN(parseInt(clienteId))) {
                request.input('cliente_id', sql.Int, parseInt(clienteId));
            } else {
                request.input('cliente_id', sql.Int, null);
            }
            
            if (clienteNome) {
                request.input('cliente_nome', sql.NVarChar, clienteNome);
            } else {
                request.input('cliente_nome', sql.NVarChar, null);
            }
            
            await request.query(`
                INSERT INTO cmConversas 
                (id, cliente_id, cliente_nome, estado, is_bot, data_inicio, data_ultima_mensagem)
                VALUES (@id, @cliente_id, @cliente_nome, @estado, @is_bot, GETDATE(), GETDATE())
            `);
                
            console.log(`✅ Conversa cm* criada: ${conversaId}`);
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao criar conversa:', error.message);
            return false;
        }
    }

    // ============ FLUXO PRINCIPAL ============

    async iniciarConversa(conversaId, clienteId = null, clienteNome = null) {
        try {
            // Criar conversa no banco
            await this.criarConversaCm(conversaId, clienteId, clienteNome);
            
            // Inicializar contexto
            const contexto = {
                estado: this.estados.AGUARDANDO_NOME,
                clienteId: clienteId,
                dadosCliente: null,
                tentativasBot: 0,
                inicioConversa: new Date(),
                ultimaMensagem: new Date(),
                transferenciaRequerida: false,
                novoFluxo: true,
                usuariosEncontrados: null,
                opcaoSelecionada: null,
                aguardandoDetalhes: false
            };
            
            // Se já tem clienteId, buscar dados
            if (clienteId && !isNaN(parseInt(clienteId))) {
                const dadosCliente = await this.buscarCliente(clienteId);
                if (dadosCliente) {
                    contexto.dadosCliente = dadosCliente;
                    contexto.estado = this.estados.MENU_PRINCIPAL;
                }
            }
            
            // Salvar contexto
            this.conversasAtivas.set(conversaId, contexto);
            
            // Gerar resposta inicial
            let resposta;
            if (contexto.dadosCliente) {
                resposta = this.respostas.menuPrincipal(contexto.dadosCliente.nome);
                contexto.estado = this.estados.MENU_PRINCIPAL;
            } else {
                resposta = this.respostas.pedindoNome();
                contexto.estado = this.estados.AGUARDANDO_NOME;
            }
            
            // Salvar mensagem inicial
            await this.salvarMensagemBanco(
                conversaId, 
                clienteId, 
                '[CONVERSA INICIADA]', 
                resposta, 
                'SAUDACAO_INICIAL'
            );
            
            return resposta;
            
        } catch (error) {
            console.error('❌ Erro iniciar conversa:', error.message);
            return "Olá! Bem-vindo ao LevelShop. Em que posso ajudar?";
        }
    }

    async processarMensagem(conversaId, mensagem, clienteId = null) {
        try {
            const contexto = this.conversasAtivas.get(conversaId);
            if (!contexto) {
                return "Sua conversa expirou. Por favor, inicie uma nova conversa.";
            }
            
            contexto.tentativasBot++;
            contexto.ultimaMensagem = new Date();
            
            let resposta;
            
            if (contexto.novoFluxo) {
                resposta = await this.processarMensagemNovoFluxo(conversaId, mensagem, contexto);
            } else {
                const intencao = this.intencoes.detectar(mensagem);
                resposta = this.respostas.obterResposta(intencao, contexto);
            }
            
            // Salvar no banco
            await this.salvarMensagemBanco(
                conversaId,
                clienteId,
                mensagem,
                resposta,
                contexto.novoFluxo ? 'NOVO_FLUXO' : this.intencoes.detectar(mensagem)
            );
            
            return resposta;
            
        } catch (error) {
            console.error('❌ Erro processar mensagem:', error.message);
            return "Desculpe, estou com problemas técnicos. Pode reformular?";
        }
    }

    async processarMensagemNovoFluxo(conversaId, mensagem, contexto) {
        mensagem = mensagem.trim();
        
        console.log(`🔍 Processando: "${mensagem}" no estado: ${contexto.estado}`);
        
        switch (contexto.estado) {
            case this.estados.AGUARDANDO_NOME:
                return await this.processarNome(conversaId, mensagem, contexto);
                
            case this.estados.IDENTIFICANDO:
                return await this.processarSelecaoUsuario(conversaId, mensagem, contexto);
                
            case this.estados.MENU_PRINCIPAL:
                const num = parseInt(mensagem);
                if (!isNaN(num) && num >= 1 && num <= 6) {
                    return await this.processarMenuPrincipal(conversaId, mensagem, contexto);
                } else {
                    return await this.processarMensagemForaDoMenu(conversaId, mensagem, contexto);
                }
                
            case this.estados.PROCESSANDO_OPCAO:
                return await this.processarOpcaoSelecionada(conversaId, mensagem, contexto);
                
            case this.estados.AGUARDANDO_DETALHES:
                return await this.processarDetalhes(conversaId, mensagem, contexto);
                
            default:
                contexto.estado = this.estados.MENU_PRINCIPAL;
                return this.respostas.menuPrincipal(contexto.dadosCliente?.nome || '');
        }
    }

    async processarNome(conversaId, nome, contexto) {
        console.log(`🤖 Processando nome: "${nome}"`);
        
        // Buscar usuários
        const usuarios = await this.userService.searchUsers(nome);
        
        if (usuarios.length === 0) {
            console.log(`⚠️ Nenhum usuário encontrado para "${nome}"`);
            contexto.dadosCliente = { nome: nome };
            contexto.estado = this.estados.MENU_PRINCIPAL;
            
            return this.respostas.menuPrincipal(nome);
            
        } else if (usuarios.length === 1) {
            console.log(`✅ Usuário encontrado: ${usuarios[0].Nome} (ID: ${usuarios[0].Id})`);
            contexto.dadosCliente = {
                id: usuarios[0].Id,
                nome: usuarios[0].Nome,
                email: usuarios[0].Email,
                ativo: usuarios[0].Ativo
            };
            contexto.estado = this.estados.MENU_PRINCIPAL;
            
            return this.respostas.menuPrincipal(usuarios[0].Nome);
            
        } else {
            console.log(`📋 Múltiplos usuários encontrados: ${usuarios.length}`);
            contexto.usuariosEncontrados = usuarios;
            contexto.estado = this.estados.IDENTIFICANDO;
            
            const listaFormatada = this.userService.formatUserList(usuarios);
            return this.respostas.multiplos_usuarios({ lista: listaFormatada });
        }
    }

    async processarSelecaoUsuario(conversaId, selecao, contexto) {
        const index = parseInt(selecao) - 1;
        
        if (isNaN(index) || index < 0 || index >= contexto.usuariosEncontrados.length) {
            return "❌ Seleção inválida. Digite o número correspondente ao seu nome:";
        }
        
        const usuario = contexto.usuariosEncontrados[index];
        contexto.dadosCliente = {
            id: usuario.Id,
            nome: usuario.Nome,
            email: usuario.Email,
            ativo: usuario.Ativo
        };
        contexto.usuariosEncontrados = null;
        contexto.estado = this.estados.MENU_PRINCIPAL;
        
        return this.respostas.menuPrincipal(usuario.Nome);
    }

    async processarMenuPrincipal(conversaId, opcao, contexto) {
        console.log(`📋 Processando opção: "${opcao}"`);
        
        const num = parseInt(opcao);
        if (isNaN(num) || num < 1 || num > 6) {
            return this.respostas.opcaoInvalida() + "\n\n" + 
                   this.respostas.menuPrincipal(contexto.dadosCliente?.nome || '');
        }
        
        contexto.opcaoSelecionada = num;
        
        switch (num) {
            case 1: // Problema técnico
                contexto.estado = this.estados.AGUARDANDO_DETALHES;
                contexto.aguardandoDetalhes = 'problema';
                return this.respostas.problemaTecnico(contexto.dadosCliente?.nome || '');
                
            case 2: // Status pedido
                contexto.estado = this.estados.AGUARDANDO_DETALHES;
                contexto.aguardandoDetalhes = 'pedido';
                return this.respostas.statusPedido(contexto.dadosCliente?.nome || '');
                
            case 3: // Dúvida produto
                contexto.estado = this.estados.AGUARDANDO_DETALHES;
                contexto.aguardandoDetalhes = 'produto';
                return this.respostas.duvidaProduto(contexto.dadosCliente?.nome || '');
                
            case 4: // Dados cadastrais
                return await this.processarOpcao4(conversaId, contexto);
                
            case 5: // Atendente humano
                contexto.estado = this.estados.FINALIZADA;
                contexto.transferenciaRequerida = true;
                return this.respostas.transferenciaAtendente(contexto.dadosCliente?.nome || '');
                
            case 6: // Outras questões
                contexto.estado = this.estados.AGUARDANDO_DETALHES;
                contexto.aguardandoDetalhes = 'outros';
                return this.respostas.outrasQuestoes(contexto.dadosCliente?.nome || '');
                
            default:
                return this.respostas.opcaoInvalida();
        }
    }

    async processarOpcao4(conversaId, contexto) {
        console.log(`👤 Processando dados cadastrais`);
        
        if (contexto.dadosCliente && contexto.dadosCliente.id) {
            console.log(`🔍 Buscando dados do ID: ${contexto.dadosCliente.id}`);
            
            const dadosCompletos = await this.buscarCliente(contexto.dadosCliente.id);
            
            if (dadosCompletos) {
                console.log(`✅ Dados encontrados para ${dadosCompletos.nome}`);
                contexto.dadosCliente = dadosCompletos;
                
                const resposta = this.respostas.dadosCadastrais(
                    contexto.dadosCliente, 
                    contexto.dadosCliente.nome || ''
                );
                
                contexto.estado = this.estados.MENU_PRINCIPAL;
                return resposta + "\n\n" + this.respostas.menuPrincipal(contexto.dadosCliente.nome);
            }
        }
        
        // Se não encontrou
        console.log(`❌ Dados não encontrados para o usuário`);
        const resposta = "Você não foi identificado no nosso sistema.\n" +
                       "Para acessar seus dados cadastrais, entre em contato com nosso suporte.";
        
        contexto.estado = this.estados.MENU_PRINCIPAL;
        return resposta + "\n\n" + this.respostas.menuPrincipal(contexto.dadosCliente?.nome || '');
    }

    async processarDetalhes(conversaId, detalhes, contexto) {
        console.log(`📝 Processando detalhes: "${detalhes}"`);
        
        let resposta;
        
        switch (contexto.opcaoSelecionada) {
            case 1: // Problema técnico
                resposta = this.respostas.analisandoSolicitacao() + "\n\n" +
                          this.respostas.resolucaoTecnica();
                break;
                
            case 2: // Status pedido
                resposta = this.respostas.informacaoPedido(detalhes);
                break;
                
            case 3: // Dúvida produto
                resposta = this.respostas.informacaoProduto();
                break;
                
            case 6: // Outras questões
                resposta = this.respostas.analisandoSolicitacao() + "\n\n" +
                          "Recebi sua solicitação. Em breve nossa equipe entrará em contato.";
                break;
                
            default:
                resposta = "Obrigado pelas informações!";
        }
        
        // Resetar estado
        contexto.estado = this.estados.MENU_PRINCIPAL;
        contexto.opcaoSelecionada = null;
        contexto.aguardandoDetalhes = false;
        
        return resposta + "\n\n" + this.respostas.menuPrincipal(contexto.dadosCliente?.nome || '');
    }

    async processarMensagemForaDoMenu(conversaId, mensagem, contexto) {
        if (mensagem.toLowerCase().includes('menu') || 
            mensagem.toLowerCase().includes('opções') ||
            mensagem.toLowerCase().includes('ajuda')) {
            return this.respostas.menuPrincipal(contexto.dadosCliente?.nome || '');
        }
        
        return `Não entendi. Você está no menu principal.\n\n` + 
               this.respostas.menuPrincipal(contexto.dadosCliente?.nome || '');
    }

    async processarOpcaoSelecionada(conversaId, input, contexto) {
        contexto.estado = this.estados.MENU_PRINCIPAL;
        contexto.opcaoSelecionada = null;
        
        return "Processamento concluído!\n\n" + 
               this.respostas.menuPrincipal(contexto.dadosCliente?.nome || '');
    }

    // ============ PERSISTÊNCIA ============

    async salvarMensagemBanco(conversaId, clienteId, mensagemCliente, respostaBot, intencao) {
        try {
            await this.initBanco();
            
            // Verificar se conversa existe
            const check = await this.pool.request()
                .input('id', sql.NVarChar, conversaId)
                .query('SELECT COUNT(*) as count FROM cmConversas WHERE id = @id');
            
            if (check.recordset[0].count === 0) {
                console.log(`⚠️ Conversa não existe, criando: ${conversaId}`);
                await this.criarConversaCm(conversaId, clienteId, null);
            }
            
            // Salvar mensagem do cliente
            await this.pool.request()
                .input('conversa_id', sql.NVarChar, conversaId)
                .input('remetente', sql.NVarChar, 'CLIENTE')
                .input('mensagem', sql.NVarChar, mensagemCliente)
                .input('is_bot', sql.Bit, 0)
                .input('intencao', sql.NVarChar, intencao)
                .query(`
                    INSERT INTO cmMensagens 
                    (conversa_id, remetente, mensagem, is_bot, intencao, data_hora)
                    VALUES (@conversa_id, @remetente, @mensagem, @is_bot, @intencao, GETDATE())
                `);

            // Salvar resposta do bot
            await this.pool.request()
                .input('conversa_id', sql.NVarChar, conversaId)
                .input('remetente', sql.NVarChar, 'BOT')
                .input('mensagem', sql.NVarChar, respostaBot)
                .input('is_bot', sql.Bit, 1)
                .input('intencao', sql.NVarChar, intencao)
                .query(`
                    INSERT INTO cmMensagens 
                    (conversa_id, remetente, mensagem, is_bot, intencao, data_hora)
                    VALUES (@conversa_id, @remetente, @mensagem, @is_bot, @intencao, GETDATE())
                `);

            // Atualizar data
            await this.pool.request()
                .input('id', sql.NVarChar, conversaId)
                .query(`
                    UPDATE cmConversas 
                    SET data_ultima_mensagem = GETDATE()
                    WHERE id = @id
                `);
            
            console.log(`✅ Mensagens salvas para: ${conversaId}`);
            
        } catch (error) {
            console.error('❌ Erro salvar mensagem:', error.message);
        }
    }

    // ============ MÉTODOS AUXILIARES ============
    
    getContextoConversa(conversaId) {
        return this.conversasAtivas.get(conversaId);
    }

    async encerrarConversa(conversaId, resolvido = false) {
        try {
            this.conversasAtivas.delete(conversaId);
            return resolvido 
                ? "Obrigado por usar nosso chat! Até a próxima! 😊"
                : "Sentimos muito por não conseguir resolver. Um atendente entrará em contato.";
        } catch (error) {
            console.error('❌ Erro ao encerrar conversa:', error.message);
            return "Conversa encerrada.";
        }
    }

    setNovoFluxo(conversaId, ativar = true) {
        const contexto = this.conversasAtivas.get(conversaId);
        if (contexto) {
            contexto.novoFluxo = ativar;
            if (ativar && !contexto.estado) {
                contexto.estado = this.estados.AGUARDANDO_NOME;
            }
            return true;
        }
        return false;
    }

    isNovoFluxo(conversaId) {
        const contexto = this.conversasAtivas.get(conversaId);
        return contexto?.novoFluxo === true;
    }

    resetarConversa(conversaId) {
        const contexto = this.conversasAtivas.get(conversaId);
        if (contexto) {
            contexto.estado = this.estados.AGUARDANDO_NOME;
            contexto.opcaoSelecionada = null;
            contexto.aguardandoDetalhes = false;
            contexto.usuariosEncontrados = null;
            return true;
        }
        return false;
    }

    verificarTimeout(conversaId) {
        const contexto = this.conversasAtivas.get(conversaId);
        if (!contexto) return false;
        
        const agora = new Date();
        const diffMinutos = (agora - contexto.ultimaMensagem) / (1000 * 60);
        
        return diffMinutos > 30;
    }

    async finalizarPorTimeout(conversaId) {
        const contexto = this.conversasAtivas.get(conversaId);
        if (!contexto) return null;
        
        contexto.estado = this.estados.TIMEOUT;
        
        try {
            await this.initBanco();
            
            await this.pool.request()
                .input('id', sql.NVarChar, conversaId)
                .input('estado', sql.NVarChar, 'FINALIZADA')
                .input('motivo_fim', sql.NVarChar, 'TIMEOUT_INATIVIDADE')
                .input('data_fim', sql.DateTime, new Date())
                .query(`
                    UPDATE cmConversas 
                    SET estado = @estado, 
                        motivo_fim = @motivo_fim,
                        data_fim = @data_fim
                    WHERE id = @id
                `);
                
            console.log(`⏰ Conversa ${conversaId} finalizada por timeout`);
            
        } catch (error) {
            console.error('❌ Erro finalizar timeout:', error.message);
        }
        
        return this.respostas.timeoutFinalizado();
    }
}

module.exports = BotService;