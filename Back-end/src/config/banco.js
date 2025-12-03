    require('dotenv').config();
    const sql = require('mssql');

    const config = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER,
        database: process.env.DB_DATABASE,
        port: Number(process.env.DB_PORT) || 1433,
        options: {
            encrypt: false,
            trustServerCertificate: true
        }
    };

    async function connectDB() {
        try {
            const pool = await sql.connect(config);
            console.log('Conectado ao SQL Server!');
            return pool;
        } catch (err) {
            console.error('Erro ao conectar:', err);
        }
    }

    async function criarConversa(idUsuario) {
        const pool = await connectDB();

        const result = await pool.request()
            .input('IdUsuario', sql.Int, idUsuario)
            .query(`
                INSERT INTO cmConversas (IdUsuario)
                OUTPUT INSERTED.*
                VALUES (@IdUsuario)
            `);

        return result.recordset[0];
    }

    //Salva uma mensagem na tabela cmMensagens.
    async function registrarMensagem(idConversa, remetente, mensagem) {
        const pool = await connectDB();

        const result = await pool.request()
            .input('IdConversa', sql.Int, idConversa)
            .input('Remetente', sql.VarChar, remetente)
            .input('Mensagem', sql.VarChar(sql.MAX), mensagem)
            .query(`
                INSERT INTO cmMensagens (IdConversa, Remetente, Mensagem)
                OUTPUT INSERTED.*
                VALUES (@IdConversa, @Remetente, @Mensagem)
            `);

        return result.recordset[0];
    }


    async function atualizarStatusConversa(idConversa, status) {
        const pool = await connectDB();

        await pool.request()
            .input('IdConversa', sql.Int, idConversa)
            .input('Status', sql.VarChar, status)
            .query(`
                UPDATE cmConversas
                SET Status = @Status
                WHERE IdConversa = @IdConversa
            `);

        return true;
    }

    //Retorna todas as mensagens daquela conversa.
    async function listarMensagensPorConversa(idConversa) {
        const pool = await connectDB();

        const result = await pool.request()
            .input('IdConversa', sql.Int, idConversa)
            .query(`
                SELECT *
                FROM cmMensagens
                WHERE IdConversa = @IdConversa
                ORDER BY DataEnvio ASC
            `);

        return result.recordset;
    }

    module.exports = {
        connectDB,
        criarConversa,
        registrarMensagem,
        atualizarStatusConversa,
        listarMensagensPorConversa,
        sql
    };
