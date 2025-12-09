import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { config } from "dotenv";
import { parse, resolve } from "path";

config({ path: resolve(__dirname, "../.env") }); 

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // permite acesso externo
    port: parseInt(process.env.PORT, 10) || 3005,      // porta padrão
    strictPort: true, // impede troca automática de porta
    allowedHosts: [
      "chatsaas.nfinformatica.com.br"
    ]
  }
});
