const { WebSocketServer } = require('ws');

function iniciarWebSocket(servidorHttp) {
    try {
        const wss = new WebSocketServer({ 
            server: servidorHttp,
            clientTracking: true
        });

        console.log('WebSocket Server configurado');

        wss.on('connection', (socket, request) => {
            console.log('Cliente WebSocket conectado');
            
            socket.send(JSON.stringify({
                tipo: 'conexao_estabelecida',
                mensagem: 'Conectado ao chat',
                timestamp: new Date().toISOString()
            }));

        socket.on("message", (data) => {
            try {
                const mensagem = JSON.parse(data);
                console.log("Mensagem WebSocket:", mensagem.tipo || "sem tipo");

                if (mensagem.tipo === "ping") {
                    socket.send(JSON.stringify({
                        tipo: "pong",
                        timestamp: new Date().toISOString()
                    }));
                    return; 
                }

                socket.send(JSON.stringify({
                    tipo: "eco",
                    dados: mensagem,
                    timestamp: new Date().toISOString()
                }));

            } catch (error) {
                console.error("Erro processar mensagem WS:", error);
            }
        });

            socket.on('close', () => {
                console.log('Cliente WebSocket desconectado');
            });

            socket.on('error', (error) => {
                console.error('Erro WebSocket:', error);
            });
        });

        return wss;
        
    } catch (error) {
        console.error('Erro ao configurar WebSocket:', error.message);
        return null; // Retorna null em vez de travar
    }
}

module.exports = { iniciarWebSocket };