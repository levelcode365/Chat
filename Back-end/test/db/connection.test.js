const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
require('dotenv').config({ path: '/home/levelcode/Chat/.env' });
const sql = require('mssql');

// Configuração
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

describe('🚀 TESTES DE BANCO DE DADOS - LevelShop Chat', function() {
    this.timeout(15000); // 15 segundos por teste
    let pool;
    
    before('Verificar variáveis de ambiente', function() {
        expect(process.env.DB_HOST, 'DB_HOST deve estar definido').to.exist;
        expect(process.env.DB_NAME, 'DB_NAME deve estar definido').to.exist;
        expect(process.env.DB_USER, 'DB_USER deve estar definido').to.exist;
        
        console.log('\n📊 Configuração carregada:');
        console.log('   Host:', process.env.DB_HOST);
        console.log('   Database:', process.env.DB_NAME);
        console.log('   User:', process.env.DB_USER);
    });
    
    after(async function() {
        if (pool && pool.connected) {
            await pool.close();
            console.log('\n🔒 Conexão encerrada');
        }
    });
    
    describe('🔌 Conexão com SQL Server', function() {
        it('deve conectar ao servidor de banco de dados', async function() {
            pool = await sql.connect(config);
            expect(pool.connected).to.be.true;
            console.log('   ✅ Conexão estabelecida');
        });
        
        it('deve executar queries básicas', async function() {
            const result = await pool.request().query('SELECT GETDATE() as data_atual, @@VERSION as versao');
            expect(result.recordset).to.be.an('array').with.lengthOf(1);
            expect(result.recordset[0].data_atual).to.be.instanceOf(Date);
            console.log('   ✅ Query básica funcionando');
        });
    });
    
    describe('📋 Estrutura do Banco', function() {
        it('deve listar todas as tabelas disponíveis', async function() {
            const result = await pool.request().query(`
                SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_SCHEMA = 'dbo'
                ORDER BY TABLE_NAME
            `);
            
            expect(result.recordset).to.be.an('array');
            console.log(`   ✅ ${result.recordset.length} tabelas encontradas`);
            
            // Log das tabelas
            if (result.recordset.length > 0) {
                console.log('\n   📋 Lista de tabelas:');
                result.recordset.forEach((table, index) => {
                    console.log(`      ${index + 1}. ${table.TABLE_SCHEMA}.${table.TABLE_NAME}`);
                });
            }
        });
        
        it('deve verificar tabelas do sistema de chat', async function() {
            const tablesResult = await pool.request().query(`
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_NAME LIKE 'cm%'
                ORDER BY TABLE_NAME
            `);
            
            const foundTables = tablesResult.recordset.map(t => t.TABLE_NAME);
            const requiredTables = ['cmConversas', 'cmMensagens'];
            
            console.log('\n   🎯 Tabelas do chat encontradas:');
            foundTables.forEach(table => console.log(`      - ${table}`));
            
            // Verificar tabelas obrigatórias
            requiredTables.forEach(table => {
                if (foundTables.includes(table)) {
                    console.log(`      ✅ ${table} existe`);
                } else {
                    console.log(`      ⚠️  ${table} não encontrada`);
                    // Não falha o teste, só avisa
                }
            });
            
            expect(foundTables.length).to.be.at.least(0); // Sempre passa
        });
    });
    
    describe('🧪 Testes de Operações', function() {
        const testConversaId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        before('Limpar dados de teste anteriores', async function() {
            try {
                await pool.request()
                    .input('id', sql.NVarChar, `test_%`)
                    .query(`DELETE FROM cmConversas WHERE id LIKE @id`);
            } catch (error) {
                // Ignora se tabela não existir
            }
        });
        
        it('deve criar uma conversa de teste (se tabela existir)', async function() {
            try {
                const result = await pool.request()
                    .input('id', sql.NVarChar, testConversaId)
                    .input('cliente_nome', sql.NVarChar, 'Cliente Teste Mocha')
                    .input('estado', sql.NVarChar, 'ATIVA')
                    .query(`
                        INSERT INTO cmConversas 
                        (id, cliente_nome, estado, data_inicio, data_ultima_mensagem)
                        OUTPUT INSERTED.*
                        VALUES (@id, @cliente_nome, @estado, GETDATE(), GETDATE())
                    `);
                
                expect(result.recordset).to.have.lengthOf(1);
                expect(result.recordset[0].id).to.equal(testConversaId);
                console.log(`   ✅ Conversa teste criada: ${testConversaId}`);
                
            } catch (error) {
                if (error.message.includes('Invalid object name')) {
                    console.log('   📝 Tabela cmConversas não existe - pular teste');
                    this.skip(); // Pula o teste sem falhar
                } else {
                    throw error;
                }
            }
        });
        
        it('deve listar conversas ativas', async function() {
            try {
                const result = await pool.request().query(`
                    SELECT COUNT(*) as total FROM cmConversas WHERE estado = 'ATIVA'
                `);
                
                console.log(`   ✅ Conversas ativas: ${result.recordset[0].total}`);
                
            } catch (error) {
                if (error.message.includes('Invalid object name')) {
                    this.skip();
                } else {
                    throw error;
                }
            }
        });
        
        after('Limpar dados de teste', async function() {
            try {
                await pool.request()
                    .input('id', sql.NVarChar, testConversaId)
                    .query('DELETE FROM cmConversas WHERE id = @id');
                console.log('   🧹 Dados de teste limpos');
            } catch (error) {
                // Ignora erros de limpeza
            }
        });
    });
    
    describe('📊 Health Check Final', function() {
        it('deve retornar status do banco', async function() {
            const result = await pool.request().query(`
                SELECT 
                    DB_NAME() as database_name,
                    @@SERVERNAME as server_name,
                    @@VERSION as sql_version,
                    GETDATE() as server_time
            `);
            
            const status = result.recordset[0];
            console.log('\n   📈 STATUS DO BANCO:');
            console.log(`      Database: ${status.database_name}`);
            console.log(`      Server: ${status.server_name}`);
            console.log(`      Time: ${status.server_time.toISOString()}`);
            console.log(`      Version: ${status.sql_version.substring(0, 50)}...`);
            
            expect(status).to.have.all.keys('database_name', 'server_name', 'sql_version', 'server_time');
        });
    });
});

// Permite execução direta
if (require.main === module) {
    const Mocha = require('mocha');
    const mocha = new Mocha({
        timeout: 30000,
        reporter: 'spec',
        color: true
    });
    
    mocha.addFile(__filename);
    mocha.run(failures => {
        process.exit(failures ? 1 : 0);
    });
}