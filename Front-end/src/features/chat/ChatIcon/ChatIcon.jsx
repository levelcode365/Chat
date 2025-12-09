import React from "react";
import "./ChatIcon.css";

/**
 * @param {Function} onClick
 * @param {boolean} isOpen
 */
export default function ChatIcon({ onClick, isOpen }) {
  return (
    <button 
      className={`chat-icon ${isOpen ? 'hidden' : ''}`}
      onClick={onClick}
      title="Abrir chat"
    >
      {/* Ícone SVG de bolha de mensagem */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor"
        width="40"
        height="40"
      >
        {/* Path do ícone de mensagem */}
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
      </svg>
    </button>
  );
}