const db = require('../../config/banco');

async function registrarMensagem(req, res) {
  try {
    const { conversaId, texto, remetente } = req.body;

    if (!conversaId || !texto || !remetente) {
      return res.status(400).json({ erro: 'Campos obrigatórios faltando.' });
    }

    const query = `
      INSERT INTO cmMensagens (conversaId, texto, remetente, dataCriacao)
      OUTPUT INSERTED.*
      VALUES (@conversaId, @texto, @remetente, GETDATE())
    `;

    const result = await db.exec(query, {
      conversaId,
      texto,
      remetente
    });

    return res.status(201).json(result[0]);
  } catch (erro) {
    console.error('Erro registrar mensagem:', erro);
    return res.status(500).json({ erro: 'Falha ao registrar mensagem' });
  }
}

module.exports = { registrarMensagem };
