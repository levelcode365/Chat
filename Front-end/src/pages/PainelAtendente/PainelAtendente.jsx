import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import './PainelAtendente.css';

function PainelAtendente() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [socket, setSocket] = useState(null);
  const [conectado, setConectado] = useState(false);
  const [conversasAtivas, setConversasAtivas] = useState([]);

  const atendenteId = `atendente_${Date.now()}`;

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('Conectado ao WebSocket. ID:', newSocket.id);
      setConectado(true);
      
      newSocket.emit('atendente_connect', {
        atendenteId: atendenteId,
        nome: 'Atendente 1' 
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Desconectado:', reason);
      setConectado(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Erro de conexão:', error);
      setConectado(false);
    });

    newSocket.on('connection_established', (data) => {
      console.log('✅ Conexão estabelecida:', data);
    });

    newSocket.on('transferring_to_atendente', (data) => {
      console.log('Nova solicitação:', data);
      
      const novaSolicitacao = {
        id: data.conversaId,
        userId: data.userId,
        userName: data.clienteNome || 'Cliente',
        motivo: 'Atendimento Humano',
        mensagem: data.message,
        tempoEspera: data.estimatedWait || 'Aguardando',
        prioridade: 'normal'
      };

      setSolicitacoes(prev => {
        const existe = prev.some(s => s.id === novaSolicitacao.id);
        if (existe) return prev;
        return [...prev, novaSolicitacao];
      });
      
      if (Notification.permission === 'granted') {
        new Notification('Nova solicitação de atendimento', {
          body: `${novaSolicitacao.userName} precisa de ajuda`,
          icon: '/message.png'
        });
      }
    });

    newSocket.on('atendente_assumiu', (data) => {
      console.log('Conversa assumida:', data);
      setConversasAtivas(prev => [...prev, {
        id: data.conversaId,
        atendenteId: data.atendenteId,
        timestamp: data.timestamp
      }]);
    });

    newSocket.on('nova-mensagem', (data) => {
      console.log('Nova mensagem:', data);
    });

    newSocket.on('error', (data) => {
      console.error('Erro:', data);
      alert(`Erro: ${data.message}`);
    });

    setSocket(newSocket);

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  const aceitarCliente = (solicitacao) => {
    if (!socket || !socket.connected) {
      alert('Não conectado ao servidor');
      return;
    }

    console.log('Aceitando cliente:', solicitacao);
    
    socket.emit('atendente_assume', {
      atendenteId: atendenteId,
      conversaId: solicitacao.id,
      userId: solicitacao.userId
    });
    
    setSolicitacoes(prev => prev.filter(s => s.id !== solicitacao.id));
    
    setConversasAtivas(prev => [...prev, {
      id: solicitacao.id,
      atendenteId: atendenteId,
      userName: solicitacao.userName,
      timestamp: new Date().toISOString()
    }]);
  };

  return (
    <div className="painel-atendente">
      <div className="painel-header">
        <h2>Painel do Atendente</h2>
        <div className="status">
          <span className={conectado ? 'conectado' : 'desconectado'}>
            {conectado ? 'Online' : 'Offline'}
          </span>
          {socket && <small>ID: {socket.id?.substring(0, 8)}...</small>}
        </div>
      </div>

      <div className="painel-content">
        <div className="solicitacoes-section">
          <h3>Solicitações Pendentes ({solicitacoes.length})</h3>
          
          {solicitacoes.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma solicitação no momento</p>
            </div>
          ) : (
            <ul className="solicitacoes-lista">
              {solicitacoes.map((sol) => (
                <li key={sol.id} className="solicitacao-item">
                  <div className="solicitacao-info">
                    <h4>{sol.userName}</h4>
                    <p><strong>Motivo:</strong> {sol.motivo}</p>
                    <p><strong>Mensagem:</strong> {sol.mensagem}</p>
                    <small>
                      Aguardando há: {sol.tempoEspera}
                    </small>
                    {sol.prioridade === 'alta' && (
                      <span className="badge prioridade-alta">
                        🔴 Prioridade Alta
                      </span>
                    )}
                  </div>
                  <button 
                    className="btn-aceitar"
                    onClick={() => aceitarCliente(sol)}
                    disabled={!conectado}
                  >
                    Aceitar Atendimento
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="conversas-ativas-section">
          <h3>Conversas Ativas ({conversasAtivas.length})</h3>
          {conversasAtivas.length === 0 ? (
            <p>Nenhuma conversa ativa</p>
          ) : (
            <ul>
              {conversasAtivas.map((conversa) => (
                <li key={conversa.id}>
                  <strong>{conversa.userName || 'Cliente'}</strong>
                  <br />
                  <small>ID: {conversa.id.substring(0, 12)}...</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default PainelAtendente;  