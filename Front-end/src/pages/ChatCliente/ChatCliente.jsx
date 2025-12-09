import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import './ChatCliente.css';

function ChatCliente() {
  const [mensagens, setMensagens] = useState([]);
  const [inputMensagem, setInputMensagem] = useState('');
  const [socket, setSocket] = useState(null);
  const [conectado, setConectado] = useState(false);
  const [atendente, setAtendente] = useState(null);
  const [conversaId, setConversaId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const mensagensEndRef = useRef(null);

  // ID do usuário (pode vir de contexto/autenticação)
  const userId = `usuario_${Date.now()}`;
  const userName = 'João Silva'; // Trocar por nome do usuário logado

  // Função para formatar texto com quebras de linha - SEM HTML
  const formatarTexto = (texto) => {
    if (!texto || typeof texto !== 'string') return '';
    
    // Substituir quebras de linha por <br> para React
    return texto.split('\n').map((linha, index) => (
      <span key={index}>
        {linha}
        {index < texto.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  useEffect(() => {
    // 1. PRIMEIRO: Iniciar conversa via API REST
    const iniciarConversa = async () => {
      try {
        console.log('🔌 Tentando conectar ao chat...');

        const response = await fetch('http://localhost:3001/api/chat/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            clienteId: userId,
            clienteNome: userName,
            sessionId: `session_${Date.now()}`
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Erro na resposta:', errorData);
          throw new Error(`Erro ao iniciar conversa: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Conversa iniciada:', data);
        
        setConversaId(data.conversaId);
        
        // Adicionar mensagem inicial do bot
        if (data.mensagemInicial) {
          adicionarMensagem({
            texto: data.mensagemInicial,
            remetente: 'Bot',
            tipo: 'bot'
          });
        }

        // 2. DEPOIS: Conectar ao WebSocket
        conectarWebSocket(data.conversaId);

      } catch (error) {
        console.error('❌ Erro ao iniciar conversa:', error);
        alert('Erro ao conectar ao chat. Tente recarregar a página.');
        setCarregando(false);
      }
    };

    iniciarConversa();

    // Cleanup ao desmontar
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const conectarWebSocket = (convId) => {
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket'],
      timeout: 10000,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // === EVENTOS DE CONEXÃO ===
    newSocket.on('connect', () => {
      console.log('✅ Conectado ao WebSocket. ID:', newSocket.id);
      setConectado(true);
      setCarregando(false);
      
      // Registrar cliente
      newSocket.emit('cliente_connect', {
        userId: userId,
        conversaId: convId
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Desconectado. Motivo:', reason);
      setConectado(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Erro conexão WebSocket:', error.message);
      setConectado(false);
      setCarregando(false);
    });

    // === EVENTO: BOT RESPONSE ===
    newSocket.on('bot_response', (data) => {
      console.log('🤖 Bot response:', data);
      
      adicionarMensagem({
        texto: data.response || data.Mensagem,
        remetente: 'Bot',
        tipo: 'bot'
      });
    });

    // === EVENTO: MENU DISPLAY ===
    newSocket.on('menu_display', (data) => {
      console.log('📋 Menu recebido:', data);
      
      adicionarMensagem({
        texto: data.menuText || data.response,
        remetente: 'Bot',
        tipo: 'bot'
      });
    });

    // === EVENTO: TRANSFERINDO PARA ATENDENTE ===
    newSocket.on('transferring_to_atendente', (data) => {
      console.log('🔄 Transferindo para atendente:', data);
      
      adicionarMensagem({
        texto: data.message || 'Conectando você com um atendente humano...',
        tipo: 'sistema'
      });
    });

    // === EVENTO: ATENDENTE ASSUMIU ===
    newSocket.on('atendente_assumiu', (data) => {
      console.log('👨‍💼 Atendente assumiu:', data);
      
      setAtendente(data.atendenteNome || 'Atendente');
      
      adicionarMensagem({
        texto: `${data.atendenteNome || 'Um atendente'} entrou no chat`,
        tipo: 'sistema'
      });
    });

    // === EVENTO: NOVA MENSAGEM ===
    newSocket.on('nova-mensagem', (data) => {
      console.log('📨 Nova mensagem recebida:', data);
      
      if (!data.isBot && data.Remetente !== userId) {
        adicionarMensagem({
          texto: data.Mensagem,
          remetente: atendente || 'Atendente',
          tipo: 'recebida'
        });
      }
    });

    setSocket(newSocket);
  };

  // Auto-scroll para última mensagem
  useEffect(() => {
    mensagensEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const adicionarMensagem = (msg) => {
    setMensagens(prev => [...prev, {
      ...msg,
      timestamp: new Date(),
      id: Date.now() + Math.random()
    }]);
  };

  const enviarMensagem = () => {
    if (!inputMensagem.trim() || !socket || !socket.connected) {
      return;
    }

    // Adicionar mensagem na interface
    adicionarMensagem({
      texto: inputMensagem,
      remetente: 'Você',
      tipo: 'enviada'
    });

    // Enviar mensagem via WebSocket
    socket.emit('cliente_message', {
      userId: userId,
      conversaId: conversaId,
      message: inputMensagem,
      sessionData: {
        userName: userName,
        userType: 'cliente_regular'
      }
    });

    console.log('📤 Mensagem enviada:', inputMensagem);
    setInputMensagem('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem();
    }
  };

  // Mostrar loading enquanto inicia conversa
  if (carregando) {
    return (
      <div className="chat-container">
        <div className="chat-loading">
          <div className="spinner"></div>
          <p>Conectando ao chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Chat de Atendimento</h2>
        <div className="status">
          <span className={conectado ? 'conectado' : 'desconectado'}>
            {conectado ? '🟢 Conectado' : '🔴 Desconectado'}
          </span>
          {atendente && <span>| Com: {atendente}</span>}
          <span>| {userName}</span>
        </div>
      </div>

      <div className="mensagens-container">
        {mensagens.length === 0 ? (
          <div className="mensagem-vazia">
            <p>Olá {userName}! Como posso ajudá-lo?</p>
          </div>
        ) : (
          mensagens.map((msg) => (
            <div 
              key={msg.id} 
              className={`mensagem ${msg.tipo}`}
            >
              {msg.tipo !== 'sistema' && (
                <strong className="remetente">{msg.remetente}: </strong>
              )}
              <span className="conteudo-mensagem">
                {formatarTexto(msg.texto)}
              </span>
              <small className="timestamp">
                {msg.timestamp.toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </small>
            </div>
          ))
        )}
        <div ref={mensagensEndRef} />
      </div>

      <div className="input-area">
        <textarea
          value={inputMensagem}
          onChange={(e) => setInputMensagem(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={conectado ? "Digite sua mensagem..." : "Aguarde conexão..."}
          rows="2"
          disabled={!conectado}
          maxLength="800"
        />
        <div className="input-footer">
          <span className={`char-count ${inputMensagem.length > 750 ? 'warning' : ''} ${inputMensagem.length > 790 ? 'danger' : ''}`}>
            {800 - inputMensagem.length}/800
          </span>
          <button 
            onClick={enviarMensagem}
            disabled={!conectado || !inputMensagem.trim()}
            className="btn-enviar"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatCliente;