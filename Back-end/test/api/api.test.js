const request = require("supertest");
const WebSocket = require("ws");
const { iniciarServidor } = require("../../src/core/servidor.js");

let servidor;
let api;


beforeAll(() => {
    servidor = iniciarServidor();
    api = request(servidor);
});

afterAll((done) => {
    servidor.close(() => {
        console.log("🔌 Servidor fechado após testes");
        done();
    });
});


test("GET /status deve retornar OK", async () => {
    const res = await api.get("/status");
    expect(res.statusCode).toBe(200);
    expect(res.body.online).toBe(true);
});


test("GET /health deve retornar healthy", async () => {
    const res = await api.get("/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("healthy");
});


test("POST /api/mensagens deve criar uma mensagem", async () => {
    const reqBody = {
        IdConversa: 1,
        Remetente: "usuario",
        Mensagem: "Mensagem de teste automatizada"
    };

    const res = await api.post("/api/mensagens").send(reqBody);

    expect(res.statusCode).toBe(201);
    expect(res.body.Mensagem).toBe(reqBody.Mensagem);
});


test("WebSocket deve conectar e receber evento de mensagem", (done) => {
    jest.setTimeout(15000);

    const ws = new WebSocket("ws://localhost:3000");

    ws.on("message", (data) => {
        const msg = JSON.parse(data);

        // Ignorar mensagens inesperadas
        if (!msg.tipo) return;

        try {
            expect(msg.tipo).toBe("conexao_estabelecida");
            ws.close();
            done();
        } catch (error) {
            done(error);
        }
    });

    ws.on("error", (err) => done(err));
});
