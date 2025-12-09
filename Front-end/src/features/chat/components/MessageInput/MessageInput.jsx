import React, { useState } from 'react';
import './MessageInput.css';

function MessageInput({ onEnviarMensagem, desabilitado = false }) {
  const [inputValue, setInputValue] = useState('');
  const MAX_CARACTERES = 800;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() && !desabilitado) {
      onEnviarMensagem(inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e) => {
    const novoValor = e.target.value;
    if (novoValor.length <= MAX_CARACTERES) {
      setInputValue(novoValor);
    }
  };

  const handleLimpar = () => {
    setInputValue('');
  };

  const caracteresRestantes = MAX_CARACTERES - inputValue.length;

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <div className="message-input-container">
        <div className="message-input-wrapper">
          <textarea
            value={inputValue}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            placeholder={desabilitado ? "Aguarde conexão..." : "Digite sua mensagem...  Aperte Shift + Enter para nova linha."}
            disabled={desabilitado}
            rows="2"
          />
          <span className={`caracteres-contador ${caracteresRestantes < 100 ? 'aviso' : ''}`}>
            {caracteresRestantes}/800
          </span>
        </div>
        <div className="message-input-actions">
          <button 
            type="button" 
            className="btn-limpar"
            onClick={handleLimpar}
            disabled={desabilitado || !inputValue}
            title="Limpar mensagem"
          >
            🗑️
          </button>
          <button 
            type="submit" 
            className="btn-enviar"
            disabled={desabilitado || !inputValue.trim()}
            title="Enviar mensagem"
          >
            📤
          </button>
        </div>
      </div>
    </form>
  );
}

export default MessageInput;