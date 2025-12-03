/**
 * Componente MessageItem
 * Representa uma mensagem individual no chat
 * Exibe o nome do remetente e o texto da mensagem
 */

// Importa a biblioteca React
import React from "react";
// Importa os estilos do componente
import "./MessageItem.css";

/**
 * Componente que renderiza uma mensagem individual
 * @param {string} text - Conteúdo da mensagem
 * @param {string} sender - Tipo do remetente ('user' ou 'bot')
 * @param {string} userName - Nome do usuário que enviou a mensagem
 */
export default function MessageItem({ text, sender, userName }) {
  return (
    // Container da mensagem com classe dinâmica baseada no remetente
    // Mensagens do usuário ficam à direita, do bot ficam à esquerda
    <div className={`msg-item-container ${sender}`}>
      {/* Exibe o nome do usuário se existir */}
      {userName && (
        <div className="msg-username">
          {userName}
        </div>
      )}
      {/* Balão da mensagem com estilo baseado no remetente */}
      <div className={`msg-item ${sender}`}>
        {text} {/* Texto da mensagem */}
      </div>
    </div>
  );
}