// Importa o StrictMode do React para ativar verificações e avisos adicionais durante o desenvolvimento
import { StrictMode } from 'react'
// Importa a função createRoot para renderizar a aplicação React no DOM
import { createRoot } from 'react-dom/client'
// Importa os estilos globais da aplicação
import './index.css'
// Importa o componente principal da aplicação
import App from './App.jsx'

// Cria a raiz da aplicação React no elemento com id 'root' do HTML
// e renderiza o componente App dentro do StrictMode
createRoot(document.getElementById('root')).render(
  // StrictMode ativa verificações extras e avisos sobre possíveis problemas no código
  <StrictMode>
    {/* Componente principal da aplicação */}
    <App />
  </StrictMode>,
)