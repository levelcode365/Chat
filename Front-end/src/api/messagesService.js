import api from './apiConfig';

export const MessagesService = {
  /**
   * @param {string} texto 
   * @param {number} remetenteId
   * @returns {Promise}
   */
  async enviarMensagem(texto, remetenteId) {
    try {
      const response = await api.post('/mensagens', {
        texto,
        remetenteId,
        dataHora: new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  },

  /**

   * @param {number} usuarioId
   * @returns {Promise}
   */
  async buscarMensagens(usuarioId) {
    try {
      const response = await api.get(`/mensagens/usuario/${usuarioId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      throw error;
    }
  },

  /**
   * @param {number[]} mensagemIds
   * @returns {Promise}
   */
  async marcarComoLidas(mensagemIds) {
    try {
      const response = await api.put('/mensagens/marcar-lidas', {
        mensagemIds
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao marcar mensagens como lidas:', error);
      throw error;
    }
  }
};