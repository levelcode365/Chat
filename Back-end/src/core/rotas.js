const express = require('express');
const router = express.Router();

// Conversas
const criarConversa = require('../modulos/conversas/criarConversa');
const atualizarStatus = require('../modulos/conversas/atualizarStatus');
const encerrarConversa = require('../modulos/conversas/encerrarConversa');
const listarConversas = require('../modulos/conversas/listarConversas');

// Mensagens — módulo correto
const { registrarMensagem } = require('../modulos/mensagens/registrarMensagem');

// Criar conversa
router.post('/conversas', criarConversa);

// Atualizar status
router.put('/conversas/:id/status', atualizarStatus);

// Encerrar conversa
router.put('/conversas/:id/encerrar', encerrarConversa);

// Listar conversas por usuário
router.get('/conversas/usuario/:idUsuario', listarConversas);

// Registrar nova mensagem  
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

// Excluir mensagem  
const deleteMensagem = require('../modulos/mensagens/deleteMensagem');
router.delete('/mensagens/:id', deleteMensagem);

module.exports = router;
