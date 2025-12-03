const { connectDB, sql } = require('../../config/banco.js');

async function listarConversas(req, res) {
    try {
        const { idUsuario } = req.params;

        const pool = await connectDB();

        const result = await pool.request()
            .input('IdUsuario', sql.Int, idUsuario)
            .query(`
                SELECT *
                FROM cmConversas
                WHERE IdUsuario = @IdUsuario
                ORDER BY DataInicio DESC
            `);

        return res.json(result.recordset);

    } catch (err) {
        console.error("Erro ao listar conversas:", err);
        return res.status(500).json({ erro: "Erro ao listar conversas" });
    }
}

module.exports = listarConversas;
