// test/api/chat-api.test.js
const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
const request = require('supertest');
const path = require('path');

// Carregar .env
require('dotenv').config({ path: '/home/levelcode/Chat/.env' });

// Importar app (precisa do servidor configurado)
let app;
let server;

describe('🚀 TESTES DA API REST - LevelShop Chat', function() {
    this.timeout(10000);
    
    before('Iniciar servidor', async function() {
        // Importar e configurar app
        const { iniciarServidor } = require('../../src/core/servidor');
        const { app: expressApp, server: httpServer } = await iniciarServidor();
        app = expressApp;
        server = httpServer;
        
        console.log('\n📡 Servidor de teste iniciado');
    });
    
    after('Parar servidor', function(done) {
        if (server) {
            server.close(done);
            console.log('🔒 Servidor de teste encerrado');
        } else {
            done();
        }
    });
    
    describe('🔍 Health Check', function() {
        it('GET /api/health deve retornar status online', async function() {
            const res = await request(app)
                .get('/api/health')
                .expect('Content-Type', /json/)
                .expect(200);
            
            expect(res.body).to.have.property('status', 'online');
            expect(res.body).to.have.property('timestamp');
            console.log('   ✅ Health check funcionando');
        });
    });
    
    describe('💬 Sistema de Chat', function() {
        let conversaId;
        
        it('POST /api/chat/start deve criar nova conversa', async function() {
            const res = await request(app)
                .post('/api/chat/start')
                .send({
                    clienteNome: 'Teste API',
                    clienteId: 999,
                    sessionId: 'test_session_123'
                })
                .expect('Content-Type', /json/)
                .expect(201);
            
            expect(res.body).to.have.property('success', true);
            expect(res.body).to.have.property('conversaId').that.is.a('string');
            expect(res.body).to.have.property('mensagemInicial').that.is.a('string');
            
            conversaId = res.body.conversaId;
            console.log(`   ✅ Conversa criada: ${conversaId}`);
        });
        
        it('POST /api/chat/message deve enviar e receber resposta', async function() {
            const res = await request(app)
                .post('/api/chat/message')
                .send({
                    conversaId: conversaId,
                    mensagem: 'Olá, isso é um teste da API',
                    clienteId: 999
                })
                .expect('Content-Type', /json/)
                .expect(200);
            
            expect(res.body).to.have.property('success', true);
            expect(res.body).to.have.property('respostaBot').that.is.a('string');
            expect(res.body.respostaBot.length).to.be.greaterThan(0);
            console.log(`   ✅ Mensagem enviada, bot respondeu: ${res.body.respostaBot.substring(0, 50)}...`);
        });
        
        it('GET /api/chat/:id/history deve retornar histórico', async function() {
            const res = await request(app)
                .get(`/api/chat/${conversaId}/history`)
                .expect('Content-Type', /json/)
                .expect(200);
            
            expect(res.body).to.have.property('success', true);
            expect(res.body).to.have.property('mensagens').that.is.an('array');
            expect(res.body.mensagens.length).to.be.at.least(2); // Pelo menos 2 mensagens
            console.log(`   ✅ Histórico com ${res.body.mensagens.length} mensagens`);
        });
        
        it('GET /api/chat/:id/status deve retornar status da conversa', async function() {
            const res = await request(app)
                .get(`/api/chat/${conversaId}/status`)
                .expect('Content-Type', /json/)
                .expect(200);
            
            expect(res.body).to.have.property('success', true);
            expect(res.body).to.have.property('conversa').that.is.an('object');
            expect(res.body.conversa).to.have.property('id', conversaId);
            expect(res.body.conversa).to.have.property('estado');
            console.log(`   ✅ Status: ${res.body.conversa.estado}`);
        });
        
        it('POST /api/chat/:id/end deve encerrar conversa', async function() {
            const res = await request(app)
                .post(`/api/chat/${conversaId}/end`)
                .send({ resolvido: true, motivo: 'Teste completo' })
                .expect('Content-Type', /json/)
                .expect(200);
            
            expect(res.body).to.have.property('success', true);
            expect(res.body).to.have.property('message', 'Conversa encerrada');
            console.log(`   ✅ Conversa encerrada`);
        });
    });
    
    describe('📊 Dashboard e Monitoramento', function() {
        it('GET /api/chat/conversas/ativas deve listar conversas', async function() {
            const res = await request(app)
                .get('/api/chat/conversas/ativas')
                .expect('Content-Type', /json/)
                .expect(200);
            
            expect(res.body).to.have.property('success', true);
            expect(res.body).to.have.property('conversas').that.is.an('array');
            expect(res.body).to.have.property('total').that.is.a('number');
            console.log(`   ✅ ${res.body.total} conversas ativas listadas`);
        });
    });
});

// Execução direta
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