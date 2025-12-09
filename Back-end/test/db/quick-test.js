// test/db/quick-test.js - Teste RÁPIDO sem dependências
require('dotenv').config({ path: '/home/levelcode/Chat/.env' });
const sql = require('mssql');

async function quickTest() {
    console.log('⚡ TESTE RÁPIDO DE CONEXÃO\n');
    
    const config = {
        server: process.env.DB_HOST,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT) || 1433,
        options: {
            encrypt: true,
            trustServerCertificate: true
        }
    };
    
    try {
        console.log('1. 📡 Conectando...');
        const pool = await sql.connect(config);
        console.log('   ✅ CONECTADO!');
        
        console.log('2. 🧪 Executando query teste...');
        const result = await pool.request().query('SELECT 1 + 1 as resultado');
        console.log('   ✅ Resultado:', result.recordset[0].resultado);
        
        console.log('3. 📊 Verificando tabelas...');
        const tables = await pool.request().query(`
            SELECT COUNT(*) as total 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME LIKE 'cm%'
        `);
        console.log('   ✅ Tabelas cm*:', tables.recordset[0].total);
        
        await pool.close();
        console.log('\n🎉 TODOS TESTES PASSARAM!');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ ERRO:', error.message);
        
        // Diagnóstico
        console.log('\n🔍 DIAGNÓSTICO:');
        console.log('   Host:', config.server);
        console.log('   Database:', config.database);
        console.log('   User:', config.user);
        console.log('   Port:', config.port);
        
        if (error.code === 'ELOGIN') {
            console.log('\n💡 DICA: Problema de login - verifique usuário/senha');
        } else if (error.code === 'ETIMEOUT') {
            console.log('\n💡 DICA: Timeout - verifique firewall/porta', config.port);
        } else if (error.message.includes('ENOTFOUND')) {
            console.log('\n💡 DICA: Host não encontrado - verifique DB_HOST');
        }
        
        process.exit(1);
    }
}

quickTest();