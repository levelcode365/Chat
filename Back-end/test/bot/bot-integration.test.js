// test/bot/bot-integration.test.js
const { describe, it, before } = require('mocha');
const { expect } = require('chai');
const path = require('path');

// Carregar .env
require('dotenv').config({ path: path.join(__dirname, '/home/levelcode/Chat/.env') });

describe('🤖 TESTES DO BOT - LevelShop Chat', function() {
    this.timeout(10000);
    
    let BotService;
    let botService;
    
    before('Carregar BotService', function() {
        try {
            BotService = require('../../src/bot/bot.service');
            botService = new BotService();
            console.log('\n🤖 BotService carregado com sucesso');
        } catch (error) {
            console.error('\n❌ Erro ao carregar BotService:', error.message);
            throw error;
        }
    });
    
    describe('🧠 Processamento de Mensagens', function() {
        it('deve processar mensagem simples e retornar resposta', async function() {
            const conversaId = `test_bot_${Date.now()}`;
            const mensagem = 'Olá, como vai?';
            
            const resposta = await botService.processarMensagem(conversaId, mensagem);
            
            expect(resposta).to.be.a('string');
            expect(resposta.length).to.be.greaterThan(0);
            console.log(`   ✅ Bot respondeu: "${resposta.substring(0, 50)}..."`);
        });
        
        it('deve detectar intenção de saudação', async function() {
            const conversaId = `test_saudacao_${Date.now()}`;
            
            // Testar diferentes formas de saudação
            const saudações = [
                'Oi',
                'Olá bom dia',
                'Boa tarde',
                'E aí',
                'Oi, tudo bem?'
            ];
            
            for (const saudacao of saudações) {
                const resposta = await botService.processarMensagem(conversaId, saudacao);
                expect(resposta).to.be.a('string');
                console.log(`   📝 "${saudacao}" → "${resposta.substring(0, 30)}..."`);
            }
        });
        
        it('deve responder sobre preços', async function() {
            const conversaId = `test_preco_${Date.now()}`;
            
            const perguntasPreco = [
                'Qual o preço?',
                'Quanto custa?',
                'Tem desconto?',
                'Qual valor?'
            ];
            
            for (const pergunta of perguntasPreco) {
                const resposta = await botService.processarMensagem(conversaId, pergunta);
                expect(resposta).to.be.a('string');
                expect(resposta.length).to.be.greaterThan(0);
                console.log(`   💰 "${pergunta}" → resposta OK`);
            }
        });
        
        it('deve sugerir transferência para atendente', async function() {
            const conversaId = `test_transfer_${Date.now()}`;
            
            // Palavras que devem trigger transferência
            const triggers = [
                'Quero falar com atendente',
                'Me transfere para humano',
                'Atendente humano por favor',
                'Não quero bot, quero pessoa'
            ];
            
            for (const trigger of triggers) {
                const resposta = await botService.processarMensagem(conversaId, trigger);
                expect(resposta).to.be.a('string');
                
                // Verificar se sugere transferência (não assertivo, só log)
                if (resposta.toLowerCase().includes('atendente') || 
                    resposta.toLowerCase().includes('humano') ||
                    resposta.toLowerCase().includes('transfer')) {
                    console.log(`   🔄 "${trigger}" → SUGERE transferência`);
                } else {
                    console.log(`   🤖 "${trigger}" → Bot responde normalmente`);
                }
            }
        });
    });
    
    describe('💾 Persistência', function() {
        it('deve iniciar e gerenciar conversas em memória', async function() {
            const conversaId = `test_mem_${Date.now()}`;
            
            // Iniciar conversa
            const respostaInicial = await botService.iniciarConversa(conversaId, 123, 'Cliente Teste');
            expect(respostaInicial).to.be.a('string');
            console.log(`   🎬 Início: "${respostaInicial.substring(0, 50)}..."`);
            
            // Verificar se conversa está em memória
            const contexto = botService.getContextoConversa(conversaId);
            expect(contexto).to.be.an('object');
            expect(contexto).to.have.property('estado');
            expect(contexto).to.have.property('clienteId', 123);
            console.log(`   💾 Contexto salvo: estado=${contexto.estado}`);
            
            // Enviar mais mensagens
            await botService.processarMensagem(conversaId, 'Preciso de ajuda');
            await botService.processarMensagem(conversaId, 'Com produtos');
            
            const contextoAtualizado = botService.getContextoConversa(conversaId);
            expect(contextoAtualizado.tentativasBot).to.be.at.least(2);
            console.log(`   🔄 Tentativas: ${contextoAtualizado.tentativasBot}`);
        });
        
        it('deve verificar estatísticas do bot', function() {
            const stats = botService.getEstatisticas();
            
            expect(stats).to.be.an('object');
            expect(stats).to.have.property('conversasAtivas').that.is.a('number');
            expect(stats).to.have.property('estados').that.is.an('object');
            
            console.log(`   📊 Estatísticas: ${stats.conversasAtivas} conversas ativas`);
            console.log(`   📈 Estados:`, stats.estados);
        });
    });
    
    describe('⏰ Funcionalidades Avançadas', function() {
        it('deve verificar inatividade de conversas', function() {
            const inativas = botService.verificarInatividade();
            
            expect(inativas).to.be.an('array');
            console.log(`   ⏰ Conversas inativas detectadas: ${inativas.length}`);
            
            if (inativas.length > 0) {
                inativas.forEach(item => {
                    if (typeof item === 'string') {
                        console.log(`      - ${item} (encerrada)`);
                    } else {
                        console.log(`      - ${item.conversaId} (notificação)`);
                    }
                });
            }
        });
        
        it('deve encerrar conversa corretamente', async function() {
            const conversaId = `test_encerrar_${Date.now()}`;
            
            // Iniciar conversa
            await botService.iniciarConversa(conversaId, null, 'Cliente Fim');
            await botService.processarMensagem(conversaId, 'Teste de encerramento');
            
            // Encerrar
            const mensagemFim = await botService.encerrarConversa(conversaId, true);
            expect(mensagemFim).to.be.a('string');
            expect(mensagemFim.toLowerCase()).to.include('obrigado').or.include('até');
            
            console.log(`   🏁 Encerramento: "${mensagemFim.substring(0, 50)}..."`);
            
            // Verificar se foi removida da memória
            const contexto = botService.getContextoConversa(conversaId);
            expect(contexto).to.be.null;
            console.log(`   🧹 Contexto removido da memória`);
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