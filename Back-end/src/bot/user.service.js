// user.service.js - CÓDIGO COMPLETO OTIMIZADO
// REMOVA qualquer importação duplicada de sql/config

let sql; // Declarar globalmente
let config; // Declarar globalmente

class UserService {
  constructor() {
    this.pool = null;
    this.initialized = false;
  }

  async init() {
    if (!this.initialized) {
      try {
        // Importar dinamicamente para evitar duplicação
        if (!sql || !config) {
          const banco = require('../config/banco');
          sql = banco.sql;
          config = banco.config;
        }
        
        this.pool = await sql.connect(config);
        this.initialized = true;
        console.log('✅ UserService conectado ao SQL Server');
      } catch (error) {
        console.error('❌ Erro ao conectar UserService:', error.message);
        throw error;
      }
    }
  }

  /**
   * BUSCA OTIMIZADA - Case-insensitive e múltiplas estratégias
   */
  async searchUsers(searchTerm) {
    try {
      await this.init();
      
      if (!searchTerm || searchTerm.trim() === '') {
        return [];
      }
      
      const term = searchTerm.trim().toLowerCase();
      console.log(`🔍 BUSCA OTIMIZADA por: "${term}"`);
      
      const request = this.pool.request();
      
      // BUSCA FLEXÍVEL - várias estratégias
      const query = `
        SELECT TOP 10
          Id,
          Nome,
          Email,
          Telefone,
          Login,
          Ativo,
          DataCadastro,
          UltimoLogin
        FROM Usuarios 
        WHERE 
          -- 1. Busca case-insensitive no nome
          (LOWER(Nome) LIKE @termLower OR 
           -- 2. Busca case-insensitive no email
           LOWER(Email) LIKE @termLower OR 
           -- 3. Busca case-insensitive no login
           LOWER(Login) LIKE @termLower OR
           -- 4. Busca original (case-sensitive)
           Nome LIKE @termParts OR
           Email LIKE @termParts OR
           Login LIKE @termParts)
          -- 5. Remover filtro de Ativo temporariamente para testes
          -- AND Ativo = 1
        ORDER BY 
          -- Prioridade: nome exato > nome parcial > email > login
          CASE 
            WHEN LOWER(Nome) = @termExact THEN 1
            WHEN Nome LIKE @termStart THEN 2
            WHEN LOWER(Nome) LIKE @termLower THEN 3
            WHEN LOWER(Email) LIKE @termLower THEN 4
            ELSE 5
          END,
          Nome
      `;
      
      // Múltiplos padrões de busca
      request.input('termLower', sql.NVarChar, `%${term}%`);
      request.input('termExact', sql.NVarChar, term);
      request.input('termStart', sql.NVarChar, `${term}%`);
      request.input('termParts', sql.NVarChar, `%${searchTerm}%`);
      
      const result = await request.query(query);
      
      console.log(`✅ Encontrados: ${result.recordset.length} usuários`);
      if (result.recordset.length > 0) {
        result.recordset.forEach((user, i) => {
          console.log(`  ${i+1}. ${user.Nome} (ID: ${user.Id}, Email: ${user.Email}, Ativo: ${user.Ativo})`);
        });
      } else {
        console.log('❌ Nenhum usuário encontrado');
        
        // Debug: mostrar alguns usuários existentes
        const debugResult = await this.pool.request()
          .query("SELECT TOP 5 Id, Nome, Ativo FROM Usuarios ORDER BY Nome");
        
        console.log('👥 Usuários na tabela (top 5):');
        debugResult.recordset.forEach((user, i) => {
          console.log(`  ${i+1}. ${user.Nome} (ID: ${user.Id}, Ativo: ${user.Ativo})`);
        });
      }
      
      return result.recordset;
      
    } catch (error) {
      console.error('❌ Erro na busca:', error.message);
      return [];
    }
  }

  /**
   * Busca RÁPIDA por ID - SEM filtro de Ativo para testes
   */
  async getUserById(userId) {
    try {
      await this.init();
      
      const idNum = parseInt(userId);
      if (isNaN(idNum)) {
        console.log(`⚠️ getUserById: ID inválido: ${userId}`);
        return null;
      }
      
      const result = await this.pool.request()
        .input('userId', sql.Int, idNum)
        .query(`
          SELECT 
            Id,
            Nome,
            Email,
            Telefone,
            Login,
            Ativo,
            DataCadastro,
            UltimoLogin
          FROM Usuarios 
          WHERE Id = @userId
          -- Remover filtro temporariamente:
          -- AND Ativo = 1
        `);
      
      console.log(`🔍 Busca ID ${idNum}: ${result.recordset.length > 0 ? 'ENCONTRADO' : 'NÃO ENCONTRADO'}`);
      
      return result.recordset[0] || null;
      
    } catch (error) {
      console.error('❌ Erro buscar por ID:', error.message);
      return null;
    }
  }

  /**
   * Verifica se usuário existe
   */
  async userExists(userId) {
    try {
      await this.init();
      
      const idNum = parseInt(userId);
      if (isNaN(idNum)) return false;
      
      const result = await this.pool.request()
        .input('userId', sql.Int, idNum)
        .query(`
          SELECT COUNT(*) as count 
          FROM Usuarios 
          WHERE Id = @userId
          -- Remover filtro temporariamente:
          -- AND Ativo = 1
        `);
      
      return result.recordset[0].count > 0;
      
    } catch (error) {
      console.error('❌ Erro ao verificar usuário:', error.message);
      return false;
    }
  }

  /**
   * Formata lista de usuários para exibição
   */
  formatUserList(users) {
    if (!users || users.length === 0) {
      return 'Nenhum usuário encontrado.';
    }
    
    let formatted = '';
    users.forEach((user, index) => {
      formatted += `${index + 1}. ${user.Nome}`;
      if (user.Email) formatted += ` (${user.Email})`;
      formatted += '\n';
    });
    
    return formatted;
  }

  /**
   * Busca DIRETA sem filtros - para debug
   */
  async debugSearch(searchTerm) {
    try {
      await this.init();
      
      console.log(`🔍 DEBUG BUSCA: "${searchTerm}"`);
      
      const result = await this.pool.request()
        .query(`
          SELECT Id, Nome, Email, Ativo 
          FROM Usuarios 
          WHERE Nome LIKE '%${searchTerm}%' 
             OR Email LIKE '%${searchTerm}%'
             OR Login LIKE '%${searchTerm}%'
          ORDER BY Nome
        `);
      
      return result.recordset;
      
    } catch (error) {
      console.error('❌ Erro debug search:', error.message);
      return [];
    }
  }
}

module.exports = UserService;