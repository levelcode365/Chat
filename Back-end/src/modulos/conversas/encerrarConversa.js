const { connectDB, sql } = require('../../config/banco.js');

async function encerrarConversa(req, res) {
    try {
        const { id } = req.params;

        const pool = await connectDB();

        await pool.request()
            .input('IdConversa', sql.Int, id)
            .query(`
                UPDATE cmConversas
                SET Status = 'encerrada',
                    DataFim = GETDATE()
                WHERE IdConversa = @IdConversa
            `);

        return res.json({ sucesso: true });

    } catch (err) {
        console.error("Erro ao encerrar conversa:", err);
        return res.status(500).json({ erro: "Erro ao encerrar conversa" });
    }
}

module.exports = encerrarConversa;
