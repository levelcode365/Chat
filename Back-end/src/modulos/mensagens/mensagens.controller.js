const express = require('express');
const MessageRouter = require('../../services/router.service');
const router = express.Router();

const messageRouter = new MessageRouter();

// Rota principal para mensagens
router.post('/processar', async (req, res) => {
    try {
        const { userId, message, sessionData } = req.body;
        
        if (!userId || !message) {
            return res.status(400).json({
                error: 'userId e message são obrigatórios'
            });
        }

        // Usar router para decidir destino
        const resultado = await messageRouter.decidirDestino(message, userId, sessionData);
        
        res.json({
            success: true,
            destination: resultado.destination,
            metadata: resultado.metadata,
            timestamp: new Date(),
            messageId: `msg_${Date.now()}_${userId}`
        });
    } catch (error) {
        console.error('[API] Erro ao processar mensagem:', error);
        res.status(500).json({
            error: 'Erro interno ao processar mensagem',
            details: error.message
        });
    }
});

// Rota para obter status do roteamento
router.get('/status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Verificar se está na fila de atendentes
        const estaNaFila = messageRouter.userStates.get(userId) === 'AGUARDANDO_ATENDENTE';
        const tentativas = messageRouter.contadorTentativas.get(userId)?.tentativas || 0;
        
        res.json({
            userId,
            status: estaNaFila ? 'aguardando_atendente' : 'com_bot',
            tentativasBot: tentativas,
            horarioFuncionamento: messageRouter.verificarHorarioFuncionamento(),
            timestamp: new Date()
        });
    } catch (error) {
        console.error('[API] Erro ao obter status:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// Rota para estatísticas do sistema
router.get('/estatisticas', async (req, res) => {
    try {
        const estatisticas = messageRouter.getEstatisticas();
        
        res.json({
            success: true,
            estatisticas,
            horarioFuncionamento: messageRouter.verificarHorarioFuncionamento(),
            timestamp: new Date()
        });
    } catch (error) {
        console.error('[API] Erro ao obter estatísticas:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

module.exports = router;