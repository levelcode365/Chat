// Back-end/src/bot/menu.service.js - ATUALIZADO SEM HTML

class MenuService {
  constructor() {
    this.menuOptions = {
      1: { 
        id: 1, 
        title: "Reportar problema técnico", 
        description: "Problemas com sistema, erros, bugs, lentidão" 
      },
      2: { 
        id: 2, 
        title: "Consultar status de pedido/serviço", 
        description: "Acompanhar pedidos, serviços em andamento" 
      },
      3: { 
        id: 3, 
        title: "Dúvidas sobre produtos/serviços", 
        description: "Informações sobre produtos, preços, especificações" 
      },
      4: { 
        id: 4, 
        title: "Visualizar dados cadastrais", 
        description: "Consultar seus dados, atualizar informações" 
      },
      5: { 
        id: 5, 
        title: "Falar com atendente humano (abrir chamado)", 
        description: "Transferir para um de nossos especialistas" 
      },
      6: { 
        id: 6, 
        title: "Outras questões", 
        description: "Assuntos não listados acima" 
      }
    };
  }

  // Gera o menu formatado SEM HTML
  generateMenuText() {
    let menuText = "📋 **MENU PRINCIPAL**\n\n";
    menuText += "Por favor, escolha uma das opções abaixo:\n\n";
    
    Object.values(this.menuOptions).forEach(option => {
      menuText += `[${option.id}] ${option.title}\n`;
      menuText += `   📝 ${option.description}\n\n`;
    });
    
    menuText += "\nDigite apenas o número da opção (1-6):";
    return menuText;
  }

  // Retorna detalhes de uma opção específica
  getOptionDetails(optionId) {
    return this.menuOptions[optionId] || null;
  }

  // Valida se a opção é válida
  isValidOption(optionId) {
    return optionId >= 1 && optionId <= 6;
  }

  // Retorna resposta específica para cada opção SEM HTML
  getOptionResponse(optionId, clienteNome = '') {
    const responses = {
      1: `🔧 ${clienteNome ? clienteNome + ', ' : ''}você selecionou: Reportar problema técnico\n\n` +
         'Por favor, descreva o problema com detalhes:\n' +
         '• Qual sistema/módulo está com problema?\n' +
         '• O que você estava fazendo quando aconteceu?\n' +
         '• Há quanto tempo isso ocorre?\n\n' +
         'Descreva o máximo de detalhes possível para podermos ajudá-lo melhor.',

      2: `📦 ${clienteNome ? clienteNome + ', ' : ''}você selecionou: Consultar status de pedido/serviço\n\n` +
         'Para consultar o status, preciso de algumas informações:\n' +
         '• Número do pedido ou protocolo\n' +
         '• CPF/CNPJ associado\n' +
         '• Data aproximada do pedido\n\n' +
         'Se não tiver essas informações à mão, posso transferi-lo para um atendente.',

      3: `💼 ${clienteNome ? clienteNome + ', ' : ''}você selecionou: Dúvidas sobre produtos/serviços\n\n` +
         'Sobre qual produto/serviço você gostaria de informações?\n' +
         '• Nome do produto/serviço\n' +
         '• Código (se souber)\n' +
         '• Sua dúvida específica\n\n' +
         'Tenho acesso ao catálogo completo e posso ajudar com especificações técnicas.',

      4: `👤 ${clienteNome ? clienteNome + ', ' : ''}você selecionou: Visualizar dados cadastrais\n\n` +
         'Para consultar seus dados, preciso confirmar algumas informações:\n' +
         '• Seu CPF/CNPJ\n' +
         '• E-mail cadastrado\n' +
         '• Últimos 4 dígitos do telefone cadastrado\n\n' +
         'Sua privacidade é importante. As informações serão usadas apenas para validação.',

      5: `👨‍💼 ${clienteNome ? clienteNome + ', ' : ''}você selecionou: Falar com atendente humano\n\n` +
         'Estou transferindo sua conversa para um de nossos especialistas.\n' +
         'Por favor, aguarde alguns instantes...\n\n' +
         '🔄 Sua posição na fila: #1\n' +
         'Tempo estimado de espera: 1-3 minutos\n\n' +
         'Enquanto isso, você pode descrever brevemente o motivo do contato.',

      6: `❓ ${clienteNome ? clienteNome + ', ' : ''}você selecionou: Outras questões\n\n` +
         'Por favor, descreva sua dúvida ou solicitação:\n' +
         '• Qual é o assunto?\n' +
         '• É urgente?\n' +
         '• Já tentou resolver de outra forma?\n\n' +
         'Tentarei ajudar no que for possível ou transferirei para o setor correto.'
    };

    return responses[optionId] || 'Opção inválida. Por favor, escolha um número entre 1 e 6.';
  }
}

module.exports = MenuService;