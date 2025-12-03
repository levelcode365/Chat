//bot dos prompts do sistema


module.exports = async (mensagem) => {
    if (mensagem.includes("boleto")) 
        return "Posso gerar o boleto para você agora mesmo.";

    if (mensagem.includes("prazo"))
        return "Nosso prazo padrão é de 3 dias úteis.";

    return "Obrigado pela mensagem! Como posso ajudar?";
};
