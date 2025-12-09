📘 DOCUMENTAÇÃO TÉCNICA - INTEGRAÇÃO FRONTEND
🚀 VISÃO GERAL
Sistema de Chat Híbrido (Bot + Humanos) com WebSocket em tempo real e API REST.

URLs do Backend:

🌐 HTTP API: http://localhost:3001

🔌 WebSocket: ws://localhost:3001/socket.io/

✅ Health Check: http://localhost:3001/api/health

📡 1. CONEXÃO WEBSOCKET (TEMPO REAL)
1.1 Instalação
bash
npm install socket.io-client
# ou
yarn add socket.io-client
1.2 Configuração Inicial
javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  transports: ['websocket'],      // Usar apenas WebSocket
  autoConnect: true,              // Conectar automaticamente
  reconnection: true,             // Tentar reconectar se cair
  reconnectionAttempts: 5,        // Máximo 5 tentativas
  reconnectionDelay: 1000,        // Esperar 1s entre tentativas
  timeout: 10000                  // Timeout de 10s
});
1.3 Gerenciamento de Conexão
javascript
// Eventos de conexão
socket.on('connect', () => {
  console.log('✅ Conectado ao WebSocket. ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('❌ Erro conexão WebSocket:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Desconectado. Motivo:', reason);
});

// Reconectar manualmente (se necessário)
socket.connect();
socket.disconnect();
🤖 2. FLUXO DO CHAT (PASSO A PASSO)
2.1 Iniciar Conversa
javascript
// 1. Primeiro, crie uma conversa via API REST
const response = await fetch('http://localhost:3001/api/chat/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clienteNome: 'João Silva',      // Obrigatório
    clienteId: 123,                 // Opcional (ID do usuário no sistema)
    sessionId: 'sess_123456'        // Opcional (para manter sessão)
  })
});

const data = await response.json();
// {
//   "success": true,
//   "conversaId": "conv_abc123def456",
//   "mensagemInicial": "Olá João Silva! Eu sou o LevelBot...",
//   "timestamp": "2024-01-15T10:30:00.000Z"
// }

const conversaId = data.conversaId; // GUARDE ESTE ID!
2.2 Conectar ao WebSocket
javascript
// 2. Conecte o cliente ao WebSocket usando o conversaId
socket.emit('cliente_connect', {
  userId: 'usuario_123',          // ID único do usuário (pode ser email, CPF, etc)
  conversaId: conversaId          // ID recebido na criação
});

// Você receberá confirmação
socket.on('connection_established', (data) => {
  console.log('✅ Cliente conectado:', data);
  // data: { status: 'connected', userId, conversaId, timestamp }
});
2.3 Enviar Mensagens
javascript
// 3. Enviar mensagem para o bot
socket.emit('cliente_message', {
  userId: 'usuario_123',          // Mesmo userId do connect
  message: 'Olá, preciso de ajuda com preços',
  conversaId: conversaId,         // Mesmo conversaId
  sessionData: {                  // Opcional - dados extras
    nome: 'João Silva',
    email: 'joao@email.com',
    telefone: '(11) 99999-9999'
  }
});
2.4 Receber Respostas
javascript
// 4. Ouvir resposta do bot
socket.on('bot_response', (data) => {
  console.log('🤖 Bot:', data.response);
  // data: {
  //   response: "Texto da resposta",
  //   userId: "usuario_123",
  //   destination: "bot",
  //   conversaId: "conv_abc123",
  //   timestamp: "2024-01-15T10:31:00.000Z"
  // }
});
🎯 3. EVENTOS PRINCIPAIS
3.1 Eventos do Cliente (Enviar)
Evento	Payload	Descrição
cliente_connect	{ userId, conversaId }	Conectar cliente ao chat
cliente_message	{ userId, message, conversaId, sessionData? }	Enviar mensagem
test	any	Testar conexão WebSocket
3.2 Eventos do Servidor (Receber)
Evento	Payload	Descrição
bot_response	{ response, userId, destination, conversaId, timestamp }	Resposta do bot
transferring_to_atendente	{ message, userId, estimatedWait, conversaId }	Transferindo para humano
atendente_assumiu	{ atendenteId, message, timestamp }	Atendente assumiu chat
connection_established	{ status, userId, conversaId, timestamp }	Conexão confirmada
error	{ message, code? }	Erro na operação
3.3 Eventos Legacy (Compatibilidade)
Evento	Payload	Descrição
enviar-mensagem	{ IdConversa, Remetente, Mensagem }	Sistema antigo
nova-mensagem	{ IdConversa, Remetente, Mensagem, DataEnvio, isBot }	Mensagem broadcast
conversa-assumida	{ idConversa, idColaborador }	Atendente assumiu
🌐 4. API REST (HTTP)
4.1 Endpoints Principais
javascript
// POST /api/chat/start - Iniciar nova conversa
fetch('http://localhost:3001/api/chat/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clienteNome: 'Nome do Cliente',  // OBRIGATÓRIO
    clienteId: 123,                  // opcional
    sessionId: 'sess_123'            // opcional
  })
});

// POST /api/chat/message - Enviar mensagem (alternativo)
fetch('http://localhost:3001/api/chat/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    conversaId: 'conv_abc123',       // OBRIGATÓRIO
    mensagem: 'Texto da mensagem',   // OBRIGATÓRIO
    clienteId: 123                   // opcional
  })
});

// GET /api/chat/:id/history - Histórico
fetch('http://localhost:3001/api/chat/conv_abc123/history?limit=50')
  .then(res => res.json())
  .then(data => console.log(data.mensagens));

// GET /api/chat/:id/status - Status
fetch('http://localhost:3001/api/chat/conv_abc123/status')
  .then(res => res.json())
  .then(data => console.log(data.conversa));

// GET /api/chat/conversas/ativas - Listar ativas
fetch('http://localhost:3001/api/chat/conversas/ativas')
  .then(res => res.json())
  .then(data => console.log(data.conversas));
4.2 Health Check
javascript
fetch('http://localhost:3001/api/health')
  .then(res => res.json())
  .then(data => {
    if (data.status === 'online') {
      console.log('✅ Backend online');
    }
  });
📱 5. EXEMPLO COMPLETO (React)
javascript
// ChatComponent.jsx - Exemplo completo
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const ChatComponent = () => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [conversaId, setConversaId] = useState(null);
  const [status, setStatus] = useState('desconectado');
  
  const userId = useRef(`user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // 1. Inicializar WebSocket e conversa
  useEffect(() => {
    // Criar conversa primeiro
    criarConversa();
  }, []);

  const criarConversa = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/chat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteNome: 'Usuário Chat',
          clienteId: parseInt(Math.random() * 1000)
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setConversaId(data.conversaId);
        setMessages([{ sender: 'bot', text: data.mensagemInicial }]);
        iniciarWebSocket(data.conversaId);
      }
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
    }
  };

  const iniciarWebSocket = (convId) => {
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      setStatus('conectado');
      
      // Conectar cliente
      newSocket.emit('cliente_connect', {
        userId: userId.current,
        conversaId: convId
      });
    });

    // Listeners
    newSocket.on('bot_response', (data) => {
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: data.response,
        time: new Date().toLocaleTimeString()
      }]);
    });

    newSocket.on('transferring_to_atendente', (data) => {
      setMessages(prev => [...prev, {
        sender: 'system',
        text: `⏳ ${data.message} (${data.estimatedWait})`,
        time: new Date().toLocaleTimeString()
      }]);
    });

    newSocket.on('atendente_assumiu', (data) => {
      setMessages(prev => [...prev, {
        sender: 'atendente',
        text: `👨‍💼 ${data.message}`,
        time: new Date().toLocaleTimeString()
      }]);
    });

    newSocket.on('error', (data) => {
      setMessages(prev => [...prev, {
        sender: 'system',
        text: `❌ Erro: ${data.message}`,
        time: new Date().toLocaleTimeString()
      }]);
    });

    setSocket(newSocket);
  };

  const enviarMensagem = () => {
    if (!inputText.trim() || !socket || !conversaId) return;

    // Adicionar visualmente
    setMessages(prev => [...prev, {
      sender: 'user',
      text: inputText,
      time: new Date().toLocaleTimeString()
    }]);

    // Enviar via WebSocket
    socket.emit('cliente_message', {
      userId: userId.current,
      message: inputText,
      conversaId: conversaId
    });

    setInputText('');
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>Chat Assistente</h3>
        <span className={`status ${status}`}>● {status}</span>
        {conversaId && <small>ID: {conversaId.substring(0, 8)}...</small>}
      </div>
      
      <div className="messages-container">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.sender}`}>
            <div className="message-header">
              <strong>{msg.sender === 'user' ? 'Você' : 
                      msg.sender === 'bot' ? '🤖 Bot' : 
                      msg.sender === 'atendente' ? '👨‍💼 Atendente' : 'ℹ️ Sistema'}</strong>
              <span className="time">{msg.time}</span>
            </div>
            <div className="message-text">{msg.text}</div>
          </div>
        ))}
      </div>
      
      <div className="input-container">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()}
          placeholder="Digite sua mensagem..."
          disabled={!socket || status !== 'conectado'}
        />
        <button 
          onClick={enviarMensagem}
          disabled={!inputText.trim() || !socket || status !== 'conectado'}
        >
          Enviar
        </button>
      </div>
    </div>
  );
};

export default ChatComponent;
🎨 6. ESTILOS CSS (SUGESTÃO)
css
/* styles.css */
.chat-container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 70vh;
}

.chat-header {
  background: #007bff;
  color: white;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-header .status {
  font-size: 0.9em;
}

.chat-header .status.conectado {
  color: #28a745;
}

.chat-header .status.desconectado {
  color: #dc3545;
}

.messages-container {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  background: #f8f9fa;
}

.message {
  margin-bottom: 15px;
  padding: 10px 15px;
  border-radius: 8px;
  max-width: 80%;
}

.message.user {
  background: #007bff;
  color: white;
  margin-left: auto;
}

.message.bot {
  background: #e9ecef;
  color: #333;
  margin-right: auto;
}

.message.atendente {
  background: #d4edda;
  color: #155724;
  margin-right: auto;
  border-left: 4px solid #28a745;
}

.message.system {
  background: #fff3cd;
  color: #856404;
  margin: 10px auto;
  text-align: center;
  font-style: italic;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 0.85em;
  opacity: 0.8;
}

.message-text {
  word-wrap: break-word;
}

.input-container {
  display: flex;
  padding: 15px;
  border-top: 1px solid #ddd;
  background: white;
}

.input-container input {
  flex: 1;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-right: 10px;
  font-size: 14px;
}

.input-container input:disabled {
  background: #f8f9fa;
  cursor: not-allowed;
}

.input-container button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.input-container button:hover:not(:disabled) {
  background: #0056b3;
}

.input-container button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}
🔧 7. TROUBLESHOOTING
Problema 1: WebSocket não conecta
javascript
// Solução:
// 1. Verifique se backend está rodando:
// curl http://localhost:3001/api/health

// 2. Adicione debug:
const socket = io('http://localhost:3001', {
  transports: ['websocket'],
  debug: true  // Habilitar logs
});

socket.onAny((event, ...args) => {
  console.log(`📡 Evento: ${event}`, args);
});
Problema 2: Eventos não chegam
javascript
// Verifique:
// 1. userId e conversaId são os mesmos no connect e message?
// 2. O socket está conectado? (socket.connected)
// 3. Há erros no console do navegador?
Problema 3: CORS Blocked
javascript
// Backend já tem CORS configurado para *
// Se persistir, verifique:
// 1. URL correta (http, não https)
// 2. Porta correta (3001)
// 3. Nenhum adblock bloqueando
📊 8. TIPOS DE RESPOSTAS DO BOT
O bot pode responder de várias formas:

Saudação inicial - "Olá! Eu sou o LevelBot..."

Resposta a preços - "Para informar o preço, preciso saber qual produto..."

Resposta a estoque - "Posso verificar a disponibilidade..."

Transferência para humano - "Vou te conectar com um atendente..."

Fora do horário - "Atendimento humano disponível das 8h às 14h..."

🚀 9. TESTE RÁPIDO (Console do Navegador)
javascript
// Cole no console para teste rápido:
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('✅ Conectado! ID:', socket.id);
  socket.emit('cliente_connect', {
    userId: 'test_' + Date.now(),
    conversaId: 'test_' + Date.now()
  });
});

socket.on('bot_response', (data) => {
  console.log('🤖:', data.response);
});

// Testar depois de 2s
setTimeout(() => {
  socket.emit('cliente_message', {
    userId: 'test_user',
    message: 'Olá, bot!',
    conversaId: 'test_123'
  });
}, 2000);
📞 10. SUPORTE
Em caso de problemas:

Verifique console do navegador (F12)

Teste conexão: curl http://localhost:3001/api/health

Teste WebSocket: wscat -c ws://localhost:3001

Consulte logs do backend

Status Codes:

200 - Sucesso

400 - Dados inválidos

404 - Recurso não encontrado

500 - Erro interno