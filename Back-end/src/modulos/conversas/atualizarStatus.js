const { connectDB, sql } = require('../../config/banco.js');

async function atualizarStatus(req, res) {
    try {
        const { id } = req.params;
        const { status, atendidoPorHumano } = req.body;

        const pool = await connectDB();

        await pool.request()
            .input('IdConversa', sql.Int, id)
            .input('Status', sql.VarChar, status)
            .input('Humano', sql.Bit, atendidoPorHumano ?? 0)
            .query(`
                UPDATE cmConversas
                SET Status = @Status,
                    AtendidoPorHumano = @Humano
                WHERE IdConversa = @IdConversa
            `);

        return res.json({ sucesso: true });

    } catch (err) {
        console.error("Erro ao atualizar status da conversa:", err);
        return res.status(500).json({ erro: "Erro ao atualizar status" });
    }
}

module.exports = atualizarStatus;
