import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import ChatLayout from './ChatLayout';

function ChatLayoutContainer() {
  const [mensagens, setMensagens] = useState([]);
  const [socket, setSocket] = useState(null);
  const [conectado, setConectado] = useState(false);
  const [atendente, setAtendente] = useState(null);
  const [conversaId, setConversaId] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // IDs do usuário
  const userId = useRef(`usuario_${Date.now()}`);
  const userName = 'João Silva';
  const chatIniciado = useRef(false); // Flag para evitar dupla inicialização
  const mensagensProcessadas = useRef(new Set()); // Rastrear mensagens já processadas

  useEffect(() => {
    // Evitar inicialização dupla (React 18 Strict Mode)
    if (chatIniciado.current) return;
    chatIniciado.current = true;

    iniciarChat();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const iniciarChat = async () => {
    try {
      console.log('🔌 Iniciando chat...', {
        clienteId: userId.current,
        clienteNome: userName
      });

      const response = await fetch('http://localhost:3001/api/chat/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clienteId: userId.current,
          clienteNome: userName,
          sessionId: `session_${Date.now()}`
        })
      });

      console.log('📡 Status da resposta:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na resposta:', errorText);
        throw new Error(`Erro ao iniciar conversa: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Conversa iniciada:', data);
      
      setConversaId(data.conversaId);
      
      // Não adicionar mensagemInicial aqui - ela virá via WebSocket bot_message
      // para evitar duplicação

      conectarWebSocket(data.conversaId);

    } catch (error) {
      console.error('❌ Erro ao iniciar chat:', error);
      console.error('Stack completo:', error.stack);
      alert('Erro ao conectar ao chat. Tente recarregar a página.');
      setCarregando(false);
    }
  };

  const conectarWebSocket = (convId) => {
    console.log('🔌 Tentando conectar WebSocket...', { convId, userId: userId.current });
    
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // === EVENTO: CONEXÃO ===
    newSocket.on('connect', () => {
      console.log('✅ Conectado ao WebSocket. ID:', newSocket.id);
      setConectado(true);
      setCarregando(false);
      
      newSocket.emit('cliente_connect', {
        userId: userId.current,
        conversaId: convId
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Desconectado. Motivo:', reason);
      setConectado(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Erro conexão WebSocket:', error.message);
      console.error('Detalhes:', error);
      setConectado(false);
      setCarregando(false);
    });

    newSocket.on('connection_established', (data) => {
      console.log('✅ Conexão estabelecida:', data);
    });

    // === EVENTO: MENSAGEM DO BOT (usar once para evitar duplicatas) ===
    newSocket.off('bot_message'); // Remover listeners antigos
    newSocket.on('bot_message', (data) => {
      console.log('🤖 Bot respondeu:', data);
      
      adicionarMensagem({
        texto: data.Mensagem,
        remetente: data.Remetente || 'Bot',
        tipo: 'bot',
        id: `bot_${Date.now()}_${Math.random()}`,
        isTransfer: data.isTransfer
      });
    });

    // === EVENTO: CONFIRMAÇÃO DE RECEBIMENTO ===
    newSocket.on('message_received', (data) => {
      console.log('✅ Mensagem recebida pelo servidor:', data);
    });

    newSocket.on('transferring_to_atendente', (data) => {
      console.log('🔄 Transferindo para atendente:', data);
      
      adicionarMensagem({
        texto: data.message || 'Conectando você com um atendente humano...',
        tipo: 'sistema',
        remetente: 'Sistema',
        id: Date.now()
      });
    });

    newSocket.on('atendente_assumiu', (data) => {
      console.log('👨‍💼 Atendente assumiu:', data);
      
      setAtendente(data.atendenteNome || 'Atendente');
      
      adicionarMensagem({
        texto: data.message || `${data.atendenteNome || 'Um atendente'} entrou no chat`,
        tipo: 'sistema',
        remetente: 'Sistema',
        id: Date.now()
      });
    });

    // REMOVER ou comentar o evento nova-mensagem pois já temos bot_response
    // newSocket.on('nova-mensagem', (data) => {
    //   console.log('📨 Nova mensagem recebida:', data);
    //   
    //   if (data.Remetente !== userId.current) {
    //     adicionarMensagem({
    //       texto: data.Mensagem,
    //       remetente: atendente || 'Atendente',
    //       tipo: 'recebida',
    //       id: data.id || Date.now()
    //     });
    //   }
    // });


    newSocket.on('error', (data) => {
      console.error('Erro do servidor:', data);
      alert(`Erro: ${data.message || 'Erro desconhecido'}`);
    });

    setSocket(newSocket);
  };

  const adicionarMensagem = (msg) => {
    // Criar hash único da mensagem para evitar duplicatas
    const msgHash = `${msg.texto}_${msg.remetente}_${msg.tipo}`;
    
    // Se a mensagem foi processada nos últimos 3 segundos, ignorar
    if (mensagensProcessadas.current.has(msgHash)) {
      console.log('⚠️ Mensagem duplicada ignorada (hash):', msg.texto.substring(0, 30));
      return;
    }
    
    // Adicionar ao set de processadas
    mensagensProcessadas.current.add(msgHash);
    
    // Remover do set após 3 segundos para permitir mesma mensagem depois
    setTimeout(() => {
      mensagensProcessadas.current.delete(msgHash);
    }, 3000);
    
    setMensagens(prev => {
      // Verificação adicional por texto idêntico recente
      const isDuplicated = prev.some(m => {
        const textoIgual = m.texto === msg.texto;
        const remetenteIgual = m.remetente === msg.remetente;
        const tempoProximo = m.timestamp && Math.abs(new Date(m.timestamp) - new Date()) < 3000;
        return textoIgual && remetenteIgual && tempoProximo;
      });
      
      if (isDuplicated) {
        console.log('⚠️ Mensagem duplicada ignorada (tempo):', msg.texto.substring(0, 30));
        return prev;
      }

      console.log('✅ Adicionando mensagem:', {
        remetente: msg.remetente,
        tipo: msg.tipo,
        texto: msg.texto.substring(0, 30)
      });

      return [...prev, {
        ...msg,
        id: msg.id || `msg_${Date.now()}_${Math.random()}`,
        timestamp: new Date()
      }];
    });
  };

  const handleEnviarMensagem = (texto) => {
    if (!texto.trim() || !socket || !socket.connected || !conversaId) {
      console.warn('⚠️ Não pode enviar:', { 
        texto: texto.trim() ? 'ok' : 'vazio',
        socket: socket ? 'ok' : 'null',
        conectado: socket?.connected,
        conversaId 
      });
      return;
    }

    console.log('📤 Enviando mensagem:', texto);

    // Adicionar a mensagem do usuário imediatamente
    adicionarMensagem({
      texto: texto,
      remetente: 'Você',
      tipo: 'enviada',
      id: `msg_${Date.now()}`
    });

    // Enviar via WebSocket
    socket.emit('cliente_message', {
      userId: userId.current,
      conversaId: conversaId,
      message: texto,
      sessionData: {
        userName: userName,
        userType: 'cliente_regular'
      }
    });
  };

  return (
    <ChatLayout
      mensagens={mensagens}
      onEnviarMensagem={handleEnviarMensagem}
      conectado={conectado}
      atendente={atendente}
      carregando={carregando}
    />
  );
}

export default ChatLayoutContainer;