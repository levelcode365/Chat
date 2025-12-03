/**
 * Serviço de Mensagens
 * Responsável por todas as operações relacionadas a mensagens
 * Inclui envio, busca e marcação de mensagens como lidas
 */

// Importa a instância configurada do axios
import api from './apiConfig';

// Objeto que contém todos os métodos relacionados a mensagens
export const MessagesService = {
  /**
   * Envia uma mensagem para o suporte
   * @param {string} texto - Conteúdo da mensagem a ser enviada
   * @param {number} remetenteId - ID do usuário que está enviando a mensagem
   * @returns {Promise} Retorna os dados da mensagem enviada
   */
  async enviarMensagem(texto, remetenteId) {
    try {
      // Faz uma requisição POST para criar uma nova mensagem
      const response = await api.post('/mensagens', {
        texto,
        remetenteId,
        dataHora: new Date().toISOString() // Adiciona timestamp atual
      });
      // Retorna os dados da resposta
      return response.data;
    } catch (error) {
      // Loga o erro no console para debug
      console.error('Erro ao enviar mensagem:', error);
      // Repassa o erro para ser tratado por quem chamou a função
      throw error;
    }
  },

  /**
   * Busca todas as mensagens de uma conversa específica
   * @param {number} usuarioId - ID do usuário para buscar mensagens
   * @returns {Promise} Retorna array com todas as mensagens do usuário
   */
  async buscarMensagens(usuarioId) {
    try {
      // Faz uma requisição GET para buscar mensagens do usuário
      const response = await api.get(`/mensagens/usuario/${usuarioId}`);
      // Retorna o array de mensagens
      return response.data;
    } catch (error) {
      // Loga o erro no console
      console.error('Erro ao buscar mensagens:', error);
      // Repassa o erro
      throw error;
    }
  },

  /**
   * Marca múltiplas mensagens como lidas
   * @param {number[]} mensagemIds - Array com IDs das mensagens a serem marcadas como lidas
   * @returns {Promise} Retorna confirmação da operação
   */
  async marcarComoLidas(mensagemIds) {
    try {
      // Faz uma requisição PUT para atualizar o status das mensagens
      const response = await api.put('/mensagens/marcar-lidas', {
        mensagemIds
      });
      // Retorna a resposta da operação
      return response.data;
    } catch (error) {
      // Loga o erro no console
      console.error('Erro ao marcar mensagens como lidas:', error);
      // Repassa o erro
      throw error;
    }
  }
};

/**
 * Classe WebSocketService
 * Gerencia conexão WebSocket para mensagens em tempo real
 * Permite receber mensagens instantâneas sem precisar fazer polling
 */
export class WebSocketService {
  /**
   * Construtor da classe
   * @param {number} usuarioId - ID do usuário para estabelecer conexão
   */
  constructor(usuarioId) {
    this.usuarioId = usuarioId; // Armazena o ID do usuário
    this.ws = null; // Instância do WebSocket (inicialmente nula)
    this.reconnectInterval = 5000; // Intervalo de 5 segundos para tentar reconectar
    this.messageHandlers = []; // Array de funções que serão chamadas ao receber mensagens
  }

  /**
   * Estabelece conexão WebSocket com o servidor
   * Configura handlers para eventos de conexão, mensagem, erro e desconexão
   */
  connect() {
    // Cria nova conexão WebSocket passando o ID do usuário como parâmetro
    this.ws = new WebSocket(`ws://localhost:5000/ws?userId=${this.usuarioId}`);

    // Handler executado quando a conexão é estabelecida com sucesso
    this.ws.onopen = () => {
      console.log('WebSocket conectado');
    };

    // Handler executado quando uma mensagem é recebida do servidor
    this.ws.onmessage = (event) => {
      // Converte a mensagem JSON recebida em objeto JavaScript
      const message = JSON.parse(event.data);
      // Chama todas as funções handlers registradas, passando a mensagem
      this.messageHandlers.forEach(handler => handler(message));
    };

    // Handler executado quando ocorre um erro na conexão
    this.ws.onerror = (error) => {
      console.error('Erro no WebSocket:', error);
    };

    // Handler executado quando a conexão é fechada
    this.ws.onclose = () => {
      console.log('WebSocket desconectado. Reconectando...');
      // Tenta reconectar após o intervalo definido
      setTimeout(() => this.connect(), this.reconnectInterval);
    };
  }

  /**
   * Registra uma função para ser chamada quando mensagens forem recebidas
   * @param {Function} handler - Função que será executada ao receber mensagem
   */
  onMessage(handler) {
    // Adiciona o handler ao array de handlers
    this.messageHandlers.push(handler);
  }

  /**
   * Envia uma mensagem pelo WebSocket
   * @param {Object} message - Objeto da mensagem a ser enviada
   */
  sendMessage(message) {
    // Verifica se o WebSocket está conectado antes de enviar
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Converte o objeto em string JSON e envia
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Fecha a conexão WebSocket
   */
  disconnect() {
    // Se houver uma conexão ativa, fecha ela
    if (this.ws) {
      this.ws.close();
    }
  }
}
