/**
 * Componente ChatLayout
 * Layout principal do chat que integra todos os componentes
 * Gerencia o estado das mensagens e comunica com a API
 */

// Importa React e o hook useState
import React, { useState } from "react";
// Importa os componentes utilizados no layout
import Header from "../../../components/Header/Header";
import MessageList from "../MessageList/MessageList";
import MessageInput from "../MessageInput/MessageInput";
// Importa os estilos do componente
import "./ChatLayout.css";

/**
 * Componente principal do layout do chat
 * @param {Function} onClose - Função chamada para fechar o chat
 */
export default function ChatLayout({ onClose }) {
  // TODO: Buscar dados do usuário da API após implementar sistema de login
  // Exemplo: const userData = JSON.parse(localStorage.getItem('user'));
  
  // Estado que armazena informações do usuário atual
  const [currentUser, setCurrentUser] = useState({
    id: 1, // ID virá da API após autenticação
    name: "Fresco" // Nome virá da API após login
  });

  // Estado que armazena todas as mensagens da conversa
  const [messages, setMessages] = useState([
    // Mensagem inicial de boas-vindas do bot
    { id: 1, text: "Olá! Como posso ajudar hoje?", sender: "bot", userName: "Suporte - Lucas", timestamp: new Date() }
  ]);
  
  // Estado que indica se está aguardando resposta (mostra indicador de digitação)
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Função que processa o envio de mensagens
   * @param {string} text - Texto da mensagem digitada pelo usuário
   */
  const handleSendMessage = async (text) => {
    // Valida se o texto não está vazio
    if (!text.trim()) return;

    // Cria objeto da mensagem do usuário
    const userMessage = {
      id: Date.now(), // ID único baseado em timestamp
      text: text.trim(), // Remove espaços extras
      sender: "user", // Marca como mensagem do usuário
      userName: currentUser.name, // Nome do usuário logado
      timestamp: new Date() // Horário atual
    };

    // Adiciona a mensagem do usuário ao array de mensagens
    setMessages(prev => [...prev, userMessage]);
    // Ativa o indicador de loading
    setIsLoading(true);

    // TODO: Aqui será implementada a chamada para a API real
    // Simulando resposta do bot com timeout por enquanto
    setTimeout(() => {
      // Cria mensagem de resposta do bot
      const botMessage = {
        id: Date.now() + 1, // ID único
        text: "Recebi sua mensagem! Em breve nossa equipe responderá.",
        sender: "bot", // Marca como mensagem do bot
        userName: "Suporte - Lucas", // Nome virá da API (atendente que respondeu)
        timestamp: new Date()
      };
      // Adiciona resposta do bot às mensagens
      setMessages(prev => [...prev, botMessage]);
      // Desativa o indicador de loading
      setIsLoading(false);
    }, 1000); // Simula delay de 1 segundo

    /* 
     * CÓDIGO PARA INTEGRAÇÃO FUTURA COM A API:
     * Quando o backend estiver pronto, substituir o setTimeout acima por este código:
     * 
     * try {
     *   // Envia mensagem para a API
     *   const response = await api.post('/mensagens', {
     *     texto: text.trim(),
     *     remetenteId: currentUser.id // ID do usuário logado
     *   });
     *   
     *   // Cria mensagem com a resposta da API
     *   const botMessage = {
     *     id: response.data.id,
     *     text: response.data.resposta || "Mensagem recebida!",
     *     sender: "bot",
     *     userName: response.data.atendenteNome || "Suporte", // Nome do atendente que respondeu
     *     timestamp: new Date(response.data.dataHora)
     *   };
     *   setMessages(prev => [...prev, botMessage]);
     * } catch (error) {
     *   console.error('Erro ao enviar mensagem:', error);
     *   
     *   // Mensagem de erro caso a requisição falhe
     *   const errorMessage = {
     *     id: Date.now() + 1,
     *     text: "Desculpe, ocorreu um erro ao enviar sua mensagem.",
     *     sender: "bot",
     *     userName: "Sistema",
     *     timestamp: new Date()
     *   };
     *   setMessages(prev => [...prev, errorMessage]);
     * } finally {
     *   // Desativa loading independente de sucesso ou erro
     *   setIsLoading(false);
     * }
     */
  };

  return (
    // Container principal do layout do chat
    <div className="chat-layout">
      {/* Cabeçalho do chat com botão de fechar */}
      <Header onClose={onClose} />

      {/* Área de conteúdo com scroll onde as mensagens aparecem */}
      <div className="chat-content">
        {/* Lista de mensagens com indicador de loading */}
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      {/* Campo de input para digitar e enviar mensagens */}
      <MessageInput onSend={handleSendMessage} disabled={isLoading} />
    </div>
  );
}
