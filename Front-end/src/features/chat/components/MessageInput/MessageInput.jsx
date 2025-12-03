/**
 * Componente MessageInput
 * Campo de entrada de texto para o usuário escrever e enviar mensagens
 * Inclui contador de caracteres e botões de enviar e limpar
 */

// Importa React e o hook useState
import React, { useState } from "react";
// Importa os estilos do componente
import "./MessageInput.css";

/**
 * Componente de input de mensagens
 * @param {Function} onSend - Função chamada ao enviar mensagem (recebe o texto como parâmetro)
 * @param {boolean} disabled - Desabilita o input e botões quando true (durante envio)
 */
export default function MessageInput({ onSend, disabled = false }) {
  // Estado que armazena o texto digitado pelo usuário
  const [msg, setMsg] = useState("");
  // Limite máximo de caracteres permitidos
  const MAX_CHARS = 800;

  /**
   * Função que envia a mensagem
   * Valida se há texto antes de enviar
   */
  const send = () => {
    // Não envia se o texto estiver vazio (após remover espaços) ou se estiver desabilitado
    if (!msg.trim() || disabled) return;
    // Chama a função onSend passada como prop com o texto
    onSend(msg);
    // Limpa o campo de texto após enviar
    setMsg("");
  };

  /**
   * Handler para teclas pressionadas no textarea
   * @param {Event} e - Evento do teclado
   */
  const handleKeyDown = (e) => {
    // Enter sozinho envia a mensagem
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Previne quebra de linha
      send(); // Envia a mensagem
    }
    // Shift+Enter adiciona quebra de linha (comportamento padrão do textarea)
  };

  /**
   * Limpa o campo de texto
   */
  const handleClear = () => {
    setMsg("");
  };

  return (
    // Container principal da área de input
    <div className="msg-input-area">
      {/* Wrapper do textarea com contador de caracteres */}
      <div className="input-wrapper">
        {/* Campo de texto para digitar mensagem */}
        <textarea
          className="msg-input"
          placeholder="Escreva uma mensagem... (Shift+Enter para nova linha)"
          value={msg} // Valor controlado pelo estado
          onChange={e => setMsg(e.target.value)} // Atualiza o estado a cada digitação
          onKeyDown={handleKeyDown} // Handler para teclas
          disabled={disabled} // Desabilita durante envio
          rows={3} // Número de linhas visíveis
          maxLength={MAX_CHARS} // Limite de caracteres
        />
        {/* Contador de caracteres no canto inferior direito */}
        <div className="char-counter">
          {msg.length}/{MAX_CHARS}
        </div>
      </div>
      {/* Coluna com botões de ação */}
      <div className="buttons-column">
        {/* Botão de enviar */}
        <button 
          className="send-btn" 
          onClick={send}
          disabled={disabled || !msg.trim()} // Desabilita se estiver enviando ou texto vazio
        >
          {disabled ? 'Enviando...' : 'Enviar'} {/* Texto muda durante envio */}
        </button>
        {/* Botão de limpar */}
        <button 
          className="clear-btn" 
          onClick={handleClear}
          disabled={disabled || !msg.trim()} // Desabilita se estiver enviando ou texto vazio
          type="button"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}