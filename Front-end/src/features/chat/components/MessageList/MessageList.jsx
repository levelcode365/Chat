import React, { useEffect, useRef } from 'react';
import './MessageList.css';

function MessageList({ mensagens = [] }) {
  const messagesEndRef = useRef(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  if (mensagens.length === 0) {
    return (
      <div className="message-list">
        <div className="message-empty">
          <p>👋 Olá! Como posso ajudá-lo hoje?</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {mensagens.map((msg, index) => (
        <div 
          key={msg.id || index} 
          className={`message message-${msg.tipo}`}
        >
          {msg.tipo !== 'sistema' && (
            <strong className="message-remetente">{msg.remetente}: </strong>
          )}
          <span className="message-texto">{msg.texto}</span>
          {msg.timestamp && (
            <small className="message-time">
              {msg.timestamp.toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </small>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;