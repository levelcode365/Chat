// src/config/banco.js
require('dotenv').config({ path: '/home/levelcode/Chat/.env' });
const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST, 
    database: process.env.DB_NAME,  
    port: Number(process.env.DB_PORT) || 1433,
    options: {
        encrypt: true,  
        trustServerCertificate: true
    }
};

console.log('✅ Banco configurado para:', config.server);

// Testar conexão imediatamente
async function testarConexao() {
    try {
        const pool = await sql.connect(config);
        console.log('✅ Conexão com banco OK');
        return pool;
    } catch (err) {
        console.error('❌ Erro conexão banco:', err.message);
        return null;
    }
}

// Exportar config E sql para outros arquivos usarem
module.exports = {
    config,
    sql,
    testarConexao
};