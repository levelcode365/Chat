// back/src/bot/fluxo-conversa.js
const sql = require('mssql');
const config = require('../config/banco');

class FluxoConversa {
  constructor() {
    this.fluxos = {
      // FLUXO DE IDENTIFICAÇÃO
      AGUARDANDO_NOME: {
        processar: async (mensagem, intencao, contexto) => {
          // Tentar extrair nome da mensagem
          const nomeExtraido = this.extrairNome(mensagem);
          
          if (nomeExtraido) {
            // Buscar cliente no banco
            const cliente = await this.buscarClientePorNome(nomeExtraido);
            
            if (cliente) {
              contexto.dadosCliente = cliente;
              contexto.clienteId = cliente.id;
              contexto.estado = 'IDENTIFICADO';
              return { 
                resposta: `resposta.saudacaoPersonalizada(${cliente.nome})`,
                atualizarContexto: contexto
              };
            } else {
              contexto.nomeTemporario = nomeExtraido;
              contexto.estado = 'VERIFICANDO_CLIENTE';
              return {
                resposta: `resposta.nomeNaoEncontrado()`,
                atualizarContexto: contexto
              };
            }
          } else {
            // Não encontrou nome, pedir novamente
            return {
              resposta: 'resposta.pedirNome()',
              atualizarContexto: contexto
            };
          }
        }
      },

      VERIFICANDO_CLIENTE: {
        processar: (mensagem, intencao, contexto) => {
          const respostaLower = mensagem.toLowerCase();
          
          if (respostaLower.includes('sim') || respostaLower.includes('sou cliente')) {
            contexto.estado = 'SOLICITANDO_EMAIL';
            return {
              resposta: 'resposta.pedirEmail()',
              atualizarContexto: contexto
            };
          } else if (respostaLower.includes('não') || respostaLower.includes('nao') || respostaLower.includes('ainda não')) {
            contexto.estado = 'NOVO_CLIENTE';
            return {
              resposta: 'Seja bem-vindo! Como posso ajudar?',
              atualizarContexto: contexto
            };
          } else {
            return {
              resposta: 'resposta.confirmarCliente()',
              atualizarContexto: contexto
            };
          }
        }
      },

      SOLICITANDO_EMAIL: {
        processar: async (mensagem, intencao, contexto) => {
          const email = this.extrairEmail(mensagem);
          
          if (email) {
            const cliente = await this.buscarClientePorEmail(email);
            
            if (cliente) {
              contexto.dadosCliente = cliente;
              contexto.clienteId = cliente.id;
              contexto.estado = 'IDENTIFICADO';
              return {
                resposta: `resposta.saudacaoPersonalizada(${cliente.nome})`,
                atualizarContexto: contexto
              };
            } else {
              return {
                resposta: 'E-mail não encontrado. Você pode informar seu nome completo?',
                atualizarContexto: contexto
              };
            }
          } else {
            return {
              resposta: 'Não consegui identificar um e-mail válido. Poderia informar novamente?',
              atualizarContexto: contexto
            };
          }
        }
      },

      IDENTIFICADO: {
        processar: (mensagem, intencao, contexto) => {
          // Cliente identificado, agora tratar a intenção real
          contexto.estado = 'COM_BOT';
          return {
            resposta: this.tratarIntencaoPrincipal(intencao, mensagem, contexto),
            atualizarContexto: contexto
          };
        }
      },

      COM_BOT: {
        processar: (mensagem, intencao, contexto) => {
          // Verificar se já excedeu tentativas
          if (contexto.tentativasBot >= 3 && intencao.tipo === 'nao_entendido') {
            contexto.estado = 'SOLICITANDO_TRANSFERENCIA';
            return {
              resposta: 'resposta.naoEntendeu(3)',
              atualizarContexto: contexto
            };
          }

          // Tratar intenção atual
          return {
            resposta: this.tratarIntencaoPrincipal(intencao, mensagem, contexto),
            atualizarContexto: contexto
          };
        }
      },

      SOLICITANDO_TRANSFERENCIA: {
        processar: (mensagem, intencao, contexto) => {
          const respostaLower = mensagem.toLowerCase();
          
          if (respostaLower.includes('sim') || respostaLower.includes('quero')) {
            contexto.estado = 'AGUARDANDO_ATENDENTE';
            return {
              resposta: 'resposta.transferenciaParaAtendente()',
              atualizarContexto: contexto,
              transferir: true
            };
          } else {
            contexto.estado = 'COM_BOT';
            contexto.tentativasBot = 0; // Resetar tentativas
            return {
              resposta: 'Vamos tentar novamente então. Como posso ajudar?',
              atualizarContexto: contexto
            };
          }
        }
      },

      AGUARDANDO_ATENDENTE: {
        processar: (mensagem, intencao, contexto) => {
          // Enquanto aguarda atendente, pode responder apenas mensagens simples
          if (intencao.tipo === 'saudacao' || intencao.tipo === 'agradecimento') {
            return {
              resposta: 'Aguarde um momento, você será atendido em breve.',
              atualizarContexto: contexto
            };
          }
          
          return {
            resposta: 'Seu atendente já está a caminho. Por favor, aguarde.',
            atualizarContexto: contexto
          };
        }
      }
    };
  }

  async processar(estadoAtual, mensagem, intencao, contexto) {
    const fluxo = this.fluxos[estadoAtual];
    
    if (!fluxo) {
      console.error(`Fluxo não encontrado para estado: ${estadoAtual}`);
      return { resposta: 'resposta.erroGenerico()', atualizarContexto: contexto };
    }

    try {
      const resultado = await fluxo.processar(mensagem, intencao, contexto);
      return resultado;
    } catch (error) {
      console.error('Erro no processamento do fluxo:', error);
      return { resposta: 'resposta.erroGenerico()', atualizarContexto: contexto };
    }
  }

  tratarIntencaoPrincipal(intencao, mensagem, contexto) {
    switch (intencao.tipo) {
      case 'saudacao':
        return contexto.dadosCliente 
          ? `resposta.saudacaoPersonalizada(${contexto.dadosCliente.nome})`
          : 'resposta.saudacaoGenerica()';
      
      case 'produto':
        return 'resposta.pedirNomeProduto()';
      
      case 'preco':
        return 'resposta.pedirNomeProduto()';
      
      case 'estoque':
        return 'resposta.verificarEstoque()';
      
      case 'problema_tecnico':
        return 'resposta.pedirDetalhesProblema()';
      
      case 'solicitacao_atendente':
        return 'resposta.transferenciaParaAtendente()';
      
      case 'agradecimento':
        return 'De nada! Fico feliz em ajudar. Precisa de mais alguma coisa?';
      
      case 'despedida':
        return 'resposta.encerramentoPadrao()';
      
      case 'nao_entendido':
        return `resposta.naoEntendeu(${contexto.tentativasBot + 1})`;
      
      default:
        return 'resposta.confirmacaoSimples()';
    }
  }

  // Métodos auxiliares
  extrairNome(mensagem) {
    // Padrões comuns para nome
    const padroes = [
      /(meu nome é|eu sou o|eu sou a|chamo-me|sou o|sou a)\s+([A-Za-zÀ-ÿ\s]+)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/ // Nome com múltiplas palavras capitalizadas
    ];

    for (const padrao of padroes) {
      const match = mensagem.match(padrao);
      if (match) {
        return match[2] || match[1];
      }
    }

    return null;
  }

  extrairEmail(mensagem) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = mensagem.match(emailRegex);
    return match ? match[0] : null;
  }

  async buscarClientePorNome(nome) {
    try {
      const pool = await sql.connect(config);
      const result = await pool.request()
        .input('nome', sql.NVarChar, `%${nome}%`)
        .query(`
          SELECT TOP 1 id, nome, email, telefone, 
                 CASE WHEN vip = 1 THEN 1 ELSE 0 END as vip
          FROM clientes 
          WHERE nome LIKE @nome
          ORDER BY id DESC
        `);
      
      return result.recordset[0] || null;
    } catch (error) {
      console.error('Erro ao buscar cliente por nome:', error);
      return null;
    }
  }

  async buscarClientePorEmail(email) {
    try {
      const pool = await sql.connect(config);
      const result = await pool.request()
        .input('email', sql.NVarChar, email)
        .query(`
          SELECT id, nome, email, telefone, 
                 CASE WHEN vip = 1 THEN 1 ELSE 0 END as vip
          FROM clientes 
          WHERE email = @email
        `);
      
      return result.recordset[0] || null;
    } catch (error) {
      console.error('Erro ao buscar cliente por email:', error);
      return null;
    }
  }

  async buscarProduto(nomeProduto) {
    try {
      const pool = await sql.connect(config);
      const result = await pool.request()
        .input('nome', sql.NVarChar, `%${nomeProduto}%`)
        .query(`
          SELECT TOP 1 id, nome, preco, estoque, categoria
          FROM produtos 
          WHERE nome LIKE @nome AND ativo = 1
        `);
      
      return result.recordset[0] || null;
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      return null;
    }
  }
}

module.exports = FluxoConversa;