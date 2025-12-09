# 1. Primeiro certifique-se que o servidor NÃO está rodando
#    (Ctrl+C se estiver rodando npm run dev)

# 2. Teste da API (vai iniciar servidor automaticamente)
cd /home/levelcode/Chat/Back-end
npm run test:api

# 3. Teste do WebSocket
npx mocha test/websocket/websocket.test.js

# 4. Teste do Bot
npx mocha test/bot/bot-integration.test.js

# 5. Todos os testes juntos (cuidado: pode demorar)
npx mocha test/**/*.test.js