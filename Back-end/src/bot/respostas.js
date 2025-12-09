// Back-end/src/bot/respostas.js - CORRIGIDO

class RespostasService {
  constructor() {
    this.respostas = {
      // SAUDAÇÕES
      saudacaoGenerica: () => {
        const saudacoes = [
          "Olá! 😊 Sou o assistente virtual da LevelShop. Como posso ajudá-lo hoje?",
          "Oi! Tudo bem? Eu sou o assistente virtual. Em que posso ser útil?",
          "Bem-vindo à LevelShop! Eu sou seu assistente virtual. Como posso ajudar?"
        ];
        return saudacoes[Math.floor(Math.random() * saudacoes.length)];
      },

      saudacaoPersonalizada: (nome) => {
        const saudacoes = [
          `Olá, ${nome}! 😊 Que bom ver você de novo! Como posso ajudar hoje?`,
          `Oi, ${nome}! Tudo bem? Em que posso ser útil?`,
          `${nome}, seja bem-vindo(a) de volta! Como posso ajudar hoje?`
        ];
        return saudacoes[Math.floor(Math.random() * saudacoes.length)];
      },

      // IDENTIFICAÇÃO
      pedirNome: () => {
        return "Para melhor atendê-lo, poderia me informar seu nome completo?";
      },

      confirmarCliente: () => {
        return "Você já é cliente da LevelShop? (Sim/Não)";
      },

      pedirEmail: () => {
        return "Poderia informar seu e-mail para que eu possa localizar seus dados?";
      },

      nomeNaoEncontrado: () => {
        return "Não encontrei seu nome em nossa base. Você já é cliente da LevelShop?";
      },

      // PRODUTOS
      pedirNomeProduto: () => {
        return "Poderia me informar o nome do produto que você está procurando?";
      },

      produtoNaoEncontrado: (nomeProduto) => {
        return `Não encontrei "${nomeProduto}" em nosso catálogo. Poderia verificar o nome ou me informar o código do produto?`;
      },

      informarPreco: (produto, preco) => {
        return `O produto ${produto} está por R$ ${preco.toFixed(2)}.`;
      },

      // PROBLEMAS/TÉCNICO
      pedirDetalhesProblema: () => {
        return "Entendi que você está com um problema. Para que eu possa ajudar melhor, poderia descrever com mais detalhes o que está acontecendo?";
      },

      coletarDadosParaAtendente: () => {
        return "Para otimizar o atendimento, vou coletar algumas informações antes de transferir você para um de nossos especialistas.";
      },

      // TRANSFERÊNCIA
      transferenciaParaAtendente: () => {
        return "Entendi sua necessidade! Estou transferindo você para um de nossos atendentes especialistas. Aguarde um momento, por favor. ⏳";
      },

      foraHorarioAtendimento: () => {
        return "Atendimento humano disponível das 8h às 14h, de segunda a sexta. Enquanto isso, posso tentar ajudar com informações básicas ou coletar seus dados para retorno posterior.";
      },

      atendentesIndisponiveis: () => {
        return "No momento, todos os nossos atendentes estão ocupados. Você prefere:\n1. Aguardar na fila (tempo estimado: 5-10 minutos)\n2. Receber um retorno por e-mail\n3. Continuar comigo tentando resolver";
      },

      // FLUXO CONVERSACIONAL
      naoEntendeu: (tentativa) => {
        if (tentativa === 1) {
          return "Não entendi completamente. Poderia reformular sua pergunta?";
        } else if (tentativa === 2) {
          return "Ainda não consegui entender. Gostaria de:\n1. Tentar novamente explicando de outra forma\n2. Falar com um atendente humano";
        }
        return "Parece que não estou conseguindo ajudar da melhor forma. Vou transferir você para um atendente humano que certamente conseguirá resolver.";
      },

      perguntarMaisAlgumaCoisa: () => {
        return "Posso ajudar com mais alguma coisa?";
      },

      // ENCERRAMENTO
      encerramentoPadrao: () => {
        const despedidas = [
          "Obrigado por conversar comigo! Volte sempre que precisar. Tenha um ótimo dia! 👋",
          "Foi um prazer ajudar! Qualquer dúvida, estou aqui. Até logo! 😊",
          "Agradeço pelo contato! Espero ter ajudado. Até a próxima! ✨"
        ];
        return despedidas[Math.floor(Math.random() * despedidas.length)];
      },

      encerramentoResolvido: () => {
        return "Fico feliz em saber que consegui ajudar! Se tiver mais alguma dúvida, estarei aqui. Tenha um excelente dia! 🌟";
      },

      // SITUAÇÕES ESPECIAIS
      perguntaInatividade: () => {
        return "Ainda está aí? Se precisar de mais alguma coisa, é só falar!";
      },

      sistemaManutencao: () => {
        return "No momento, nosso sistema está em manutenção para melhor atendê-lo. Por favor, tente novamente em alguns minutos ou deixe seu e-mail para retornarmos o contato.";
      },

      // FORMAS DE PAGAMENTO
      listarFormasPagamento: () => {
        return "Aceitamos as seguintes formas de pagamento:\n• Cartão de crédito (até 12x)\n• Cartão de débito\n• PIX (5% de desconto)\n• Boleto bancário\n• Transferência bancária";
      },

      // PRAZOS DE ENTREGA
      pedirCepEntrega: () => {
        return "Para calcular o frete e informar o prazo de entrega, preciso do seu CEP. Pode me informar?";
      },

      informarPrazoEntrega: (cep, prazo, valorFrete) => {
        return `Para o CEP ${cep}:\n• Prazo de entrega: ${prazo} dias úteis\n• Valor do frete: R$ ${valorFrete.toFixed(2)}`;
      },

      // ERROS
      erroGenerico: () => {
        return "Desculpe, estou com uma dificuldade técnica no momento. Pode tentar novamente em alguns instantes?";
      },

      // CONFIRMAÇÕES
      confirmacaoSimples: () => {
        return "Entendi! Vou verificar isso para você.";
      },

      // ============ NOVAS RESPOSTAS PARA IDENTIFICAÇÃO E MENU ============
      pedindo_nome: () => {
        const frases = [
          "Para personalizar seu atendimento, qual seu nome?",
          "Antes de começarmos, como posso chamar você?",
          "Por favor, digite seu nome para continuarmos:",
          "Qual é o seu nome? Assim posso te ajudar melhor!"
        ];
        return frases[Math.floor(Math.random() * frases.length)];
      },

      saudacao_identificada: (params) => {
        const nome = params.nome || 'Cliente';
        const frases = [
          `Olá, ${nome}! Que bom te ver de novo! 😊\n`,
          `Oi, ${nome}! Como vai? Espero que bem!\n`,
          `${nome}, é sempre um prazer! 👋\n`,
          `Que bom falar com você novamente, ${nome}!\n`
        ];
        return frases[Math.floor(Math.random() * frases.length)];
      },

      multiplos_usuarios: (params) => {
        return `Encontrei vários resultados:\n${params.lista}\n\nDigite o número correspondente ao seu nome:`;
      },

      usuario_nao_encontrado: () => {
        const frases = [
          "Não encontrei seu cadastro completo.\nPoderia confirmar seu nome completo?",
          "Hmm, não localizei no sistema.\nTente: Nome completo ou email cadastrado",
          "Cadastro não encontrado.\nDeseja criar um novo ou tentar outro nome?"
        ];
        return frases[Math.floor(Math.random() * frases.length)];
      },

      // MENU PRINCIPAL - SEM HTML, APENAS TEXTO
      menu_principal: (params) => {
        const clienteNome = params.nome || '';
        const saudacao = clienteNome 
          ? `Olá, ${clienteNome}! 👋\n\n`
          : 'Olá! 👋\n\n';
        
        return saudacao + 
          '📋 **MENU PRINCIPAL**\n\n' +
          'Por favor, escolha uma das opções abaixo:\n\n' +
          '[1] Reportar problema técnico\n' +
          '   📝 Problemas com sistema, erros, bugs, lentidão\n\n' +
          
          '[2] Consultar status de pedido/serviço\n' +
          '   📝 Acompanhar pedidos, serviços em andamento\n\n' +
          
          '[3] Dúvidas sobre produtos/serviços\n' +
          '   📝 Informações sobre produtos, preços, especificações\n\n' +
          
          '[4] Visualizar dados cadastrais\n' +
          '   📝 Consultar seus dados, atualizar informações\n\n' +
          
          '[5] Falar com atendente humano (abrir chamado)\n' +
          '   📝 Transferir para um de nossos especialistas\n\n' +
          
          '[6] Outras questões\n' +
          '   📝 Assuntos não listados acima\n\n' +
          
          'Digite apenas o número da opção (1-6):';
      },

      opcao_invalida: () => {
        return '❌ Opção inválida. Digite um número entre 1 e 6.';
      },

      analisando_solicitacao: () => {
        const frases = [
          "Analisando sua solicitação... 🔍",
          "Deixe-me verificar isso para você... ⏳",
          "Processando sua requisição...",
          "Um momento, estou consultando as informações... 📊"
        ];
        return frases[Math.floor(Math.random() * frases.length)];
      },

      // RESPOSTAS ESPECÍFICAS PARA CADA OPÇÃO DO MENU - SEM HTML
      problema_tecnico: (params) => {
        const clienteNome = params.nome || '';
        return `🔧 ${clienteNome ? clienteNome + ', ' : ''}você selecionou: Reportar problema técnico\n\n` +
               'Por favor, descreva com detalhes:\n' +
               '• Qual sistema/módulo está com problema?\n' +
               '• O que você estava fazendo quando aconteceu?\n' +
               '• Há quanto tempo isso ocorre?\n\n' +
               'Descreva o máximo de detalhes possível para podermos ajudá-lo melhor.';
      },

      status_pedido: (params) => {
        const clienteNome = params.nome || '';
        return `📦 ${clienteNome ? clienteNome + ', ' : ''}você selecionou: Consultar status de pedido/serviço\n\n` +
               'Para consultar o status, preciso de algumas informações:\n' +
               '• Número do pedido ou protocolo\n' +
               '• CPF/CNPJ associado\n' +
               '• Data aproximada do pedido\n\n' +
               'Se não tiver essas informações à mão, posso transferi-lo para um atendente.';
      },

      duvida_produto: (params) => {
        const clienteNome = params.nome || '';
        return `💼 ${clienteNome ? clienteNome + ', ' : ''}você selecionou: Dúvidas sobre produtos/serviços\n\n` +
               'Sobre qual produto/serviço você gostaria de informações?\n' +
               '• Nome do produto/serviço\n' +
               '• Código (se souber)\n' +
               '• Sua dúvida específica\n\n' +
               'Tenho acesso ao catálogo completo e posso ajudar com especificações técnicas.';
      },

      // CORREÇÃO AQUI: dados_cadastrais corrigido
      dados_cadastrais: (params) => {
        const clienteNome = params.nome || '';
        const userData = params.userData || {};
        
        console.log('🔍 DEBUG dados_cadastrais:', { 
          clienteNome, 
          userData,
          temUserData: !!userData,
          keys: Object.keys(userData)
        });
        
        if (!userData || Object.keys(userData).length === 0) {
          return `👤 ${clienteNome ? clienteNome + ', ' : ''}você selecionou: Visualizar dados cadastrais\n\n` +
                 'Aguarde um momento enquanto busco seus dados... 📊';
        }
        
        // CORREÇÃO: Usar propriedades camelCase (do bot.service.js) ou PascalCase (do banco)
        const nome = userData.nome || userData.Nome || 'Não informado';
        const email = userData.email || userData.Email || 'Não informado';
        const telefone = userData.telefone || userData.Telefone || 'Não informado';
        const login = userData.login || userData.Login || 'Não informado';
        const dataCadastro = userData.DataCadastro || userData.dataCadastro;
        
        let dataFormatada = 'Não informado';
        if (dataCadastro) {
          try {
            dataFormatada = new Date(dataCadastro).toLocaleDateString('pt-BR');
          } catch (e) {
            console.error('Erro ao formatar data:', e.message);
          }
        }
        
        console.log('📊 Dados formatados:', { nome, email, telefone, login, dataFormatada });
        
        return `👤 ${clienteNome ? clienteNome + ', ' : ''}Seus Dados Cadastrais\n\n` +
               `• Nome: ${nome}\n` +
               `• Email: ${email}\n` +
               `• Telefone: ${telefone}\n` +
               `• Login: ${login}\n` +
               `• Cadastro: ${dataFormatada}\n\n` +
               `Deseja atualizar algum dado? (Sim/Não)`;
      },

      transferencia_atendente: (params) => {
        const clienteNome = params.nome || '';
        return `👨‍💼 ${clienteNome ? clienteNome + ', ' : ''}você selecionou: Falar com atendente humano\n\n` +
               'Estou transferindo sua conversa para um de nossos especialistas.\n' +
               'Por favor, aguarde alguns instantes...\n\n' +
               '🔄 Sua posição na fila: #1\n' +
               'Tempo estimado de espera: 1-3 minutos\n\n' +
               'Enquanto isso, você pode descrever brevemente o motivo do contato.';
      },

      outras_questoes: (params) => {
        const clienteNome = params.nome || '';
        return `❓ ${clienteNome ? clienteNome + ', ' : ''}você selecionou: Outras questões\n\n` +
               'Por favor, descreva sua dúvida ou solicitação:\n' +
               '• Qual é o assunto?\n' +
               '• É urgente?\n' +
               '• Já tentou resolver de outra forma?\n\n' +
               'Tentarei ajudar no que for possível ou transferirei para o setor correto.';
      },

      // RESPOSTAS TÉCNICAS
      resolucao_tecnica: () => {
        const solucoes = [
          '🔧 Solução encontrada: Tente reiniciar o aplicativo e limpar o cache. Isso resolve 90% dos casos!',
          '🛠️ Procedimento: Acesse Configurações > Limpar Cache > Confirmar. Isso deve resolver o problema.',
          '💡 Dica: Esse erro é conhecido. Faça logout, aguarde 2 minutos e faça login novamente.'
        ];
        return solucoes[Math.floor(Math.random() * solucoes.length)];
      },

      informacao_pedido: (params) => {
        const numero = params.numero || '0000';
        return `📦 Pedido #${numero}\n` +
               '• Status: Em processamento\n' +
               '• Previsão: 2-3 dias úteis\n' +
               '• Última atualização: Hoje';
      },

      informacao_produto: () => {
        return '📝 Informações do Produto:\n' +
               '• Garantia: 12 meses\n' +
               '• Especificações completas\n' +
               '• Suporte técnico incluso';
      },

      // TIMEOUT
      timeout_warning: () => {
        return '⏰ Aviso de Inatividade\n' +
               'Você está há algum tempo sem responder.\n' +
               'Sua sessão será encerrada em 5 minutos.';
      },

      timeout_finalizado: () => {
        return '⏰ Sessão Encerrada\n' +
               'Sua sessão foi finalizada por inatividade.\n' +
               'Para novo atendimento, reconecte-se.';
      }
    };

    // PALAVRAS PROIBIDAS (substituição)
    this.palavrasProibidas = [
      { original: "garantido", substituicao: "recomendado" },
      { original: "com certeza", substituicao: "provavelmente" },
      { original: "absolutamente", substituicao: "muito provavelmente" },
      { original: "sempre", substituicao: "normalmente" },
      { original: "nunca", substituicao: "raramente" },
      { original: "definitivamente", substituicao: "muito possivelmente" },
      { original: "prometo", substituicao: "posso afirmar que" },
      { original: "asseguro", substituicao: "posso informar que" },
      { original: "comprometo", substituicao: "me esforçarei para" }
    ];
  }

  // Método principal para obter resposta
  obterResposta(tipo, parametros = {}) {
    if (this.respostas[tipo]) {
      let resposta = this.respostas[tipo](parametros);
      resposta = this.sanitizarResposta(resposta);
      return resposta;
    }
    console.error(`❌ Tipo de resposta não encontrado: ${tipo}`);
    return this.respostas.erroGenerico();
  }

  // Sanitizar resposta (remover palavras proibidas)
  sanitizarResposta(resposta) {
    let respostaSanitizada = resposta;
    
    this.palavrasProibidas.forEach(({ original, substituicao }) => {
      const regex = new RegExp(original, 'gi');
      respostaSanitizada = respostaSanitizada.replace(regex, substituicao);
    });

    return respostaSanitizada;
  }

  // Métodos diretos (para facilitar)
  saudacaoGenerica() { return this.obterResposta('saudacaoGenerica'); }
  saudacaoPersonalizada(nome) { return this.obterResposta('saudacaoPersonalizada', { nome }); }
  pedirNome() { return this.obterResposta('pedirNome'); }
  transferenciaParaAtendente() { return this.obterResposta('transferenciaParaAtendente'); }
  foraHorarioAtendimento() { return this.obterResposta('foraHorarioAtendimento'); }
  perguntaInatividade() { return this.obterResposta('perguntaInatividade'); }
  erroGenerico() { return this.obterResposta('erroGenerico'); }
  encerramentoPadrao() { return this.obterResposta('encerramentoPadrao'); }
  encerramentoResolvido() { return this.obterResposta('encerramentoResolvido'); }

  // ============ NOVOS MÉTODOS DIRETOS ============
  pedindoNome() { return this.obterResposta('pedindo_nome'); }
  saudacaoIdentificada(nome) { return this.obterResposta('saudacao_identificada', { nome }); }
  menuPrincipal(nome = '') { return this.obterResposta('menu_principal', { nome }); }
  opcaoInvalida() { return this.obterResposta('opcao_invalida'); }
  analisandoSolicitacao() { return this.obterResposta('analisando_solicitacao'); }
  problemaTecnico(nome = '') { return this.obterResposta('problema_tecnico', { nome }); }
  statusPedido(nome = '') { return this.obterResposta('status_pedido', { nome }); }
  duvidaProduto(nome = '') { return this.obterResposta('duvida_produto', { nome }); }
  dadosCadastrais(userData = null, nome = '') { 
    console.log('📤 Enviando dados para exibição:', { 
      temUserData: !!userData, 
      nome,
      userDataKeys: userData ? Object.keys(userData) : []
    });
    return this.obterResposta('dados_cadastrais', { userData, nome }); 
  }
  transferenciaAtendente(nome = '') { return this.obterResposta('transferencia_atendente', { nome }); }
  outrasQuestoes(nome = '') { return this.obterResposta('outras_questoes', { nome }); }
  resolucaoTecnica() { return this.obterResposta('resolucao_tecnica'); }
  informacaoPedido(numero) { return this.obterResposta('informacao_pedido', { numero }); }
  informacaoProduto() { return this.obterResposta('informacao_produto'); }
  timeoutWarning() { return this.obterResposta('timeout_warning'); }
  timeoutFinalizado() { return this.obterResposta('timeout_finalizado'); }
}

module.exports = RespostasService;