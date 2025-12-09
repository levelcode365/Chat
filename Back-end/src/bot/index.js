// src/bot/index.js
const BotService = require('./bot.service');
const IntencoesService = require('./intencoes');
const RespostasService = require('./respostas');
const AprendizadoService = require('./aprendizado');
const FluxoConversa = require('./fluxo-conversa');
const EstadosService = require('./estados');
const TransferenciaService = require('./transferencia');
const BancoService = require('./banco.service');

// NOVOS SERVIÇOS
const UserService = require('./user.service');
const MenuService = require('./menu.service');
const MessageService = require('./message.service');

// Inicializar instâncias
const intencoes = new IntencoesService();
const respostas = new RespostasService();
const aprendizado = new AprendizadoService();
const fluxo = new FluxoConversa();
const estados = new EstadosService();
const transferencia = new TransferenciaService();
const banco = new BancoService();

// NOVAS INSTÂNCIAS
const userService = new UserService();
const menuService = new MenuService();
const messageService = new MessageService();

const botService = new BotService();

module.exports = {
  // Instância principal
  bot: botService,
  
  // Serviços individuais
  BotService,
  IntencoesService,
  RespostasService,
  AprendizadoService,
  FluxoConversa,
  EstadosService,
  TransferenciaService,
  BancoService,
  
  // NOVOS SERVIÇOS
  UserService,
  MenuService,
  MessageService,
  userService,
  menuService,
  messageService,
  
  // Atalhos para métodos comuns
  processarMensagem: (conversaId, mensagem, clienteId) => 
    botService.processarMensagem(conversaId, mensagem, clienteId),
    
  iniciarConversa: (conversaId, clienteId) => 
    botService.iniciarConversa(conversaId, clienteId),
    
  encerrarConversa: (conversaId, resolvido) => 
    botService.encerrarConversa(conversaId, resolvido),
    
  // NOVOS ATALHOS
  buscarUsuarios: (termo) => userService.searchUsers(termo),
  gerarMenu: () => menuService.generateMenuText(),
  salvarMensagem: (conversaId, remetente, mensagem, isBot, intencao) => 
    messageService.saveMessage(conversaId, remetente, mensagem, isBot, intencao),
  
  // Utilitários
  intencoes,
  respostas,
  aprendizado,
  fluxo,
  estados,
  transferencia,
  banco,
  userService,
  menuService,
  messageService
};