Perfeito! Agora tenho todas as informações. Vou integrar tudo na porta 3001 conforme sua estrutura.

📋 SITUAÇÃO ATUAL:
Banco: SQL Server na nuvem (206.42.13.180) ✅

WebSocket: Já tem estrutura (preciso dos códigos)

C#: Ainda não conectado (vamos fazer API REST primeiro)

Front: Porta 3000 (vou configurar CORS)

📁 PRECISO DOS CÓDIGOS DOS ARQUIVOS:
ARQUIVOS CRÍTICOS QUE PRECISO VER:
src/config/websocket.js - Configuração principal

src/websocket/eventos.js - Eventos WebSocket

src/websocket/conexão.js - Como está a conexão atual

Qualquer arquivo com funções de banco que você já tem

PARA CRIAR A INTEGRAÇÃO, PRECISO SABER:
Como você salva mensagens no banco hoje?

Como atualiza status de conversas?

Quais tabelas já existem no banco?

🚀 ENQUANTO ME MANDA OS CÓDIGOS, VOU CRIAR A ESTRUTURA BASE:
1. ARQUIVO .env PARA PORTA 3001:
env
# CONFIG BANCO (seus dados)
DB_HOST=206.42.13.180
DB_USER=levelshop
DB_PASSWORD="%dmPBy!B7wQR77%6"
DB_NAME=Levelcode-ModasMVP
DB_PORT=1433

# CONFIG APLICAÇÃO
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
JWT_SECRET=6ce42bc51f6deb7b9768db8c6bb9a17d6015cf8269f5d6873f76a67449b459

# WEBSOCKET
WS_PORT=3001
WS_PATH=/socket.io
CORS_ORIGIN=http://localhost:3000

# BOT CONFIG
BOT_NAME=LevelBot
MAX_BOT_ATTEMPTS=3
ENABLE_BOT=true

# ROTEAMENTO
HORARIO_INICIO=8
HORARIO_FIM=14
ENABLE_ROUTING=true
2. package.json ATUALIZADO:
json
{
  "name": "levelshop-chat-3001",
  "version": "1.0.0",
  "description": "API unificada WebSocket + Bot + Roteamento - Porta 3001",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "setup": "node scripts/setup-database.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "mssql": "^10.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "axios": "^1.6.0",
    "body-parser": "^1.20.2",
    "jsonwebtoken": "^9.0.2",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
3. src/index.js - PONTO DE ENTRADA UNIFICADO:
javascript
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

// Inicializar app
const app = express();
const server = http.createServer(app);

// Configurar CORS para frontend na porta 3000
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

// Configurar Socket.io
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
    },
    path: process.env.WS_PATH || '/socket.io'
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'LevelShop Chat API',
        port: process.env.PORT,
        timestamp: new Date().toISOString()
    });
});

// Status do WebSocket
app.get('/api/ws-status', (req, res) => {
    res.json({
        connected: io.engine.clientsCount,
        port: process.env.WS_PORT
    });
});

// Teste de conexão com banco
app.get('/api/db-test', async (req, res) => {
    try {
        const sql = require('mssql');
        const config = {
            server: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            options: {
                encrypt: true,
                trustServerCertificate: true
            }
        };
        
        await sql.connect(config);
        res.json({ success: true, message: 'Conexão com banco OK' });
        sql.close();
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Rota para frontend testar
app.post('/api/test-message', (req, res) => {
    const { message } = req.body;
    res.json({
        received: message,
        response: `Bot (teste) responde: Recebi sua mensagem: "${message}"`
    });
});

// Inicializar WebSocket
require('./websocket').init(io);

// Iniciar servidor
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Servidor iniciado na porta ${PORT}`);
    console.log(`📡 WebSocket: ws://localhost:${PORT}`);
    console.log(`🌐 HTTP API: http://localhost:${PORT}`);
    console.log(`🖥️  Frontend: ${process.env.FRONTEND_URL}`);
});
4. src/websocket/index.js - INTEGRAÇÃO:
javascript
const WebSocketHandler = require('./handlers');

let ioInstance = null;

module.exports = {
    init: (io) => {
        ioInstance = io;
        const handler = new WebSocketHandler(io);
        
        io.on('connection', (socket) => {
            console.log(`🔌 Novo cliente conectado: ${socket.id}`);
            
            // Eventos básicos
            socket.on('disconnect', () => {
                console.log(`🔌 Cliente desconectado: ${socket.id}`);
            });
            
            // Ping/pong
            socket.on('ping', () => {
                socket.emit('pong', { timestamp: Date.now() });
            });
            
            // Mensagem do frontend
            socket.on('mensagem-cliente', (data) => {
                handler.handleClientMessage(socket, data);
            });
            
            // Identificação
            socket.on('identificar', (data) => {
                handler.handleIdentification(socket, data);
            });
        });
        
        console.log('✅ WebSocket configurado');
    },
    
    getIO: () => ioInstance
};
🎯 AGORA ME MANDE:
Arquivos que preciso ver:
src/config/websocket.js

src/websocket/eventos.js

Seu arquivo atual de conexão com banco (onde salva mensagens)

Sua estrutura de tabelas no banco (ou me diga quais tem)

Para integrar, preciso saber:
Como você quer que o bot funcione? Direto no WebSocket ou via API REST?

O roteamento já está implementado em algum arquivo?

Tem funções prontas para registrarMensagem() e atualizarStatusConversa()?

Envie esses códigos e eu crio TODO o sistema integrado funcionando na porta 3001! 🚀