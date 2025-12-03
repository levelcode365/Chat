//registra APENAS a conexão inicial
const registrarEventos = require("./eventos");

module.exports = (wss) => {
    
    wss.on("connection", (socket, req) => {
        console.log("Nova conexão WebSocket");

        // prepara o socket...
        // registra colaborador...
        
        registrarEventos(socket, wss);

    });

};
