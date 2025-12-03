/**
 * Arquivo de configuração da API
 * Configura a instância do axios com URL base e interceptors
 */

// Importa a biblioteca axios para fazer requisições HTTP
import axios from 'axios';

// Cria uma instância do axios com configurações personalizadas
const api = axios.create({
  baseURL: 'http://localhost:5000/api', // URL base da API backend
  headers: {
    'Content-Type': 'application/json' // Define que as requisições serão em JSON
  }
});

// Interceptor para adicionar token de autenticação automaticamente em todas as requisições
api.interceptors.request.use(
  (config) => {
    // Busca o token JWT armazenado no localStorage
    const token = localStorage.getItem('token');
    // Se o token existir, adiciona no cabeçalho Authorization
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Retorna a configuração modificada
    return config;
  },
  (error) => {
    // Em caso de erro na configuração da requisição, rejeita a promise
    return Promise.reject(error);
  }
);

// Exporta a instância configurada do axios
export default api;
