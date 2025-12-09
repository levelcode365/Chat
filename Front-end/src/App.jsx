import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ChatCliente from "./pages/ChatCliente/ChatCliente";
import PainelAtendente from "./pages/PainelAtendente/PainelAtendente";
import React from "react";
import ChatLayoutContainer from "./features/chat/components/ChatLayout/ChatLayoutContainer";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        {/* Rota principal - Chat antigo AGORA COM WEBSOCKET */}
        <Route 
          path="/" 
          element={
            <div className="app-container">
              <div className="chat-wrapper">
                <ChatLayoutContainer />
              </div>
            </div>
          } 
        />
        
        {/* Rota alternativa do chat com WebSocket */}
        <Route path="/chat" element={<ChatCliente />} />
        
        {/* Rota do painel do atendente */}
        <Route path="/atendente" element={<PainelAtendente />} />
      </Routes>
    </Router>
  );
}

export default App;