const WebSocketServer = require('./app');
const eventos = require('./eventos');

let wsServer = null;

function iniciarWebSocket(server) {
  if (!wsServer) {
    wsServer = new WebSocketServer(server);
    
    // Conectar eventos
    wsServer.on('cliente_conectado', (dados) => {
      eventos.emitirClienteConectado(dados.userId, dados.usuario);
    });
    
    wsServer.on('cliente_desconectado', (dados) => {
      eventos.emitirClienteDesconectado(dados.userId);
    });
    
    console.log('✅ WebSocket Server inicializado');
  }
  return wsServer;
}

function getWebSocketServer() {
  if (!wsServer) {
    throw new Error('WebSocket Server não inicializado. Chame iniciarWebSocket() primeiro.');
  }
  return wsServer;
}

function getConexoesAtivas() {
  return wsServer ? wsServer.getConexoesAtivas() : [];
}

function enviarParaUsuario(userId, dados) {
  if (wsServer) {
    wsServer.enviarParaUsuario(userId, dados);
  }
}

function broadcast(dados, filtro = null) {
  if (wsServer) {
    wsServer.broadcast(dados, filtro);
  }
}

module.exports = {
  iniciarWebSocket,
  getWebSocketServer,
  getConexoesAtivas,
  enviarParaUsuario,
  broadcast,
  eventos
};