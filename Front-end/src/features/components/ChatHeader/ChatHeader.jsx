import React from 'react';
import './ChatHeader.css';

function ChatHeader({ conectado = false, atendente = null }) {
  return (
    <div className="chat-header">
      <div className="chat-header-content">
        <h2>Chat de Atendimento ao Usuario</h2>
        <div className="chat-status">
          {atendente && (
            <span className="atendente-info">
              Atendente: {atendente}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatHeader;