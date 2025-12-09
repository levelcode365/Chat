const sql = require('mssql');
const path = require('path');


require('dotenv').config({ 
    path: path.join(__dirname, '/home/levelcode/Chat/.env')
});

console.log('[DATABASE] Verificando configuração:');
console.log('  DB_HOST:', process.env.DB_HOST || 'NÃO DEFINIDO');
console.log('  DB_USER:', process.env.DB_USER || 'NÃO DEFINIDO');
console.log('  DB_NAME:', process.env.DB_NAME || 'NÃO DEFINIDO');

class DatabaseService {
    constructor() {
        this.pool = null;
        this.config = {
            server: process.env.DB_HOST,      
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            options: {
                encrypt: true,
                trustServerCertificate: true
            }
        };
        console.log('[DATABASE] Configurado para:', this.config.server);
    }

    async init() {
        try {
            if (!this.pool) {
                this.pool = await sql.connect(this.config);
                console.log('[DATABASE] Conectado ao SQL Server:', this.config.server);
            }
            return this.pool;
        } catch (err) {
            console.error('[DATABASE] Erro na conexão:', err.message);
            throw err;
        }
    }


    async getMensagensConversa(conversaId, limit = 10) {
        try {
            const result = await this.pool.request()
                .input('conversaId', sql.Int, conversaId)
                .input('limit', sql.Int, limit)
                .query(`
                    SELECT TOP (@limit) 
                        IdMensagem,
                        IdConversa,
                        Remetente,
                        Mensagem,
                        DataEnvio,
                        Lida
                    FROM Mensagens 
                    WHERE IdConversa = @conversaId 
                    ORDER BY DataEnvio DESC
                `);
            return result.recordset.reverse(); // Mais antigo primeiro
        } catch (err) {
            console.error('[DATABASE] Erro ao buscar mensagens:', err);
            return [];
        }
    }

    async getUserInfo(userId) {
        try {
            // Buscar por nome de usuário (Remetente)
            const result = await this.pool.request()
                .input('userName', sql.NVarChar(100), userId)
                .query(`
                    SELECT TOP 1 
                        c.IdCliente,
                        c.Nome,
                        c.Email,
                        c.Telefone,
                        c.Categoria,
                        CASE WHEN c.Categoria IN ('VIP', 'PREMIUM') THEN 1 ELSE 0 END as IsVip
                    FROM Clientes c
                    WHERE c.Nome LIKE '%' + @userName + '%'
                    OR c.Email LIKE '%' + @userName + '%'
                `);
            
            return result.recordset[0] || null;
        } catch (err) {
            console.error('[DATABASE] Erro ao buscar usuário:', err);
            return null;
        }
    }

    async saveRoutingLog(userId, destino, motivo, conversaId) {
        try {
            await this.pool.request()
                .input('userId', sql.NVarChar(100), userId)
                .input('destino', sql.NVarChar(20), destino)
                .input('motivo', sql.NVarChar(100), motivo)
                .input('conversaId', sql.Int, conversaId || null)
                .query(`
                    INSERT INTO LogRoteamento (UserId, Destino, Motivo, ConversaId, Timestamp)
                    VALUES (@userId, @destino, @motivo, @conversaId, GETDATE())
                `);
        } catch (err) {
            console.error('[DATABASE] Erro ao salvar log de roteamento:', err);
        }
    }

    // Outros métodos que você já pode ter
    async getConversaAtiva(userId) {
        try {
            const result = await this.pool.request()
                .input('userId', sql.NVarChar(100), userId)
                .query(`
                    SELECT TOP 1 IdConversa 
                    FROM Conversas 
                    WHERE ClienteNome LIKE '%' + @userId + '%'
                    AND Status IN ('ativa', 'aguardando')
                    ORDER BY DataCriacao DESC
                `);
            return result.recordset[0]?.IdConversa || null;
        } catch (err) {
            console.error('[DATABASE] Erro ao buscar conversa ativa:', err);
            return null;
        }
    }
}

module.exports = DatabaseService;