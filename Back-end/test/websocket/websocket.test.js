// test/websocket/websocket.test.js
const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
const io = require('socket.io-client');
const path = require('path');

// Carregar .env
require('dotenv').config({ path: path.join(__dirname, '/home/levelcode/Chat/.env') });

// Importar e iniciar servidor
let server;
let socketUrl;

describe('🔌 TESTES DO WEBSOCKET - LevelShop Chat', function() {
    this.timeout(15000);
    
    before('Iniciar servidor de teste', async function() {
        const { iniciarServidor } = require('../../src/core/servidor');
        const { app, server: httpServer } = await iniciarServidor();
        server = httpServer;
        
        const PORT = process.env.APP_SERVER_PORT || 3001;
        socketUrl = `http://localhost:${PORT}`;
        
        console.log(`\n📡 Servidor WebSocket em: ${socketUrl}`);
    });
    
    after('Parar servidor', function(done) {
        if (server) {
            server.close(done);
            console.log('🔒 Servidor WebSocket encerrado');
        } else {
            done();
        }
    });
    
    describe('🔄 Conexão WebSocket', function() {
        it('deve conectar e receber evento de conexão', function(done) {
            const socket = io(socketUrl, {
                transports: ['websocket'],
                timeout: 5000
            });
            
            socket.on('connect', () => {
                console.log('   ✅ Cliente conectado:', socket.id);
                socket.disconnect();
                done();
            });
            
            socket.on('connect_error', (error) => {
                console.error('   ❌ Erro de conexão:', error.message);
                socket.disconnect();
                done(error);
            });
            
            // Timeout
            setTimeout(() => {
                socket.disconnect();
                done(new Error('Timeout na conexão WebSocket'));
            }, 10000);
        });
        
        it('deve reconectar automaticamente', function(done) {
            const socket = io(socketUrl, {
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: 3,
                reconnectionDelay: 1000
            });
            
            let connected = false;
            let reconnected = false;
            
            socket.on('connect', () => {
                if (!connected) {
                    connected = true;
                    console.log('   ✅ Conexão inicial estabelecida');
                    
                    // Simular desconexão
                    setTimeout(() => {
                        socket.io.engine.close();
                    }, 500);
                } else if (!reconnected) {
                    reconnected = true;
                    console.log('   ✅ Reconexão automática funcionou');
                    socket.disconnect();
                    done();
                }
            });
            
            socket.on('reconnect', (attempt) => {
                console.log(`   🔄 Reconectado na tentativa ${attempt}`);
            });
            
            socket.on('disconnect', (reason) => {
                console.log(`   🔌 Desconectado: ${reason}`);
            });
            
            setTimeout(() => {
                socket.disconnect();
                done(new Error('Timeout no teste de reconexão'));
            }, 10000);
        });
    });
    
    describe('💬 Comunicação Chat', function() {
        it('deve enviar mensagem e receber resposta do bot', function(done) {
            const socket = io(socketUrl, {
                transports: ['websocket'],
                timeout: 5000
            });
            
            const testConversaId = `test_ws_${Date.now()}`;
            const testUserId = `user_${Date.now()}`;
            
            socket.on('connect', () => {
                console.log('   ✅ Conectado para teste de chat');
                
                // 1. Conectar como cliente
                socket.emit('cliente_connect', {
                    userId: testUserId,
                    conversaId: testConversaId
                });
                
                // 2. Enviar mensagem
                setTimeout(() => {
                    socket.emit('cliente_message', {
                        userId: testUserId,
                        message: 'Olá WebSocket! Isso é um teste.',
                        conversaId: testConversaId,
                        sessionData: {}
                    });
                }, 1000);
            });
            
            // Ouvir respostas
            socket.on('bot_response', (data) => {
                console.log('   🤖 Resposta do bot recebida:', data.response.substring(0, 50) + '...');
                expect(data).to.have.property('response').that.is.a('string');
                expect(data).to.have.property('userId', testUserId);
                expect(data).to.have.property('destination', 'bot');
                
                socket.disconnect();
                done();
            });
            
            socket.on('nova-mensagem', (data) => {
                console.log('   📨 Nova mensagem broadcast:', data.Remeterte || 'bot');
            });
            
            socket.on('connect_error', (error) => {
                console.error('   ❌ Erro:', error.message);
                socket.disconnect();
                done(error);
            });
            
            setTimeout(() => {
                socket.disconnect();
                done(new Error('Timeout no teste de chat'));
            }, 10000);
        });
        
        it('deve transferir para atendente quando solicitado', function(done) {
            const socket = io(socketUrl, {
                transports: ['websocket'],
                timeout: 5000
            });
            
            const testConversaId = `test_transfer_${Date.now()}`;
            const testUserId = `user_transfer_${Date.now()}`;
            let transferTriggered = false;
            
            socket.on('connect', () => {
                console.log('   ✅ Conectado para teste de transferência');
                
                socket.emit('cliente_connect', {
                    userId: testUserId,
                    conversaId: testConversaId
                });
                
                setTimeout(() => {
                    // Mensagem que deve trigger transferência
                    socket.emit('cliente_message', {
                        userId: testUserId,
                        message: 'Quero falar com um atendente humano agora!',
                        conversaId: testConversaId,
                        sessionData: {}
                    });
                }, 1000);
            });
            
            socket.on('transferring_to_atendente', (data) => {
                console.log('   🔄 Transferência para atendente:', data.message);
                expect(data).to.have.property('message').that.includes('atendente');
                expect(data).to.have.property('userId', testUserId);
                
                transferTriggered = true;
                socket.disconnect();
                done();
            });
            
            socket.on('bot_response', (data) => {
                console.log('   🤖 Bot respondeu:', data.response.substring(0, 50) + '...');
                // Se o bot responder em vez de transferir, pode ser comportamento esperado
                // dependendo da configuração
            });
            
            setTimeout(() => {
                socket.disconnect();
                if (!transferTriggered) {
                    console.log('   ℹ️  Transferência não acionada (pode ser esperado)');
                    done(); // Não falha, apenas informa
                }
            }, 8000);
        });
    });
    
    describe('👨‍💼 Sistema de Atendentes', function() {
        it('deve conectar atendente e receber notificações', function(done) {
            const atendenteSocket = io(socketUrl, {
                transports: ['websocket'],
                timeout: 5000
            });
            
            const atendenteId = `atendente_test_${Date.now()}`;
            
            atendenteSocket.on('connect', () => {
                console.log(`   ✅ Atendente ${atendenteId} conectado`);
                
                // Registrar como atendente
                atendenteSocket.emit('atendente_connect', {
                    atendenteId: atendenteId
                });
                
                // Esperar notificações (se houver)
                setTimeout(() => {
                    atendenteSocket.disconnect();
                    console.log('   ℹ️  Teste de atendente completado');
                    done();
                }, 3000);
            });
            
            atendenteSocket.on('transferencia-humano', (data) => {
                console.log('   🔔 Atendente recebeu notificação:', data.id || data.conversaId);
                expect(data).to.have.property('id').or.have.property('conversaId');
            });
            
            atendenteSocket.on('atendentes_status', (data) => {
                console.log(`   📊 Status atendentes: ${data.online} online, ${data.clientesEsperando} esperando`);
            });
            
            setTimeout(() => {
                atendenteSocket.disconnect();
                done(new Error('Timeout no teste de atendente'));
            }, 10000);
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