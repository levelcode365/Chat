// Importa React e o hook useState para gerenciar estados
import React, { useState } from "react";
// Importa o componente do ícone flutuante do chat
import ChatIcon from "./features/chat/ChatIcon/ChatIcon";
// Importa o componente do layout principal do chat
import ChatLayout from "./features/chat/components/ChatLayout/ChatLayout";
// Importa os estilos do componente App
import "./App.css";

/**
 * Componente principal da aplicação
 * Gerencia o estado de abertura/fechamento do chat
 */
function App() {
  // Estado que controla se o chat está aberto (true) ou fechado (false)
  const [isOpen, setIsOpen] = useState(false);

  // Se o chat não estiver aberto, mostra apenas o ícone flutuante
  if (!isOpen) {
    return (
      <>
        {/* Container da página principal com altura mínima de 100vh e cor de fundo */}
        <div style={{ minHeight: '100vh', background: '#f5f2ea' }}>
          {/* Aqui pode ser adicionado o conteúdo da página principal */}
        </div>
        
        {/* Ícone flutuante do chat que abre o chat ao ser clicado */}
        <ChatIcon 
          onClick={() => setIsOpen(true)} // Abre o chat quando clicado
          isOpen={false} // Indica que o chat está fechado
        />
      </>
    );
  }

  // Se o chat estiver aberto, mostra o layout completo do chat em tela cheia
  return (
    // Container fixo que ocupa toda a tela com z-index alto para ficar sobre tudo
    <div className="app-container" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999 }}>
      <div className="chat-wrapper">
        {/* Layout do chat com função de fechar passada como prop */}
        <ChatLayout onClose={() => setIsOpen(false)} />
      </div>
    </div>
  );
}

// Exporta o componente App como padrão
export default App;
