import { io } from "socket.io-client";
export class WebSocketService {
  constructor(userId, conversaId, userType = 'cliente') {
    this.userId = userId;
    this.conversaId = conversaId;
    this.userType = userType;
    this.socket = null;
    this.messageHandlers = [];
    this.isInitialized = false;
    this.serverUrl = 'http://localhost:3001';
  }
  connect() {
    if (this.socket && this.socket.connected) {
      console.log('Já conectado');
      return;
    }
    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 5000,
      reconnectionAttempts: 5
    });
    this._setupEventListeners();
    this.isInitialized = true;
  }
  _setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('Conectado:', this.socket.id);
      
      if (this.userType === 'cliente') {
        this.socket.emit('cliente_connect', {
          userId: this.userId,
          conversaId: this.conversaId
        });
      } else if (this.userType === 'atendente') {
        this.socket.emit('atendente_connect', {
          atendenteId: this.userId
        });
      }
    });
    this.socket.on('connection_established', (data) => {
      this._notifyHandlers({ type: 'connection_established', data });
    });
    this.socket.on('bot_response', (data) => {
      this._notifyHandlers({ type: 'bot_response', data });
    });
    this.socket.on('transferring_to_atendente', (data) => {
      this._notifyHandlers({ type: 'transferring_to_atendente', data });
    });
    this.socket.on('atendente_assumiu', (data) => {
      this._notifyHandlers({ type: 'atendente_assumiu', data });
    });
    this.socket.on('atendente_connected', (data) => {
      this._notifyHandlers({ type: 'atendente_connected', data });
    });
    this.socket.on('transferencia-humano', (data) => {
      this._notifyHandlers({ type: 'nova_solicitacao', data });
    });
    this.socket.on('conversa-assumida', (data) => {
      this._notifyHandlers({ type: 'conversa_assumida', data });
    });
    this.socket.on('nova-mensagem', (data) => {
      this._notifyHandlers({ type: 'nova-mensagem', data });
    });
    this.socket.on('error', (error) => {
      this._notifyHandlers({ type: 'error', data: error });
    });
    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Desconectado:', reason);
    });
  }
  enviarMensagem(mensagem, sessionData = {}) {
    if (!this.socket || !this.socket.connected) {
      console.warn('Socket não conectado');
      return;
    }
    this.socket.emit('cliente_message', {
      userId: this.userId,
      conversaId: this.conversaId,
      message: mensagem,
      sessionData: {
        userName: sessionData.userName || `User_${this.userId}`,
        userType: sessionData.userType || 'cliente_regular',
        ...sessionData
      }
    });
  }
  aceitarCliente(clienteUserId, clienteConversaId) {
    if (!this.socket || !this.socket.connected) return;

    this.socket.emit('atendente_accept_client', {
      atendenteId: this.userId,
      userId: clienteUserId,
      conversaId: clienteConversaId
    });
  }
  onMessage(callback) {
    this.messageHandlers.push(callback);
  }
  removeMessageHandler(callback) {
    this.messageHandlers = this.messageHandlers.filter(h => h !== callback);
  }
  _notifyHandlers(message) {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('❌ Erro no handler:', error);
      }
    });
  }
  disconnect() {
    if (this.socket) {
      if (this.userType === 'atendente') {
        this.socket.emit('atendente_disconnect', {
          atendenteId: this.userId
        });
      }
      this.socket.disconnect();
      this.socket = null;
    }
    this.messageHandlers = [];
    this.isInitialized = false;
  }
  isConnected() {
    return this.socket && this.socket.connected;
  }
}