// back/src/bot/intencoes.js
class IntencoesService {
  constructor() {
    this.padroes = {
      saudacao: {
        palavras: ['olá', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'ola', 'eae', 'iai'],
        tipo: 'saudacao',
        prioridade: 1
      },
      nome: {
        palavras: ['meu nome é', 'eu sou o', 'eu sou a', 'chamo-me', 'sou o', 'sou a'],
        tipo: 'identificacao',
        prioridade: 2
      },
      produto: {
        palavras: ['produto', 'item', 'mercadoria', 'compra', 'loja', 'catálogo', 'catalogo'],
        tipo: 'produto',
        prioridade: 3
      },
      preco: {
        palavras: ['preço', 'valor', 'quanto custa', 'custa quanto', 'preco'],
        tipo: 'preco',
        prioridade: 3
      },
      estoque: {
        palavras: ['estoque', 'disponível', 'tem em estoque', 'disponibilidade', 'tem?', 'tem ainda?'],
        tipo: 'estoque',
        prioridade: 3
      },
      problema: {
        palavras: ['problema', 'erro', 'defeito', 'quebrou', 'não funciona', 'não funciona', 'bug'],
        tipo: 'problema_tecnico',
        prioridade: 9
      },
      atendente: {
        palavras: ['atendente', 'humano', 'pessoa', 'falar com alguém', 'alguém real'],
        tipo: 'solicitacao_atendente',
        prioridade: 10
      },
      agradecimento: {
        palavras: ['obrigado', 'obrigada', 'valeu', 'agradeço', 'grato', 'gratidao'],
        tipo: 'agradecimento',
        prioridade: 1
      },
      despedida: {
        palavras: ['tchau', 'adeus', 'até mais', 'flw', 'falo depois', 'encerrar'],
        tipo: 'despedida',
        prioridade: 1
      }
    };
  }

  detectar(mensagem) {
    const mensagemLower = mensagem.toLowerCase().trim();
    
    // Detecção de padrões
    const intencoesDetectadas = [];
    
    for (const [nome, padrao] of Object.entries(this.padroes)) {
      for (const palavra of padrao.palavras) {
        if (mensagemLower.includes(palavra)) {
          intencoesDetectadas.push({
            tipo: padrao.tipo,
            confianca: this.calcularConfianca(mensagemLower, palavra),
            palavraChave: palavra,
            prioridade: padrao.prioridade
          });
          break; // Não precisa verificar outras palavras do mesmo padrão
        }
      }
    }

    // Ordenar por prioridade e confiança
    intencoesDetectadas.sort((a, b) => {
      if (a.prioridade !== b.prioridade) {
        return b.prioridade - a.prioridade;
      }
      return b.confianca - a.confianca;
    });

    // Retornar a intenção principal ou "nao_entendido"
    if (intencoesDetectadas.length > 0) {
      return {
        tipo: intencoesDetectadas[0].tipo,
        secundarias: intencoesDetectadas.slice(1).map(i => i.tipo),
        confianca: intencoesDetectadas[0].confianca
      };
    }

    return {
      tipo: 'nao_entendido',
      secundarias: [],
      confianca: 0
    };
  }

  calcularConfianca(mensagem, palavra) {
    // Confiança baseada na posição e relevância da palavra
    const posicao = mensagem.indexOf(palavra);
    const comprimentoPalavra = palavra.length;
    const comprimentoMensagem = mensagem.length;
    
    // Palavras no início têm mais confiança
    const scorePosicao = posicao === 0 ? 1.0 : 1.0 - (posicao / comprimentoMensagem);
    
    // Palavras mais longas têm mais confiança
    const scoreComprimento = comprimentoPalavra / 10; // Máximo 0.4
    
    return Math.min(scorePosicao + scoreComprimento, 1.0);
  }

  // Método para adicionar novas intenções dinamicamente
  adicionarPadrao(nome, palavras, tipo, prioridade = 3) {
    this.padroes[nome] = {
      palavras,
      tipo,
      prioridade
    };
  }

  // Método para treinar com exemplos
  aprenderComExemplo(mensagem, intencaoCorreta) {
    // Implementação básica de aprendizado
    // Em produção, usaríamos um modelo de ML
    console.log(`Aprendendo: "${mensagem}" → ${intencaoCorreta}`);
    
    // Adicionar palavras únicas da mensagem ao padrão existente
    const palavrasMensagem = mensagem.toLowerCase().split(/\s+/);
    
    if (this.padroes[intencaoCorreta]) {
      // Adicionar novas palavras que não estão no padrão
      palavrasMensagem.forEach(palavra => {
        if (palavra.length > 2 && !this.padroes[intencaoCorreta].palavras.includes(palavra)) {
          this.padroes[intencaoCorreta].palavras.push(palavra);
        }
      });
    }
  }
}

module.exports = IntencoesService;