// src/core/servidor.js - VERSÃO FINAL CORRIGIDA
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const rotas = require('./rotas.js');
const { iniciarWebSocket } = require('../config/websocket.js'); // .js é importante!

const app = express();

app.use(helmet()); // Segurança HTTP headers
app.use(cors({
    origin: '*', // Em produção, especifique domínios
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200, // Limite de 200 requisições por IP
    message: { 
        erro: 'Limite de requisições excedido. Tente novamente em 15 minutos.' 
    },
    standardHeaders: true, // Retorna rate limit info nos headers
    legacyHeaders: false // Desabilita headers antigos
});
app.use(limiter);


app.use('/api', rotas);


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


app.get('/', (req, res) => {
    res.json({
        mensagem: 'Bem-vindo à API do Chat',
        endpoints: {
            api: '/api',
            status: '/status',
            health: '/health',
            websocket: 'ws://localhost:3000' // Seu WebSocket
        },
        documentacao: 'Em breve: /api-docs'
    });
});


app.use((req, res, next) => {
    res.status(404).json({
        erro: 'Endpoint não encontrado',
        path: req.path,
        metodo: req.method
    });
});


app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    
    res.status(err.status || 500).json({
        erro: 'Erro interno do servidor',
        mensagem: process.env.NODE_ENV === 'development' ? err.message : 'Entre em contato com o suporte',
        timestamp: new Date().toISOString()
    });
});


function iniciarServidor() {
    const PORTA = process.env.DB_PORTA || 3000;

    // Iniciar servidor HTTP
    const servidor = app.listen(PORTA, () => {
        console.log('='.repeat(50));
        console.log('CHAT BACKEND INICIADO COM SUCESSO!');
        console.log('='.repeat(50));
        console.log(`Local:    http://localhost:${PORTA}`);
        console.log(`API:      http://localhost:${PORTA}/api`);
        console.log(`Health:   http://localhost:${PORTA}/health`);
        console.log(`Status:   http://localhost:${PORTA}/status`);
        console.log(`WebSocket: ws://localhost:${PORTA}`);
        console.log('='.repeat(50));
        console.log('Logs abaixo ↓');
        console.log('='.repeat(50));
    });

    // Configurar WebSocket no MESMO servidor
    iniciarWebSocket(servidor);
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('Recebido SIGTERM, encerrando graciosamente...');
        servidor.close(() => {
            console.log('Servidor HTTP fechado');
            process.exit(0);
        });
    });

    return servidor;
}

// Exportar para testes e reutilização
module.exports = {
    app,
    iniciarServidor
};
