const { connectDB, sql } = require('../../config/banco.js');

async function criarConversa(req, res) {
    try {
        const { IdUsuario } = req.body;

        const pool = await connectDB();

        const result = await pool.request()
            .input('IdUsuario', sql.Int, IdUsuario)
            .query(`
                INSERT INTO cmConversas (IdUsuario)
                VALUES (@IdUsuario);

                SELECT SCOPE_IDENTITY() AS IdConversa;
            `);

        return res.status(201).json({
            sucesso: true,
            IdConversa: result.recordset[0].IdConversa
        });

    } catch (err) {
        console.error("Erro ao criar conversa:", err);
        return res.status(500).json({ erro: "Erro ao criar conversa" });
    }
}

module.exports = criarConversa;
