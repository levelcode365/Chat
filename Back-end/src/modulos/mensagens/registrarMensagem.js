const sql = require('mssql');
const { connectDB } = require('../../config/banco');

async function registrarMensagem({ IdConversa, Remetente, Mensagem }) {
    try {
        const pool = await connectDB();

        const result = await pool.request()
            .input("IdConversa", sql.Int, IdConversa)
            .input("Remetente", sql.VarChar(20), Remetente)
            .input("Mensagem", sql.VarChar(sql.MAX), Mensagem)
            .query(`
                INSERT INTO cmMensagens (IdConversa, Remetente, Mensagem)
                OUTPUT INSERTED.*
                VALUES (@IdConversa, @Remetente, @Mensagem)
            `);

        return result.recordset[0]; // retorna a mensagem inserida

    } catch (error) {
        console.error("Erro ao registrar mensagem:", error);
        throw error;
    }
}

module.exports = { registrarMensagem };
