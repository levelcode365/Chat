CHAT BACKEND API

API para gerenciamento de conversas e mensagens em tempo real.

BASE URL:
http://localhost:3000/api

--------------------------------------------------
ENDPOINTS

1. Criar conversa
POST /conversas

Request body:
{
  "IdUsuario": 1
}

Response 201:
{
  "sucesso": true,
  "IdConversa": 123
}

Erros possíveis:
- 400: "IdUsuario é obrigatório"
- 500: "Erro ao criar conversa"

--------------------------------------------------
2. Listar conversas por usuário
GET /conversas/usuario/:idUsuario

Exemplo:
GET /conversas/usuario/1

Response 200:
[
  {
    "IdConversa": 123,
    "IdUsuario": 1,
    "Status": "ativa",
    "DataInicio": "2025-11-30T16:00:00.000Z",
    "DataFim": null,
    "AtendidoPorHumano": 0
  }
]

Erros possíveis:
- 500: "Erro ao listar conversas"

--------------------------------------------------
3. Atualizar status da conversa
PUT /conversas/:id/status

Request body:
{
  "status": "em andamento",
  "atendidoPorHumano": true
}

Response 200:
{
  "sucesso": true
}

Erros possíveis:
- 500: "Erro ao atualizar status"

--------------------------------------------------
4. Encerrar conversa
PUT /conversas/:id/encerrar

Response 200:
{
  "sucesso": true
}

Erros possíveis:
- 500: "Erro ao encerrar conversa"

--------------------------------------------------
5. Registrar mensagem
POST /mensagens

Request body:
{
  "IdConversa": 123,
  "Remetente": "cliente",
  "Mensagem": "Mensagem de teste"
}

Response 201:
{
  "IdMensagem": 456,
  "IdConversa": 123,
  "Remetente": "cliente",
  "Mensagem": "Mensagem de teste",
  "DataEnvio": "2025-11-30T16:00:00.000Z"
}

Erros possíveis:
- 400: "Campos obrigatórios: IdConversa, Remetente, Mensagem"
- 500: "Erro ao registrar mensagem"

--------------------------------------------------
6. Excluir mensagem
DELETE /mensagens/:id

Response 200:
{
  "message": "Mensagem excluída com sucesso"
}

Erros possíveis:
- 404: "Mensagem não encontrada"
- 500: "Erro ao excluir mensagem"

--------------------------------------------------
OBSERVAÇÕES GERAIS

- Todos os endpoints retornam JSON.
- Campos obrigatórios devem ser enviados pelo front para evitar status 400.
- Datas (DataInicio, DataFim, DataEnvio) seguem o padrão ISO 8601.
- Para testes locais, use http://localhost:3000/api como base URL.
