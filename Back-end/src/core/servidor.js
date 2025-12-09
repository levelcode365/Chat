const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const rotas = require('./rotas.js');
const { iniciarWebSocket } = require('../config/websocket.js');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { 
        erro: 'Limite de requisições excedido. Tente novamente em 15 minutos.' 
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);

// Rotas
app.use('/api', rotas);

// Rotas de status
app.get('/status', (req, res) => {
    res.json({
        online: true,
        versao: '1.0.0',
        mensagem: 'API funcionando com sucesso.',
        timestamp: new Date().toISOString(),
        ambiente: process.env.NODE_ENV || 'development'
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        servico: 'chat-backend',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/ws-info', (req, res) => {
    res.json({
        protocol: 'WebSocket',
        compatible_clients: ['Socket.io', 'WebSocket nativo'],
        endpoints: {
            websocket: 'ws://localhost:3001/socket.io/',
            transport: 'websocket/polling',
            namespace: '/'
        }
    });
});

app.get('/', (req, res) => {
    res.json({
        mensagem: 'Bem-vindo à API do Chat com Roteamento Inteligente',
        endpoints: {
            api: '/api',
            status: '/status',
            health: '/health',
            ws_info: '/ws-info',
            websocket: 'ws://localhost:3001'
        },
        features: [
            'Roteamento inteligente bot/atendente',
            'Socket.io para comunicação em tempo real',
            'Autenticação JWT',
            'Rate limiting',
            'CORS habilitado'
        ]
    });
});

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        erro: 'Endpoint não encontrado',
        path: req.path,
        metodo: req.method
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Erro não tratado:', err);
    
    res.status(err.status || 500).json({
        erro: 'Erro interno do servidor',
        mensagem: process.env.NODE_ENV === 'development' ? err.message : 'Entre em contato com o suporte',
        timestamp: new Date().toISOString()
    });
});

function iniciarServidor() {
    const PORTA = process.env.APP_SERVER_PORT || 3001;

    // Criar servidor HTTP primeiro
    const servidor = http.createServer(app);

    // Configurar eventos do servidor ANTES de iniciar
    return new Promise((resolve, reject) => {
        servidor.listen(PORTA, () => {
            console.log('='.repeat(50));
            console.log('CHAT BACKEND INICIADO COM SUCESSO!');
            console.log('='.repeat(50));
            console.log(`Local:    http://localhost:${PORTA}`);
            console.log(`API:      http://localhost:${PORTA}/api`);
            console.log(`Health:   http://localhost:${PORTA}/health`);
            console.log(`Status:   http://localhost:${PORTA}/status`);
            console.log(`WebSocket: ws://localhost:${PORTA}/socket.io/`);
            console.log(`WS Info:  http://localhost:${PORTA}/ws-info`);
            console.log('='.repeat(50));
            console.log(' Socket.io configurado com roteamento inteligente!');
            console.log(' Bot <-> Atendente funcionando!');
            console.log('='.repeat(50));
            console.log('Logs abaixo ↓');
            console.log('='.repeat(50));

            // SÓ DEPOIS que o servidor está ouvindo, iniciar WebSocket
            try {
                const io = iniciarWebSocket(servidor);
                if (io) {
                    console.log('✅ WebSocket configurado com sucesso');
                } else {
                    console.log('⚠️ WebSocket não pôde ser configurado, mas HTTP está funcionando');
                }
            } catch (wsError) {
                console.error('⚠️ Erro ao configurar WebSocket:', wsError.message);
                console.log('ℹ️ Servidor HTTP continuará funcionando sem WebSocket');
            }

            resolve({ app, servidor });
        });

        servidor.on('error', (err) => {
            console.error('❌ Erro ao iniciar servidor HTTP:', err.message);
            reject(err);
        });
    });
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 Recebido SIGTERM, encerrando graciosamente...');
    if (global.httpServer) {
        global.httpServer.close(() => {
            console.log('✅ Servidor HTTP fechado');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

module.exports = {
    app,
    iniciarServidor
};