class MessageRouter {
    constructor() {
        this.contadorTentativas = new Map(); // userId → { tentativas: number, horaPrimeira: Date }
        this.historicoDecisoes = new Map(); // userId → histórico de decisões
        this.config = {
            maxTentativasBot: 3,
            horarioFuncionamento: { inicio: 8, fim: 14 }, // 8h às 14h
            timezone: 'America/Sao_Paulo'
        };

        this.palavrasChave = {
            atendenteExplicito: [
                'atendente', 'humano', 'pessoa', 'falar com alguém',
                'operador', 'assistente humano', 'quero pessoa',
                'pessoa real', 'contato humano', 'falar com atendente',
                'preciso de um atendente', 'quero falar com alguém',
                'pode me passar alguém', 'transferir atendente',
                'alguém pode me ajudar', 'preciso de ajuda humana',
                'atendimento humano', 'não quero bot', 'prefiro pessoa'
            ]
        };
    }

    async decidirDestino(mensagem, userId, sessionData = {}) {
        try {
            const mensagemLower = mensagem.toLowerCase();
            
            console.log(`[ROUTE] Processando mensagem de ${userId}: "${mensagem.substring(0, 30)}..."`);

            // 1. Solicitação EXPLÍCITA de atendente (PRIORIDADE MÁXIMA)
            // Usuário quer falar com humano? Transfere imediatamente!
            if (this.temPalavraChave(mensagemLower, 'atendenteExplicito')) {
                console.log(`[ROUTE] ✅ Solicitação explícita de atendente por ${userId}`);
                return this.criarRespostaAtendente(userId, mensagem, 'solicitacao_explicita', sessionData);
            }

            // 2. BOT RESPONDE A TUDO (24/7)
            // O bot está sempre disponível para ajudar
            console.log(`[ROUTE] 🤖 Bot processando mensagem de ${userId}`);
            this.incrementarTentativa(userId);
            
            return this.criarRespostaBot(
                this.getBotResponse(mensagemLower),
                'bot_resposta'
            );

        } catch (error) {
            console.error(`[ROUTE] Erro ao decidir destino para ${userId}:`, error);
            return this.criarRespostaBot(
                "Desculpe, estou com problemas técnicos. Pode reformular?",
                'erro_roteamento'
            );
        }
    }

    temPalavraChave(mensagem, categoria) {
        return this.palavrasChave[categoria].some(keyword => 
            mensagem.includes(keyword)
        );
    }

    estaNoHorarioFuncionamento(hora, diaSemana) {
        // Verificar se é dia útil (1=segunda, 5=sexta)
        const isDiaUtil = diaSemana >= 1 && diaSemana <= 5;
        
        // Verificar horário comercial (8h às 14h)
        const isHorarioComercial = hora >= this.config.horarioFuncionamento.inicio && 
                                   hora < this.config.horarioFuncionamento.fim;
        
        return isDiaUtil && isHorarioComercial;
    }

    getMensagemForaHorario(mensagem) {
        if (mensagem.includes('olá') || mensagem.includes('oi') || mensagem.includes('bom')) {
            return "🤖 Olá! Atendimento humano disponível das 8h às 14h, de segunda a sexta. Enquanto isso, posso te ajudar com informações básicas!";
        }
        if (mensagem.includes('preço') || mensagem.includes('valor') || mensagem.includes('custa')) {
            return "🤖 Para informações de preços, você pode consultar nosso site ou aguardar o horário comercial para falar com um atendente.";
        }
        if (mensagem.includes('estoque') || mensagem.includes('disponível')) {
            return "🤖 Para verificar disponibilidade de produtos, nosso site tem estoque em tempo real, ou você pode retornar amanhã no horário comercial.";
        }
        if (mensagem.includes('endereço') || mensagem.includes('onde fica')) {
            return "🤖 Nosso endereço é Rua Exemplo, 123 - Centro. Estamos fechados agora, mas reabrimos amanhã às 8h!";
        }
        
        return "🤖 Atendimento humano disponível das 8h às 14h (segunda a sexta). Para questões urgentes, deixe seu e-mail que retornamos no próximo dia útil.";
    }

    getBotResponse(mensagem) {
        if (mensagem.includes('olá') || mensagem.includes('oi') || mensagem.includes('bom')) {
            return "Olá! 😊 Em que posso te ajudar hoje? Se preferir falar com um atendente humano, é só pedir!";
        }
        if (mensagem.includes('preço') || mensagem.includes('valor')) {
            return "Para informar o preço, preciso saber qual produto você está interessado. Pode me dizer o nome do produto?";
        }
        if (mensagem.includes('estoque') || mensagem.includes('disponível')) {
            return "Posso verificar a disponibilidade! Qual produto você gostaria de consultar?";
        }
        if (mensagem.includes('horário') || mensagem.includes('funcionamento')) {
            return "Funcionamos de segunda a sexta, das 8h às 14h. Posso te ajudar agora, ou se preferir, pode solicitar um atendente humano!";
        }
        if (mensagem.includes('endereço') || mensagem.includes('onde fica')) {
            return "Nosso endereço é Rua Exemplo, 123 - Centro. Temos estacionamento gratuito!";
        }
        if (mensagem.includes('telefone') || mensagem.includes('contato')) {
            return "Nosso telefone é (11) 9999-9999. Posso te ajudar agora ou você prefere falar com um atendente?";
        }
        if (mensagem.includes('ajuda') || mensagem.includes('help')) {
            return "Estou aqui para ajudar! 😊 Posso responder sobre produtos, preços, horários, endereço e muito mais. Se precisar de um atendente humano, é só pedir!";
        }
        
        return "Entendi! Posso te ajudar com mais alguma coisa? Se preferir falar com um atendente humano, me avise!";
    }

    criarRespostaBot(mensagem, motivo) {
        return {
            destination: 'bot',
            metadata: {
                mensagemSistema: mensagem,
                motivo: motivo,
                timestamp: new Date()
            }
        };
    }

    criarRespostaAtendente(userId, mensagemOriginal, motivo, sessionData) {
        const contexto = {
            userId: userId,
            userName: sessionData?.Remetente || userId,
            conversaId: sessionData?.IdConversa,
            motivo: motivo,
            mensagemOriginal: mensagemOriginal,
            timestamp: new Date(),
            userType: sessionData?.userType || 'visitante'
        };

        return {
            destination: 'atendente',
            metadata: {
                ...contexto,
                mensagemSistema: this.getMensagemTransferencia(motivo)
            }
        };
    }

    getMensagemTransferencia(motivo) {
        const mensagens = {
            'solicitacao_explicita': "Perfeito! Estou te conectando com um atendente humano. Por favor, aguarde um momento..."
        };
        
        return mensagens[motivo] || "Transferindo para atendente humano...";
    }

    getTentativasBot(userId) {
        const dados = this.contadorTentativas.get(userId);
        return dados ? dados.tentativas : 0;
    }

    incrementarTentativa(userId) {
        const dados = this.contadorTentativas.get(userId) || { tentativas: 0, primeiraTentativa: new Date() };
        dados.tentativas += 1;
        this.contadorTentativas.set(userId, dados);
    }

    resetarContadores(userId) {
        this.contadorTentativas.delete(userId);
        console.log(`[ROUTE] Contadores resetados para ${userId}`);
    }

    getEstatisticas() {
        return {
            usuariosMonitorados: this.contadorTentativas.size,
            totalDecisoes: this.historicoDecisoes.size,
            tentativasMedias: Array.from(this.contadorTentativas.values())
                .reduce((acc, curr) => acc + curr.tentativas, 0) / this.contadorTentativas.size || 0
        };
    }
}

module.exports = MessageRouter;