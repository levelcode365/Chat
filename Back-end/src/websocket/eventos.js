const { registrarMensagem } = require("../modulos/mensagens/registrarMensagem");
const { atualizarStatusConversa } = require("../modulos/conversas/atualizarStatus");


function sanitizeString(str) {
    if (typeof str !== "string") return "";
    return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

module.exports = (socket, wss) => {

    socket.on("enviar-mensagem", async (data) => {
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

            const saved = await registrarMensagem(data);
            wss.broadcast("nova-mensagem", saved);

        } catch (error) {
            console.error("Erro enviar-mensagem:", error);
            socket.send(JSON.stringify({ erro: "Erro ao enviar mensagem" }));
        }
    });

    socket.on("transferir-humano", async (data) => {
        try {
            if (!data.id || typeof data.id !== "number") {
                return socket.send(JSON.stringify({ erro: "Id inválido para transferência" }));
            }

            await atualizarStatusConversa(data.id, "aguardando");
            wss.broadcastToColaboradores("transferencia-humano", data);

        } catch (error) {
            console.error("Erro transferir-humano:", error);
            socket.send(JSON.stringify({ erro: "Erro na transferência para humano" }));
        }
    });

    socket.on("colaborador-assumiu", async (data) => {
        try {
            const { idConversa, idColaborador } = data;

            if (!idConversa || typeof idConversa !== "number") {
                return socket.send(JSON.stringify({ erro: "IdConversa inválido" }));
            }

            if (!idColaborador || typeof idColaborador !== "number") {
                return socket.send(JSON.stringify({ erro: "IdColaborador inválido" }));
            }

            await atualizarStatusConversa(idConversa, "humano");
            wss.broadcast("conversa-assumida", { idConversa, idColaborador });

        } catch (error) {
            console.error("Erro colaborador-assumiu:", error);
            socket.send(JSON.stringify({ erro: "Erro ao assumir conversa" }));
        }
    });

};
