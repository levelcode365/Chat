// src/bot/estados-novos.js
class EstadosNovosService {
  constructor() {
    this.estados = {
      // Estados do novo fluxo
      AGUARDANDO_NOME: 'AGUARDANDO_NOME',
      IDENTIFICANDO: 'IDENTIFICANDO', // Quando há múltiplos resultados
      IDENTIFICADO: 'IDENTIFICADO', // Usuário identificado com sucesso
      MENU_PRINCIPAL: 'MENU_PRINCIPAL', // Exibindo menu
      PROCESSANDO_OPCAO: 'PROCESSANDO_OPCAO', // Processando seleção
      AGUARDANDO_DETALHES: 'AGUARDANDO_DETALHES', // Aguardando mais informações
      RESOLVENDO: 'RESOLVENDO', // Bot tentando resolver
      FINALIZADA: 'FINALIZADA',
      TIMEOUT: 'TIMEOUT'
    };
  }

  getEstado(nome) {
    return this.estados[nome];
  }

  getAllEstados() {
    return this.estados;
  }

  isEstadoAtivo(estado) {
    const estadosAtivos = [
      this.estados.AGUARDANDO_NOME,
      this.estados.IDENTIFICANDO,
      this.estados.IDENTIFICADO,
      this.estados.MENU_PRINCIPAL,
      this.estados.PROCESSANDO_OPCAO,
      this.estados.AGUARDANDO_DETALHES,
      this.estados.RESOLVENDO
    ];
    return estadosAtivos.includes(estado);
  }

  isEstadoFinalizado(estado) {
    return estado === this.estados.FINALIZADA || estado === this.estados.TIMEOUT;
  }

  getNextEstado(currentEstado, action) {
    const transicoes = {
      AGUARDANDO_NOME: {
        USER_FOUND_SINGLE: this.estados.IDENTIFICADO,
        USER_FOUND_MULTIPLE: this.estados.IDENTIFICANDO,
        USER_NOT_FOUND: this.estados.MENU_PRINCIPAL
      },
      IDENTIFICANDO: {
        USER_SELECTED: this.estados.MENU_PRINCIPAL,
        TIMEOUT: this.estados.TIMEOUT
      },
      IDENTIFICADO: {
        SHOW_MENU: this.estados.MENU_PRINCIPAL,
        TIMEOUT: this.estados.TIMEOUT
      },
      MENU_PRINCIPAL: {
        OPTION_SELECTED: this.estados.PROCESSANDO_OPCAO,
        TIMEOUT: this.estados.TIMEOUT
      },
      PROCESSANDO_OPCAO: {
        NEED_DETAILS: this.estados.AGUARDANDO_DETALHES,
        CAN_RESOLVE: this.estados.RESOLVENDO,
        NEED_TRANSFER: this.estados.FINALIZADA, // Por enquanto finaliza
        TIMEOUT: this.estados.TIMEOUT
      },
      AGUARDANDO_DETALHES: {
        DETAILS_RECEIVED: this.estados.RESOLVENDO,
        TIMEOUT: this.estados.TIMEOUT
      },
      RESOLVENDO: {
        RESOLVED: this.estados.MENU_PRINCIPAL,
        NOT_RESOLVED: this.estados.MENU_PRINCIPAL,
        TIMEOUT: this.estados.TIMEOUT
      }
    };

    return transicoes[currentEstado]?.[action] || currentEstado;
  }
}

module.exports = EstadosNovosService;