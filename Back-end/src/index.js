require('dotenv').config({ path: '/home/levelcode/Chat/.env' });
const { iniciarServidor } = require('./core/servidor');

console.log('✅ Banco configurado para:', process.env.DB_HOST || '206.42.13.180');

async function startApplication() {
    try {
        console.log('🚀 Iniciando LevelShop Chat System v2.0...');
        
        // 1. Iniciar servidor HTTP (tudo em um só lugar)
        console.log('🌐 Iniciando servidor HTTP...');
        const { app, servidor } = await iniciarServidor();
        
        // 2. Configurações adicionais da app
        app.get('/api/health', (req, res) => {
            res.json({
                status: 'online',
                system: 'LevelShop Chat System',
                timestamp: new Date().toISOString(),
                port: process.env.APP_SERVER_PORT || 3001,
                frontend: process.env.APP_FRONT_PORT || 3005,
                database: process.env.DB_NAME || 'Levelcode-ModasMVP'
            });
        });
        
        // 3. Rota de teste simples
        app.post('/api/test/message', (req, res) => {
            res.json({
                success: true,
                message: 'API funcionando!',
                resposta: 'Olá! Eu sou o LevelBot. Como posso ajudar?',
                timestamp: new Date()
            });
        });
        
        const PORT = process.env.APP_SERVER_PORT || 3001;
        console.log('✅ Sistema iniciado com sucesso!');
        console.log(`📡 HTTP Server: http://localhost:${PORT}`);
        console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
        
        // Guardar referência para graceful shutdown
        global.httpServer = servidor;
        
        return { app, servidor };
        
    } catch (error) {
        console.error('❌ Erro crítico ao iniciar aplicação:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Iniciar aplicação
startApplication().catch((error) => {
    console.error('Falha ao iniciar aplicação:', error);
    process.exit(1);
});