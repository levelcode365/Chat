import React from 'react';
import ChatHeader from '../../../components/ChatHeader/ChatHeader';
import MessageList from '../MessageList/MessageList';
import MessageInput from '../MessageInput/MessageInput';
import './ChatLayout.css';

function ChatLayout({ 
  mensagens = [], 
  onEnviarMensagem, 
  conectado = false,
  atendente = null,
  carregando = false 
}) {
  return (
    <div className="chat-layout">
      <ChatHeader 
        conectado={conectado}
        atendente={atendente}
      />
      
      {carregando ? (
        <div className="chat-loading">
          <div className="spinner"></div>
          <p>Conectando ao chat...</p>
        </div>
      ) : (
        <>
          <MessageList mensagens={mensagens} />
          <MessageInput 
            onEnviarMensagem={onEnviarMensagem}
            desabilitado={!conectado}
          />
        </>
      )}
    </div>
  );
}

export default ChatLayout;