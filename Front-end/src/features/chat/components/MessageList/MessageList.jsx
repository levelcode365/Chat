/**
 * Componente MessageList
 * Contêiner que exibe todas as mensagens da conversa
 * Inclui scroll automático e indicador de digitação
 */

// Importa React e hooks necessários
import React, { useEffect, useRef } from "react";
// Importa o componente de mensagem individual
import MessageItem from "../MessageItem/MessageItem";
// Importa os estilos do componente
import "./MessageList.css";

/**
 * Componente que renderiza a lista de mensagens
 * @param {Array} messages - Array com todas as mensagens da conversa
 * @param {boolean} isLoading - Indica se está aguardando resposta (mostra indicador de digitação)
 */
export default function MessageList({ messages = [], isLoading = false }) {
  // Referência para o elemento final da lista (usado para scroll automático)
  const messagesEndRef = useRef(null);

  // Efeito que executa scroll automático sempre que novas mensagens são adicionadas
  useEffect(() => {
    // Rola suavemente até o final da lista de mensagens
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]); // Executa sempre que o array de mensagens mudar

  return (
    // Container principal da lista de mensagens
    <div className="message-list">
      {/* Mapeia e renderiza cada mensagem do array */}
      {messages.map(msg => (
        <MessageItem 
          key={msg.id} // Chave única para cada mensagem (importante para o React)
          text={msg.text} // Texto da mensagem
          sender={msg.sender} // Tipo do remetente (user/bot)
          userName={msg.userName} // Nome do remetente
          timestamp={msg.timestamp} // Horário da mensagem
        />
      ))}
      
      {/* Indicador de digitação (mostra 3 pontos animados quando isLoading = true) */}
      {isLoading && (
        <div className="typing-indicator">
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
        </div>
      )}
      
      {/* Elemento invisível no final da lista usado como referência para scroll */}
      <div ref={messagesEndRef} />
    </div>
  );
}
