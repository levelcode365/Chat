//cria wss


const http = require("http");
const app = require("./src/app");
const { WebSocketServer } = require("ws");

// Porta
const PORT = process.env.PORT || 3001;

// Criar servidor HTTP real
const server = http.createServer(app);

// Criar servidor WebSocket
const wss = new WebSocketServer({ server });

// Conectar módulos do WebSocket
require("./src/websocket/conexoes")(wss);

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`🚀 Servidor HTTP & WS rodando na porta ${PORT}`);
});
