const { connectDB, sql } = require('../../config/banco.js');

// Função para excluir mensagem
async function excluirMensagem(req, res) {
    try {
        const { id } = req.params;

        const pool = await connectDB();

        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                DELETE FROM CaixaMensagens 
                WHERE idMensagens = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "Mensagem não encontrada" });
        }

        return res.json({ message: "Mensagem excluída com sucesso" });

    } catch (err) {
        console.error("Erro ao excluir mensagem:", err);
        res.status(500).json({ error: "Erro ao excluir mensagem" });
    }
}

module.exports = excluirMensagem ;
