/**
 * Componente ChatIcon
 * Ícone flutuante que fica no canto inferior direito da tela
 * Quando clicado, abre a janela de chat
 */

// Importa a biblioteca React
import React from "react";
// Importa os estilos do componente
import "./ChatIcon.css";

/**
 * Componente que renderiza o ícone flutuante do chat
 * @param {Function} onClick - Função chamada quando o ícone é clicado
 * @param {boolean} isOpen - Indica se o chat está aberto (controla visibilidade)
 */
export default function ChatIcon({ onClick, isOpen }) {
  return (
    // Botão flutuante com classe que controla visibilidade
    <button 
      className={`chat-icon ${isOpen ? 'hidden' : ''}`} // Adiciona classe 'hidden' se o chat estiver aberto
      onClick={onClick} // Executa função ao clicar
      title="Abrir chat" // Texto que aparece ao passar o mouse
    >
      {/* Ícone SVG de bolha de mensagem */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor" // Usa a cor definida no CSS
        width="40"
        height="40"
      >
        {/* Path do ícone de mensagem */}
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
      </svg>
    </button>
  );
}