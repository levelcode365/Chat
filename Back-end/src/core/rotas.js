// src/core/rotas.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { sql, config: dbConfig } = require('../config/banco'); // ← IMPORT CORRETO!

// Importações existentes
const criarConversa = require('../modulos/conversas/criarConversa');
const atualizarStatus = require('../modulos/conversas/atualizarStatus');
const encerrarConversa = require('../modulos/conversas/encerrarConversa');
const listarConversas = require('../modulos/conversas/listarConversas');
const { registrarMensagem } = require('../modulos/mensagens/registrarMensagem');
const deleteMensagem = require('../modulos/mensagens/deleteMensagem');

// Importações para as novas rotas de chat
const BotService = require('../bot/bot.service');
const botService = new BotService();

// ============ ROTAS LEGACY (sem /api no início) ============

// Criar conversa (sistema antigo) → /api/conversas
router.post('/conversas', criarConversa);

// Atualizar status (sistema antigo) → /api/conversas/:id/status
router.put('/conversas/:id/status', atualizarStatus);

// Encerrar conversa (sistema antigo) → /api/conversas/:id/encerrar
router.put('/conversas/:id/encerrar', encerrarConversa);

// Listar conversas por usuário (sistema antigo) → /api/conversas/usuario/:idUsuario
router.get('/conversas/usuario/:idUsuario', listarConversas);

// Registrar nova mensagem (sistema antigo) → /api/mensagens  
router.post('/mensagens', async (req, res) => {
    try {
        const { IdConversa, Remetente, Mensagem } = req.body;

        if (!IdConversa || !Remetente || !Mensagem) {
            return res.status(400).json({
                erro: "Campos obrigatórios: IdConversa, Remetente, Mensagem"
            });
        }

        const payload = await registrarMensagem({ IdConversa, Remetente, Mensagem });

        return res.status(201).json(payload);

    } catch (erro) {
        console.error("Erro POST /mensagens:", erro);
        res.status(500).json({ erro: "Erro ao registrar mensagem" });
    }
});

// Excluir mensagem (sistema antigo) → /api/mensagens/:id
router.delete('/mensagens/:id', deleteMensagem);

// ============ NOVAS ROTAS CHAT (sem /api no início) ============

// Health check da API → /api/health (os testes esperam isso)
router.get('/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'LevelShop Chat API',
        timestamp: new Date().toISOString(),
        endpoints: {
            chat: '/api/chat/*',
            conversations: '/api/conversas/*',
            messages: '/api/mensagens/*'
        }
    });
});

// ============ ROTAS DO CHAT (prefix /chat) ============
const chatRouter = express.Router();

// INICIAR CONVERSA → /api/chat/start
chatRouter.post('/start', async (req, res) => {
    try {
        const { clienteId, clienteNome, sessionId } = req.body;
        
        if (!clienteNome) {
            return res.status(400).json({
                success: false,
                error: 'clienteNome é obrigatório'
            });
        }
        
        const conversaId = `conv_${uuidv4()}`;
        
        // Iniciar conversa com bot
        const mensagemInicial = await botService.iniciarConversa(
            conversaId, 
            clienteId, 
            clienteNome
        );
        
        return res.status(201).json({
            success: true,
            conversaId,
            mensagemInicial,
            timestamp: new Date(),
            sessionId: sessionId || null
        });
        
    } catch (error) {
        console.error('Erro ao iniciar chat:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao iniciar conversa'
        });
    }
});

// ENVIAR MENSAGEM VIA HTTP → /api/chat/message
chatRouter.post('/message', async (req, res) => {
    try {
        const { conversaId, mensagem, clienteId } = req.body;
        
        if (!conversaId || !mensagem) {
            return res.status(400).json({
                error: 'conversaId e mensagem são obrigatórios'
            });
        }
        
        const respostaBot = await botService.processarMensagem(
            conversaId,
            mensagem,
            clienteId
        );
        
        return res.status(200).json({
            success: true,
            respostaBot,
            conversaId,
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao processar mensagem'
        });
    }
});

// HISTÓRICO DA CONVERSA → /api/chat/:conversaId/history
chatRouter.get('/:conversaId/history', async (req, res) => {
    try {
        const { conversaId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        
        const pool = await sql.connect(dbConfig); // ← CORREÇÃO!
        
        const result = await pool.request()
            .input('conversa_id', sql.NVarChar, conversaId)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT TOP (@limit) 
                    id,
                    conversa_id,
                    remetente,
                    mensagem,
                    is_bot,
                    intencao,
                    FORMAT(data_hora, 'dd/MM/yyyy HH:mm:ss') as data_hora_formatada,
                    data_hora
                FROM cmMensagens 
                WHERE conversa_id = @conversa_id 
                ORDER BY data_hora ASC
            `);
        
        return res.status(200).json({
            success: true,
            conversaId,
            mensagens: result.recordset,
            total: result.recordset.length,
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar histórico'
        });
    }
});

// STATUS DA CONVERSA → /api/chat/:conversaId/status
chatRouter.get('/:conversaId/status', async (req, res) => {
    try {
        const { conversaId } = req.params;
        
        const pool = await sql.connect(dbConfig); // ← CORREÇÃO!
        
        const result = await pool.request()
            .input('id', sql.NVarChar, conversaId)
            .query(`
                SELECT 
                    id,
                    cliente_id,
                    cliente_nome,
                    estado,
                    atendente_id,
                    atendente_nome,
                    is_bot,
                    FORMAT(data_inicio, 'dd/MM/yyyy HH:mm:ss') as data_inicio_formatada,
                    FORMAT(data_ultima_mensagem, 'dd/MM/yyyy HH:mm:ss') as data_ultima_mensagem_formatada,
                    data_inicio,
                    data_ultima_mensagem,
                    DATEDIFF(MINUTE, data_inicio, GETDATE()) as duracao_minutos
                FROM cmConversas 
                WHERE id = @id
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Conversa não encontrada'
            });
        }
        
        return res.status(200).json({
            success: true,
            conversa: result.recordset[0],
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('Erro ao buscar status:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar status'
        });
    }
});

// ENCERRAR CONVERSA → /api/chat/:conversaId/end
chatRouter.post('/:conversaId/end', async (req, res) => {
    try {
        const { conversaId } = req.params;
        const { resolvido, motivo } = req.body;
        
        const pool = await sql.connect(dbConfig); // ← CORREÇÃO!
        
        // Atualizar estado
        await pool.request()
            .input('id', sql.NVarChar, conversaId)
            .input('estado', sql.NVarChar, 'FINALIZADA')
            .input('data_fim', sql.DateTime, new Date())
            .query(`
                UPDATE cmConversas 
                SET estado = @estado, data_fim = @data_fim
                WHERE id = @id
            `);
        
        // Se tiver bot service ativo, encerrar conversa em memória
        const contexto = botService.getContextoConversa(conversaId);
        if (contexto) {
            const mensagemEncerramento = await botService.encerrarConversa(
                conversaId, 
                resolvido
            );
            
            // Salvar mensagem de encerramento
            await pool.request()
                .input('conversa_id', sql.NVarChar, conversaId)
                .input('remetente', sql.NVarChar, 'BOT')
                .input('mensagem', sql.NVarChar, mensagemEncerramento)
                .input('is_bot', sql.Bit, 1)
                .input('intencao', sql.NVarChar, 'ENCERRAMENTO')
                .query(`
                    INSERT INTO cmMensagens 
                    (conversa_id, remetente, mensagem, is_bot, intencao, data_hora)
                    VALUES (@conversa_id, @remetente, @mensagem, @is_bot, @intencao, GETDATE())
                `);
        }
        
        return res.status(200).json({
            success: true,
            message: 'Conversa encerrada',
            conversaId,
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('Erro ao encerrar conversa:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao encerrar conversa'
        });
    }
});

// LISTAR CONVERSAS ATIVAS → /api/chat/conversas/ativas
chatRouter.get('/conversas/ativas', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig); // ← CORREÇÃO!
        
        const result = await pool.request()
            .query(`
                SELECT 
                    id,
                    cliente_id,
                    cliente_nome,
                    estado,
                    atendente_id,
                    atendente_nome,
                    is_bot,
                    FORMAT(data_inicio, 'dd/MM/yyyy HH:mm:ss') as data_inicio_formatada,
                    FORMAT(data_ultima_mensagem, 'dd/MM/yyyy HH:mm:ss') as data_ultima_mensagem_formatada,
                    data_inicio,
                    data_ultima_mensagem,
                    DATEDIFF(MINUTE, data_ultima_mensagem, GETDATE()) as minutos_inatividade
                FROM cmConversas 
                WHERE estado IN ('ATIVA', 'AGUARDANDO_ATENDENTE', 'COM_ATENDENTE')
                ORDER BY data_ultima_mensagem DESC
            `);
        
        return res.status(200).json({
            success: true,
            conversas: result.recordset,
            total: result.recordset.length,
            timestamp: new Date()
        });
        
    } catch (error) {
        console.error('Erro ao listar conversas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao listar conversas'
        });
    }
});

// Montar router de chat no caminho /chat (vira /api/chat no servidor)
router.use('/chat', chatRouter);

// ============ ROTA DE FALLBACK PARA /api/* ============
router.use('*', (req, res) => {
    res.status(404).json({
        error: 'Rota da API não encontrada',
        path: req.originalUrl,
        method: req.method,
        availableRoutes: {
            health: 'GET /api/health',
            chat: {
                start: 'POST /api/chat/start',
                message: 'POST /api/chat/message',
                history: 'GET /api/chat/:id/history',
                status: 'GET /api/chat/:id/status',
                end: 'POST /api/chat/:id/end',
                active: 'GET /api/chat/conversas/ativas'
            },
            legacy: {
                conversations: 'POST /api/conversas',
                updateStatus: 'PUT /api/conversas/:id/status',
                messages: 'POST /api/mensagens'
            }
        }
    });
});

module.exports = router;