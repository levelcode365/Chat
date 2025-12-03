/**
 * Componente Header
 * Cabeçalho do chat com título e botão de fechar
 */

// Importa a biblioteca React
import React from "react";
// Importa os estilos do componente
import "./Header.css";

/**
 * Componente que renderiza o cabeçalho do chat
 * @param {Function} onClose - Função chamada ao clicar no botão de fechar
 */
export default function Header({ onClose }) {
  return (
    // Container do cabeçalho
    <div className="chat-header">
      {/* Título do chat */}
      <span>Atendimento ao Usuário</span>
      
      {/* Botão para fechar o chat (X) */}
      <button className="close-btn" onClick={onClose}>×</button>
    </div>
  );
}